import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BOOK_IMPORT_MIN_CHAPTER_CONTENT_CHARS,
  buildPreview,
} from '@/lib/book-import/preview-generator'
import type { InternalTask } from '@/lib/book-import/task-manager'

vi.mock('@/lib/book-import/ai-helpers', () => ({
  callWithJsonObject: vi.fn(async () => ({
    description: 'd',
    theme: 't',
    genre: 'g',
    narrative_perspective: '第三人称',
    target_words: 10000,
  })),
  callWithJsonArray: vi.fn(async () => []),
}))

function makeTask(): InternalTask {
  return {
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
  }
}

describe('buildPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('filters out chapters shorter than minimum and renumbers', async () => {
    const longBody = '字'.repeat(BOOK_IMPORT_MIN_CHAPTER_CONTENT_CHARS)
    const chaptersData = [
      { title: '短章', content: '短', chapter_number: 1 },
      { title: '长章', content: longBody, chapter_number: 2 },
      { title: '另一长章', content: longBody, chapter_number: 3 },
    ]
    const preview = await buildPreview(makeTask(), chaptersData, 'book.txt')
    expect(preview.chapters).toHaveLength(2)
    expect(preview.chapters[0]!.chapter_number).toBe(1)
    expect(preview.chapters[0]!.title).toBe('长章')
    expect(preview.chapters[1]!.chapter_number).toBe(2)
    const filtered = preview.warnings.find(w => w.code === 'chapters_filtered_too_short')
    expect(filtered).toBeDefined()
    expect(filtered!.level).toBe('info')
  })

  it('when all chapters are too short, returns empty lists and an error warning', async () => {
    const chaptersData = [
      { title: 'A', content: 'x'.repeat(50), chapter_number: 1 },
    ]
    const preview = await buildPreview(makeTask(), chaptersData, 'book.txt')
    expect(preview.chapters).toHaveLength(0)
    expect(preview.outlines).toHaveLength(0)
    const w = preview.warnings.find(x => x.code === 'all_chapters_filtered_too_short')
    expect(w).toBeDefined()
    expect(w!.level).toBe('error')
  })
})
