/**
 * Map序列化问题修复测试
 */

import { describe, it, expect } from 'vitest'
import { GlobalContextManager } from '@/lib/book-import/context-manager'

describe('Map Serialization Fix', () => {
  it('should preserve Map functionality after getCurrentContext', () => {
    const contextManager = new GlobalContextManager({
      bookInfo: {
        title: '测试',
        genre: '测试',
        theme: '测试',
        totalChapters: 100,
        narrativePerspective: 'third'
      }
    })

    // 添加一些测试数据到Map中
    const testResult = {
      startChapter: 1,
      endChapter: 5,
      keyEvents: ['测试事件'],
      newCharacters: [],
      characterRelations: [],
      characterActions: [],
      characterDevelopments: new Map([['测试角色', '测试发展']]),
      newPlotThreads: [],
      plotAdvancements: [],
      newLocations: [],
      newOrganizations: [],
      newWorldRules: [],
      worldBuildingAdditions: [],
      inconsistencies: [],
      processedOutlines: []
    }

    // 更新上下文
    contextManager.updateContext(1, testResult)

    // 获取当前上下文
    const currentContext = contextManager.getCurrentContext()

    // 验证Map对象的功能性
    expect(currentContext.plotThreads.threadStates).toBeInstanceOf(Map)
    expect(currentContext.characterKnowledge.characterAppearances).toBeInstanceOf(Map)
    expect(currentContext.characterKnowledge.characterAliases).toBeInstanceOf(Map)

    // 验证Map的get方法正常工作
    const threadStates = currentContext.plotThreads.threadStates
    expect(() => threadStates.get('test')).not.toThrow()

    const characterAppearances = currentContext.characterKnowledge.characterAppearances
    expect(() => characterAppearances.get('test')).not.toThrow()

    const characterAliases = currentContext.characterKnowledge.characterAliases
    expect(() => characterAliases.get('test')).not.toThrow()
  })

  it('should handle empty Maps correctly', () => {
    const contextManager = new GlobalContextManager({
      bookInfo: {
        title: '测试',
        genre: '测试',
        theme: '测试',
        totalChapters: 10,
        narrativePerspective: 'third'
      }
    })

    const currentContext = contextManager.getCurrentContext()

    // 空Map也应该正常工作
    expect(currentContext.plotThreads.threadStates.get('nonexistent')).toBeUndefined()
    expect(currentContext.characterKnowledge.characterAppearances.get('nonexistent')).toBeUndefined()
    expect(currentContext.characterKnowledge.characterAliases.get('nonexistent')).toBeUndefined()
  })

  it('should maintain Map data across multiple context updates', async () => {
    const contextManager = new GlobalContextManager({
      bookInfo: {
        title: '测试',
        genre: '测试',
        theme: '测试',
        totalChapters: 10,
        narrativePerspective: 'third'
      }
    })

    // 第一次更新
    const batch1 = {
      startChapter: 1,
      endChapter: 5,
      keyEvents: ['事件1'],
      newCharacters: [],
      characterRelations: [],
      characterActions: [],
      characterDevelopments: new Map([['角色A', '发展1']]),
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

    // 第二次更新
    const batch2 = {
      startChapter: 6,
      endChapter: 10,
      keyEvents: ['事件2'],
      newCharacters: [],
      characterRelations: [],
      characterActions: [],
      characterDevelopments: new Map([['角色A', '发展2']]),
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

    // 获取当前上下文
    const currentContext = contextManager.getCurrentContext()

    // 验证Map数据完整性
    expect(currentContext.batchHistory).toHaveLength(2)

    // 验证Map方法仍然有效
    const charDev = currentContext.batchHistory[1]?.characterDevelopments
    expect(charDev).toBeInstanceOf(Map)
    expect(charDev?.get('角色A')).toBe('发展2')
  })

  it('should not throw errors when accessing Map methods', () => {
    const contextManager = new GlobalContextManager({
      bookInfo: {
        title: '测试',
        genre: '测试',
        theme: '测试',
        totalChapters: 100,
        narrativePerspective: 'third'
      }
    })

    const currentContext = contextManager.getCurrentContext()

    // 这些调用都不应该抛出错误
    expect(() => {
      currentContext.plotThreads.threadStates.set('test', 'value')
      currentContext.plotThreads.threadStates.get('test')
      currentContext.plotThreads.threadStates.has('test')
      currentContext.plotThreads.threadStates.delete('test')
    }).not.toThrow()

    expect(() => {
      currentContext.characterKnowledge.characterAppearances.set('test', new Set([1, 2, 3]))
      currentContext.characterKnowledge.characterAppearances.get('test')
      currentContext.characterKnowledge.characterAppearances.has('test')
      currentContext.characterKnowledge.characterAppearances.delete('test')
    }).not.toThrow()
  })

  it('should work correctly with prompt building', () => {
    const contextManager = new GlobalContextManager({
      bookInfo: {
        title: '测试小说',
        genre: '玄幻',
        theme: '成长',
        totalChapters: 15,
        narrativePerspective: 'third'
      }
    })

    // 添加一些测试数据
    const testResult = {
      startChapter: 1,
      endChapter: 5,
      keyEvents: ['主角获得宝剑'],
      newCharacters: [],
      characterRelations: [],
      characterActions: [],
      characterDevelopments: new Map([['主角', '首次登场']]),
      newPlotThreads: [
        {
          name: '成长线',
          type: 'growth',
          importance: 'main',
          description: '主角成长之路'
        }
      ],
      plotAdvancements: [
        {
          threadName: '成长线',
          description: '获得宝剑',
          impact: 'high'
        }
      ],
      newLocations: [],
      newOrganizations: [],
      newWorldRules: [],
      worldBuildingAdditions: [],
      inconsistencies: [],
      processedOutlines: []
    }

    // 更新上下文
    contextManager.updateContext(1, testResult)

    // 获取上下文用于提示词构建
    const contextForPrompt = contextManager.getContextForPrompt(1, {
      characters: 3000,
      plotThreads: 2000,
      worldBuilding: 1500,
      previousSummaries: 1000
    })

    // 验证返回的上下文格式正确
    expect(contextForPrompt.characters).toBeDefined()
    expect(contextForPrompt.plotThreads).toBeDefined()
    expect(contextForPrompt.worldBuilding).toBeDefined()
    expect(contextForPrompt.previousSummaries).toBeDefined()
    expect(contextForPrompt.consistencyRules).toBeInstanceOf(Array)

    // 验证没有错误抛出
    expect(() => {
      // 这些是提示词构建器会访问的属性
      const _ = contextForPrompt.characters
      const __ = contextForPrompt.plotThreads
      const ___ = contextForPrompt.worldBuilding
    }).not.toThrow()
  })
})