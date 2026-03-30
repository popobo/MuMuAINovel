/**
 * 增强提示词构建器 - 构建带全局上下文的AI提示词
 */

import type { GlobalBookContext, ContextForPrompt } from './context-manager'
import type { BookImportChapter, ProjectSuggestion } from './types'

export class EnhancedPromptBuilder {
  /**
   * 构建带全局上下文的大纲生成提示词
   */
  buildContextAwareOutlinePrompt(
    context: GlobalBookContext,
    currentBatch: BookImportChapter[],
    batchNumber: number,
    totalBatches: number
  ): string {
    const contextForPrompt = this.getContextForPrompt(context, batchNumber)

    const sections = []

    // 1. 系统角色定义
    sections.push(this.buildSystemSection())

    // 2. 任务说明
    sections.push(this.buildTaskSection(batchNumber, totalBatches))

    // 3. 全局上下文
    sections.push(this.buildGlobalContextSection(contextForPrompt))

    // 4. 前序发展
    if (batchNumber > 1 && contextForPrompt.previousSummaries) {
      sections.push(this.buildPreviousDevelopmentSection(contextForPrompt.previousSummaries))
    }

    // 5. 当前批次任务
    sections.push(this.buildCurrentTaskSection(currentBatch))

    // 6. 输出要求
    sections.push(this.buildOutputRequirementsSection(contextForPrompt.consistencyRules))

    return sections.join('\n\n')
  }

  /**
   * 构建全局分析提示词
   */
  buildGlobalAnalysisPrompt(
    suggestion: ProjectSuggestion,
    sampleChapters: BookImportChapter[],
    totalChapters: number
  ): string {
    const sampleText = sampleChapters.map((ch, idx) =>
      `【章节样本${idx + 1}】\n标题：${ch.title}\n内容：${(ch.content || '').slice(0, 3000)}`
    ).join('\n\n---\n\n')

    return `<system>
你是专业的文学分析师，负责对整本书进行全局分析，提取核心要素为后续章节大纲生成提供上下文。
</system>

<task>
基于提供的章节样本，分析全书的核心要素，包括主要角色、剧情线、世界观设定等。
</task>

<book_info>
书名：${suggestion.title || '拆书导入项目'}
类型：${suggestion.genre || '通用'}
主题：${suggestion.theme || '未设定'}
总章节数：${totalChapters}
采样章节：${sampleChapters.length}
</book_info>

<samples>
${sampleText}
</samples>

<output>
返回JSON对象：
{
  "book_summary": "全书摘要（500-800字）：包含主角、核心冲突、主线剧情、整体风格",
  "characters": [
    {
      "name": "角色名",
      "aliases": ["别名1", "别名2"],
      "introduction": "角色介绍（100-200字）",
      "role": "主角/配角/反派",
      "importance": "main/secondary/minor",
      "profile": {
        "appearance": "外貌描述",
        "personality": "性格特点",
        "background": "背景故事",
        "goals": ["目标1", "目标2"]
      }
    }
  ],
  "plot_threads": [
    {
      "name": "主线名称（如：复仇线、成长线）",
      "type": "revenge/growth/romance/mystery/conflict/journey/other",
      "description": "简要描述（100-200字）",
      "importance": "main/secondary"
    }
  ],
  "world_elements": {
    "locations": ["已出现的重要地点"],
    "organizations": ["已出现的组织势力"],
    "rules": ["世界规则/设定"],
    "power_systems": ["力量体系"]
  }
}
</output>`
  }

  /**
   * 构建系统角色定义部分
   */
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

  /**
   * 构建任务说明部分
   */
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

  /**
   * 构建全局上下文部分
   */
  private buildGlobalContextSection(context: ContextForPrompt): string {
    const sections = []

    if (context.coreInfo) {
      sections.push(`## 📚 书籍信息\n${context.coreInfo}`)
    }

    if (context.characters) {
      sections.push(`## 👥 主要角色\n${context.characters}`)
    }

    if (context.plotThreads) {
      sections.push(`## 🎭 核心剧情线\n${context.plotThreads}`)
    }

    if (context.worldBuilding) {
      sections.push(`## 🌍 世界观要素\n${context.worldBuilding}`)
    }

    return `<global_context>
${sections.join('\n\n')}
</global_context>`
  }

  /**
   * 构建前序发展部分
   */
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

  /**
   * 构建当前批次任务部分
   */
  private buildCurrentTaskSection(batch: BookImportChapter[]): string {
    const chaptersText = batch.map((chapter) => {
      const content = (chapter.content || '').slice(0, 3500)
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

  /**
   * 构建输出要求部分
   */
  private buildOutputRequirementsSection(consistencyRules: string[]): string {
    return `<output_requirements>
## 📤 输出格式要求

返回JSON数组，每个元素包含：

\`\`\`json
{
  "chapter_number": 章节号,
  "title": "章节标题",
  "detailed_outline": "详细大纲（300-500字）：包含开场、发展、转折、高潮、结尾",
  "scenes": ["场景1描述", "场景2描述"],
  "characters": [
    {
      "name": "角色名",
      "type": "character|organization",
      "new": false,
      "development": "本章节的发展描述",
      "introduction": "角色介绍（仅对新角色）",
      "profile": {
        "appearance": "外貌（新角色）",
        "personality": "性格（新角色）",
        "background": "背景（新角色）"
      },
      "currentStatus": "当前状态"
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
\`\`\`

**一致性要求**：
${consistencyRules.length > 0 ?
  consistencyRules.map(r => `- ${r}`).join('\n') :
  '- 确保角色行为符合已建立的人设\n- 确保世界观设定与前文一致\n- 确保剧情发展符合逻辑'
}

**特别说明**：
- 对于已出现的角色，"new"字段设为false，并在"development"中描述本章节的发展
- 对于新出现的角色，"new"字段设为true，并提供详细介绍
- 剧情线推进要明确标注哪些线得到了发展
- 世界观元素要区分是新增还是对已有元素的扩展
</output_requirements>`
  }

  /**
   * 获取用于提示词的上下文
   */
  private getContextForPrompt(
    context: GlobalBookContext,
    batchNumber: number
  ): ContextForPrompt {
    const budget = this.calculateBudget(batchNumber)

    return {
      coreInfo: this.formatCoreInfo(context),
      characters: this.formatCharacters(context, budget.characters),
      plotThreads: this.formatPlotThreads(context, budget.plotThreads),
      worldBuilding: this.formatWorldBuilding(context),
      previousSummaries: this.formatPreviousSummaries(context, batchNumber, budget.previousSummaries),
      consistencyRules: this.extractConsistencyRules(context)
    }
  }

  /**
   * 计算Token预算分配
   */
  private calculateBudget(batchNumber: number): {
    characters: number
    plotThreads: number
    worldBuilding: number
    previousSummaries: number
  } {
    // 根据批次位置调整预算分配
    if (batchNumber <= 3) {
      // 前期，给予更多上下文预算
      return {
        characters: 4000,
        plotThreads: 3000,
        worldBuilding: 2000,
        previousSummaries: 1500
      }
    } else {
      // 后期，适度压缩上下文
      return {
        characters: 3000,
        plotThreads: 2000,
        worldBuilding: 1500,
        previousSummaries: 2000
      }
    }
  }

  /**
   * 格式化核心信息
   */
  private formatCoreInfo(context: GlobalBookContext): string {
    return `《${context.bookInfo.title}》
类型：${context.bookInfo.genre || '通用'}
主题：${context.bookInfo.theme || '未设定'}
总章节数：${context.bookInfo.totalChapters}
叙事视角：${context.bookInfo.narrativePerspective}
书籍摘要：${context.bookSummary.initial || '暂无'}`
  }

  /**
   * 格式化角色信息
   */
  private formatCharacters(context: GlobalBookContext, budget: number): string {
    const characters = context.characterKnowledge.mainCharacters

    if (characters.length === 0) {
      return '暂无角色信息'
    }

    if (budget < 2000) {
      // 低预算：简要列表
      const mainChars = characters.filter(c => c.importance === 'main')
      return mainChars.map(c =>
        `- **${c.name}**：${c.currentStatus || '活跃'}`
      ).join('\n')
    } else {
      // 高预算：详细信息
      return characters.map(c => {
        const recentDevelopment = c.development[c.development.length - 1]
        return `- **${c.name}**（${c.importance === 'main' ? '主要' : '次要'}）
  性格：${c.profile.personality || '暂无'}
  背景：${c.profile.background || '暂无'}
  当前状态：${c.currentStatus || '活跃'}
  近期发展：${recentDevelopment?.development || '暂无新进展'}`
      }).join('\n\n')
    }
  }

  /**
   * 格式化剧情线信息
   */
  private formatPlotThreads(context: GlobalBookContext, budget: number): string {
    const threads = context.plotThreads.mainThreads

    if (threads.length === 0) {
      return '暂无剧情线信息'
    }

    if (budget < 1500) {
      // 低预算：简要列表
      return threads.map(t => {
        const state = context.plotThreads.threadStates.get(t.name) || '未知'
        return `- **${t.name}**：${state}`
      }).join('\n')
    } else {
      // 高预算：详细信息
      return threads.map(t => {
        const state = context.plotThreads.threadStates.get(t.name) || '未知'
        return `- **${t.name}**（${t.importance === 'main' ? '主线' : '支线'}）
  描述：${t.description}
  当前状态：${state}`
      }).join('\n\n')
    }
  }

  /**
   * 格式化世界观信息
   */
  private formatWorldBuilding(context: GlobalBookContext): string {
    const locations = context.worldBuilding.locations
    const organizations = context.worldBuilding.organizations
    const rules = context.worldBuilding.worldRules

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
   * 格式化前序摘要
   */
  private formatPreviousSummaries(
    context: GlobalBookContext,
    batchNumber: number,
    budget: number
  ): string {
    if (batchNumber === 1 || context.batchHistory.length === 0) {
      return ''
    }

    const recentBatches = context.batchHistory.slice(-2)

    if (budget < 1500) {
      // 低预算：只摘要
      return recentBatches.map(batch =>
        `第${batch.chapterRange[0]}-${batch.chapterRange[1]}章：${batch.summary.slice(0, 100)}`
      ).join('\n')
    } else {
      // 正常预算：详细摘要
      return recentBatches.map(batch => {
        const charDev = Array.from(batch.characterDevelopments.entries())
          .map(([name, dev]) => `${name}：${dev}`)
          .join('；')

        return `## 第${batch.chapterRange[0]}-${batch.chapterRange[1]}章
**摘要**：${batch.summary}
${batch.keyEvents.length > 0 ? `**关键事件**：${batch.keyEvents.join('、')}` : ''}
${charDev ? `**角色发展**：${charDev}` : ''}
${batch.plotAdvancements.length > 0 ? `**剧情推进**：${batch.plotAdvancements.join('、')}` : ''}`
      }).join('\n\n')
    }
  }

  /**
   * 提取一致性规则
   */
  private extractConsistencyRules(context: GlobalBookContext): string[] {
    const rules: string[] = []

    // 从角色信息生成规则
    for (const char of context.characterKnowledge.mainCharacters) {
      if (char.profile.personality) {
        rules.push(`${char.name}的性格特征：${char.profile.personality}`)
      }
    }

    // 从世界观生成规则
    if (context.worldBuilding.worldRules.length > 0) {
      rules.push(`世界规则：${context.worldBuilding.worldRules.slice(0, 2).join('；')}`)
    }

    return rules
  }
}