/**
 * 全局上下文管理器 - 用于维护拆书导入过程中的全局知识
 */

/**
 * 角色发展记录
 */
export interface CharacterDevelopment {
  chapterNumber: number
  development: string
  psychologicalChange: string
  capabilityChange: string
}

/**
 * 角色档案
 */
export interface CharacterProfile {
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
}

/**
 * 新角色数据
 */
export interface NewCharacterData {
  name: string
  aliases?: string[]
  profile: {
    appearance: string
    personality: string
    background: string
    goals: string[]
  }
  introduction: string
  currentStatus?: string
  development?: string
}

/**
 * 角色关系数据
 */
export interface CharacterRelationData {
  source: string
  target: string
  relationship: string
  description?: string
}

/**
 * 角色行为数据
 */
export interface CharacterActionData {
  character: string
  action: string
  motivation?: string
  chapterNumber: number
}
export interface CharacterDevelopment {
  chapterNumber: number
  development: string
  psychologicalChange: string
  capabilityChange: string
}

/**
 * 角色档案
 */
export interface CharacterProfile {
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

/**
 * 角色关系
 */
export interface CharacterRelation {
  character1: string
  character2: string
  relationshipType: string
  description: string
  establishedChapter: number
}

/**
 * 剧情线里程碑
 */
export interface PlotMilestone {
  chapterNumber: number
  description: string
  impact: 'high' | 'medium' | 'low'
}

/**
 * 剧情线
 */
export interface PlotThread {
  id: string
  name: string
  type: 'revenge' | 'growth' | 'romance' | 'mystery' | 'conflict' | 'journey' | 'other'
  importance: 'main' | 'secondary'
  description: string
  startDate: number
  status: 'active' | 'paused' | 'completed'
  keyMilestones: PlotMilestone[]
}

/**
 * 地点档案
 */
export interface LocationProfile {
  name: string
  description: string
  type: string
  firstAppearance: number
  appearances: number[]
  importance: number
}

/**
 * 组织档案
 */
export interface OrganizationProfile {
  name: string
  description: string
  type: string
  firstAppearance: number
  appearances: number[]
  importance: number
}

/**
 * 批次处理记录
 */
export interface BatchRecord {
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
 * 全局书籍上下文
 */
export interface GlobalBookContext {
  // 书籍基本信息
  bookInfo: {
    title: string
    genre: string
    theme: string
    totalChapters: number
    narrativePerspective: string
  }

  // 全书摘要
  bookSummary: {
    initial: string           // 初始摘要
    cumulative: string[]      // 累积摘要
    current: string           // 当前完整摘要
  }

  // 角色知识图谱
  characterKnowledge: {
    mainCharacters: CharacterProfile[]
    characterRelationships: CharacterRelation[]
    characterAppearances: Map<string, Set<number>>
    characterAliases: Map<string, string[]>
  }

  // 剧情线追踪
  plotThreads: {
    mainThreads: PlotThread[]
    threadStates: Map<string, string>
    threadProgress: PlotMilestone[]
  }

  // 世界观设定
  worldBuilding: {
    locations: LocationProfile[]
    organizations: OrganizationProfile[]
    worldRules: string[]
    powerSystems: string[]
    timeline: string[]
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

/**
 * 批次处理结果
 */
export interface BatchProcessingResult {
  startChapter: number
  endChapter: number
  keyEvents: string[]
  newCharacters: NewCharacterData[]
  characterRelations: CharacterRelationData[]
  characterActions: CharacterActionData[]
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
    type?: string
    importance?: number
  }>
  newOrganizations: Array<{
    name: string
    description: string
    type?: string
    importance?: number
  }>
  newWorldRules: string[]
  worldBuildingAdditions: string[]
  inconsistencies?: string[]
  processedOutlines?: Array<{
    chapter_number: number
    title: string
    detailed_outline: string
    scenes: string[]
    characters: Array<{
      name: string
      type: string
      new: boolean
      development?: string
      introduction?: string
      profile?: {
        appearance?: string
        personality?: string
        background?: string
      }
      currentStatus?: string
    }>
    plot_advancement: {
      threads_advanced?: string[]
      new_threads?: string[]
      key_events?: string[]
      turning_points?: string[]
    }
    world_building: {
      new_locations?: string[]
      new_organizations?: string[]
      new_rules?: string[]
      expanded_elements?: string[]
    }
    key_points?: string[]
    emotion?: string
    goal?: string
  }>
}

/**
 * Token预算分配
 */
export interface TokenBudget {
  characters: number
  plotThreads: number
  worldBuilding: number
  previousSummaries: number
}

/**
 * 用于提示词的上下文
 */
export interface ContextForPrompt {
  coreInfo: string
  characters: string
  plotThreads: string
  worldBuilding: string
  previousSummaries: string
  consistencyRules: string[]
}

/**
 * 全局上下文管理器
 */
export class GlobalContextManager {
  private context: GlobalBookContext
  private readonly maxHistoryLength = 3  // 保留最近3批的历史

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
  }

  /**
   * 获取用于AI提示词的上下文
   */
  getContextForPrompt(
    batchNumber: number,
    budgetConstraints: TokenBudget
  ): ContextForPrompt {
    return {
      coreInfo: this.getCoreBookInfo(),
      characters: this.getCharacterInfo(budgetConstraints.characters),
      plotThreads: this.getPlotThreadInfo(budgetConstraints.plotThreads),
      worldBuilding: this.getWorldBuildingInfo(budgetConstraints.worldBuilding),
      previousSummaries: this.getPreviousSummaries(batchNumber, budgetConstraints.previousSummaries),
      consistencyRules: this.getConsistencyRules()
    }
  }

  /**
   * 获取当前上下文（用于调试和监控）
   * 注意：返回的是上下文的深拷贝，Map对象会被保留
   */
  getCurrentContext(): GlobalBookContext {
    // 安全地深拷贝上下文，保留Map对象的功能
    return {
      ...this.context,
      characterKnowledge: {
        ...this.context.characterKnowledge,
        characterAppearances: new Map(this.context.characterKnowledge.characterAppearances),
        characterAliases: new Map(this.context.characterKnowledge.characterAliases)
      },
      plotThreads: {
        ...this.context.plotThreads,
        threadStates: new Map(this.context.plotThreads.threadStates)
      },
      batchHistory: this.context.batchHistory.map(batch => ({
        ...batch,
        characterDevelopments: new Map(batch.characterDevelopments) // 保留嵌套的Map
      }))
    }
  }

  /**
   * 添加批次记录
   */
  private addBatchRecord(batchNumber: number, result: BatchProcessingResult): void {
    const record: BatchRecord = {
      batchNumber,
      chapterRange: [result.startChapter, result.endChapter],
      summary: this.generateBatchSummary(result),
      keyEvents: result.keyEvents,
      newCharacters: result.newCharacters.map(c => c.name),
      characterDevelopments: new Map(result.characterDevelopments),
      plotAdvancements: result.plotAdvancements.map(p => p.description),
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
  private async updateCharacterKnowledge(result: BatchProcessingResult): Promise<void> {
    // 处理新出现的角色
    for (const newChar of result.newCharacters) {
      const existingChar = this.findCharacter(newChar.name)

      if (!existingChar) {
        // 新角色，添加到知识库
        this.context.characterKnowledge.mainCharacters.push({
          id: this.generateId('char', newChar.name),
          name: newChar.name,
          aliases: newChar.aliases || [],
          firstAppearance: result.startChapter,
          importance: this.assessCharacterImportance(newChar),
          profile: {
            appearance: newChar.profile?.appearance || '',
            personality: newChar.profile?.personality || '',
            background: newChar.profile?.background || '',
            goals: newChar.profile?.goals || []
          },
          development: [{
            chapterNumber: result.startChapter,
            development: `首次登场：${newChar.introduction}`,
            psychologicalChange: '初始状态',
            capabilityChange: '初始能力'
          }],
          currentStatus: newChar.currentStatus || '活跃'
        })

        // 记录出现章节
        this.context.characterKnowledge.characterAppearances.set(
          newChar.name,
          new Set([result.startChapter])
        )

        // 处理别名
        for (const alias of newChar.aliases || []) {
          const aliasList = this.context.characterKnowledge.characterAliases.get(alias)
          if (aliasList) {
            aliasList.push(newChar.name)
          } else {
            this.context.characterKnowledge.characterAliases.set(alias, [newChar.name])
          }
        }
      } else {
        // 已存在角色，更新信息
        existingChar.development.push({
          chapterNumber: result.startChapter,
          development: newChar.development || '继续发展',
          psychologicalChange: '状态延续',
          capabilityChange: '能力保持'
        })

        if (newChar.currentStatus) {
          existingChar.currentStatus = newChar.currentStatus
        }

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
  private async updatePlotThreads(result: BatchProcessingResult): Promise<void> {
    // 识别新的剧情线
    for (const newThread of result.newPlotThreads) {
      const existingThread = this.context.plotThreads.mainThreads.find(
        t => t.name === newThread.name
      )

      if (!existingThread) {
        // 新剧情线
        this.context.plotThreads.mainThreads.push({
          id: this.generateId('thread', newThread.name),
          name: newThread.name,
          type: newThread.type as 'revenge' | 'growth' | 'romance' | 'mystery' | 'conflict' | 'journey' | 'other',
          importance: newThread.importance as 'main' | 'secondary',
          description: newThread.description,
          startDate: result.startChapter,
          status: 'active',
          keyMilestones: [{
            chapterNumber: result.startChapter,
            description: `剧情线开始：${newThread.description}`,
            impact: 'high'
          }]
        })

        this.context.plotThreads.threadStates.set(newThread.name, '刚开始')
      }
    }

    // 更新现有剧情线的进展
    for (const advancement of result.plotAdvancements) {
      const thread = this.findPlotThread(advancement.threadName)
      if (thread) {
        thread.keyMilestones.push({
          chapterNumber: result.startChapter,
          description: advancement.description,
          impact: (advancement.impact as 'high' | 'medium' | 'low') || 'medium'
        })

        if (advancement.newState) {
          this.context.plotThreads.threadStates.set(thread.name, advancement.newState)
        }

        this.context.plotThreads.threadProgress.push({
          chapterNumber: result.startChapter,
          description: advancement.description,
          impact: (advancement.impact as 'high' | 'medium' | 'low') || 'medium'
        })
      }
    }
  }

  /**
   * 更新世界观设定
   */
  private async updateWorldBuilding(result: BatchProcessingResult): Promise<void> {
    // 添加新地点
    for (const location of result.newLocations) {
      const existing = this.context.worldBuilding.locations.find(
        l => l.name === location.name
      )

      if (!existing) {
        this.context.worldBuilding.locations.push({
          name: location.name,
          description: location.description,
          type: location.type || '未知',
          firstAppearance: result.startChapter,
          appearances: [result.startChapter],
          importance: location.importance || 50
        })
      } else {
        existing.appearances.push(result.startChapter)
      }
    }

    // 添加新组织
    for (const org of result.newOrganizations) {
      const existing = this.context.worldBuilding.organizations.find(
        o => o.name === org.name
      )

      if (!existing) {
        this.context.worldBuilding.organizations.push({
          name: org.name,
          description: org.description,
          type: org.type || '未知',
          firstAppearance: result.startChapter,
          appearances: [result.startChapter],
          importance: org.importance || 50
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
  private async updateBookSummary(result: BatchProcessingResult): Promise<void> {
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
      const recentSummaries = this.context.bookSummary.cumulative.slice(-2)
      this.context.bookSummary.current =
        this.context.bookSummary.initial +
        '\n\n近期发展：\n' +
        recentSummaries.join('\n\n')
    }
  }

  /**
   * 检查一致性
   */
  private checkConsistency(result: BatchProcessingResult): void {
    // 检查角色行为一致性
    for (const characterAction of result.characterActions) {
      const character = this.findCharacter(characterAction.character)
      if (character) {
        const inconsistency = this.checkBehaviorConsistency(character, characterAction)
        if (inconsistency) {
          console.warn(`[一致性警告] ${inconsistency}`)
        }
      }
    }
  }

  /**
   * 获取用于AI提示词的角色信息
   */
  private getCharacterInfo(budget: number): string {
    const characters = this.context.characterKnowledge.mainCharacters

    if (characters.length === 0) {
      return '暂无角色信息'
    }

    if (budget < 1500) {
      // 低预算：只列出主要角色
      const mainChars = characters.filter(c => c.importance === 'main')
      return mainChars.map(c =>
        `- **${c.name}**：${c.currentStatus}`
      ).join('\n')
    } else if (budget < 4000) {
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
   * 获取剧情线信息
   */
  private getPlotThreadInfo(budget: number): string {
    const threads = this.context.plotThreads.mainThreads

    if (threads.length === 0) {
      return '暂无剧情线信息'
    }

    if (budget < 1500) {
      // 低预算：简要列表
      return threads.map(t =>
        `- **${t.name}**：${this.context.plotThreads.threadStates.get(t.name) || '未知'}`
      ).join('\n')
    } else {
      // 高预算：详细信息
      return threads.map(t => {
        const state = this.context.plotThreads.threadStates.get(t.name) || '未知'
        return `- **${t.name}**（${t.importance === 'main' ? '主线' : '支线'}）
  描述：${t.description}
  当前状态：${state}`
      }).join('\n\n')
    }
  }

  /**
   * 获取世界观信息
   */
  private getWorldBuildingInfo(budget: number): string {
    const locations = this.context.worldBuilding.locations
    const organizations = this.context.worldBuilding.organizations
    const rules = this.context.worldBuilding.worldRules

    const parts: string[] = []

    if (locations.length > 0) {
      const locationList = locations.slice(0, 5).map(l => l.name).join('、')
      parts.push(`地点：${locationList}${locations.length > 5 ? '等' : ''}`)
    }

    if (organizations.length > 0) {
      const orgList = organizations.slice(0, 5).map(o => o.name).join('、')
      parts.push(`组织：${orgList}${organizations.length > 5 ? '等' : ''}`)
    }

    if (rules.length > 0) {
      const ruleList = rules.slice(0, 3).join('；')
      parts.push(`规则：${ruleList}${rules.length > 3 ? '等' : ''}`)
    }

    return parts.length > 0 ? parts.join('\n') : '世界观待探索'
  }

  /**
   * 获取前批摘要
   */
  private getPreviousSummaries(batchNumber: number, budget: number): string {
    if (batchNumber === 1 || this.context.batchHistory.length === 0) {
      return ''
    }

    const recentBatches = this.context.batchHistory.slice(-2)

    if (budget < 1000) {
      // 低预算：只摘要
      return recentBatches.map(batch =>
        `第${batch.chapterRange[0]}-${batch.chapterRange[1]}章：${batch.summary.slice(0, 80)}`
      ).join('\n')
    } else {
      // 正常预算：详细摘要
      return recentBatches.map(batch => {
        const charDev = Array.from(batch.characterDevelopments.entries())
          .map(([name, dev]) => `${name}：${dev}`)
          .join('；')

        return `## 第${batch.chapterRange[0]}-${batch.chapterRange[1]}章
**摘要**：${batch.summary}
**关键事件**：${batch.keyEvents.join('、') || '暂无'}
${charDev ? `**角色发展**：${charDev}` : ''}
**剧情推进**：${batch.plotAdvancements.join('、') || '暂无'}`
      }).join('\n\n')
    }
  }

  /**
   * 获取一致性规则
   */
  private getConsistencyRules(): string[] {
    const rules: string[] = []

    // 从角色信息生成规则
    for (const char of this.context.characterKnowledge.mainCharacters) {
      if (char.profile.personality) {
        rules.push(`${char.name}的性格特征：${char.profile.personality}`)
      }
    }

    // 从世界观生成规则
    if (this.context.worldBuilding.worldRules.length > 0) {
      rules.push(`世界规则：${this.context.worldBuilding.worldRules.slice(0, 2).join('；')}`)
    }

    return rules
  }

  /**
   * 获取核心书籍信息
   */
  private getCoreBookInfo(): string {
    return `《${this.context.bookInfo.title}》
类型：${this.context.bookInfo.genre}
主题：${this.context.bookInfo.theme}
总章节数：${this.context.bookInfo.totalChapters}
叙事视角：${this.context.bookInfo.narrativePerspective}`
  }

  // 辅助方法

  private findCharacter(name: string): CharacterProfile | undefined {
    // 先检查别名
    const canonicalNames = this.context.characterKnowledge.characterAliases.get(name)
    const searchName = canonicalNames?.[0] || name

    return this.context.characterKnowledge.mainCharacters.find(
      c => c.name === searchName
    )
  }

  private findPlotThread(name: string): PlotThread | undefined {
    return this.context.plotThreads.mainThreads.find(t => t.name === name)
  }

  private generateBatchSummary(result: BatchProcessingResult): string {
    const parts: string[] = []

    if (result.keyEvents.length > 0) {
      parts.push(`发生了${result.keyEvents.join('、')}`)
    }

    if (result.newCharacters.length > 0) {
      parts.push(`新角色${result.newCharacters.map(c => c.name).join('、')}登场`)
    }

    if (result.plotAdvancements.length > 0) {
      parts.push(`剧情推进：${result.plotAdvancements.slice(0, 2).map(p => p.description).join('、')}`)
    }

    return parts.length > 0 ? parts.join('，') : '内容发展'
  }

  private generateId(prefix: string, name: string): string {
    return `${prefix}_${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private assessCharacterImportance(char: NewCharacterData): 'main' | 'secondary' | 'minor' {
    // 简单评估：基于描述长度
    const descriptionLength = char.profile?.background?.length || 0

    if (descriptionLength > 200) return 'main'
    if (descriptionLength > 100) return 'secondary'
    return 'minor'
  }

  private updateCharacterRelation(relation: CharacterRelationData): void {
    // 更新角色关系
    const existing = this.context.characterKnowledge.characterRelationships.find(
      r => r.character1 === relation.source && r.character2 === relation.target
    )

    if (!existing) {
      this.context.characterKnowledge.characterRelationships.push({
        character1: relation.source,
        character2: relation.target,
        relationshipType: relation.relationship || '未知',
        description: relation.description || '',
        establishedChapter: 1
      })
    }
  }

  private checkBehaviorConsistency(character: CharacterProfile, action: CharacterActionData): string | null {
    // 简单的一致性检查
    const personality = character.profile.personality.toLowerCase()
    const actionDesc = (action.action || '').toLowerCase()

    // 检查明显冲突
    if (personality.includes('温和') && actionDesc.includes('暴怒')) {
      return `角色${character.name}性格温和，但出现了暴怒行为，请确认是否合理`
    }

    if (personality.includes('冷漠') && actionDesc.includes('热情')) {
      return `角色${character.name}性格冷漠，但表现出热情行为，请确认是否合理`
    }

    return null
  }

  private calculateBatchQuality(result: BatchProcessingResult): number {
    let score = 50 // 基础分

    score += result.newCharacters.length * 5
    score += result.plotAdvancements.length * 10
    score += result.keyEvents.length * 8
    score -= (result.inconsistencies?.length || 0) * 15

    return Math.max(0, Math.min(100, score))
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
        cumulative: initial.bookSummary?.cumulative || [],
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
}