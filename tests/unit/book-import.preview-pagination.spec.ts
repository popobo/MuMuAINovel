import { describe, expect, it, vi } from 'vitest'
import { BookImportService } from '@/services/book-import.service'
import { db } from '@/lib/db'

vi.mock('@/lib/ai/complete-with-user-settings', () => ({
  completeWithUserOrEnv: vi.fn(async () => ({ content: '{}' })),
}))

vi.mock('@/lib/db', () => ({
  db: {
    bookImportTask: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
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

function seedCompletedTask(service: BookImportService, chapterCount: number) {
  const chapters = Array.from({ length: chapterCount }, (_, idx) => {
    const n = idx + 1
    return {
      title: `第${n}章`,
      content: `正文${n}`,
      summary: `摘要${n}`,
      chapter_number: n,
      outline_title: `第${n}章`,
    }
  })
  const outlines = chapters.map(item => ({
    title: item.title,
    content: item.summary,
    order_index: item.chapter_number,
  }))

  ;((service as unknown as { tasks: Map<string, unknown> }).tasks).set('task-page-1', {
    taskId: 'task-page-1',
    userId: 'u1',
    filename: 'book.txt',
    status: 'completed',
    progress: 100,
    message: null,
    error: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    preview: {
      task_id: 'task-page-1',
      project_suggestion: {
        title: '测试项目',
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
  })
}

describe('BookImport preview pagination', () => {
  it('should return paginated preview chapters when page params are provided', async () => {
    const service = new BookImportService()
    seedCompletedTask(service, 55)

    const page2 = await service.getPreviewPage('task-page-1', 'u1', {
      page: 2,
      pageSize: 20,
    })

    expect(page2.chapters).toHaveLength(20)
    expect(page2.chapters[0]?.chapter_number).toBe(21)
    expect(page2.chapters[19]?.chapter_number).toBe(40)
    expect(page2.pagination?.total_items).toBe(55)
    expect(page2.pagination?.total_pages).toBe(3)
  })

  it('should expose staging failed list and per-chapter staging_status from DB', async () => {
    const service = new BookImportService()
    seedCompletedTask(service, 25)
    ;(db.bookImportTaskChapter.count as ReturnType<typeof vi.fn>).mockResolvedValue(25)
    ;(db.bookImportTaskChapter.findMany as ReturnType<typeof vi.fn>).mockImplementation(
      async (args: { where?: { status?: string } }) => {
        if (args.where?.status === 'failed') {
          return [{ chapterNumber: 3 }, { chapterNumber: 18 }]
        }
        return [
          {
            chapterNumber: 2,
            title: '第2章',
            content: '正文',
            summary: null,
            outlineTitle: null,
            outlineContent: null,
            outlineStructure: null,
            status: 'failed',
          },
        ]
      },
    )

    const page1 = await service.getPreviewPage('task-page-1', 'u1', {
      page: 1,
      pageSize: 20,
    })

    expect(page1.staging?.failed_chapter_numbers).toEqual([3, 18])
    expect(page1.chapters[0]?.chapter_number).toBe(2)
    expect(page1.chapters[0]?.staging_status).toBe('failed')
  })
})
