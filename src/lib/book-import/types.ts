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

export interface ProjectSuggestion {
  title: string
  description?: string | null
  theme?: string | null
  genre?: string | null
  narrative_perspective: string
  target_words: number
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
  summary: string
  scenes: string[]
  characters: Array<{ name: string; type: string }>
  key_points: string[]
  emotion: string
  goal: string
}
