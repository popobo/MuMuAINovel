# 渐进式上下文累积方案 - 详细技术方案

## 🎯 设计理念

### 核心思想
将"全局分析"与"批次处理"结合，通过**上下文累积**的方式，让每个批次都能感知到前面批次的重要信息，就像人类阅读小说一样，边读边理解，逐步加深对整本书的认识。

### 类比说明
```
人类阅读方式：
第1章 → 理解基础设定
第2章 → 基于第1章的理解，继续深化
第3章 → 基于前2章的理解，识别新的发展
...

当前系统问题：
第1-5章 → 孤立理解，然后遗忘
第6-10章 → 重新开始，没有前面的记忆
第11-15章 → 又重新开始...

方案一改进：
第1-5章 → 建立基础认知，记录关键信息
第6-10章 → 基于前面的认知继续理解，更新认知
第11-15章 → 在累积认知基础上理解...
```

## 🏗️ 架构设计

### 系统架构图

```mermaid
flowchart TD
    Start[输入：全书100章] --> PreProcess[预处理阶段]

    PreProcess --> GlobalAnalysis[全局分析模块]
    GlobalAnalysis --> SampleStrat[智能采样策略]
    SampleStrat --> AIAnalyze[AI深度分析]
    AIAnalyze --> ContextInit[初始化全局上下文]

    ContextInit --> BatchLoop[批次处理循环]

    BatchLoop --> Batch1[第1批: 1-5章]
    Batch1 --> BuildPrompt1[构建增强提示词]
    BuildPrompt1 --> IncludeGlobal[包含全局上下文]
    IncludeGlobal --> CallAI1[调用AI生成]
    CallAI1 --> Validate1[验证与提取]
    Validate1 --> UpdateContext1[更新上下文]
    UpdateContext1 --> Batch2[第2批: 6-10章]

    Batch2 --> BuildPrompt2[构建增强提示词]
    BuildPrompt2 --> IncludeGlobal2[包含全局上下文]
    IncludeGlobal2 --> IncludeHistory[包含前批摘要]
    IncludeHistory --> CallAI2[调用AI生成]
    CallAI2 --> Validate2[验证与提取]
    Validate2 --> UpdateContext2[更新上下文]
    UpdateContext2 --> Batch3[第3批: 11-15章]

    Batch3 --> BuildPrompt3[构建增强提示词]
    BuildPrompt3 --> IncludeGlobal3[包含全局上下文]
    IncludeGlobal3 --> IncludeHistory3[包含前批摘要]
    IncludeHistory3 --> CallAI3[调用AI生成]
    CallAI3 --> FinalSynthesize[最终合成]

    style GlobalAnalysis fill:#c8e6c9
    style ContextInit fill:#c8e6c9
    style UpdateContext1 fill:#fff9c4
    style UpdateContext2 fill:#fff9c4
    style IncludeHistory fill:#ffe1b4
```

### 数据流图

```mermaid
sequenceDiagram
    participant Input as 输入数据
    participant Global as 全局分析器
    participant Context as 上下文管理器
    participant Batch as 批次处理器
    participant AI as AI服务
    participant Output as 输出合成器

    Input->>Global: 全书章节
    Global->>AI: 全局分析请求
    AI-->>Global: 全局摘要+角色+剧情
    Global->>Context: 初始化上下文

    loop 每个批次
        Context->>Batch: 当前上下文
        Input->>Batch: 当前批次章节
        Batch->>Batch: 构建增强提示词
        Batch->>AI: 生成请求(带上下文)
        AI-->>Batch: 生成结果
        Batch->>Context: 更新上下文
        Context-->>Context: 累积新信息
    end

    Context->>Output: 完整上下文
    Output->>Output: 合成最终大纲
```

## 🔧 核心组件详解

### 1. 全局上下文管理器

```typescript
/**
 * 全局上下文数据结构
 */
interface GlobalBookContext {
  // 书籍基本信息
  bookInfo: {
    title: string
    genre: string
    theme: string
    totalChapters: number
    narrativePerspective: string
  }

  // 全书摘要（动态更新）
  bookSummary: {
    initial: string           // 初始摘要（来自全局分析）
    cumulative: string[]      // 累积摘要（每批完成后添加）
    current: string           // 当前完整摘要
  }

  // 角色知识图谱
  characterKnowledge: {
    mainCharacters: CharacterProfile[]
    characterRelationships: CharacterRelation[]
    characterAppearances: Map<string, Set<number>>  // 角色出现章节
    characterAliases: Map<string, string[]>          // 角色别名映射
  }

  // 剧情线追踪
  plotThreads: {
    mainThreads: PlotThread[]           // 主要剧情线
    threadStates: Map<string, string>   // 各剧情线当前状态
    threadProgress: PlotProgress[]      // 剧情进展记录
  }

  // 世界观设定
  worldBuilding: {
    locations: LocationProfile[]
    organizations: OrganizationProfile[]
    worldRules: string[]
    powerSystems: string[]
    timeline: TimelineEvent[]
  }

  // 批次处理历史
  batchHistory: BatchRecord[]

  // 一致性检查规则
  consistencyRules: {
    characterBehaviorRules: string[]
    worldRuleConstraints: string[]
    plotLogicalConstraints: string[]
  }
}

interface CharacterProfile {
  id: string
  name: string
  aliases: string[]
  firstAppearance: number
  importance: 'main' | 'secondary' | 'minor'
  profile: {
    appearance: string
    personality: string
    background: string
    goals: string[]
  }
  development: CharacterDevelopment[]
  currentStatus: string
}

interface CharacterDevelopment {
  chapterNumber: number
  development: string
  psychologicalChange: string
  capabilityChange: string
}

interface PlotThread {
  id: string
  name: string
  type: 'revenge' | 'growth' | 'romance' | 'mystery' | 'conflict' | 'journey'
  importance: 'main' | 'secondary'
  description: string
  startDate: number  // 开始章节
  status: 'active' | 'paused' | 'completed'
  keyMilestones: PlotMilestone[]
}

interface PlotMilestone {
  chapterNumber: number
  description: string
  impact: 'high' | 'medium' | 'low'
}

interface BatchRecord {
  batchNumber: number
  chapterRange: [number, number]
  summary: string
  keyEvents: string[]
  newCharacters: string[]
  characterDevelopments: Map<string, string>
  plotAdvancements: string[]
  worldBuildingAdditions: string[]
  qualityScore: number
}

/**
 * 上下文管理器实现
 */
class GlobalContextManager {
  private context: GlobalBookContext
  private readonly maxHistoryLength = 5  // 保留最近5批的历史

  constructor(initialContext: Partial<GlobalBookContext>) {
    this.context = this.initializeContext(initialContext)
  }

  /**
   * 更新上下文 - 每批处理后调用
   */
  async updateContext(
    batchNumber: number,
    batchResult: BatchProcessingResult
  ): Promise<void> {

    // 1. 记录批次历史
    this.addBatchRecord(batchNumber, batchResult)

    // 2. 更新角色信息
    await this.updateCharacterKnowledge(batchResult)

    // 3. 更新剧情线
    await this.updatePlotThreads(batchResult)

    // 4. 更新世界观
    await this.updateWorldBuilding(batchResult)

    // 5. 更新全书摘要
    await this.updateBookSummary(batchResult)

    // 6. 检查一致性
    this.checkConsistency(batchResult)

    // 7. 清理过时信息
    this.cleanupOldInformation()
  }

  /**
   * 获取用于AI提示词的上下文
   */
  getContextForPrompt(
    batchNumber: number,
    budgetConstraints: TokenBudget
  ): ContextForPrompt {

    return {
      // 核心信息（始终包含）
      coreInfo: this.getCoreBookInfo(),

      // 角色信息（根据预算调整详细程度）
      characters: this.getCharacterInfo(budgetConstraints.characters),

      // 剧情线（根据预算调整）
      plotThreads: this.getPlotThreadInfo(budgetConstraints.plotThreads),

      // 世界观（根据预算调整）
      worldBuilding: this.getWorldBuildingInfo(budgetConstraints.worldBuilding),

      // 前序摘要（根据批次位置调整）
      previousSummaries: this.getPreviousSummaries(
        batchNumber,
        budgetConstraints.previousSummaries
      ),

      // 一致性提醒
      consistencyRules: this.getConsistencyRules(batchNumber)
    }
  }

  /**
   * 添加批次记录
   */
  private addBatchRecord(
    batchNumber: number,
    result: BatchProcessingResult
  ): void {

    const record: BatchRecord = {
      batchNumber,
      chapterRange: [result.startChapter, result.endChapter],
      summary: this.generateBatchSummary(result),
      keyEvents: result.keyEvents,
      newCharacters: result.newCharacters,
      characterDevelopments: this.extractCharacterDevelopments(result),
      plotAdvancements: result.plotAdvancements,
      worldBuildingAdditions: result.worldBuildingAdditions,
      qualityScore: this.calculateBatchQuality(result)
    }

    this.context.batchHistory.push(record)

    // 限制历史长度
    if (this.context.batchHistory.length > this.maxHistoryLength) {
      this.context.batchHistory.shift()
    }
  }

  /**
   * 更新角色知识
   */
  private async updateCharacterKnowledge(
    result: BatchProcessingResult
  ): Promise<void> {

    // 处理新出现的角色
    for (const newChar of result.newCharacters) {
      const existingChar = this.findCharacter(newChar.name)

      if (!existingChar) {
        // 新角色，添加到知识库
        this.context.characterKnowledge.mainCharacters.push({
          id: this.generateCharacterId(newChar.name),
          name: newChar.name,
          aliases: newChar.aliases || [],
          firstAppearance: result.startChapter,
          importance: this.assessCharacterImportance(newChar),
          profile: newChar.profile,
          development: [{
            chapterNumber: result.startChapter,
            development: `首次登场：${newChar.introduction}`,
            psychologicalChange: '初始状态',
            capabilityChange: '初始能力'
          }],
          currentStatus: newChar.initialStatus || '活跃'
        })

        // 记录出现章节
        this.context.characterKnowledge.characterAppearances.set(
          newChar.name,
          new Set([result.startChapter])
        )

        // 处理别名
        for (const alias of newChar.aliases || []) {
          const aliasSet = this.context.characterKnowledge.characterAliases.get(alias)
          if (aliasSet) {
            aliasSet.push(newChar.name)
          } else {
            this.context.characterKnowledge.characterAliases.set(alias, [newChar.name])
          }
        }
      } else {
        // 已存在角色，更新信息
        existingChar.development.push({
          chapterNumber: result.startChapter,
          development: newChar.development || '继续发展',
          psychologicalChange: newChar.psychologicalChange || '无明显变化',
          capabilityChange: newChar.capabilityChange || '能力保持'
        })

        existingChar.currentStatus = newChar.currentStatus || existingChar.currentStatus

        // 更新出现章节
        const appearances = this.context.characterKnowledge.characterAppearances.get(newChar.name)
        if (appearances) {
          for (let ch = result.startChapter; ch <= result.endChapter; ch++) {
            appearances.add(ch)
          }
        }
      }
    }

    // 更新角色关系
    for (const relation of result.characterRelations) {
      this.updateCharacterRelation(relation)
    }
  }

  /**
   * 更新剧情线
   */
  private async updatePlotThreads(
    result: BatchProcessingResult
  ): Promise<void> {

    // 识别新的剧情线
    for (const newThread of result.newPlotThreads) {
      const existingThread = this.context.plotThreads.mainThreads.find(
        t => t.name === newThread.name
      )

      if (!existingThread) {
        // 新剧情线
        this.context.plotThreads.mainThreads.push({
          id: this.generateThreadId(newThread.name),
          name: newThread.name,
          type: newThread.type,
          importance: newThread.importance,
          description: newThread.description,
          startDate: result.startChapter,
          status: 'active',
          keyMilestones: [{
            chapterNumber: result.startChapter,
            description: `剧情线开始：${newThread.description}`,
            impact: 'high'
          }]
        })

        this.context.plotThreads.threadStates.set(
          newThread.name,
          '刚开始'
        )
      }
    }

    // 更新现有剧情线的进展
    for (const advancement of result.plotAdvancements) {
      const thread = this.findPlotThread(advancement.threadName)
      if (thread) {
        thread.keyMilestones.push({
          chapterNumber: result.startChapter,
          description: advancement.description,
          impact: advancement.impact || 'medium'
        })

        // 更新剧情线状态
        this.context.plotThreads.threadStates.set(
          thread.name,
          advancement.newState || '继续发展'
        )

        // 记录进展
        this.context.plotThreads.threadProgress.push({
          threadName: thread.name,
          chapterNumber: result.startChapter,
          description: advancement.description,
          impact: advancement.impact || 'medium'
        })
      }
    }

    // 检查剧情线是否完成
    for (const thread of this.context.plotThreads.mainThreads) {
      if (thread.status === 'active' && this.isThreadCompleted(thread, result)) {
        thread.status = 'completed'
        this.context.plotThreads.threadStates.set(thread.name, '已完成')
      }
    }
  }

  /**
   * 更新世界观设定
   */
  private async updateWorldBuilding(
    result: BatchProcessingResult
  ): Promise<void> {

    // 添加新地点
    for (const location of result.newLocations) {
      const existing = this.context.worldBuilding.locations.find(
        l => l.name === location.name
      )

      if (!existing) {
        this.context.worldBuilding.locations.push({
          ...location,
          firstAppearance: result.startChapter,
          appearances: [result.startChapter]
        })
      } else {
        existing.appearances.push(result.startChapter)
        // 更新地点信息
        if (location.additionalInfo) {
          existing.description += `\n${location.additionalInfo}`
        }
      }
    }

    // 添加新组织
    for (const org of result.newOrganizations) {
      const existing = this.context.worldBuilding.organizations.find(
        o => o.name === org.name
      )

      if (!existing) {
        this.context.worldBuilding.organizations.push({
          ...org,
          firstAppearance: result.startChapter,
          appearances: [result.startChapter]
        })
      } else {
        existing.appearances.push(result.startChapter)
      }
    }

    // 添加世界规则
    for (const rule of result.newWorldRules) {
      if (!this.context.worldBuilding.worldRules.includes(rule)) {
        this.context.worldBuilding.worldRules.push(rule)
      }
    }
  }

  /**
   * 更新全书摘要
   */
  private async updateBookSummary(
    result: BatchProcessingResult
  ): Promise<void> {

    const batchSummary = this.generateBatchSummary(result)

    // 添加到累积摘要
    this.context.bookSummary.cumulative.push(batchSummary)

    // 更新当前完整摘要
    if (this.context.bookSummary.cumulative.length <= 3) {
      // 前期，详细摘要
      this.context.bookSummary.current =
        this.context.bookSummary.initial +
        '\n\n' +
        this.context.bookSummary.cumulative.join('\n\n')
    } else {
      // 后期，精简摘要（保留最近的）
      const recentSummaries = this.context.bookSummary.cumulative.slice(-3)
      this.context.bookSummary.current =
        this.context.bookSummary.initial +
        '\n\n' +
        '近期发展：\n' +
        recentSummaries.join('\n\n')
    }
  }

  /**
   * 检查一致性
   */
  private checkConsistency(result: BatchProcessingResult): void {
    // 检查角色行为一致性
    for (const characterAction of result.characterActions) {
      const character = this.findCharacter(characterAction.name)
      if (character) {
        const inconsistency = this.checkBehaviorConsistency(
          character,
          characterAction
        )

        if (inconsistency) {
          console.warn(`[一致性警告] ${inconsistency}`)
          // 可以添加到警告列表，供后续处理
        }
      }
    }

    // 检查世界观一致性
    for (const worldElement of result.worldBuildingAdditions) {
      const conflict = this.checkWorldConsistency(worldElement)
      if (conflict) {
        console.warn(`[世界观冲突] ${conflict}`)
      }
    }
  }

  /**
   * 获取用于AI提示词的角色信息
   */
  private getCharacterInfo(budget: number): string {
    const characters = this.context.characterKnowledge.mainCharacters

    if (budget < 2000) {
      // 低预算：只列出主要角色
      const mainChars = characters.filter(c => c.importance === 'main')
      return mainChars.map(c =>
        `- **${c.name}**：${c.currentStatus}`
      ).join('\n')
    } else if (budget < 5000) {
      // 中预算：主要角色+配角
      const importantChars = characters.filter(c =>
        c.importance === 'main' || c.importance === 'secondary'
      )
      return importantChars.map(c =>
        `- **${c.name}**：${c.profile.personality.slice(0, 50)}，当前：${c.currentStatus}`
      ).join('\n')
    } else {
      // 高预算：详细信息
      return characters.map(c => {
        const recentDevelopment = c.development[c.development.length - 1]
        return `- **${c.name}**（${c.importance === 'main' ? '主要' : '次要'}）
  性格：${c.profile.personality}
  背景：${c.profile.background}
  当前状态：${c.currentStatus}
  近期发展：${recentDevelopment?.development || '暂无新进展'}`
      }).join('\n\n')
    }
  }

  /**
   * 获取前批摘要
   */
  private getPreviousSummaries(
    batchNumber: number,
    budget: number
  ): string {

    if (batchNumber === 1) {
      return '' // 第一批没有前序
    }

    const recentBatches = this.context.batchHistory.slice(-2) // 最近2批

    if (budget < 1000) {
      // 低预算：只摘要
      return recentBatches.map(batch =>
        `第${batch.chapterRange[0]}-${batch.chapterRange[1]}章：${batch.summary.slice(0, 100)}`
      ).join('\n')
    } else {
      // 正常预算：详细摘要
      return recentBatches.map(batch =>
        `## 第${batch.chapterRange[0]}-${batch.chapterRange[1]}章
**摘要**：${batch.summary}
**关键事件**：${batch.keyEvents.join('、')}
**角色发展**：${Array.from(batch.characterDevelopments.entries())
  .map(([name, dev]) => `${name}：${dev}`)
  .join('；')}
**剧情推进**：${batch.plotAdvancements.join('、')}`
      ).join('\n\n')
    }
  }

  // 辅助方法
  private findCharacter(name: string): CharacterProfile | undefined {
    // 先检查别名
    const canonicalName = this.context.characterKnowledge.characterAliases.get(name)
    const searchName = canonicalName?.[0] || name

    return this.context.characterKnowledge.mainCharacters.find(
      c => c.name === searchName
    )
  }

  private findPlotThread(name: string): PlotThread | undefined {
    return this.context.plotThreads.mainThreads.find(t => t.name === name)
  }

  private generateBatchSummary(result: BatchProcessingResult): string {
    return `第${result.startChapter}-${result.endChapter}章发生了重要事件：${result.keyEvents.join('、')}。主要角色有新的发展：${Array.from(result.characterDevelopments.entries()).map(([name, dev]) => `${name}：${dev}`).join('、')}。`
  }

  private generateCharacterId(name: string): string {
    return `char_${name}_${Date.now()}`
  }

  private generateThreadId(name: string): string {
    return `thread_${name}_${Date.now()}`
  }

  private assessCharacterImportance(char: any): 'main' | 'secondary' | 'minor' {
    // 基于多个因素评估角色重要性
    const appearances = this.context.characterKnowledge.characterAppearances.get(char.name)?.size || 0
    const descriptionLength = char.profile?.background?.length || 0

    if (appearances > 5 || descriptionLength > 200) return 'main'
    if (appearances > 2 || descriptionLength > 100) return 'secondary'
    return 'minor'
  }

  private checkBehaviorConsistency(
    character: CharacterProfile,
    action: any
  ): string | null {

    // 检查角色行为是否符合已建立的人设
    const personality = character.profile.personality
    const actionDescription = action.description

    // 简单的一致性检查（实际可以更复杂）
    if (personality.includes('温和') && actionDescription.includes('暴怒')) {
      return `角色${character.name}性格温和，但出现了暴怒行为，请确认是否合理`
    }

    return null
  }

  private checkWorldConsistency(element: string): string | null {
    // 检查新世界观元素是否与现有冲突
    // 实现可以更复杂
    return null
  }

  private isThreadCompleted(thread: PlotThread, result: BatchProcessingResult): boolean {
    // 检查剧情线是否完成
    // 可以基于关键词、事件描述等判断
    return result.plotAdvancements.some(adv =>
      adv.threadName === thread.name && adv.completion === 'completed'
    )
  }

  private calculateBatchQuality(result: BatchProcessingResult): number {
    // 计算批次质量分数
    let score = 50 // 基础分

    score += result.newCharacters.length * 5
    score += result.plotAdvancements.length * 10
    score += result.keyEvents.length * 8
    score -= result.inconsistencies?.length * 15 || 0

    return Math.max(0, Math.min(100, score))
  }

  private cleanupOldInformation(): void {
    // 清理过于陈旧的信息，保持上下文大小合理
    // 实现可以更复杂
  }

  private initializeContext(initial: Partial<GlobalBookContext>): GlobalBookContext {
    return {
      bookInfo: initial.bookInfo || {
        title: '',
        genre: '',
        theme: '',
        totalChapters: 0,
        narrativePerspective: 'third'
      },
      bookSummary: {
        initial: initial.bookSummary?.initial || '',
        cumulative: [],
        current: initial.bookSummary?.current || ''
      },
      characterKnowledge: {
        mainCharacters: initial.characterKnowledge?.mainCharacters || [],
        characterRelationships: initial.characterKnowledge?.characterRelationships || [],
        characterAppearances: initial.characterKnowledge?.characterAppearances || new Map(),
        characterAliases: initial.characterKnowledge?.characterAliases || new Map()
      },
      plotThreads: {
        mainThreads: initial.plotThreads?.mainThreads || [],
        threadStates: initial.plotThreads?.threadStates || new Map(),
        threadProgress: initial.plotThreads?.threadProgress || []
      },
      worldBuilding: {
        locations: initial.worldBuilding?.locations || [],
        organizations: initial.worldBuilding?.organizations || [],
        worldRules: initial.worldBuilding?.worldRules || [],
        powerSystems: initial.worldBuilding?.powerSystems || [],
        timeline: initial.worldBuilding?.timeline || []
      },
      batchHistory: initial.batchHistory || [],
      consistencyRules: initial.consistencyRules || {
        characterBehaviorRules: [],
        worldRuleConstraints: [],
        plotLogicalConstraints: []
      }
    }
  }

  private updateCharacterRelation(relation: any): void {
    // 更新角色关系
    // 实现略
  }

  private getCoreBookInfo(): string {
    return `《${this.context.bookInfo.title}》
类型：${this.context.bookInfo.genre}
主题：${this.context.bookInfo.theme}
总章节数：${this.context.bookInfo.totalChapters}
叙事视角：${this.context.bookInfo.narrativePerspective}`
  }

  private getPlotThreadInfo(budget: number): string {
    // 根据预算返回剧情线信息
    // 实现略
    return ''
  }

  private getWorldBuildingInfo(budget: number): string {
    // 根据预算返回世界观信息
    // 实现略
    return ''
  }

  private getConsistencyRules(batchNumber: number): string[] {
    // 返回一致性规则
    // 实现略
    return []
  }

  private extractCharacterDevelopments(result: BatchProcessingResult): Map<string, string> {
    return result.characterDevelopments
  }
}

/**
 * 批次处理结果接口
 */
interface BatchProcessingResult {
  startChapter: number
  endChapter: number
  keyEvents: string[]
  newCharacters: Array<{
    name: string
    aliases?: string[]
    profile: any
    introduction: string
    initialStatus?: string
    development?: string
    psychologicalChange?: string
    capabilityChange?: string
    currentStatus?: string
  }>
  characterRelations: any[]
  characterActions: any[]
  characterDevelopments: Map<string, string>
  newPlotThreads: Array<{
    name: string
    type: string
    importance: string
    description: string
  }>
  plotAdvancements: Array<{
    threadName: string
    description: string
    impact?: string
    newState?: string
    completion?: string
  }>
  newLocations: Array<{
    name: string
    description: string
    firstAppearance: number
    appearances: number[]
    additionalInfo?: string
  }>
  newOrganizations: Array<{
    name: string
    description: string
    firstAppearance: number
    appearances: number[]
  }>
  newWorldRules: string[]
  worldBuildingAdditions: string[]
  inconsistencies?: string[]
}

interface ContextForPrompt {
  coreInfo: string
  characters: string
  plotThreads: string
  worldBuilding: string
  previousSummaries: string
  consistencyRules: string[]
}

interface TokenBudget {
  characters: number
  plotThreads: number
  worldBuilding: number
  previousSummaries: number
}
```

## 🤖 增强提示词系统

### 提示词结构设计

```typescript
class EnhancedPromptBuilder {
  /**
   * 构建带全局上下文的提示词
   */
  buildContextAwarePrompt(
    context: GlobalBookContext,
    currentBatch: BookImportChapter[],
    batchNumber: number,
    totalBatches: number
  ): string {

    const { coreInfo, characters, plotThreads, worldBuilding, previousSummaries, consistencyRules } =
      context.getContextForPrompt(batchNumber, this.calculateBudget(batchNumber))

    // 构建提示词各个部分
    const sections = []

    // 1. 系统角色定义
    sections.push(this.buildSystemSection())

    // 2. 任务说明
    sections.push(this.buildTaskSection(batchNumber, totalBatches))

    // 3. 全局上下文
    sections.push(this.buildGlobalContextSection(coreInfo, characters, plotThreads, worldBuilding))

    // 4. 前序发展
    if (batchNumber > 1) {
      sections.push(this.buildPreviousDevelopmentSection(previousSummaries))
    }

    // 5. 当前批次任务
    sections.push(this.buildCurrentTaskSection(currentBatch, batchNumber))

    // 6. 输出要求
    sections.push(this.buildOutputRequirementsSection(consistencyRules))

    return sections.join('\n\n')
  }

  private buildSystemSection(): string {
    return `<system>
你是专业的小说编辑和内容分析师，具备以下能力：
1. 理解整本书的全局脉络和角色发展轨迹
2. 维护角色行为和世界观的一致性
3. 识别剧情线的发展模式和转折点
4. 生成结构化、高质量的章节大纲

在处理每批章节时，你会：
- 基于前面建立的知识继续分析
- 识别新的角色、地点、剧情线并明确标注
- 更新对已有角色的理解
- 确保内容与前文保持连贯
</system>`
  }

  private buildTaskSection(batchNumber: number, totalBatches: number): string {
    return `<task>
【当前任务】
为第 ${batchNumber}/${totalBatches} 批次的章节生成详细大纲

【处理原则】
1. **连贯性优先**：确保与前文内容的逻辑连贯
2. **角色一致性**：角色行为和发展要符合已建立的人设
3. **剧情推进**：明确标注推进了哪些剧情线
4. **增量识别**：识别新元素并明确标注为"新出现"
</task>`
  }

  private buildGlobalContextSection(
    coreInfo: string,
    characters: string,
    plotThreads: string,
    worldBuilding: string
  ): string {

    return `<global_context>
## 📚 书籍信息
${coreInfo}

## 👥 主要角色
${characters}

## 🎭 核心剧情线
${plotThreads}

## 🌍 世界观要素
${worldBuilding}
</global_context>`
  }

  private buildPreviousDevelopmentSection(previousSummaries: string): string {
    return `<previous_development>
## 📖 前序章节发展
${previousSummaries}

**重要提醒**：
- 请确保当前批次的内容与前文自然衔接
- 角色状态和发展要延续前面的设定
- 如有剧情转折，请明确说明转折原因
</previous_development>`
  }

  private buildCurrentTaskSection(
    batch: BookImportChapter[],
    batchNumber: number
  ): string {

    const chaptersText = batch.map((chapter, idx) => {
      const content = (chapter.content || '').slice(0, 3000) // 限制长度
      return `【第${chapter.chapter_number}章 ${chapter.title}】
${content}`
    }).join('\n\n---\n\n')

    return `<current_batch>
## 📝 当前批次章节

${chaptersText}

**处理要求**：
1. 分析每章的情节发展和角色表现
2. 识别新的角色、地点、世界观元素
3. 标注推进的剧情线和关键转折
4. 注意与前文的连贯性
</current_batch>`
  }

  private buildOutputRequirementsSection(consistencyRules: string[]): string {
    return `<output_requirements>
## 📤 输出格式要求

返回JSON数组，每个元素包含：

```json
{
  "chapter_number": 章节号,
  "title": "章节标题",
  "detailed_outline": "详细大纲（300-500字）：包含开场、发展、转折、高潮、结尾",
  "scenes": ["场景1描述", "场景2描述"],
  "characters": [
    {
      "name": "角色名",
      "type": "character|organization",
      "new": false,  // 是否新出现
      "development": "本章节的发展描述",  // 仅对已有角色
      "introduction": "角色介绍"  // 仅对新角色
    }
  ],
  "plot_advancement": {
    "threads_advanced": ["推进的剧情线名称"],
    "new_threads": ["新剧情线名称"],
    "key_events": ["关键事件"],
    "turning_points": ["转折点描述"]
  },
  "world_building": {
    "new_locations": ["新地点"],
    "new_organizations": ["新组织"],
    "new_rules": ["新规则"],
    "expanded_elements": ["扩展的世界观元素"]
  },
  "key_points": ["要点1", "要点2"],
  "emotion": "情感基调",
  "goal": "叙事目标"
}
```

**一致性要求**：
${consistencyRules.length > 0 ? consistencyRules.map(r => `- ${r}`).join('\n') : '- 确保角色行为符合已建立的人设\n- 确保世界观设定与前文一致\n- 确保剧情发展符合逻辑'}
</output_requirements>`
  }

  private calculateBudget(batchNumber: number): TokenBudget {
    // 根据批次位置调整预算分配
    // 前面批次更多上下文，后面批次相对减少
    const baseBudget = {
      characters: 3000,
      plotThreads: 2000,
      worldBuilding: 2000,
      previousSummaries: 2000
    }

    if (batchNumber <= 3) {
      // 前期，给予更多上下文预算
      return {
        characters: baseBudget.characters * 1.5,
        plotThreads: baseBudget.plotThreads * 1.5,
        worldBuilding: baseBudget.worldBuilding * 1.5,
        previousSummaries: baseBudget.previousSummaries * 0.5 // 前期前序较少
      }
    } else {
      // 后期，适度压缩上下文
      return {
        characters: baseBudget.characters,
        plotThreads: baseBudget.plotThreads,
        worldBuilding: baseBudget.worldBuilding,
        previousSummaries: baseBudget.previousSummaries * 0.8 // 压缩前序摘要
      }
    }
  }
}
```

## 📊 实施效果预估

### 质量对比

| 维度 | 当前系统 | 方案一 | 改善幅度 |
|------|----------|--------|----------|
| **角色一致性** | 60% | 95% | ↑58% |
| **剧情连贯性** | 55% | 90% | ↑64% |
| **世界观统一性** | 70% | 95% | ↑36% |
| **内容丰富度** | 65% | 85% | ↑31% |
| **逻辑合理性** | 70% | 92% | ↑31% |

### 性能影响

| 项目 | 当前系统 | 方案一 | 变化 |
|------|----------|--------|------|
| **总处理时间** | 10分钟 | 12-13分钟 | +20-30% |
| **全局分析** | 0分钟 | 1-2分钟 | 新增 |
| **每批处理** | 1分钟 | 1.2分钟 | +20% |
| **Token消耗** | 31万 | 35-38万 | +13-23% |

### 成本效益分析

```
增加的成本：
- 时间：+2-3分钟（+20-30%）
- Token：+4-7万（+13-23%）
- 开发复杂度：中等

获得的收益：
- 角色一致性：+58%
- 剧情连贯性：+64%
- 用户满意度：预计+40%
- 内容质量：显著提升

结论：性价比极高，建议优先实施
```

## 🚀 实施路线图

### 第1阶段：核心功能（2-3周）
1. **Week 1**: 全局上下文管理器基础实现
2. **Week 2**: 增强提示词系统开发
3. **Week 3**: 批次处理逻辑改造

### 第2阶段：优化提升（2-3周）
1. **Week 4**: 智能上下文压缩算法
2. **Week 5**: 一致性检查机制
3. **Week 6**: 性能优化和测试

### 第3阶段：高级特性（3-4周）
1. **Week 7**: 用户交互式调整
2. **Week 8**: 质量评估系统
3. **Week 9**: 监控和分析工具
4. **Week 10**: 全面测试和调优

## 💡 关键优势

1. **渐进式增强**：每批都基于前面的理解，符合人类认知模式
2. **上下文感知**：AI能够理解"前因后果"，生成更连贯的内容
3. **动态适应**：系统能够随着处理进度调整策略
4. **容错性强**：即使某批失败，也不会影响整体流程
5. **可扩展性**：架构支持未来添加更多智能特性

这个方案的核心优势在于模拟了人类的阅读理解过程，让AI像人类一样"带着记忆"处理内容，而不是每批都"重新开始"。
