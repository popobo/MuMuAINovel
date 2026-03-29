import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import {
  buildChapterHeadingSample,
  diagnoseStrongPatternValidation,
  parseHeadingInferenceObject,
  strongPatternsFromInference,
  strongPatternsFromPresets,
} from '@/lib/book-import/chapter-heading-inference'
import {
  BOOK_IMPORT_CHAPTER_HEADING_PRESETS,
  formatPrompt,
} from '@/lib/book-import/prompts'
import { cleanText, decodeBytes, splitChapters } from '@/lib/book-import/txt-parser'
import { callWithJsonObject } from '@/lib/book-import/ai-helpers'
import {
  buildPreview,
} from '@/lib/book-import/preview-generator'
import {
  generateCharactersAndRelationships,
  generateWorldBuilding,
  generateEvents,
} from '@/lib/book-import/ai-generators'
import {
  TaskManager,
  BookImportError,
  TaskCancelledError,
  type InternalTask,
} from '@/lib/book-import/task-manager'

// Re-export for API routes
export { BookImportError }
import {
  deriveWorldSettings,
  buildSummary,
} from '@/lib/book-import/metadata'
import type {
  BookImportApplyRequest,
  BookImportApplyResponse,
  BookImportChapter,
  BookImportOutline,
  BookImportPreviewResponse,
  BookImportTaskCreateResponse,
  BookImportTaskStatusResponse,
  BookImportWarning,
  WritingStyleAnalysis,
} from '@/lib/book-import/types'

const MAX_TXT_BYTES = 50 * 1024 * 1024

function normalizeApplyPayload(
  chapters: BookImportChapter[],
  outlines: BookImportOutline[],
): {
  chapters: BookImportChapter[]
  outlines: BookImportOutline[]
} {
  if (chapters.length === 0) {
    return { chapters: [], outlines: [] }
  }

  const sortedChapters = [...chapters].sort((a, b) => a.chapter_number - b.chapter_number)
  const normalizedChapters: BookImportChapter[] = sortedChapters.map((item, idx) => ({
    title: item.title,
    content: item.content,
    summary: item.summary,
    chapter_number: idx + 1,
    outline_title: item.outline_title || item.title,
  }))

  const sortedOutlines = outlines.length
    ? [...outlines].sort((a, b) => a.order_index - b.order_index)
    : []
  let normalizedOutlines: BookImportOutline[] = sortedOutlines.map((item, idx) => ({
    title: item.title,
    content: item.content,
    order_index: idx + 1,
    structure: item.structure,
  }))

  while (normalizedOutlines.length < normalizedChapters.length) {
    const chapter = normalizedChapters[normalizedOutlines.length]!
    const structure = { summary: chapter.summary } as Record<string, unknown>
    normalizedOutlines.push({
      title: chapter.outline_title || chapter.title,
      content: chapter.summary,
      order_index: normalizedOutlines.length + 1,
      structure,
    })
  }

  if (normalizedOutlines.length > normalizedChapters.length) {
    normalizedOutlines = normalizedOutlines.slice(0, normalizedChapters.length)
  }

  for (
    let idx = 0;
    idx < Math.min(normalizedChapters.length, normalizedOutlines.length);
    idx++
  ) {
    normalizedChapters[idx]!.outline_title = normalizedOutlines[idx]!.title
  }

  return {
    chapters: normalizedChapters,
    outlines: normalizedOutlines,
  }
}

export class BookImportService {
  private readonly taskManager = new TaskManager()

  async createTask(params: {
    userId: string
    filename: string
    fileContent: Buffer
    importMode: 'append' | 'overwrite'
  }): Promise<BookImportTaskCreateResponse> {
    if (!params.filename.toLowerCase().endsWith('.txt')) {
      throw new BookImportError('仅支持 .txt 文件', 400)
    }
    if (params.importMode !== 'append' && params.importMode !== 'overwrite') {
      throw new BookImportError('import_mode 仅支持 append 或 overwrite', 400)
    }
    if (params.fileContent.length > MAX_TXT_BYTES) {
      throw new BookImportError('文件大小超过 50MB 限制', 413)
    }

    const task = this.taskManager.create({
      userId: params.userId,
      filename: params.filename,
    })
    await this.taskManager.persist(task)

    void this.runPipeline(task.taskId, params.fileContent).catch(err => {
      console.error('[book-import] pipeline error', err)
    })

    return { task_id: task.taskId, status: 'pending' }
  }

  async getTaskStatus(taskId: string, userId: string): Promise<BookImportTaskStatusResponse> {
    const task = await this.taskManager.getOrThrow(taskId, userId)
    return this.taskManager.toStatus(task)
  }

  async getLatestActiveTaskStatus(userId: string): Promise<BookImportTaskStatusResponse | null> {
    const memTasks = this.taskManager.getActiveTasksByUser(userId)
      .filter(task => ['pending', 'running', 'completed'].includes(task.status))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    if (memTasks.length > 0) {
      return this.taskManager.toStatus(memTasks[0]!)
    }

    const dbTask = await db.bookImportTask.findFirst({
      where: {
        userId,
        importedProjectId: null,
        status: { in: ['pending', 'running', 'completed'] },
      },
      orderBy: { updatedAt: 'desc' },
    })
    if (!dbTask) return null

    return {
      task_id: dbTask.taskId,
      status: dbTask.status as BookImportTaskStatusResponse['status'],
      progress: dbTask.progress,
      message: dbTask.message,
      error: dbTask.error,
      created_at: dbTask.createdAt.toISOString(),
      updated_at: dbTask.updatedAt.toISOString(),
    }
  }

  async getPreview(taskId: string, userId: string): Promise<BookImportPreviewResponse> {
    return this.getPreviewPage(taskId, userId)
  }

  async getPreviewPage(
    taskId: string,
    userId: string,
    pageParams?: { page?: number; pageSize?: number },
  ): Promise<BookImportPreviewResponse> {
    const task = await this.taskManager.getOrThrow(taskId, userId)
    if (task.status !== 'completed') {
      throw new BookImportError('任务尚未完成，无法获取预览', 400)
    }
    if (!task.preview) {
      throw new BookImportError('预览数据不存在', 500)
    }
    const page = Math.max(1, Math.trunc(pageParams?.page ?? 1))
    const pageSizeRaw = Math.trunc(pageParams?.pageSize ?? 20)
    const pageSize = Math.max(1, Math.min(200, pageSizeRaw))
    const stagingCount = await db.bookImportTaskChapter.count({
      where: { taskId },
    })

    if (stagingCount > 0) {
      const totalPages = Math.max(1, Math.ceil(stagingCount / pageSize))
      const safePage = Math.min(page, totalPages)
      const start = (safePage - 1) * pageSize
      const failedRows = await db.bookImportTaskChapter.findMany({
        where: { taskId, status: 'failed' },
        select: { chapterNumber: true },
        orderBy: { chapterNumber: 'asc' },
      })
      const failedChapterNumbers = failedRows.map(r => r.chapterNumber)

      const rows = await db.bookImportTaskChapter.findMany({
        where: { taskId },
        orderBy: { chapterNumber: 'asc' },
        skip: start,
        take: pageSize,
      })

      const chapters: BookImportChapter[] = rows.map(row => ({
        title: row.title,
        content: row.content,
        summary: row.summary,
        chapter_number: row.chapterNumber,
        outline_title: row.outlineTitle || row.title,
        staging_status: row.status,
      }))
      const outlines: BookImportOutline[] = rows.map(row => ({
        title: row.outlineTitle || row.title,
        content: row.outlineContent ?? row.summary ?? '',
        order_index: row.chapterNumber,
        structure:
          row.outlineStructure && typeof row.outlineStructure === 'object'
            ? (row.outlineStructure as Record<string, unknown>)
            : null,
      }))

      return {
        ...task.preview,
        chapters,
        outlines,
        staging: { failed_chapter_numbers: failedChapterNumbers },
        pagination: {
          page: safePage,
          page_size: pageSize,
          total_items: stagingCount,
          total_pages: totalPages,
        },
      }
    }

    const totalItems = task.preview.chapters.length
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * pageSize
    const end = start + pageSize

    return {
      ...task.preview,
      chapters: task.preview.chapters.slice(start, end),
      outlines: task.preview.outlines.slice(start, end),
      pagination: {
        page: safePage,
        page_size: pageSize,
        total_items: totalItems,
        total_pages: totalPages,
      },
    }
  }

  async getImportedProjectId(taskId: string, userId: string): Promise<string | null> {
    const task = this.taskManager.get(taskId)
    if (task && task.userId === userId) return task.importedProjectId
    const dbTask = await db.bookImportTask.findUnique({
      where: { taskId },
      select: { userId: true, importedProjectId: true },
    })
    if (!dbTask || dbTask.userId !== userId) return null
    return dbTask.importedProjectId
  }

  async cancelTask(taskId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const task = await this.taskManager.getOrThrow(taskId, userId)
    if (['completed', 'failed', 'cancelled'].includes(task.status)) {
      return { success: true, message: `任务已是终态：${task.status}` }
    }
    task.cancelled = true
    this.taskManager.setState(task, {
      status: 'cancelled',
      progress: task.progress,
      message: '任务已取消',
    })
    await this.taskManager.persist(task)
    return { success: true, message: '取消成功' }
  }

  async applyImport(
    taskId: string,
    userId: string,
    payload: BookImportApplyRequest,
  ): Promise<BookImportApplyResponse> {
    const task = await this.taskManager.getOrThrow(taskId, userId)
    if (task.status !== 'completed') {
      throw new BookImportError('任务未完成，无法导入', 400)
    }

    const statistics: Record<string, number> = {
      chapters: 0,
      outlines: 0,
      generated_world_building: 0,
      generated_careers: 0,
      generated_entities: 0,
      generated_events: 0,
    }

    const warnings: BookImportWarning[] = task.preview ? [...task.preview.warnings] : []
    let chaptersToImport: BookImportChapter[] = []
    let outlinesToImport: BookImportOutline[] = []

    const stagingRows = await db.bookImportTaskChapter.findMany({
      where: { taskId, status: { not: 'failed' } },
      orderBy: { chapterNumber: 'asc' },
    })

    if (stagingRows.length > 0) {
      chaptersToImport = stagingRows.map(row => ({
        title: row.title,
        content: row.content,
        summary: row.summary,
        chapter_number: row.chapterNumber,
        outline_title: row.outlineTitle || row.title,
      }))
      outlinesToImport = stagingRows.map(row => ({
        title: row.outlineTitle || row.title,
        content: row.outlineContent ?? row.summary ?? '',
        order_index: row.chapterNumber,
        structure:
          row.outlineStructure && typeof row.outlineStructure === 'object'
            ? (row.outlineStructure as Record<string, unknown>)
            : null,
      }))
    } else {
      const normalized = normalizeApplyPayload(payload.chapters, payload.outlines)
      chaptersToImport = normalized.chapters
      outlinesToImport = normalized.outlines
    }

    const world = deriveWorldSettings(payload.project_suggestion, chaptersToImport)

    // Helper function to calculate overall confidence
    function calculateOverallConfidence(style: WritingStyleAnalysis): number {
      const confidences = [
        style.prose_quality_confidence,
        style.tone_confidence,
        style.pacing_confidence,
        style.language_level_confidence,
        style.voice_confidence,
      ]
      return confidences.reduce((sum, c) => sum + c, 0) / confidences.length
    }

    const project = await db.project.create({
      data: {
        userId,
        title: payload.project_suggestion.title.slice(0, 200),
        description: payload.project_suggestion.description ?? undefined,
        theme: payload.project_suggestion.theme ?? undefined,
        genre: payload.project_suggestion.genre ?? undefined,
        targetWords: Math.max(
          1000,
          payload.project_suggestion.target_words ?? 100000,
        ),
        narrativePerspective: (
          payload.project_suggestion.narrative_perspective || '第三人称'
        ).slice(0, 50),
        worldTimePeriod: world.worldTimePeriod,
        worldLocation: world.worldLocation,
        worldAtmosphere: world.worldAtmosphere,
        worldRules: world.worldRules,
        // Writing Style Analysis
        ...(payload.project_suggestion.writing_style ? {
          writingStyleAnalysis: JSON.stringify(payload.project_suggestion.writing_style),
          writingStyleSummary: payload.project_suggestion.writing_style.style_summary,
          styleProseQuality: payload.project_suggestion.writing_style.prose_quality,
          styleTone: payload.project_suggestion.writing_style.tone,
          stylePacing: payload.project_suggestion.writing_style.pacing,
          styleLanguageLevel: payload.project_suggestion.writing_style.language_level,
          styleVoice: payload.project_suggestion.writing_style.voice,
          styleAnalyzedAt: new Date(),
          styleAnalysisConfidence: calculateOverallConfidence(payload.project_suggestion.writing_style),
        } : {}),
        status: 'planning',
        wizardStatus: 'incomplete',
        wizardStep: 1,
        outlineMode: 'one-to-one',
        currentWords: 0,
      },
    })

    const titleToId = new Map<string, string>()
    for (let idx = 0; idx < outlinesToImport.length; idx++) {
      const item = outlinesToImport[idx]!
      let outlineDescription = item.content?.trim() ?? ''
      if (!outlineDescription && item.structure && typeof item.structure === 'object') {
        const s = item.structure as Record<string, unknown>
        outlineDescription = String(s.summary ?? s.content ?? '').trim()
      }
      const created = await db.outline.create({
        data: {
          projectId: project.id,
          title: item.title.slice(0, 200),
          description: outlineDescription || null,
          orderIndex: item.order_index,
        },
      })
      titleToId.set(item.title, created.id)
    }
    statistics.outlines = outlinesToImport.length

    let totalWords = 0
    for (const item of [...chaptersToImport].sort(
      (a, b) => a.chapter_number - b.chapter_number,
    )) {
      const content = item.content || ''
      const wc = content.length
      const outlineId =
        titleToId.get(item.outline_title || '') ??
        titleToId.get(item.title) ??
        null

      await db.chapter.create({
        data: {
          projectId: project.id,
          title: item.title.slice(0, 200),
          content,
          summary: item.summary ?? undefined,
          chapterNumber: item.chapter_number,
          wordCount: wc,
          status: 'draft',
          outlineId,
          subIndex: 1,
        },
      })
      totalWords += wc
      statistics.chapters += 1
    }

    await db.project.update({
      where: { id: project.id },
      data: { currentWords: totalWords },
    })

    this.taskManager.setState(task, {
      status: 'running',
      progress: 95,
      message: '正在生成角色和关系信息...',
    })

    try {
      await generateCharactersAndRelationships(
        task.userId,
        project.id,
        payload.project_suggestion,
        chaptersToImport,
        outlinesToImport,
      )
      statistics.generated_careers = 0
    } catch (e) {
      console.warn('[book-import] character/relationship generation failed', e)
    }

    this.taskManager.setState(task, {
      status: 'running',
      progress: 97,
      message: '正在生成详细世界观设定...',
    })

    try {
      await generateWorldBuilding(
        task.userId,
        project.id,
        payload.project_suggestion,
        chaptersToImport,
        outlinesToImport,
      )
    } catch (e) {
      console.warn('[book-import] world building generation failed', e)
    }

    this.taskManager.setState(task, {
      status: 'running',
      progress: 98,
      message: '正在生成重要事件信息...',
    })

    try {
      const eventsCount = await generateEvents(
        task.userId,
        project.id,
        payload.project_suggestion,
        chaptersToImport,
        outlinesToImport,
      )
      statistics.generated_events = eventsCount
    } catch (e) {
      console.warn('[book-import] events generation failed', e)
    }

    task.importedProjectId = project.id
    task.failedSteps = []
    await this.taskManager.persist(task)

    return {
      success: true,
      project_id: project.id,
      statistics,
      warnings,
    }
  }

  private async persistPreviewChapters(
    task: InternalTask,
    chapters: BookImportChapter[],
    outlines: BookImportOutline[],
    failedChapterErrors: Record<number, string> = {},
  ): Promise<void> {
    try {
      await db.bookImportTaskChapter.deleteMany({ where: { taskId: task.taskId } })
      if (chapters.length === 0) return
      const outlineByOrder = new Map<number, BookImportOutline>()
      for (const outline of outlines) {
        outlineByOrder.set(outline.order_index, outline)
      }
      await db.bookImportTaskChapter.createMany({
        data: chapters.map(chapter => {
          const matchedOutline = outlineByOrder.get(chapter.chapter_number)
          const err = failedChapterErrors[chapter.chapter_number]
          return {
            taskId: task.taskId,
            chapterNumber: chapter.chapter_number,
            title: chapter.title,
            content: chapter.content,
            summary: chapter.summary ?? null,
            outlineTitle: chapter.outline_title ?? chapter.title,
            outlineContent:
              matchedOutline?.content ?? chapter.summary ?? buildSummary(chapter.content),
            outlineStructure: matchedOutline?.structure ? JSON.stringify(matchedOutline.structure) : Prisma.JsonNull,
            status: err ? 'failed' : 'ready',
            error: err ? err.slice(0, 2000) : null,
          }
        }),
      })
    } catch (e) {
      console.warn('[book-import] persist preview chapters failed', e)
    }
  }

  async retryFailedChapters(
    taskId: string,
    userId: string,
    chapterNumbers?: number[],
  ): Promise<{ retried: number; remaining_failed: number }> {
    await this.taskManager.getOrThrow(taskId, userId)
    const where = {
      taskId,
      status: 'failed',
      ...(chapterNumbers && chapterNumbers.length > 0
        ? { chapterNumber: { in: chapterNumbers } }
        : {}),
    }
    const failedRows = await db.bookImportTaskChapter.findMany({ where })
    for (const row of failedRows) {
      const fallbackSummary = row.summary || buildSummary(row.content || '')
      await db.bookImportTaskChapter.update({
        where: {
          taskId_chapterNumber: { taskId, chapterNumber: row.chapterNumber },
        },
        data: {
          summary: fallbackSummary,
          outlineTitle: row.outlineTitle || row.title,
          outlineContent: row.outlineContent || fallbackSummary,
          status: 'ready',
          error: null,
        },
      })
    }
    const remaining_failed = await db.bookImportTaskChapter.count({
      where: { taskId, status: 'failed' },
    })
    return { retried: failedRows.length, remaining_failed }
  }

  async updateStagingChapter(
    taskId: string,
    userId: string,
    chapterNumber: number,
    patch: Partial<Pick<BookImportChapter, 'title' | 'summary' | 'content'>>,
  ): Promise<void> {
    await this.taskManager.getOrThrow(taskId, userId)
    const updates: {
      title?: string
      summary?: string | null
      content?: string
      outlineTitle?: string
      outlineContent?: string | null
    } = {}

    if (typeof patch.title === 'string') {
      updates.title = patch.title
      updates.outlineTitle = patch.title
    }
    if (typeof patch.summary === 'string' || patch.summary === null) {
      updates.summary = patch.summary ?? null
      updates.outlineContent = patch.summary ?? null
    }
    if (typeof patch.content === 'string') {
      updates.content = patch.content
    }
    if (Object.keys(updates).length === 0) return

    await db.bookImportTaskChapter.update({
      where: {
        taskId_chapterNumber: { taskId, chapterNumber },
      },
      data: updates,
    })
  }

  private checkCancelled(task: InternalTask) {
    if (task.cancelled || task.status === 'cancelled') {
      throw new TaskCancelledError()
    }
  }

  private async runPipeline(taskId: string, fileContent: Buffer): Promise<void> {
    const task = this.taskManager.get(taskId)
    if (!task) return

    try {
      this.taskManager.setState(task, {
        status: 'running',
        progress: 5,
        message: '正在识别编码并读取文本...',
      })
      this.checkCancelled(task)

      const { text, encoding } = decodeBytes(fileContent)
      const cleaned = cleanText(text)

      this.taskManager.setState(task, {
        status: 'running',
        progress: 10,
        message: `文本清洗完成（编码：${encoding}）`,
      })
      this.checkCancelled(task)

      this.taskManager.setState(task, {
        status: 'running',
        progress: 11,
        message: '正在识别章节标题版式…',
      })
      this.checkCancelled(task)

      let headingStrongPatterns: RegExp[] | undefined
      try {
        const headingSample = buildChapterHeadingSample(cleaned)
        const headingPrompt = formatPrompt(BOOK_IMPORT_CHAPTER_HEADING_PRESETS, {
          sample: headingSample,
        })
        const headingObj = await callWithJsonObject(task.userId, headingPrompt, {
          maxTokens: 512,
          temperature: 0.2,
        })
        console.info('[book-import] chapter heading LLM JSON:', headingObj)

        const parsed = parseHeadingInferenceObject(headingObj)
        console.info('[book-import] chapter heading parsed:', parsed)

        const mapped =
          parsed.mode === 'presets' ? strongPatternsFromPresets(parsed.presets) : null
        const validation =
          mapped && mapped.length > 0
            ? diagnoseStrongPatternValidation(cleaned, mapped)
            : null
        console.info('[book-import] chapter heading mapped regex sources:', {
          presetIds: parsed.mode === 'presets' ? parsed.presets : [],
          regexSources: mapped?.map(r => r.source) ?? [],
          validation,
        })

        const inferred = strongPatternsFromInference(parsed, cleaned)
        console.info('[book-import] chapter heading apply custom strong patterns:', {
          applied: Boolean(inferred),
        })
        if (inferred) {
          headingStrongPatterns = inferred
        }
      } catch (e) {
        console.warn('[book-import] chapter heading inference skipped', e)
      }

      const chaptersData = splitChapters(
        cleaned,
        headingStrongPatterns
          ? { strongPatterns: headingStrongPatterns }
          : undefined,
      )
      console.info('[book-import] chapter split result:', {
        chapterCount: chaptersData.length,
        usedLlmStrongPatterns: Boolean(headingStrongPatterns),
      })
      if (chaptersData.length === 0) {
        throw new Error('未能识别到有效章节，请检查TXT内容')
      }

      this.taskManager.setState(task, {
        status: 'running',
        progress: 15,
        message: `已识别 ${chaptersData.length} 个章节，正在构建预览结构...`,
      })
      this.checkCancelled(task)

      this.taskManager.setState(task, {
        status: 'running',
        progress: 18,
        message: '正在构建全量章节预览结构...',
      })

      const preview = await buildPreview(task, chaptersData, task.filename)
      this.checkCancelled(task)
      task.preview = preview

      await this.persistPreviewChapters(
        task,
        preview.chapters,
        preview.outlines,
        {},
      )

      this.taskManager.setState(task, {
        status: 'completed',
        progress: 100,
        message: '解析完成，可预览并确认导入',
      })
    } catch (e) {
      if (e instanceof TaskCancelledError) {
        this.taskManager.setState(task, {
          status: 'cancelled',
          progress: task.progress,
          message: '任务已取消',
        })
        return
      }
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[book-import] runPipeline failed', e)
      this.taskManager.setState(task, {
        status: 'failed',
        progress: task.progress,
        message: '解析失败',
        error: msg,
      })
    }
  }
}

export const bookImportService = new BookImportService()
