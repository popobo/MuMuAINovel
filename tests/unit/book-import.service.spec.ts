import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BookImportService } from '@/services/book-import.service'
import type {
  BookImportChapter,
  BookImportOutline,
  BookImportPreviewResponse,
  ProjectSuggestion,
} from '@/lib/book-import/types'

vi.mock('@/lib/ai/complete-with-user-settings', () => ({
  completeWithUserOrEnv: vi.fn(async () => ({ content: '{}' })),
}))

vi.mock('@/lib/db', () => ({
  db: {
    project: {
      create: vi.fn(),
      update: vi.fn(),
    },
    outline: {
      create: vi.fn(),
    },
    chapter: {
      create: vi.fn(),
    },
    bookImportTask: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    bookImportTaskChapter: {
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
      deleteMany: vi.fn(async () => ({ count: 0 })),
      createMany: vi.fn(async () => ({ count: 0 })),
      update: vi.fn(async () => ({})),
    },
  },
}))

import { db } from '@/lib/db'

function makeChapters(count: number) {
  return Array.from({ length: count }, (_, idx) => {
    const n = idx + 1
    return {
      title: `第${n}章`,
      content: `内容${n}`.repeat(200),
      summary: `摘要${n}`,
      chapter_number: n,
      outline_title: `第${n}章`,
    }
  })
}

type TestTask = {
  taskId: string
  userId: string
  filename: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  message: string | null
  error: string | null
  createdAt: Date
  updatedAt: Date
  preview: BookImportPreviewResponse | null
  cancelled: boolean
  importedProjectId: string | null
  failedSteps: Array<{
    step_name: string
    step_label: string
    error: string
    retry_count: number
  }>
}

type BookImportServiceForTest = BookImportService & {
  buildPreview: (
    task: TestTask,
    chaptersData: Array<{ title: string; content: string; chapter_number: number }>,
  ) => Promise<BookImportPreviewResponse>
  tasks: Map<string, TestTask>
  generateReverseProjectSuggestion: (
    userId: string,
    suggestion: ProjectSuggestion,
    chapters: BookImportChapter[],
    task: TestTask,
  ) => Promise<ProjectSuggestion>
  generateReverseOutlines: (
    userId: string,
    suggestion: ProjectSuggestion,
    chapters: BookImportChapter[],
    task: TestTask,
  ) => Promise<{
    outlines: BookImportOutline[]
    failedChapterErrors: Record<number, string>
  }>
}

describe('BookImportService', () => {
  let service: BookImportService

  beforeEach(() => {
    service = new BookImportService()
    vi.clearAllMocks()
  })

  it('buildPreview should keep all recognized chapters', async () => {
    const serviceForTest = service as unknown as BookImportServiceForTest
    const chaptersData = Array.from({ length: 12 }, (_, idx) => {
      const n = idx + 1
      return {
        title: `第${n}章`,
        content: `正文${n}`.repeat(180),
        chapter_number: n,
      }
    })

    vi.spyOn(serviceForTest, 'generateReverseProjectSuggestion').mockResolvedValue(
      {
        title: '测试项目',
        description: 'desc',
        theme: 'theme',
        genre: 'genre',
        narrative_perspective: '第三人称',
        target_words: 100000,
      },
    )
    vi.spyOn(serviceForTest, 'generateReverseOutlines').mockResolvedValue({
      outlines: chaptersData.map((item, idx) => ({
        title: item.title,
        content: `大纲${idx + 1}`,
        order_index: idx + 1,
      })),
      failedChapterErrors: {},
    })

    const preview = await serviceForTest.buildPreview(
      {
        taskId: 't1',
        userId: 'u1',
        filename: 'book.txt',
        status: 'running',
        progress: 0,
        message: null,
        error: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        preview: null,
        cancelled: false,
        importedProjectId: null,
        failedSteps: [],
      },
      chaptersData,
    )

    expect(preview.chapters).toHaveLength(12)
  })

  it('buildPreview should persist staging status failed when outline errors are reported', async () => {
    const serviceForTest = service as unknown as BookImportServiceForTest
    const chaptersData = Array.from({ length: 3 }, (_, idx) => {
      const n = idx + 1
      return {
        title: `第${n}章`,
        content: `正文${n}`.repeat(180),
        chapter_number: n,
      }
    })

    vi.spyOn(serviceForTest, 'generateReverseProjectSuggestion').mockResolvedValue({
      title: '测试项目',
      description: 'desc',
      theme: 'theme',
      genre: 'genre',
      narrative_perspective: '第三人称',
      target_words: 100000,
    })
    vi.spyOn(serviceForTest, 'generateReverseOutlines').mockResolvedValue({
      outlines: chaptersData.map((item, idx) => ({
        title: item.title,
        content: `大纲${idx + 1}`,
        order_index: idx + 1,
      })),
      failedChapterErrors: { 2: '模拟大纲失败' },
    })

    const preview = await serviceForTest.buildPreview(
      {
        taskId: 't-fail',
        userId: 'u1',
        filename: 'book.txt',
        status: 'running',
        progress: 0,
        message: null,
        error: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        preview: null,
        cancelled: false,
        importedProjectId: null,
        failedSteps: [],
      },
      chaptersData,
    )

    expect(preview.warnings.some(w => w.code === 'outline_ai_partial_failed')).toBe(true)

    expect(db.bookImportTaskChapter.createMany).toHaveBeenCalled()
    const call = (db.bookImportTaskChapter.createMany as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as { data: Array<{ chapterNumber: number; status: string; error: string | null }> }
    expect(call?.data).toBeDefined()
    const row2 = call!.data.find(r => r.chapterNumber === 2)
    expect(row2?.status).toBe('failed')
    expect(row2?.error).toBe('模拟大纲失败')
    const row1 = call!.data.find(r => r.chapterNumber === 1)
    expect(row1?.status).toBe('ready')
  })

  it('applyImport should import all submitted chapters', async () => {
    const chapters = makeChapters(12)
    const outlines = chapters.map(item => ({
      title: item.title,
      content: item.summary,
      order_index: item.chapter_number,
    }))

    ;(db.project.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'p1' })
    ;(db.project.update as ReturnType<typeof vi.fn>).mockResolvedValue({})
    ;(db.outline.create as ReturnType<typeof vi.fn>).mockImplementation(
      async ({ data }: { data: { title: string } }) => ({ id: `o-${data.title}` }),
    )
    ;(db.chapter.create as ReturnType<typeof vi.fn>).mockResolvedValue({})

    const task = {
      taskId: 'task-1',
      userId: 'u1',
      filename: 'book.txt',
      status: 'completed',
      progress: 100,
      message: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      preview: {
        task_id: 'task-1',
        project_suggestion: {
          title: '测试',
          description: null,
          theme: null,
          genre: null,
          narrative_perspective: '第三人称',
          target_words: 100000,
        },
        chapters,
        outlines,
        warnings: [],
      },
      cancelled: false,
      importedProjectId: null,
      failedSteps: [],
    }

    ;(service as unknown as BookImportServiceForTest).tasks.set('task-1', task)

    await service.applyImport('task-1', 'u1', {
      project_suggestion: task.preview.project_suggestion,
      chapters,
      outlines,
      import_mode: 'append',
    })

    expect(db.chapter.create).toHaveBeenCalledTimes(12)
  })

  it('retryFailedChapters should recover failed staging chapters', async () => {
    const task = {
      taskId: 'task-retry-1',
      userId: 'u1',
      filename: 'book.txt',
      status: 'completed',
      progress: 100,
      message: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      preview: {
        task_id: 'task-retry-1',
        project_suggestion: {
          title: '测试',
          description: null,
          theme: null,
          genre: null,
          narrative_perspective: '第三人称',
          target_words: 100000,
        },
        chapters: [],
        outlines: [],
        warnings: [],
      },
      cancelled: false,
      importedProjectId: null,
      failedSteps: [],
    }
    ;(service as unknown as BookImportServiceForTest).tasks.set('task-retry-1', task)

    ;(db.bookImportTaskChapter.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        taskId: 'task-retry-1',
        chapterNumber: 3,
        title: '第3章',
        content: '正文',
        summary: null,
        outlineTitle: null,
        outlineContent: null,
      },
    ])
    ;(db.bookImportTaskChapter.update as ReturnType<typeof vi.fn>).mockResolvedValue({})
    ;(db.bookImportTaskChapter.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)

    const result = await service.retryFailedChapters('task-retry-1', 'u1')

    expect(result.retried).toBe(1)
    expect(result.remaining_failed).toBe(0)
    expect(db.bookImportTaskChapter.update).toHaveBeenCalledTimes(1)
  })

  it('retryFailedChapters should filter by chapter_numbers when provided', async () => {
    const task = {
      taskId: 'task-retry-filter',
      userId: 'u1',
      filename: 'book.txt',
      status: 'completed',
      progress: 100,
      message: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      preview: {
        task_id: 'task-retry-filter',
        project_suggestion: {
          title: '测试',
          description: null,
          theme: null,
          genre: null,
          narrative_perspective: '第三人称',
          target_words: 100000,
        },
        chapters: [],
        outlines: [],
        warnings: [],
      },
      cancelled: false,
      importedProjectId: null,
      failedSteps: [],
    }
    ;(service as unknown as BookImportServiceForTest).tasks.set('task-retry-filter', task)

    ;(db.bookImportTaskChapter.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        taskId: 'task-retry-filter',
        chapterNumber: 5,
        title: '第5章',
        content: '正文',
        summary: null,
        outlineTitle: null,
        outlineContent: null,
      },
    ])
    ;(db.bookImportTaskChapter.update as ReturnType<typeof vi.fn>).mockResolvedValue({})
    ;(db.bookImportTaskChapter.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)

    await service.retryFailedChapters('task-retry-filter', 'u1', [5, 7])

    expect(db.bookImportTaskChapter.findMany).toHaveBeenCalledWith({
      where: {
        taskId: 'task-retry-filter',
        status: 'failed',
        chapterNumber: { in: [5, 7] },
      },
    })
  })

  it('updateStagingChapter should persist chapter edits', async () => {
    const task = {
      taskId: 'task-edit-1',
      userId: 'u1',
      filename: 'book.txt',
      status: 'completed',
      progress: 100,
      message: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      preview: null,
      cancelled: false,
      importedProjectId: null,
      failedSteps: [],
    }
    ;(service as unknown as BookImportServiceForTest).tasks.set('task-edit-1', task)
    ;(db.bookImportTaskChapter.update as ReturnType<typeof vi.fn>).mockResolvedValue({})

    await service.updateStagingChapter('task-edit-1', 'u1', 2, {
      title: '新章节标题',
      summary: '新摘要',
      content: '新内容',
    })

    expect(db.bookImportTaskChapter.update).toHaveBeenCalledWith({
      where: { taskId_chapterNumber: { taskId: 'task-edit-1', chapterNumber: 2 } },
      data: {
        title: '新章节标题',
        outlineTitle: '新章节标题',
        summary: '新摘要',
        outlineContent: '新摘要',
        content: '新内容',
      },
    })
  })
})
