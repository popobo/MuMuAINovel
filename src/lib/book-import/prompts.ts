/** 拆书导入提示词（自经典版 PromptService 迁移） */

export const BOOK_IMPORT_CHAPTER_HEADING_PRESETS = `<system>
你是 TXT 小说排版分析助手，只根据给定正文片段判断「章节标题行」最常见的版式。
</system>

<task>
【任务】
阅读下方正文片段（可能含前言、广告或正文），判断全书章节标题行最符合哪些**固定版式**。

【重要】
- 不要输出正则表达式；不要发明新的版式名称。
- 只能从允许的 preset id 列表中选择一项或多项（可多选）。
- 若片段中看不到任何章节标题、或无法判断，返回 mode=builtin（使用系统默认规则）。

【匹配规则（必读）】
- 下列每一种版式都是对「去掉行首尾空白后的**整行**」生效，不是对行内某一段子串。
- leading_number_title：**整行的第一个字符必须是数字**（1～4 位章节号）。若行首是汉字、英文或其它符号，即使行里出现「001、」也不算本类。
- 反例：「上卷 : 001，死神」**不是** leading_number_title（行首是「上」不是数字）；若全书章节标题常为此类，应选 cn_volume_colon_index。
- 可多种版式并存（例如既有「第一章」又有「Chapter 1」），此时 presets 里可同时选 cn_di_zhang 与 en_chapter。
</task>

<allowed_presets>
cn_di_zhang — 整行以中文「第…章/节/回/卷/集/部/篇」开头，如「第一章 风起」「第十二回」
en_chapter — 整行以英文 Chapter / Chap. 加数字开头，如「Chapter 1」「Chap. 12」
cn_bracket_line — 整行被中文方括号包裹，如「【楔子】」「【番外 二】」
leading_number_title — **整行以** 1～4 位数字开头，后接分隔符（、．.- 等）再接标题，如「001、风起」「12. 进城」
cn_volume_colon_index — 整行以「上/中/下/前/后 + 卷 + 英文或中文冒号 + 数字序号」为主干，如「上卷 : 001，死神」「下卷：12 进城」
hash_number_title — 整行以 # 开头，后接数字或「第」，如「# 1」「# 第一章」
cn_episode — 整行以中文「第…集」开头（常见于脚本/短剧体）
cn_vol_chapter_one_line — 同一行同时含「第…卷」与「第…章」（与 cn_volume_colon_index 不同，本条是「第X卷」体例）
</allowed_presets>

<input>
【正文片段】
{sample}
</input>

<output>
仅输出一个纯 JSON 对象（不要 markdown、不要代码块、不要解释）：

{
  "mode": "builtin" | "presets",
  "presets": ["cn_di_zhang"],
  "rationale": "一句话说明依据（可为空字符串）"
}

【规则】
- mode 为 "builtin" 时，presets 必须为 []。
- mode 为 "presets" 时，presets 至少包含 1 个 allowed_presets 中的 id，且不得包含列表外的字符串。
- rationale 可为空字符串。
</output>`

export const BOOK_IMPORT_REVERSE_PROJECT_SUGGESTION = `<system>
你是资深网文策划编辑，擅长从小说正文中反向提炼项目立项信息。
</system>

<task>
【任务】
基于提供的前3章内容，提炼该小说的核心立项信息，用于创建新项目。

【目标】
在不偏离原文的前提下，输出可直接用于项目初始化的结构化信息。
</task>

<input priority="P0">
【输入信息】
书名：{title}
前3章内容：
{sampled_text}
</input>

<output priority="P0">
【输出格式】
仅输出一个纯JSON对象（不要markdown、不要代码块、不要解释）：

{
  "description": "小说简介",
  "theme": "核心主题",
  "genre": "小说类型",
  "narrative_perspective": "第一人称/第三人称/全知视角",
  "target_words": 100000
}

【字段要求】
1) description：120-260字，聚焦主角、核心冲突、主线目标与故事张力。
2) theme：120-260字，提炼作品想表达的核心命题。
3) genre：2-12字，如都市、玄幻、悬疑、科幻、言情等。
4) narrative_perspective：只能是“第一人称”或“第三人称”或“全知视角”。
5) target_words：整数。按网文体量合理预估；无法判断时返回100000。
</output>

<constraints>
【必须遵守】
✅ 严格基于已给正文内容，不凭空添加关键设定
✅ 保持信息自洽，避免互相矛盾
✅ 输出必须是可解析JSON对象
✅ 小说的genre可以由多个类型组成

【禁止事项】
❌ 输出JSON以外的任何文字
❌ 使用markdown标记或代码块包裹
❌ narrative_perspective输出枚举值之外的内容
❌ target_words输出非整数
</constraints>`

export const BOOK_IMPORT_REVERSE_OUTLINES = `<system>
你是资深网文总编与剧情策划，擅长基于已完成章节反向提炼标准化章节大纲。
</system>

<task>
【任务】
基于给定的章节正文（每批最多5章），为每章反向生成对应大纲结构。

【核心目标】
输出结构必须与系统现有大纲生成结构严格一致（与 OUTLINE_CREATE 字段一致），用于直接入库。
</task>

<project priority="P0">
【项目信息】
书名：{title}
类型：{genre}
主题：{theme}
叙事视角：{narrative_perspective}
</project>

<input priority="P0">
【批次范围】
第{start_chapter}章 - 第{end_chapter}章（共{expected_count}章）

【章节内容】
{chapters_text}
</input>

<output priority="P0">
【输出格式】
仅输出纯JSON数组（不要markdown、不要代码块、不要解释）。
数组长度必须严格等于 {expected_count}。

每个对象字段必须严格为：
[
  {
    "chapter_number": 1,
    "title": "章节标题",
    "detailed_outline": "章节详细大纲（200-500字）：包含开场、发展、转折、高潮、结尾等完整情节结构",
    "scenes": ["场景1描述", "场景2描述"],
    "characters": [
      {"name": "角色名1", "type": "character"},
      {"name": "组织/势力名1", "type": "organization"}
    ],
    "key_points": ["情节要点1", "情节要点2"],
    "emotion": "本章情感基调",
    "goal": "本章叙事目标"
  }
]

【字段约束】
- chapter_number：必须与输入章节号一致
- title：必须与输入章节标题一致
- detailed_outline：章节详细大纲（200-500字），包含开场、发展、转折、高潮、结尾等完整情节结构
- scenes：2-6条
- characters：可为空；type 仅允许 character 或 organization
- key_points：2-6条
- emotion：一句话
- goal：一句话
</output>

<constraints>
【必须遵守】
✅ 严格一章对应一个对象，数量与顺序完全一致
✅ 字段名、字段层级、字段类型严格一致
✅ 仅基于输入正文提炼，不擅自扩展设定
✅ 输出必须可被JSON直接解析

【禁止事项】
❌ 输出JSON之外任何文本
❌ 缺失字段或新增字段
❌ chapter_number/title 与输入不一致
❌ 使用 markdown 或代码块
</constraints>`

export const BOOK_IMPORT_CHARACTERS_AND_RELATIONSHIPS = `<system>
你是资深小说编辑与角色设计师，擅长从小说章节中提取和完善角色信息及角色关系。
</system>

<task>
【任务】
基于提供的小说章节内容，提取并完善主要角色的详细信息和角色关系。

【核心目标】
创建可用于角色管理系统的完整角色档案和关系网络。
</task>

<project priority="P0">
【项目信息】
书名：{title}
类型：{genre}
主题：{theme}
叙事视角：{narrative_perspective}

角色列表（从章节大纲中提取）：{character_list}
</project>

<input priority="P0">
【章节内容样本】
{chapter_samples}

【章节中的角色出现记录】
{character_appearances}
</input>

<output priority="P0">
【输出格式】
仅输出纯JSON对象（不要markdown、不要代码块、不要解释）：

{
  "characters": [
    {
      "name": "角色名",
      "nickname": "昵称（如果有）",
      "age": 年龄数字或null,
      "gender": "男/女/未知",
      "appearance": "外貌描述（100-300字）",
      "personality": "性格特点（100-300字）",
      "background": "背景故事（150-400字）",
      "role": "主角/配角/反派/其他"
    }
  ],
  "relationships": [
    {
      "character1": "角色1姓名",
      "character2": "角色2姓名",
      "type": "关系类型（如：师徒、仇敌、恋人、亲属、朋友、竞争等）",
      "description": "关系描述（50-200字）",
      "strength": 关系强度(1-100的数字)
    }
  ]
}

【字段约束】
- characters数组长度应与character_list中的主要角色数量一致（通常5-15个）
- 优先使用章节中明确出现的角色信息，缺失部分根据上下文合理推断
- relationships应为每对有互动的角色创建关系记录
- strength：1-20表示微弱关系，21-40普通关系，41-60重要关系，61-80关键关系，81-100核心关系
</output>

<constraints>
【必须遵守】
✅ 基于章节内容提取角色信息，不凭空创造主要角色
✅ 保持角色信息与原文设定一致
✅ 输出必须可被JSON直接解析
✅ 角色名必须与character_list中的名字匹配

【禁止事项】
❌ 输出JSON之外任何文本
❌ 为次要路人角色创建详细档案
❌ 使用 markdown 或代码块
</constraints>`

export const BOOK_IMPORT_WORLD_BUILDING = `<system>
你是资深世界架构师，擅长从小说内容中提取和构建详细的世界观设定。
</system>

<task>
【任务】
基于提供的小说内容，构建详细的世界观设定，包括时间地点、势力组织、重要场所等。

【核心目标】
创建可用于世界观管理系统的完整世界设定。
</task>

<project priority="P0">
【项目信息】
书名：{title}
类型：{genre}
主题：{theme}

基础世界观：
时间背景：{time_period}
地理背景：{location}
氛围基调：{atmosphere}
</project>

<input priority="P0">
【章节内容样本】
{chapter_samples}

【已识别的组织和势力】
{organizations}
</input>

<output priority="P0">
【输出格式】
仅输出纯JSON对象（不要markdown、不要代码块、不要解释）：

{
  "world_time_period": "详细的时代背景描述（200-500字）",
  "world_location": "详细的地理环境和世界格局描述（200-500字）",
  "world_atmosphere": "世界的整体氛围和基调描述（150-400字）",
  "world_rules": "世界的核心规则、力量体系、社会制度等（200-500字）",
  "locations": [
    {
      "name": "地点名称",
      "type": "地点类型（如：城市、森林、宫殿、山脉、秘境等）",
      "description": "地点描述（150-400字）",
      "climate": "气候特点",
      "population": "人口规模或null",
      "importance": 重要性(1-100的数字)
    }
  ],
  "organizations": [
    {
      "name": "组织/势力名称",
      "type": "组织类型（如：宗门、朝廷、商会、邪恶势力、中立组织等）",
      "description": "组织详细描述（200-500字）",
      "leader": "领导者名字或null",
      "size": 规模(1-100的数字),
      "influence": 影响力(1-100的数字),
      "location_name": "总部所在地点名称或null"
    }
  ]
}

【字段约束】
- locations数组建议包含3-10个重要地点
- organizations数组应包含主要势力组织
- importance/influence/strength：1-20不重要，21-40普通，41-60重要，61-80很重要，81-100核心
</output>

<constraints>
【必须遵守】
✅ 基于章节内容提取世界设定，不凭空创造与原文冲突的设定
✅ 保持世界观设定与原文一致
✅ 输出必须可被JSON直接解析
✅ 地点和组织的命名应与原文匹配

【禁止事项】
❌ 输出JSON之外任何文本
❌ 创造与原文设定冲突的元素
❌ 使用 markdown 或代码块
</constraints>`

export const BOOK_IMPORT_EVENTS = `<system>
你是资深剧情策划，擅长从小说章节中提取重要事件和剧情节点。
</system>

<task>
【任务】
基于提供的小说章节内容，识别和提取推动剧情发展的重要事件。

【核心目标】
创建可用于事件管理系统的完整事件记录，帮助理解故事脉络和关键转折点。
</task>

<project priority="P0">
【项目信息】
书名：{title}
类型：{genre}
主题：{theme}
叙事视角：{narrative_perspective}

【章节范围】
第{start_chapter}章 - 第{end_chapter}章
</project>

<input priority="P0">
【章节内容样本】
{chapter_samples}

【章节标题列表】
{chapter_titles}
</input>

<output priority="P0">
【输出格式】
仅输出纯JSON对象（不要markdown、不要代码块、不要解释）：

{
  "events": [
    {
      "name": "事件名称",
      "type": "事件类型（如：战斗、会面、发现、转折、冲突、和解、背叛、成长、突破、仪式、旅程等）",
      "description": "事件详细描述（200-500字）：包括事件的起因、过程、结果和影响",
      "date": "故事中的时间描述（如：开篇、三年后、春季、夜晚等）或null",
      "importance": 重要性(1-100的数字),
      "location_name": "发生地点名称或null"
    }
  ]
}

【字段约束】
- events数组应包含5-15个推动剧情发展的重要事件
- 优先选择对角色成长、世界观揭示、剧情转折有重大影响的事件
- 每个事件的描述应包含：起因、发展、高潮、结果
- importance：1-20普通事件，21-40重要事件，41-60关键事件，61-80重大转折，81-100核心事件
- date可以是相对时间（如"三年后"）或绝对时间（如"开篇春季"）
</output>

<constraints>
【必须遵守】
✅ 基于章节内容提取事件，不凭空创造与原文不符的事件
✅ 事件描述应准确反映原文情节
✅ 输出必须可被JSON直接解析
✅ 事件的重要性应与其实际影响相符

【禁止事项】
❌ 输出JSON之外任何文本
❌ 为日常琐碎场景创建事件记录
❌ 创造与原文冲突的事件
❌ 使用 markdown 或代码块
</constraints>`

export function formatPrompt(
  template: string,
  vars: Record<string, string | number>,
): string {
  let out = template
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{${key}}`).join(String(value))
  }
  if (/\{[a-zA-Z0-9_]+\}/.test(out)) {
    throw new Error('Prompt template has unreplaced placeholders')
  }
  return out
}
