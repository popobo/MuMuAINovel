/**
 * 上下文感知大纲生成器 - 实现带全局上下文的大纲生成
 */

import { callWithJsonArray } from './ai-helpers'
import { normalizeOutlineCharacterEntries } from './metadata'
import type { BookImportChapter, BookImportOutline, ProjectSuggestion } from './types'
import type { InternalTask } from './task-manager'
import { GlobalContextManager } from './context-manager'

interface GlobalAnalysisData {
  book_summary?: string
  characters?: Array<{
    name: string
    description?: string
    personality?: string
    development?: string
    psychological_change?: string
    capability_change?: string
    introduction?: string
    aliases?: string[]
    importance?: string
    profile?: {
      appearance?: string
      personality?: string
    }
  }>
  main_plot_threads?: Array<{
    name: string
    description: string
    importance: string
  }>
  sub_plot_threads?: Array<{
    name: string
    description: string
  }>
  world_building?: {
    time_period?: string
    locations?: string[]
    organizations?: string[]
    events?: string[]
  }
  narrative_style?: {
    pace?: string
    perspective?: string
    tone?: string
  }
}

interface CharacterData {
  name: string
  aliases?: string[]
  importance?: string
  introduction?: string
  profile?: {
    appearance?: string
    personality?: string
  }
}

interface PlotThreadData {
  name: string
  description: string
  importance?: string
  type?: string
}
import { EnhancedPromptBuilder } from './enhanced-prompt-builder'
import type { BatchProcessingResult } from './context-manager'

/**
 * 上下文感知大纲生成器
 */
export class ContextAwareOutlineGenerator {
  private contextManager: GlobalContextManager
  private promptBuilder: EnhancedPromptBuilder
  private userId: string
  private task: InternalTask | null

  constructor(userId: string, task?: InternalTask) {
    // 初始化时先创建空的上下文管理器
    this.contextManager = new GlobalContextManager({})
    this.promptBuilder = new EnhancedPromptBuilder()
    this.userId = userId
    this.task = task || null
  }

  /**
   * 生成带上下文的大纲
   */
  async generateOutlinesWithContext(
    chapters: BookImportChapter[],
    suggestion: ProjectSuggestion
  ): Promise<{ outlines: BookImportOutline[]; failedChapterErrors: Record<number, string> }> {

    // 阶段1：全局分析
    if (this.task) {
      this.task.progress = 90
      this.task.message = '正在进行全书全局分析...'
    }
    console.info('[context-aware] Starting global analysis...')

    try {
      await this.performGlobalAnalysis(chapters, suggestion)
    } catch (e) {
      console.warn('[context-aware] Global analysis failed, proceeding without it', e)
      // 继续处理，只是没有全局上下文
    }

    // 阶段2：渐进式批次处理
    if (this.task) {
      this.task.progress = 92
      this.task.message = '开始基于全局上下文生成大纲...'
    }
    console.info('[context-aware] Starting context-aware outline generation...')

    const batchSize = 5
    const totalBatches = Math.ceil(chapters.length / batchSize)
    const failedChapterErrors: Record<number, string> = {}

    // 临时存储所有批次的结果
    const allBatchResults: Array<{ chapters: BookImportChapter[]; outlines: BookImportOutline[]; batchNumber: number }> = []

    for (let batchIdx = 0, start = 0; start < chapters.length; batchIdx++, start += batchSize) {
      const batch = chapters.slice(start, start + batchSize)
      if (batch.length === 0) break

      const startChapter = batch[0]!.chapter_number
      const endChapter = batch[batch.length - 1]!.chapter_number
      const batchNumber = batchIdx + 1

      if (this.task) {
        this.task.progress = 94 + Math.floor((4 * batchIdx) / totalBatches)
        this.task.message = `生成批次 ${batchNumber}/${totalBatches}（第${startChapter}-${endChapter}章），包含全局上下文...`
      }
      console.info(`[context-aware] Processing batch ${batchNumber}/${totalBatches} (chapters ${startChapter}-${endChapter})`)

      try {
        // 构建增强提示词
        const enhancedPrompt = this.promptBuilder.buildContextAwareOutlinePrompt(
          this.contextManager.getCurrentContext(),
          batch,
          batchNumber,
          totalBatches
        )

        // 调用AI
        const aiData = await callWithJsonArray(this.userId, enhancedPrompt)
        const batchResult = await this.processBatchWithValidation(aiData, batch)

        // 更新上下文管理器
        await this.contextManager.updateContext(batchNumber, batchResult)

        // 保存结果
        if (batchResult.processedOutlines) {
          const outlines: BookImportOutline[] = batchResult.processedOutlines.map(po => ({
            title: po.title,
            content: po.detailed_outline,
            order_index: po.chapter_number,
            structure: {
              scenes: po.scenes,
              characters: po.characters,
              // ... other properties
            }
          }))
          allBatchResults.push({
            chapters: batch,
            outlines,
            batchNumber
          })
        }

      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`[context-aware] Batch ${batchNumber} failed:`, msg)

        // 使用规则大纲作为降级方案
        const fallbackOutlines = this.createFallbackOutlines(batch)
        allBatchResults.push({
          chapters: batch,
          outlines: fallbackOutlines,
          batchNumber
        })

        // 标记失败
        for (const chapter of batch) {
          failedChapterErrors[chapter.chapter_number] = `AI生成失败，使用规则大纲：${msg.slice(0, 200)}`
        }
      }
    }

    // 生成最终大纲
    const outlines = this.synthesizeFinalOutlines(allBatchResults)

    if (this.task) {
      this.task.progress = 99
      this.task.message = '大纲生成完成，正在整理...'
    }
    console.info('[context-aware] Outline generation completed')

    return { outlines, failedChapterErrors }
  }

  /**
   * 执行全局分析
   */
  private async performGlobalAnalysis(
    chapters: BookImportChapter[],
    suggestion: ProjectSuggestion
  ): Promise<void> {

    // 智能采样：选择代表性章节
    const sampleChapters = this.selectRepresentativeChapters(chapters, 9)

    if (this.task) {
      this.task.message = `正在分析全书（采样${sampleChapters.length}个章节）...`
    }
    console.info(`[context-aware] Analyzing ${sampleChapters.length} sample chapters from ${chapters.length} total`)

    const analysisPrompt = this.promptBuilder.buildGlobalAnalysisPrompt(
      suggestion,
      sampleChapters,
      chapters.length
    )

    try {
      const analysisData = await callWithJsonArray(this.userId, analysisPrompt)

      // 解析分析结果并初始化上下文
      await this.initializeContextFromAnalysis(analysisData, suggestion, chapters.length)

      console.info('[context-aware] Global analysis completed successfully')

    } catch (e) {
      console.warn('[context-aware] Global analysis AI call failed', e)
      // 使用基础上下文
      this.initializeBasicContext(suggestion, chapters)
    }
  }

  /**
   * 选择代表性章节进行采样
   */
  private selectRepresentativeChapters(
    chapters: BookImportChapter[],
    sampleSize: number
  ): BookImportChapter[] {

    if (chapters.length <= sampleSize) return chapters

    const result: BookImportChapter[] = []

    // 策略：前3章 + 中间均匀采样 + 最后3章
    result.push(...chapters.slice(0, 3)) // 前3章

    if (chapters.length > 10) {
      // 中间均匀采样
      const middleStart = 3
      const middleEnd = chapters.length - 3
      const middleSampleSize = Math.min(sampleSize - 6, middleEnd - middleStart)
      const interval = Math.floor((middleEnd - middleStart) / middleSampleSize)

      for (let i = 0; i < middleSampleSize; i++) {
        const index = Math.min(middleStart + i * interval, middleEnd - 1)
        result.push(chapters[index]!)
      }
    }

    // 最后3章（如果有的话）
    if (chapters.length > 6) {
      result.push(...chapters.slice(-3))
    }

    return result.slice(0, sampleSize)
  }

  /**
   * 从分析结果初始化上下文
   */
  private async initializeContextFromAnalysis(
    analysisData: unknown,
    suggestion: ProjectSuggestion,
    totalChapters: number
  ): Promise<void> {

    const data = (Array.isArray(analysisData) ? analysisData[0] : analysisData) as Record<string, unknown>
    const bookSummary = String(data.book_summary || '').slice(0, 2000)
    const characters = Array.isArray(data.characters) ? data.characters : []
    const plotThreads = Array.isArray(data.plot_threads) ? data.plot_threads : []
    const worldElements = (data.world_elements || {}) as Record<string, unknown>

    // 创建新的上下文管理器
    this.contextManager = new GlobalContextManager({
      bookInfo: {
        title: suggestion.title || '拆书导入项目',
        genre: suggestion.genre || '通用',
        theme: suggestion.theme || '未设定',
        totalChapters,
        narrativePerspective: suggestion.narrative_perspective || '第三人称'
      },
      bookSummary: {
        initial: bookSummary,
        cumulative: [],
        current: bookSummary
      },
      characterKnowledge: {
        mainCharacters: characters.map((char: CharacterData) => ({
          id: `char_${char.name}_${Date.now()}`,
          name: char.name,
          aliases: char.aliases || [],
          firstAppearance: 1,
          importance: (char.importance || 'secondary') as 'main' | 'secondary' | 'minor',
          profile: {
            appearance: char.profile?.appearance || '',
            personality: char.profile?.personality || '',
            background: char.introduction || '',
            goals: (char.profile as { goals?: string[] })?.goals || []
          },
          development: [],
          currentStatus: '活跃'
        })),
        characterRelationships: [],
        characterAppearances: new Map(),
        characterAliases: new Map()
      },
      plotThreads: {
        mainThreads: plotThreads.map((thread: PlotThreadData) => ({
          id: `thread_${thread.name}_${Date.now()}`,
          name: thread.name,
          type: (thread.type || 'other') as 'revenge' | 'growth' | 'romance' | 'mystery' | 'conflict' | 'journey' | 'other',
          importance: (thread.importance || 'secondary') as 'main' | 'secondary',
          description: thread.description,
          startDate: 1,
          status: 'active' as const,
          keyMilestones: []
        })),
        threadStates: new Map(
          plotThreads.map((t: PlotThreadData) => [t.name, '刚开始'])
        ),
        threadProgress: []
      },
      worldBuilding: {
        locations: ((worldElements.locations as string[]) || []).map((loc: string) => ({
          name: loc,
          description: '',
          type: '未知',
          firstAppearance: 1,
          appearances: [1],
          importance: 50
        })),
        organizations: ((worldElements.organizations as string[]) || []).map((org: string) => ({
          name: org,
          description: '',
          type: '未知',
          firstAppearance: 1,
          appearances: [1],
          importance: 50
        })),
        worldRules: (worldElements.rules as string[]) || [],
        powerSystems: (worldElements.power_systems as string[]) || [],
        timeline: []
      },
      batchHistory: [],
      consistencyRules: {
        characterBehaviorRules: [],
        worldRuleConstraints: [],
        plotLogicalConstraints: []
      }
    })
  }

  /**
   * 初始化基础上下文（当AI分析失败时）
   */
  private initializeBasicContext(suggestion: ProjectSuggestion, chapters: BookImportChapter[]): void {
    this.contextManager = new GlobalContextManager({
      bookInfo: {
        title: suggestion.title || '拆书导入项目',
        genre: suggestion.genre || '通用',
        theme: suggestion.theme || '未设定',
        totalChapters: chapters.length,
        narrativePerspective: suggestion.narrative_perspective || '第三人称'
      },
      bookSummary: {
        initial: `《${suggestion.title}》共${chapters.length}章，是一部${suggestion.genre || '小说'}作品。`,
        cumulative: [],
        current: `《${suggestion.title}》共${chapters.length}章，是一部${suggestion.genre || '小说'}作品。`
      },
      characterKnowledge: {
        mainCharacters: [],
        characterRelationships: [],
        characterAppearances: new Map(),
        characterAliases: new Map()
      },
      plotThreads: {
        mainThreads: [],
        threadStates: new Map(),
        threadProgress: []
      },
      worldBuilding: {
        locations: [],
        organizations: [],
        worldRules: [],
        powerSystems: [],
        timeline: []
      },
      batchHistory: [],
      consistencyRules: {
        characterBehaviorRules: [],
        worldRuleConstraints: [],
        plotLogicalConstraints: []
      }
    })
  }

  /**
   * 处理批次并验证结果
   */
  private async processBatchWithValidation(
    aiData: unknown,
    batch: BookImportChapter[]
  ): Promise<BatchProcessingResult> {

    const aiItems = Array.isArray(aiData) ? aiData : []
    const result: BatchProcessingResult = {
      startChapter: batch[0]!.chapter_number,
      endChapter: batch[batch.length - 1]!.chapter_number,
      keyEvents: [],
      newCharacters: [],
      characterRelations: [],
      characterActions: [],
      characterDevelopments: new Map(),
      newPlotThreads: [],
      plotAdvancements: [],
      newLocations: [],
      newOrganizations: [],
      newWorldRules: [],
      worldBuildingAdditions: [],
      inconsistencies: [],
      processedOutlines: []
    }

    // 确保processedOutlines被初始化
    result.processedOutlines = []

    // 处理每个章节的结果
    for (let i = 0; i < Math.min(batch.length, aiItems.length); i++) {
      const chapter = batch[i]!
      const aiItem = aiItems[i]

      if (aiItem && typeof aiItem === 'object') {
        // 提取大纲信息
        const outline = {
          chapter_number: chapter.chapter_number,
          title: aiItem.title || chapter.title,
          detailed_outline: aiItem.detailed_outline || '',
          scenes: aiItem.scenes || [],
          characters: aiItem.characters || [],
          key_points: aiItem.key_points || [],
          emotion: aiItem.emotion || '',
          goal: aiItem.goal || '',
          plot_advancement: aiItem.plot_advancement || {},
          world_building: aiItem.world_building || {}
        }

        result.processedOutlines.push(outline)

        // 提取关键事件
        if (aiItem.plot_advancement?.key_events) {
          result.keyEvents.push(...aiItem.plot_advancement.key_events)
        }

        // 提取角色信息
        if (aiItem.characters) {
          for (const char of aiItem.characters) {
            if (char.new) {
              result.newCharacters.push({
                name: char.name,
                aliases: [],
                profile: char.profile || {},
                introduction: char.introduction || '',
                currentStatus: char.currentStatus || '活跃'
              })
            } else {
              const existingDev = result.characterDevelopments.get(char.name) || ''
              result.characterDevelopments.set(char.name, existingDev + (char.development || '') + ' ')
            }
          }
        }

        // 提取剧情推进
        if (aiItem.plot_advancement?.threads_advanced) {
          for (const thread of aiItem.plot_advancement.threads_advanced) {
            result.plotAdvancements.push({
              threadName: thread,
              description: `在第${chapter.chapter_number}章得到推进`,
              impact: 'medium'
            })
          }
        }

        // 提取新剧情线
        if (aiItem.plot_advancement?.new_threads) {
          for (const thread of aiItem.plot_advancement.new_threads) {
            result.newPlotThreads.push({
              name: thread,
              type: 'other',
              importance: 'secondary',
              description: `在第${chapter.chapter_number}章开始的新剧情线`
            })
          }
        }

        // 提取世界观元素
        if (aiItem.world_building) {
          const wb = aiItem.world_building
          if (wb.new_locations) {
            result.newLocations.push(...wb.new_locations.map((loc: string) => ({
              name: loc,
              description: '',
              type: '未知'
            })))
          }
          if (wb.new_organizations) {
            result.newOrganizations.push(...wb.new_organizations.map((org: string) => ({
              name: org,
              description: '',
              type: '未知'
            })))
          }
          if (wb.new_rules) {
            result.newWorldRules.push(...wb.new_rules)
          }
        }
      }
    }

    return result
  }

  /**
   * 创建降级大纲（当AI生成失败时）
   */
  private createFallbackOutlines(batch: BookImportChapter[]): BookImportOutline[] {
    return batch.map(chapter => ({
      title: chapter.title,
      content: this.generateBasicOutline(chapter),
      order_index: chapter.chapter_number,
      structure: {
        chapter_number: chapter.chapter_number,
        scenes: [],
        characters: [],
        key_points: [],
        emotion: '',
        goal: '',
        plot_advancement: {},
        world_building: {}
      }
    }))
  }

  /**
   * 生成基础大纲
   */
  private generateBasicOutline(chapter: BookImportChapter): string {
    const content = chapter.content || ''
    const firstPart = content.slice(0, 200)
    const lastPart = content.slice(-200)

    return `本章主要内容：${firstPart}...\n\n发展：...\n\n结果：...${lastPart}`
  }

  /**
   * 合成最终大纲
   */
  private synthesizeFinalOutlines(
    batchResults: Array<{ chapters: BookImportChapter[]; outlines: BookImportOutline[]; batchNumber: number }>
  ): BookImportOutline[] {

    return batchResults.flatMap(result => result.outlines)
  }
}