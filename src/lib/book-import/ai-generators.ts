import { db } from '@/lib/db'
import { callWithJsonObject } from './ai-helpers'
import { formatPrompt } from './prompts'
import {
  BOOK_IMPORT_CHARACTERS_AND_RELATIONSHIPS,
  BOOK_IMPORT_WORLD_BUILDING,
  BOOK_IMPORT_EVENTS,
} from './prompts'
import {
  normalizeOutlineCharacterEntries,
  CHARACTER_TYPE,
} from './metadata'
import type {
  BookImportChapter,
  BookImportOutline,
  ProjectSuggestion,
} from './types'

/**
 * Generate characters and relationships from imported content
 */
export async function generateCharactersAndRelationships(
  userId: string,
  projectId: string,
  suggestion: ProjectSuggestion,
  chapters: BookImportChapter[],
  outlines: BookImportOutline[],
): Promise<void> {
  if (chapters.length === 0) return

  // Extract all characters from outline structures
  const characterSet = new Set<string>()
  const characterAppearances: Map<string, number[]> = new Map()

  for (let idx = 0; idx < outlines.length; idx++) {
    const outline = outlines[idx]
    if (outline.structure && typeof outline.structure === 'object') {
      const structure = outline.structure as Record<string, unknown>
      const normalized = normalizeOutlineCharacterEntries(structure.characters)
      for (const char of normalized) {
        if (char.type !== CHARACTER_TYPE.CHARACTER) continue
        const name = char.name // Already trimmed by normalizeOutlineCharacterEntries
        characterSet.add(name)
        const appearances = characterAppearances.get(name) || []
        appearances.push(idx + 1)
        characterAppearances.set(name, appearances)
      }
    }
  }

  if (characterSet.size === 0) {
    console.info('[book-import] no characters found in outlines')
    return
  }

  const characterList = Array.from(characterSet).slice(0, 20)

  const sampleChapters = chapters.slice(0, 5)
  const chapterSamples = sampleChapters
    .map((ch, idx) => `【第${idx + 1}章 ${ch.title}】\n${(ch.content || '').slice(0, 1500)}`)
    .join('\n\n')

  const characterAppearancesText = characterList
    .map(name => {
      const chapters = characterAppearances.get(name) || []
      return `${name}: 出现于第${chapters.join('、')}章`
    })
    .join('\n')

  const prompt = formatPrompt(BOOK_IMPORT_CHARACTERS_AND_RELATIONSHIPS, {
    title: suggestion.title || '拆书导入项目',
    genre: suggestion.genre || '通用',
    theme: suggestion.theme || '未设定',
    narrative_perspective: suggestion.narrative_perspective || '第三人称',
    character_list: characterList.join('、'),
    chapter_samples: chapterSamples,
    character_appearances: characterAppearancesText,
  })

  try {
    const aiData = await callWithJsonObject(userId, prompt, {
      maxTokens: 4096,
      temperature: 0.3,
    })

    const charactersRaw = aiData.characters as Array<Record<string, unknown>> | undefined
    let createdFromAi = false

    if (Array.isArray(charactersRaw) && charactersRaw.length > 0) {
      const nameToId = new Map<string, string>()

      for (const charData of charactersRaw) {
        const name = String(charData.name || '').trim()
        if (!name) continue

        const character = await db.character.create({
          data: {
            projectId,
            name: name.slice(0, 100),
            nickname: charData.nickname ? String(charData.nickname).slice(0, 100) : null,
            age: charData.age && typeof charData.age === 'number' ? charData.age : null,
            gender: charData.gender ? String(charData.gender).slice(0, 20) : null,
            appearance: charData.appearance ? String(charData.appearance).slice(0, 2000) : null,
            personality: charData.personality ? String(charData.personality).slice(0, 2000) : null,
            background: charData.background ? String(charData.background).slice(0, 3000) : null,
            role: charData.role ? String(charData.role).slice(0, 50) : null,
          },
        })
        nameToId.set(name, character.id)
      }

      createdFromAi = nameToId.size > 0

      const relationshipsRaw = aiData.relationships as Array<Record<string, unknown>> | undefined
      if (Array.isArray(relationshipsRaw)) {
        for (const relData of relationshipsRaw) {
          const char1Name = String(relData.character1 || '').trim()
          const char2Name = String(relData.character2 || '').trim()

          if (!char1Name || !char2Name || char1Name === char2Name) continue

          const char1Id = nameToId.get(char1Name)
          const char2Id = nameToId.get(char2Name)

          if (!char1Id || !char2Id) continue

          const existing = await db.relationship.findUnique({
            where: {
              characterId_relatedId: {
                characterId: char1Id,
                relatedId: char2Id,
              },
            },
          })

          if (existing) continue

          await db.relationship.create({
            data: {
              characterId: char1Id,
              relatedId: char2Id,
              relationshipType: String(relData.type || '未知').slice(0, 50),
              description: relData.description ? String(relData.description).slice(0, 1000) : null,
              strength: typeof relData.strength === 'number' ? Math.max(1, Math.min(100, relData.strength)) : 50,
            },
          })
        }
      }

      if (createdFromAi) {
        console.info(
          `[book-import] created ${nameToId.size} characters and relationships from AI`,
        )
      }
    }

    if (!createdFromAi && characterList.length > 0) {
      console.info(
        '[book-import] AI returned no usable characters; using name-list + co-appearance fallback',
      )
      await createFallbackCharacters(projectId, characterList, characterAppearances)
    }
  } catch (e) {
    console.warn('[book-import] AI character generation failed, using fallback', e)
    await createFallbackCharacters(projectId, characterList, characterAppearances)
  }
}

/**
 * Create fallback characters from extracted names
 */
async function createFallbackCharacters(
  projectId: string,
  characterNames: string[],
  characterAppearances: Map<string, number[]>,
): Promise<void> {
  const nameToId = new Map<string, string>()

  for (const name of characterNames) {
    const appearances = characterAppearances.get(name) || []
    const character = await db.character.create({
      data: {
        projectId,
        name: name.slice(0, 100),
        role: appearances.length > 5 ? '主要角色' : '配角',
        background: `出现在第${appearances.join('、')}章`,
      },
    })
    nameToId.set(name, character.id)
  }

  const appearanceThreshold = 3
  for (let i = 0; i < characterNames.length; i++) {
    for (let j = i + 1; j < characterNames.length; j++) {
      const char1Appearances = new Set(characterAppearances.get(characterNames[i]) || [])
      const char2Appearances = new Set(characterAppearances.get(characterNames[j]) || [])

      let coAppearances = 0
      for (const chapter of char1Appearances) {
        if (char2Appearances.has(chapter)) coAppearances++
      }

      if (coAppearances >= appearanceThreshold) {
        const char1Id = nameToId.get(characterNames[i])
        const char2Id = nameToId.get(characterNames[j])

        if (char1Id && char2Id) {
          await db.relationship.create({
            data: {
              characterId: char1Id,
              relatedId: char2Id,
              relationshipType: '相识',
              description: `共同出现在${coAppearances}个章节中`,
              strength: Math.min(60, coAppearances * 10),
            },
          })
        }
      }
    }
  }

  console.info(`[book-import] created ${characterNames.length} fallback characters`)
}

/**
 * Generate world building details from imported content
 */
export async function generateWorldBuilding(
  userId: string,
  projectId: string,
  suggestion: ProjectSuggestion,
  chapters: BookImportChapter[],
  outlines: BookImportOutline[],
): Promise<void> {
  if (chapters.length === 0) return

  const organizationSet = new Set<string>()
  const organizationAppearances: Map<string, number[]> = new Map()

  for (let idx = 0; idx < outlines.length; idx++) {
    const outline = outlines[idx]
    if (outline.structure && typeof outline.structure === 'object') {
      const structure = outline.structure as Record<string, unknown>
      const normalized = normalizeOutlineCharacterEntries(structure.characters)
      for (const char of normalized) {
        if (char.type !== CHARACTER_TYPE.ORGANIZATION) continue
        const name = char.name // Already trimmed by normalizeOutlineCharacterEntries
        organizationSet.add(name)
        const appearances = organizationAppearances.get(name) || []
        appearances.push(idx + 1)
        organizationAppearances.set(name, appearances)
      }
    }
  }

  const organizations = Array.from(organizationSet).slice(0, 15)
  const organizationsText = organizations
    .map(name => {
      const chapters = organizationAppearances.get(name) || []
      return `${name}: 出现于第${chapters.join('、')}章`
    })
    .join('\n')

  const sampleChapters = chapters.slice(0, 3)
  const chapterSamples = sampleChapters
    .map((ch, idx) => `【第${idx + 1}章 ${ch.title}】\n${(ch.content || '').slice(0, 2000)}`)
    .join('\n\n')

  const prompt = formatPrompt(BOOK_IMPORT_WORLD_BUILDING, {
    title: suggestion.title || '拆书导入项目',
    genre: suggestion.genre || '通用',
    theme: suggestion.theme || '未设定',
    time_period: '待详细设定',
    location: '待详细设定',
    atmosphere: '待详细设定',
    chapter_samples: chapterSamples,
    organizations: organizationsText || '未识别到具体组织',
  })

  try {
    const aiData = await callWithJsonObject(userId, prompt, {
      maxTokens: 4096,
      temperature: 0.3,
    })

    const worldUpdate: {
      worldTimePeriod?: string
      worldLocation?: string
      worldAtmosphere?: string
      worldRules?: string
    } = {}

    if (aiData.world_time_period && typeof aiData.world_time_period === 'string') {
      worldUpdate.worldTimePeriod = aiData.world_time_period.slice(0, 2000)
    }
    if (aiData.world_location && typeof aiData.world_location === 'string') {
      worldUpdate.worldLocation = aiData.world_location.slice(0, 2000)
    }
    if (aiData.world_atmosphere && typeof aiData.world_atmosphere === 'string') {
      worldUpdate.worldAtmosphere = aiData.world_atmosphere.slice(0, 1500)
    }
    if (aiData.world_rules && typeof aiData.world_rules === 'string') {
      worldUpdate.worldRules = aiData.world_rules.slice(0, 2000)
    }

    if (Object.keys(worldUpdate).length > 0) {
      await db.project.update({
        where: { id: projectId },
        data: worldUpdate,
      })
    }

    const locationsRaw = aiData.locations as Array<Record<string, unknown>> | undefined
    if (Array.isArray(locationsRaw) && locationsRaw.length > 0) {
      for (const locData of locationsRaw) {
        const name = String(locData.name || '').trim()
        if (!name) continue

        await db.location.create({
          data: {
            projectId,
            name: name.slice(0, 100),
            type: String(locData.type || '未知').slice(0, 50),
            description: locData.description ? String(locData.description).slice(0, 2000) : null,
            climate: locData.climate ? String(locData.climate).slice(0, 100) : null,
            population: locData.population && typeof locData.population === 'number' ? locData.population : null,
            importance: typeof locData.importance === 'number' ? Math.max(1, Math.min(100, locData.importance)) : 50,
          },
        })
      }
    }

    const orgsRaw = aiData.organizations as Array<Record<string, unknown>> | undefined
    if (Array.isArray(orgsRaw) && orgsRaw.length > 0) {
      for (const orgData of orgsRaw) {
        const name = String(orgData.name || '').trim()
        if (!name) continue

        let locationId: string | null = null
        if (orgData.location_name && typeof orgData.location_name === 'string') {
          const locationName = String(orgData.location_name).trim()
          const location = await db.location.findFirst({
            where: {
              projectId,
              name: { equals: locationName, mode: 'insensitive' },
            },
          })
          if (location) locationId = location.id
        }

        await db.organization.create({
          data: {
            projectId,
            name: name.slice(0, 100),
            type: String(orgData.type || '未知').slice(0, 50),
            description: orgData.description ? String(orgData.description).slice(0, 3000) : null,
            leader: orgData.leader ? String(orgData.leader).slice(0, 100) : null,
            size: typeof orgData.size === 'number' ? Math.max(1, Math.min(100, orgData.size)) : 50,
            influence: typeof orgData.influence === 'number' ? Math.max(1, Math.min(100, orgData.influence)) : 50,
            locationId,
          },
        })
      }
    }

    console.info(`[book-import] created world building: ${locationsRaw?.length || 0} locations, ${orgsRaw?.length || 0} organizations`)
  } catch (e) {
    console.warn('[book-import] AI world building generation failed, using basic info', e)
  }
}

/**
 * Generate events from imported content
 */
export async function generateEvents(
  userId: string,
  projectId: string,
  suggestion: ProjectSuggestion,
  chapters: BookImportChapter[],
): Promise<number> {
  if (chapters.length === 0) return 0

  const sampleChapters = chapters.slice(0, 10)
  const chapterSamples = sampleChapters
    .map((ch, idx) => `【第${idx + 1}章 ${ch.title}】\n${(ch.content || '').slice(0, 2000)}`)
    .join('\n\n---\n\n')

  const chapterTitles = chapters
    .slice(0, 20)
    .map((ch, idx) => `${idx + 1}. ${ch.title}`)
    .join('\n')

  const prompt = formatPrompt(BOOK_IMPORT_EVENTS, {
    title: suggestion.title || '拆书导入项目',
    genre: suggestion.genre || '通用',
    theme: suggestion.theme || '未设定',
    narrative_perspective: suggestion.narrative_perspective || '第三人称',
    start_chapter: '1',
    end_chapter: String(Math.min(chapters.length, 10)),
    chapter_samples: chapterSamples,
    chapter_titles: chapterTitles,
  })

  try {
    const aiData = await callWithJsonObject(userId, prompt, {
      maxTokens: 4096,
      temperature: 0.3,
    })

    const eventsRaw = aiData.events as Array<Record<string, unknown>> | undefined
    if (Array.isArray(eventsRaw) && eventsRaw.length > 0) {
      for (const eventData of eventsRaw) {
        const name = String(eventData.name || '').trim()
        if (!name) continue

        let locationId: string | null = null
        if (eventData.location_name && typeof eventData.location_name === 'string') {
          const locationName = String(eventData.location_name).trim()
          const location = await db.location.findFirst({
            where: {
              projectId,
              name: { equals: locationName, mode: 'insensitive' },
            },
          })
          if (location) locationId = location.id
        }

        await db.event.create({
          data: {
            projectId,
            name: name.slice(0, 200),
            type: String(eventData.type || '未知').slice(0, 50),
            description: eventData.description ? String(eventData.description).slice(0, 2000) : null,
            date: eventData.date ? String(eventData.date).slice(0, 100) : null,
            importance: typeof eventData.importance === 'number' ? Math.max(1, Math.min(100, eventData.importance)) : 50,
            locationId,
          },
        })
      }

      console.info(`[book-import] created ${eventsRaw.length} events`)
      return eventsRaw.length
    }
  } catch (e) {
    console.warn('[book-import] AI event generation failed', e)
  }
  return 0
}
