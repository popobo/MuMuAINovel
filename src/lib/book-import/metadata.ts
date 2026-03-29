/**
 * 规则推断与摘要（自经典版 book_import_service 迁移）
 */

import type { BookImportChapter, OutlineStructure, ProjectSuggestion, WritingStyleAnalysis } from './types'

// Character/organization type constants
export const CHARACTER_TYPE = {
  CHARACTER: 'character',
  ORGANIZATION: 'organization',
} as const

export function buildSummary(content: string, maxLen = 120): string | null {
  if (!content) return null
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLen) return normalized
  return `${normalized.slice(0, maxLen)}…`
}

export function stripChapterPrefix(title: string): string {
  const normalized = title.trim()
  if (!normalized) return normalized

  const stripped = normalized
    .replace(
      /^第\s*[0-9零一二三四五六七八九十百千万两〇]+\s*[章节回卷]\s*[-—:：、.．）)】\]]*\s*/,
      '',
    )
    .trim()

  return stripped || normalized
}

export function detectThemeFromText(text: string): string {
  if (/复仇|报仇|雪恨/.test(text)) return '复仇与救赎'
  if (/成长|蜕变|逆袭/.test(text)) return '成长与逆袭'
  if (/真相|谜团|秘密|调查/.test(text)) return '真相与抉择'
  if (/权谋|争权|朝堂|家族/.test(text)) return '权力与人性'
  if (/爱情|喜欢|恋爱|婚约/.test(text)) return '爱情与选择'
  return '命运与选择'
}

export function detectGenreFromText(text: string): string {
  if (/修仙|宗门|灵气|飞升|仙门/.test(text)) return '仙侠'
  if (/玄幻|异界|魔法|斗气/.test(text)) return '玄幻'
  if (/星际|机甲|赛博|人工智能|宇宙/.test(text)) return '科幻'
  if (/悬疑|凶案|推理|谜案|诡/.test(text)) return '悬疑'
  if (/总裁|职场|都市|豪门/.test(text)) return '都市'
  if (/恋爱|言情|心动|告白/.test(text)) return '言情'
  return '通用'
}

export function detectNarrativePerspectiveFromText(text: string): string {
  const snippet = text.slice(0, 6000)
  const firstPersonHits = (snippet.match(/[我咱俺]\S{0,2}/g) ?? []).length
  const thirdPersonHits = (snippet.match(/[他她它]\S{0,2}/g) ?? []).length

  if (firstPersonHits >= 20 && firstPersonHits > thirdPersonHits * 1.2) {
    return '第一人称'
  }
  return '第三人称'
}

export function normalizeNarrativePerspective(
  value: unknown,
  fallback: string,
): string {
  const raw = String(value ?? '').trim()
  if (!raw) return fallback

  if (['第一人称', '第三人称', '全知视角'].includes(raw)) return raw

  const rawLower = raw.toLowerCase().replace(/[-\s]/g, '_')
  if (
    [
      'first_person',
      'firstperson',
      'first_person_perspective',
      '1st_person',
      'first',
    ].includes(rawLower)
  ) {
    return '第一人称'
  }
  if (
    [
      'third_person',
      'thirdperson',
      'third_person_perspective',
      '3rd_person',
      'third',
    ].includes(rawLower)
  ) {
    return '第三人称'
  }
  if (['omniscient', 'god_view', 'godview', 'all_knowing'].includes(rawLower)) {
    return '全知视角'
  }

  if (raw.includes('第一人称') || ['第一视角', '主角视角', '我视角'].includes(raw)) {
    return '第一人称'
  }
  if (raw.includes('第三人称') || ['第三视角', '旁观视角'].includes(raw)) {
    return '第三人称'
  }
  if (raw.includes('全知') || raw.includes('上帝视角')) return '全知视角'

  return fallback
}

export function normalizeTargetWords(value: unknown, fallback = 100000): number {
  const parsed =
    typeof value === 'number' && Number.isFinite(value)
      ? Math.floor(value)
      : parseInt(String(value ?? ''), 10)
  if (Number.isNaN(parsed)) return fallback
  if (parsed < 1000) return fallback
  if (parsed > 3_000_000) return 3_000_000
  return parsed
}

export function extractNarrativePerspective(
  projectData: Record<string, unknown>,
  fallback: string,
): string {
  const candidates = [
    projectData.narrative_perspective,
    projectData.narrativePerspective,
    projectData.perspective,
    projectData.narrative_view,
    projectData.narrative_angle,
    projectData['叙事视角'],
    projectData['叙事角度'],
    projectData['视角'],
  ]

  for (const value of candidates) {
    const normalized = normalizeNarrativePerspective(value, '')
    if (normalized) return normalized
  }
  return normalizeNarrativePerspective(null, fallback)
}

export function buildFallbackProjectSuggestion(
  title: string,
  chapters: BookImportChapter[],
): ProjectSuggestion {
  const sampledChapters = chapters.slice(0, 3)
  const sampledText = sampledChapters
    .map(c => (c.content || '').slice(0, 2000))
    .join('\n\n')
    .trim()

  const fallbackDescriptionSource = sampledChapters
    .map(c => c.summary || (c.content || '').slice(0, 600))
    .join('\n')
    .trim()

  const fallbackDescription =
    buildSummary(fallbackDescriptionSource) ||
    '由拆书功能基于前3章自动提炼：该故事围绕核心人物与主要冲突展开，可在导入前继续修改。'

  return {
    title,
    description: fallbackDescription.slice(0, 500),
    theme: detectThemeFromText(sampledText),
    genre: detectGenreFromText(sampledText),
    narrative_perspective: detectNarrativePerspectiveFromText(sampledText),
    target_words: 100000,
  }
}

export function buildFallbackOutlineStructure(
  chapter: BookImportChapter,
): OutlineStructure {
  let summary = (
    chapter.summary ||
    buildSummary(chapter.content || '') ||
    ''
  ).trim()
  if (!summary) summary = '本章围绕主要人物与核心冲突推进剧情。'

  return {
    chapter_number: chapter.chapter_number,
    title: chapter.title,
    detailed_outline: summary.slice(0, 1200),
    scenes: ['主角在当前处境中做出关键选择', '冲突升级并形成新的悬念'],
    characters: [],
    key_points: ['推进主线冲突', '呈现角色动机与关系变化'],
    emotion: '紧张递进',
    goal: '承接前章并推动后续剧情发展',
  }
}

/**
 * 将大纲里的 characters 数组规范为 { name, type }。
 * 缺省或非 organization 一律视为 character（与上下文感知大纲里常省略 type 的模型输出对齐）。
 */
export function normalizeOutlineCharacterEntries(
  charactersRaw: unknown,
): Array<{ name: string; type: string }> {
  const raw = Array.isArray(charactersRaw) ? charactersRaw : []
  const characters: Array<{ name: string; type: string }> = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const name = String(o.name ?? '').trim()
    if (!name) continue
    const roleType =
      String(o.type ?? '').trim().toLowerCase() === CHARACTER_TYPE.ORGANIZATION
        ? CHARACTER_TYPE.ORGANIZATION
        : CHARACTER_TYPE.CHARACTER
    characters.push({ name: name.slice(0, 80), type: roleType })
  }
  return characters
}

function normalizeSingleReverseOutline(
  raw: Record<string, unknown>,
  fallback: OutlineStructure,
  chapterNumber: number,
  chapterTitle: string,
): OutlineStructure {
  // 优先使用 detailed_outline,如果没有则使用 summary 或 content 作为fallback
  let detailedOutline = raw.detailed_outline && typeof raw.detailed_outline === 'string'
    ? String(raw.detailed_outline).trim()
    : (raw.summary ?? raw.content) && typeof (raw.summary ?? raw.content) === 'string'
      ? String(raw.summary ?? raw.content).trim()
      : String(fallback.detailed_outline || '').trim()

  if (!detailedOutline) detailedOutline = String(fallback.detailed_outline || '本章围绕主要人物与核心冲突推进剧情。')

  const scenesRaw = Array.isArray(raw.scenes) ? raw.scenes : []
  let scenes = scenesRaw
    .map(s => String(s).trim())
    .filter(Boolean)
    .slice(0, 6)
  if (scenes.length === 0) scenes = [...fallback.scenes]

  const characters = normalizeOutlineCharacterEntries(raw.characters)
  const useChars = characters.length > 0 ? characters : fallback.characters

  const keyPointsRaw = Array.isArray(raw.key_points) ? raw.key_points : []
  let keyPoints = keyPointsRaw
    .map(s => String(s).trim())
    .filter(Boolean)
    .slice(0, 8)
  if (keyPoints.length === 0) keyPoints = [...fallback.key_points]

  const emotion = String(raw.emotion ?? fallback.emotion ?? '剧情递进').trim() || '剧情递进'
  const goal =
    String(raw.goal ?? fallback.goal ?? '推进主线冲突').trim() || '推进主线冲突'

  return {
    chapter_number: chapterNumber,
    title: chapterTitle,
    detailed_outline: detailedOutline.slice(0, 5000),
    scenes,
    characters: useChars,
    key_points: keyPoints,
    emotion: emotion.slice(0, 200),
    goal: goal.slice(0, 300),
  }
}

export function normalizeReverseOutlineBatch(
  aiData: unknown,
  chapters: BookImportChapter[],
): OutlineStructure[] {
  const aiItems = Array.isArray(aiData) ? aiData : []
  const normalized: OutlineStructure[] = []

  for (let idx = 0; idx < chapters.length; idx++) {
    const chapter = chapters[idx]!
    const fallback = buildFallbackOutlineStructure(chapter)
    const candidate =
      idx < aiItems.length && aiItems[idx] && typeof aiItems[idx] === 'object'
        ? (aiItems[idx] as Record<string, unknown>)
        : {}
    normalized.push(
      normalizeSingleReverseOutline(
        candidate,
        fallback,
        chapter.chapter_number,
        chapter.title,
      ),
    )
  }

  return normalized
}

export function buildReverseOutlineChaptersText(chapters: BookImportChapter[]): string {
  const parts: string[] = []
  for (const chapter of chapters) {
    const summary = (chapter.summary || '').trim()
    const excerpt = (chapter.content || '').trim().slice(0, 2200)
    parts.push(
      `【第${chapter.chapter_number}章 ${chapter.title}】\n` +
        `章节摘要：${summary || '无'}\n` +
        `正文节选：\n${excerpt || '无'}`,
    )
  }
  return parts.join('\n\n')
}

export function deriveWorldSettings(
  suggestion: ProjectSuggestion,
  chapters: BookImportChapter[],
): {
  worldTimePeriod: string
  worldLocation: string
  worldAtmosphere: string
  worldRules: string
} {
  const sampleParts: string[] = [
    suggestion.title || '',
    suggestion.theme || '',
    suggestion.genre || '',
    suggestion.description || '',
  ]
  for (const chapter of chapters.slice(0, 3)) {
    if (chapter.content) {
      sampleParts.push(chapter.content.slice(0, 1200))
    }
  }
  const sampleText = sampleParts.join('\n')
  const genre = suggestion.genre || ''
  const theme = suggestion.theme || ''

  return {
    worldTimePeriod: detectTimePeriod(sampleText, genre),
    worldLocation: detectLocation(sampleText, genre),
    worldAtmosphere: detectAtmosphere(sampleText, genre, theme),
    worldRules: detectWorldRules(sampleText, genre),
  }
}

function detectTimePeriod(text: string, genre: string): string {
  if (/民国|军阀|北洋|租界/.test(text)) return '近代民国时期'
  if (/星际|宇宙|机甲|赛博|未来|人工智能/.test(text)) return '未来科技时代'
  if (/古代|王朝|皇帝|后宫|朝堂|将军|宗门|修仙|江湖|武林/.test(text)) {
    return '古代架空时代'
  }
  if (/校园|大学|高中|公司|都市|地铁/.test(text)) return '现代都市'

  if (/科幻|星际/.test(genre)) return '未来科技时代'
  if (/仙侠|玄幻|武侠|历史|古言/.test(genre)) return '古代架空时代'
  return '现代都市（可在世界设定页调整）'
}

function detectLocation(text: string, genre: string): string {
  if (/星际|宇宙|舰队|空间站|机甲/.test(text)) return '多星系宇宙与舰队文明'
  if (/宗门|仙门|秘境|灵脉|江湖|武林/.test(text)) return '宗门林立的江湖/仙侠世界'
  if (/王朝|都城|皇宫|边关|朝堂/.test(text)) return '王朝都城与边疆并存的古代世界'
  if (/校园|大学|高中/.test(text)) return '校园与城市生活场景'
  if (/都市|城市|街区|公司|医院/.test(text)) return '现代城市社会'

  if (/悬疑/.test(genre)) return '现代城市与封闭场景并行'
  return '以人物活动区域为核心的现实场景'
}

function detectAtmosphere(text: string, genre: string, theme: string): string {
  if (/悬疑|谜|诡|凶案|惊悚|追查/.test(text)) return '紧张悬疑、危机渐进'
  if (/热血|战斗|对决|复仇|战争/.test(text)) return '高压对抗、节奏强烈'
  if (/治愈|日常|温馨|轻松|搞笑/.test(text)) return '日常细腻、轻松温暖'
  if (/权谋|宫斗|朝堂|家族斗争/.test(text)) return '权谋博弈、暗流涌动'

  if (/言情/.test(genre)) return '情感拉扯、细腻克制'
  if (theme) return `${theme}导向、人物驱动`
  return '人物驱动、冲突递进'
}

function detectWorldRules(text: string, genre: string): string {
  if (
    /修仙|玄幻|灵气|境界|宗门|飞升/.test(text) ||
    /仙侠|玄幻/.test(genre)
  ) {
    return '存在修炼体系与等级秩序，资源与传承决定势力格局。'
  }
  if (
    /星际|机甲|赛博|人工智能|基因/.test(text) ||
    /科幻|星际/.test(genre)
  ) {
    return '科技规则主导社会运行，组织制度与技术能力决定角色行动边界。'
  }
  if (/江湖|门派|武林|侠客/.test(text) || /武侠/.test(genre)) {
    return '江湖门派秩序与恩怨规则并行，强者与名望影响话语权。'
  }
  if (/王朝|皇权|朝堂|礼法/.test(text) || /历史|古言/.test(genre)) {
    return '以礼法与权力秩序为基础，家国与阶层关系深刻影响人物命运。'
  }
  return '以现实逻辑为基础，结合剧情推进逐步补充特殊设定。'
}

/**
 * Validate and extract examples array from AI response
 */
function validateExamples(
  examples: unknown,
  required: boolean = true,
): string[] {
  if (!examples || !Array.isArray(examples)) {
    if (required) {
      throw new Error('examples must be an array')
    }
    return []
  }

  const validated: string[] = []
  for (const example of examples) {
    if (typeof example === 'string' && example.trim().length > 0) {
      validated.push(example.trim().slice(0, 500)) // 限制每个示例最长500字
    }
  }

  if (required && validated.length === 0) {
    throw new Error('examples array cannot be empty')
  }

  return validated
}

/**
 * Normalize and validate writing style analysis from AI
 */
export function normalizeWritingStyleAnalysis(
  data: Record<string, unknown>,
): WritingStyleAnalysis | null {
  try {
    // 验证枚举值
    const proseQuality = String(data.prose_quality || '').trim()
    const validProseQuality = ['descriptive', 'action_oriented', 'balanced']
    if (!validProseQuality.includes(proseQuality)) {
      throw new Error(`Invalid prose_quality: ${proseQuality}`)
    }

    const tone = String(data.tone || '').trim()
    const validTone = ['serious', 'humorous', 'mixed', 'dark', 'light']
    if (!validTone.includes(tone)) {
      throw new Error(`Invalid tone: ${tone}`)
    }

    const pacing = String(data.pacing || '').trim()
    const validPacing = ['fast', 'slow', 'variable', 'tension_building']
    if (!validPacing.includes(pacing)) {
      throw new Error(`Invalid pacing: ${pacing}`)
    }

    const languageLevel = String(data.language_level || '').trim()
    const validLanguageLevel = ['simple', 'complex', 'literary', 'casual']
    if (!validLanguageLevel.includes(languageLevel)) {
      throw new Error(`Invalid language_level: ${languageLevel}`)
    }

    const voice = String(data.voice || '').trim()
    const validVoice = ['poetic', 'direct', 'metaphorical', 'literal']
    if (!validVoice.includes(voice)) {
      throw new Error(`Invalid voice: ${voice}`)
    }

    const sentenceStructure = String(data.sentence_structure || 'varied').trim()
    const dialogueRatio = String(data.dialogue_ratio || 'moderate').trim()
    const descriptionDensity = String(data.description_density || 'moderate').trim()
    const styleSummary = String(data.style_summary || '').trim()

    if (styleSummary.length < 100 || styleSummary.length > 1200) {
      throw new Error(`style_summary length invalid: ${styleSummary.length}`)
    }

    // 验证置信度分数
    const confidenceKeys = [
      'prose_quality_confidence',
      'tone_confidence',
      'pacing_confidence',
      'language_level_confidence',
      'voice_confidence',
    ]

    for (const key of confidenceKeys) {
      const conf = typeof data[key] === 'number' ? data[key] : 0.5
      if (typeof conf !== 'number' || conf < 0 || conf > 1) {
        throw new Error(`Invalid ${key}: ${conf}`)
      }
    }

    // 验证核心维度的examples（必需）
    const proseQualityExamples = validateExamples(data.prose_quality_examples, true)
    const toneExamples = validateExamples(data.tone_examples, true)
    const pacingExamples = validateExamples(data.pacing_examples, true)
    const languageLevelExamples = validateExamples(data.language_level_examples, true)
    const voiceExamples = validateExamples(data.voice_examples, true)

    // 验证辅助维度的examples（可选）
    const sentenceStructureExamples = validateExamples(data.sentence_structure_examples, false)
    const dialogueRatioExamples = validateExamples(data.dialogue_ratio_examples, false)
    const descriptionDensityExamples = validateExamples(data.description_density_examples, false)

    return {
      prose_quality: proseQuality as WritingStyleAnalysis['prose_quality'],
      prose_quality_confidence: Number(data.prose_quality_confidence ?? 0.5),
      prose_quality_examples: proseQualityExamples,

      tone: tone as WritingStyleAnalysis['tone'],
      tone_confidence: Number(data.tone_confidence ?? 0.5),
      tone_examples: toneExamples,

      pacing: pacing as WritingStyleAnalysis['pacing'],
      pacing_confidence: Number(data.pacing_confidence ?? 0.5),
      pacing_examples: pacingExamples,

      language_level: languageLevel as WritingStyleAnalysis['language_level'],
      language_level_confidence: Number(data.language_level_confidence ?? 0.5),
      language_level_examples: languageLevelExamples,

      voice: voice as WritingStyleAnalysis['voice'],
      voice_confidence: Number(data.voice_confidence ?? 0.5),
      voice_examples: voiceExamples,

      sentence_structure: sentenceStructure as WritingStyleAnalysis['sentence_structure'],
      dialogue_ratio: dialogueRatio as WritingStyleAnalysis['dialogue_ratio'],
      description_density: descriptionDensity as WritingStyleAnalysis['description_density'],

      sentence_structure_examples: sentenceStructureExamples.length > 0 ? sentenceStructureExamples : undefined,
      dialogue_ratio_examples: dialogueRatioExamples.length > 0 ? dialogueRatioExamples : undefined,
      description_density_examples: descriptionDensityExamples.length > 0 ? descriptionDensityExamples : undefined,

      style_summary: styleSummary.slice(0, 1200),
    }
  } catch (e) {
    console.warn('[book-import] failed to normalize writing style analysis', e)
    return null
  }
}

