export type BookImportTaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type ImportMode = 'append' | 'overwrite'

export type BookImportWarningLevel = 'info' | 'warning' | 'error'

export interface BookImportWarning {
  code: string
  message: string
  level: BookImportWarningLevel
}

export interface WritingStyleAnalysis {
  prose_quality: 'descriptive' | 'action_oriented' | 'balanced'
  prose_quality_confidence: number
  prose_quality_examples: string[] // 原文示例

  tone: 'serious' | 'humorous' | 'mixed' | 'dark' | 'light'
  tone_confidence: number
  tone_examples: string[] // 原文示例

  pacing: 'fast' | 'slow' | 'variable' | 'tension_building'
  pacing_confidence: number
  pacing_examples: string[] // 原文示例

  language_level: 'simple' | 'complex' | 'literary' | 'casual'
  language_level_confidence: number
  language_level_examples: string[] // 原文示例

  voice: 'poetic' | 'direct' | 'metaphorical' | 'literal'
  voice_confidence: number
  voice_examples: string[] // 原文示例

  sentence_structure: 'short_simple' | 'long_complex' | 'varied'
  dialogue_ratio: 'minimal' | 'moderate' | 'heavy'
  description_density: 'sparse' | 'moderate' | 'rich'

  // 保留字数较少的特征的示例
  sentence_structure_examples?: string[] // 原文示例
  dialogue_ratio_examples?: string[] // 原文示例
  description_density_examples?: string[] // 原文示例

  /**
   * 风格指纹：用于后续生成时“可执行”的约束与偏好。
   * 该字段尽量体现作品的独特手法，而非泛化优点。
   */
  style_fingerprint?: {
    do_list: string[] // 6-12条，可执行的写作指令（用“动词开头”）
    dont_list: string[] // 4-10条禁忌（避免模型跑偏）
    signature_devices: Array<{
      name: string // 手法名，如“短促并列句”“意象串联”“反讽式旁白”
      description: string // 20-80字，描述其作用
      evidence: string[] // 2-4条原文摘录（必须来自输入）
    }>
    motifs: Array<{
      motif: string // 意象/母题词组
      why_it_matters: string // 20-80字，说明其与主题/情绪的关系
      evidence: string[] // 1-3条原文摘录
    }>
    lexical_preferences?: {
      favored_connectives?: string[] // 常见连接词/转折词，如“于是”“却”“偏偏”
      favored_sensory_words?: string[] // 高频感官词/意象词
      avoided_words?: string[] // 明显不符合风格的词
    }
    rhythm?: {
      paragraph_length: 'short' | 'mixed' | 'long' // 段落节奏倾向
      sentence_length: 'short' | 'mixed' | 'long'
      dialogue_format?: 'with_tags' | 'minimal_tags' | 'mixed'
    }
  }

  style_summary: string
}

export interface ProjectSuggestion {
  title: string
  description?: string | null
  theme?: string | null
  genre?: string | null
  narrative_perspective: string
  target_words: number
  writing_style?: WritingStyleAnalysis | null
}

export interface BookImportChapter {
  title: string
  content: string
  summary?: string | null
  chapter_number: number
  outline_title?: string | null
  /** 拆书 staging 行状态：ready / failed 等；无 staging 时省略 */
  staging_status?: string | null
}

export interface BookImportOutline {
  title: string
  content?: string | null
  order_index: number
  structure?: Record<string, unknown> | null
}

export interface BookImportTaskCreateResponse {
  task_id: string
  status: BookImportTaskStatus
}

export interface BookImportTaskStatusResponse {
  task_id: string
  status: BookImportTaskStatus
  progress: number
  message?: string | null
  error?: string | null
  created_at: string
  updated_at: string
}

export interface BookImportPreviewResponse {
  task_id: string
  project_suggestion: ProjectSuggestion
  chapters: BookImportChapter[]
  outlines: BookImportOutline[]
  warnings: BookImportWarning[]
  /** 有 DB staging 时返回当前任务下仍处于 failed 的章节号（全量列表，便于勾选重试） */
  staging?: {
    failed_chapter_numbers: number[]
  }
  pagination?: {
    page: number
    page_size: number
    total_items: number
    total_pages: number
  }
}

export interface BookImportApplyRequest {
  project_suggestion: ProjectSuggestion
  chapters: BookImportChapter[]
  outlines: BookImportOutline[]
  import_mode: ImportMode
}

export interface BookImportApplyResponse {
  success: boolean
  project_id: string
  statistics: Record<string, number>
  warnings: BookImportWarning[]
}

export type OutlineStructure = {
  chapter_number: number
  title: string
  detailed_outline: string
  scenes: string[]
  characters: Array<{ name: string; type: string }>
  key_points: string[]
  emotion: string
  goal: string
}
