/**
 * 上下文感知大纲生成器测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { GlobalContextManager } from '@/lib/book-import/context-manager'
import { EnhancedPromptBuilder } from '@/lib/book-import/enhanced-prompt-builder'
import type { BookImportChapter } from '@/lib/book-import/types'

describe('GlobalContextManager', () => {
  let contextManager: GlobalContextManager

  beforeEach(() => {
    contextManager = new GlobalContextManager({
      bookInfo: {
        title: '测试小说',
        genre: '玄幻',
        theme: '成长',
        totalChapters: 100,
        narrativePerspective: '第三人称'
      }
    })
  })

  it('should initialize with basic context', () => {
    const context = contextManager.getCurrentContext()

    expect(context.bookInfo.title).toBe('测试小说')
    expect(context.bookInfo.totalChapters).toBe(100)
    expect(context.characterKnowledge.mainCharacters).toHaveLength(0)
  })

  it('should update context with batch results', async () => {
    const batchResult = {
      startChapter: 1,
      endChapter: 5,
      keyEvents: ['主角获得神秘宝剑', '初次战斗'],
      newCharacters: [
        {
          name: '张三',
          aliases: ['小张'],
          profile: {
            appearance: '英俊',
            personality: '勇敢',
            background: '孤儿',
            goals: ['成为强者']
          },
          introduction: '主角',
          currentStatus: '活跃'
        }
      ],
      characterRelations: [],
      characterActions: [],
      characterDevelopments: new Map([['张三', '首次登场，获得宝剑']]),
      newPlotThreads: [
        {
          name: '成长线',
          type: 'growth',
          importance: 'main',
          description: '主角从弱变强'
        }
      ],
      plotAdvancements: [
        {
          threadName: '成长线',
          description: '获得宝剑',
          impact: 'high'
        }
      ],
      newLocations: [
        {
          name: '青云镇',
          description: '主角出生地'
        }
      ],
      newOrganizations: [],
      newWorldRules: ['修炼等级：炼体、筑基'],
      worldBuildingAdditions: [],
      inconsistencies: [],
      processedOutlines: []
    }

    await contextManager.updateContext(1, batchResult)

    const context = contextManager.getCurrentContext()

    // 验证角色添加
    expect(context.characterKnowledge.mainCharacters).toHaveLength(1)
    expect(context.characterKnowledge.mainCharacters[0]?.name).toBe('张三')

    // 验证剧情线添加
    expect(context.plotThreads.mainThreads).toHaveLength(1)
    expect(context.plotThreads.mainThreads[0]?.name).toBe('成长线')

    // 验证地点添加
    expect(context.worldBuilding.locations).toHaveLength(1)
    expect(context.worldBuilding.locations[0]?.name).toBe('青云镇')

    // 验证世界规则添加
    expect(context.worldBuilding.worldRules).toContain('修炼等级：炼体、筑基')
  })

  it('should generate context for prompt correctly', () => {
    const contextForPrompt = contextManager.getContextForPrompt(1, {
      characters: 3000,
      plotThreads: 2000,
      worldBuilding: 1500,
      previousSummaries: 1000
    })

    expect(contextForPrompt.coreInfo).toContain('测试小说')
    expect(contextForPrompt.characters).toBeDefined()
    expect(contextForPrompt.plotThreads).toBeDefined()
  })

  it('should maintain character consistency across batches', async () => {
    // 第一批：引入角色
    const batch1 = {
      startChapter: 1,
      endChapter: 5,
      keyEvents: ['张三出场'],
      newCharacters: [
        {
          name: '张三',
          aliases: [],
          profile: {
            appearance: '年轻',
            personality: '温和',
            background: '平民',
            goals: []
          },
          introduction: '主角',
          currentStatus: '活跃'
        }
      ],
      characterRelations: [],
      characterActions: [],
      characterDevelopments: new Map([['张三', '初次登场']]),
      newPlotThreads: [],
      plotAdvancements: [],
      newLocations: [],
      newOrganizations: [],
      newWorldRules: [],
      worldBuildingAdditions: [],
      inconsistencies: [],
      processedOutlines: []
    }

    await contextManager.updateContext(1, batch1)

    // 第二批：角色发展
    const batch2 = {
      startChapter: 6,
      endChapter: 10,
      keyEvents: ['张三战斗'],
      newCharacters: [],
      characterRelations: [],
      characterActions: [],
      characterDevelopments: new Map([['张三', '首次战斗，展现勇气']]),
      newPlotThreads: [],
      plotAdvancements: [],
      newLocations: [],
      newOrganizations: [],
      newWorldRules: [],
      worldBuildingAdditions: [],
      inconsistencies: [],
      processedOutlines: []
    }

    await contextManager.updateContext(2, batch2)

    const context = contextManager.getCurrentContext()
    const zhangSan = context.characterKnowledge.mainCharacters.find(c => c.name === '张三')

    expect(zhangSan).toBeDefined()
    expect(zhangSan?.development).toHaveLength(2) // 两次发展记录
    expect(zhangSan?.development[0]?.development).toContain('初次登场')
    expect(zhangSan?.development[1]?.development).toContain('首次战斗')
  })
})

describe('EnhancedPromptBuilder', () => {
  let promptBuilder: EnhancedPromptBuilder
  let mockContext: any
  let mockChapters: BookImportChapter[]

  beforeEach(() => {
    promptBuilder = new EnhancedPromptBuilder()

    mockContext = {
      bookInfo: {
        title: '测试小说',
        genre: '玄幻',
        theme: '成长',
        totalChapters: 100,
        narrativePerspective: '第三人称'
      },
      bookSummary: {
        initial: '这是一部玄幻小说',
        cumulative: [],
        current: '这是一部玄幻小说'
      },
      characterKnowledge: {
        mainCharacters: [
          {
            id: 'char_1',
            name: '张三',
            aliases: ['小张'],
            firstAppearance: 1,
            importance: 'main',
            profile: {
              appearance: '英俊',
              personality: '勇敢',
              background: '孤儿',
              goals: ['变强']
            },
            development: [
              {
                chapterNumber: 1,
                development: '首次登场',
                psychologicalChange: '初始',
                capabilityChange: '初始'
              }
            ],
            currentStatus: '活跃'
          }
        ],
        characterRelationships: [],
        characterAppearances: new Map([['张三', new Set([1, 2, 3])]]),
        characterAliases: new Map([['小张', ['张三']])
      },
      plotThreads: {
        mainThreads: [
          {
            id: 'thread_1',
            name: '成长线',
            type: 'growth',
            importance: 'main',
            description: '主角成长之路',
            startDate: 1,
            status: 'active',
            keyMilestones: []
          }
        ],
        threadStates: new Map([['成长线', '刚开始']]),
        threadProgress: []
      },
      worldBuilding: {
        locations: [
          {
            name: '青云镇',
            description: '主角出生地',
            type: '城镇',
            firstAppearance: 1,
            appearances: [1],
            importance: 50
          }
        ],
        organizations: [],
        worldRules: ['修炼等级制度'],
        powerSystems: [],
        timeline: []
      },
      batchHistory: [],
      consistencyRules: {
        characterBehaviorRules: [],
        worldRuleConstraints: [],
        plotLogicalConstraints: []
      }
    }

    mockChapters = [
      {
        title: '第一章',
        content: '这是第一章的内容...',
        summary: '第一章摘要',
        chapter_number: 1,
        outline_title: '第一章'
      },
      {
        title: '第二章',
        content: '这是第二章的内容...',
        summary: '第二章摘要',
        chapter_number: 2,
        outline_title: '第二章'
      }
    ]
  })

  it('should build context-aware outline prompt', () => {
    const prompt = promptBuilder.buildContextAwareOutlinePrompt(
      mockContext,
      mockChapters,
      1,
      20
    )

    // 验证提示词包含关键部分
    expect(prompt).toContain('测试小说')
    expect(prompt).toContain('张三')
    expect(prompt).toContain('成长线')
    expect(prompt).toContain('青云镇')
    expect(prompt).toContain('第一章')
    expect(prompt).toContain('第二章')
  })

  it('should include previous summaries for later batches', () => {
    // 添加批次历史
    mockContext.batchHistory = [
      {
        batchNumber: 1,
        chapterRange: [1, 5],
        summary: '前五章发展',
        keyEvents: ['事件1', '事件2'],
        newCharacters: ['角色A'],
        characterDevelopments: new Map([['角色A', '发展1']]),
        plotAdvancements: ['剧情1'],
        worldBuildingAdditions: ['设定1'],
        qualityScore: 80
      }
    ]

    const prompt = promptBuilder.buildContextAwareOutlinePrompt(
      mockContext,
      mockChapters,
      2,
      20
    )

    // 第二批应该包含前序摘要
    expect(prompt).toContain('前序章节发展')
    expect(prompt).toContain('前五章发展')
  })

  it('should build global analysis prompt', () => {
    const prompt = promptBuilder.buildGlobalAnalysisPrompt(
      {
        title: '测试小说',
        genre: '玄幻',
        theme: '成长'
      },
      mockChapters,
      100
    )

    expect(prompt).toContain('测试小说')
    expect(prompt).toContain('100')
    expect(prompt).toContain('章节样本')
    expect(prompt).toContain('book_summary')
    expect(prompt).toContain('characters')
    expect(prompt).toContain('plot_threads')
  })
})

describe('Context Awareness Integration', () => {
  it('should maintain consistency across multiple batches', async () => {
    const contextManager = new GlobalContextManager({
      bookInfo: {
        title: '一致性测试',
        genre: '测试',
        theme: '测试',
        totalChapters: 15,
        narrativePerspective: '第三人称'
      }
    })

    // 模拟3个批次
    const batches = [
      {
        number: 1,
        chapters: '1-5',
        newChar: '主角',
        events: ['开局']
      },
      {
        number: 2,
        chapters: '6-10',
        newChar: '', // 无新角色
        events: ['发展']
      },
      {
        number: 3,
        chapters: '11-15',
        newChar: '', // 无新角色
        events: ['高潮']
      }
    ]

    for (const batch of batches) {
      const batchResult = {
        startChapter: (batch.number - 1) * 5 + 1,
        endChapter: batch.number * 5,
        keyEvents: [batch.events],
        newCharacters: batch.newChar ? [
          {
            name: batch.newChar,
            aliases: [],
            profile: {
              appearance: '测试',
              personality: '测试',
              background: '测试',
              goals: []
            },
            introduction: '测试角色',
            currentStatus: '活跃'
          }
        ] : [],
        characterRelations: [],
        characterActions: [],
        characterDevelopments: new Map(batch.newChar ? [[batch.newChar, '首次登场']] : []),
        newPlotThreads: [],
        plotAdvancements: [],
        newLocations: [],
        newOrganizations: [],
        newWorldRules: [],
        worldBuildingAdditions: [],
        inconsistencies: [],
        processedOutlines: []
      }

      await contextManager.updateContext(batch.number, batchResult)
    }

    const context = contextManager.getCurrentContext()

    // 验证只添加了一个角色（主角）
    expect(context.characterKnowledge.mainCharacters).toHaveLength(1)

    // 验证批次历史记录
    expect(context.batchHistory).toHaveLength(3)

    // 验证角色发展记录
    const mainChar = context.characterKnowledge.mainCharacters[0]
    expect(mainChar?.development).toHaveLength(1) // 只有第一次添加时记录
  })
})