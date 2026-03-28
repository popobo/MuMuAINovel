import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { completeWithUserOrEnv } from '@/lib/ai/complete-with-user-settings'
import {
  buildChapterHeadingSample,
  diagnoseStrongPatternValidation,
  parseHeadingInferenceObject,
  strongPatternsFromInference,
  strongPatternsFromPresets,
} from '@/lib/book-import/chapter-heading-inference'
import {
  BOOK_IMPORT_CHAPTER_HEADING_PRESETS,
  BOOK_IMPORT_REVERSE_OUTLINES,
  BOOK_IMPORT_REVERSE_PROJECT_SUGGESTION,
  BOOK_IMPORT_CHARACTERS_AND_RELATIONSHIPS,
  BOOK_IMPORT_WORLD_BUILDING,
  formatPrompt,
} from '@/lib/book-import/prompts'
import { parseJsonArrayFromModelText, parseJsonObjectFromModelText } from '@/lib/book-import/parse-ai-json'
import {
  buildFallbackOutlineStructure,
  buildFallbackProjectSuggestion,
  buildReverseOutlineChaptersText,
  buildSummary,
  deriveWorldSettings,
  extractNarrativePerspective,
  normalizeReverseOutlineBatch,
  normalizeTargetWords,
  stripChapterPrefix,
} from '@/lib/book-import/metadata'
import { cleanText, decodeBytes, splitChapters } from '@/lib/book-import/txt-parser'
import type {
  BookImportApplyRequest,
  BookImportApplyResponse,
  BookImportChapter,
  BookImportOutline,
  BookImportPreviewResponse,
  BookImportTaskCreateResponse,
  BookImportTaskStatusResponse,
  BookImportWarning,
  OutlineStructure,
  ProjectSuggestion,
} from '@/lib/book-import/types'

export class BookImportError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message)
    this.name = 'BookImportError'
  }
}

class TaskCancelledError extends Error {
  constructor() {
    super('任务已取消')
    this.name = 'TaskCancelledError'
  }
}

type InternalTask = {
  taskId: string
  userId: string
  filename: string
  status: BookImportTaskStatusResponse['status']
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

const MAX_TXT_BYTES = 50 * 1024 * 1024

async function callWithJsonObject(
  userId: string,
  prompt: string,
  opts?: { maxTokens?: number; temperature?: number },
): Promise<Record<string, unknown>> {
  let lastErr: Error = new Error('AI JSON 解析失败')
  const maxTokens = opts?.maxTokens ?? 4096
  const temperature = opts?.temperature ?? 0.35
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { content } = await completeWithUserOrEnv(
        userId,
        [{ role: 'user', content: prompt }],
        { maxTokens, temperature },
      )
      return parseJsonObjectFromModelText(content)
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
    }
  }
  throw lastErr
}

async function callWithJsonArray(userId: string, prompt: string): Promise<unknown[]> {
  let lastErr: Error = new Error('AI JSON 解析失败')
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { content } = await completeWithUserOrEnv(
        userId,
        [{ role: 'user', content: prompt }],
        { maxTokens: 8192,
          temperature: 0.35 },
      )
      return parseJsonArrayFromModelText(content)
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
    }
  }
  throw lastErr
}

function basenameStem(name: string): string {
  const base = name.replace(/\\/g, '/').split('/').pop() ?? name
  const dot = base.lastIndexOf('.')
  return dot === -1 ? base : base.slice(0, dot)
}

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
    const structure = buildFallbackOutlineStructure(chapter)
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
  private readonly tasks = new Map<string, InternalTask>()

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

    const taskId = randomUUID()
    const now = new Date()
    const task: InternalTask = {
      taskId,
      userId: params.userId,
      filename: params.filename,
      status: 'pending',
      progress: 0,
      message: '任务已创建',
      error: null,
      createdAt: now,
      updatedAt: now,
      preview: null,
      cancelled: false,
      importedProjectId: null,
      failedSteps: [],
    }
    this.tasks.set(taskId, task)
    await this.persistTask(task)

    void this.runPipeline(taskId, params.fileContent).catch(err => {
      console.error('[book-import] pipeline error', err)
    })

    return { task_id: taskId, status: 'pending' }
  }

  async getTaskStatus(taskId: string, userId: string): Promise<BookImportTaskStatusResponse> {
    const task = await this.getTaskOrThrow(taskId, userId)
    return this.toStatus(task)
  }

  async getLatestActiveTaskStatus(userId: string): Promise<BookImportTaskStatusResponse | null> {
    const memTasks = [...this.tasks.values()]
      .filter(task => task.userId === userId && !task.importedProjectId)
      .filter(task => ['pending', 'running', 'completed'].includes(task.status))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    if (memTasks.length > 0) {
      return this.toStatus(memTasks[0]!)
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
    const task = await this.getTaskOrThrow(taskId, userId)
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

  /** 供重试 SSE 等场景读取最近一次导入成功的项目 ID */
  async getImportedProjectId(taskId: string, userId: string): Promise<string | null> {
    const task = this.tasks.get(taskId)
    if (task && task.userId === userId) return task.importedProjectId
    const dbTask = await db.bookImportTask.findUnique({
      where: { taskId },
      select: { userId: true, importedProjectId: true },
    })
    if (!dbTask || dbTask.userId !== userId) return null
    return dbTask.importedProjectId
  }

  async cancelTask(taskId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const task = await this.getTaskOrThrow(taskId, userId)
    if (['completed', 'failed', 'cancelled'].includes(task.status)) {
      return { success: true, message: `任务已是终态：${task.status}` }
    }
    task.cancelled = true
    this.setTaskState(task, {
      status: 'cancelled',
      progress: task.progress,
      message: '任务已取消',
    })
    await this.persistTask(task)
    return { success: true, message: '取消成功' }
  }

  async applyImport(
    taskId: string,
    userId: string,
    payload: BookImportApplyRequest,
  ): Promise<BookImportApplyResponse> {
    const task = await this.getTaskOrThrow(taskId, userId)
    if (task.status !== 'completed') {
      throw new BookImportError('任务未完成，无法导入', 400)
    }

    const statistics: Record<string, number> = {
      chapters: 0,
      outlines: 0,
      generated_world_building: 0,
      generated_careers: 0,
      generated_entities: 0,
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

    // Generate characters and relationships
    this.setTaskState(task, {
      status: 'running',
      progress: 95,
      message: '正在生成角色和关系信息...',
    })

    try {
      await this.generateCharactersAndRelationships(
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

    // Generate world building details
    this.setTaskState(task, {
      status: 'running',
      progress: 97,
      message: '正在生成详细世界观设定...',
    })

    try {
      await this.generateWorldBuilding(
        task.userId,
        project.id,
        payload.project_suggestion,
        chaptersToImport,
        outlinesToImport,
      )
    } catch (e) {
      console.warn('[book-import] world building generation failed', e)
    }

    task.importedProjectId = project.id
    task.failedSteps = []
    await this.persistTask(task)

    return {
      success: true,
      project_id: project.id,
      statistics,
      warnings,
    }
  }

  private async getTaskOrThrow(taskId: string, userId: string): Promise<InternalTask> {
    const memTask = this.tasks.get(taskId)
    if (memTask) {
      if (memTask.userId !== userId) {
        throw new BookImportError('无权访问该任务', 403)
      }
      return memTask
    }

    const dbTask = await db.bookImportTask.findUnique({ where: { taskId } })
    if (!dbTask) {
      throw new BookImportError('任务不存在', 404)
    }
    if (dbTask.userId !== userId) {
      throw new BookImportError('无权访问该任务', 403)
    }

    const hydrated: InternalTask = {
      taskId: dbTask.taskId,
      userId: dbTask.userId,
      filename: dbTask.filename,
      status: dbTask.status as InternalTask['status'],
      progress: dbTask.progress,
      message: dbTask.message,
      error: dbTask.error,
      createdAt: dbTask.createdAt,
      updatedAt: dbTask.updatedAt,
      preview: (dbTask.preview as BookImportPreviewResponse | null) ?? null,
      cancelled: dbTask.cancelled,
      importedProjectId: dbTask.importedProjectId,
      failedSteps:
        (dbTask.failedSteps as InternalTask['failedSteps'] | null) ?? [],
    }
    this.tasks.set(taskId, hydrated)
    return hydrated
  }

  private toStatus(task: InternalTask): BookImportTaskStatusResponse {
    return {
      task_id: task.taskId,
      status: task.status,
      progress: task.progress,
      message: task.message,
      error: task.error,
      created_at: task.createdAt.toISOString(),
      updated_at: task.updatedAt.toISOString(),
    }
  }

  private setTaskState(
    task: InternalTask,
    params: {
      status: InternalTask['status']
      progress: number
      message: string | null
      error?: string | null
    },
  ) {
    task.status = params.status
    task.progress = Math.max(0, Math.min(100, params.progress))
    task.message = params.message
    task.error = params.error ?? null
    task.updatedAt = new Date()
    void this.persistTask(task)
  }

  private async persistTask(task: InternalTask): Promise<void> {
    try {
      await db.bookImportTask.upsert({
        where: { taskId: task.taskId },
        create: {
          taskId: task.taskId,
          userId: task.userId,
          filename: task.filename,
          status: task.status,
          progress: task.progress,
          message: task.message,
          error: task.error,
          preview: task.preview as unknown as Prisma.InputJsonValue,
          cancelled: task.cancelled,
          importedProjectId: task.importedProjectId,
          failedSteps: task.failedSteps as unknown as Prisma.InputJsonValue,
          createdAt: task.createdAt,
        },
        update: {
          status: task.status,
          progress: task.progress,
          message: task.message,
          error: task.error,
          preview: task.preview as unknown as Prisma.InputJsonValue,
          cancelled: task.cancelled,
          importedProjectId: task.importedProjectId,
          failedSteps: task.failedSteps as unknown as Prisma.InputJsonValue,
          updatedAt: task.updatedAt,
        },
      })
    } catch (e) {
      console.warn('[book-import] persist task failed', e)
    }
  }

  private async persistPreviewChapters(
    taskId: string,
    chapters: BookImportChapter[],
    outlines: BookImportOutline[],
    failedChapterErrors: Record<number, string> = {},
  ): Promise<void> {
    try {
      await db.bookImportTaskChapter.deleteMany({ where: { taskId } })
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
            taskId,
            chapterNumber: chapter.chapter_number,
            title: chapter.title,
            content: chapter.content,
            summary: chapter.summary ?? null,
            outlineTitle: chapter.outline_title ?? chapter.title,
            outlineContent:
              matchedOutline?.content ?? chapter.summary ?? buildSummary(chapter.content),
            outlineStructure: (matchedOutline?.structure ?? null) as unknown as Prisma.InputJsonValue,
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
    await this.getTaskOrThrow(taskId, userId)
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
    await this.getTaskOrThrow(taskId, userId)
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
    const task = this.tasks.get(taskId)
    if (!task) return

    try {
      this.setTaskState(task, {
        status: 'running',
        progress: 5,
        message: '正在识别编码并读取文本...',
      })
      this.checkCancelled(task)

      const { text, encoding } = decodeBytes(fileContent)
      const cleaned = cleanText(text)

      this.setTaskState(task, {
        status: 'running',
        progress: 10,
        message: `文本清洗完成（编码：${encoding}）`,
      })
      this.checkCancelled(task)

      this.setTaskState(task, {
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

      this.setTaskState(task, {
        status: 'running',
        progress: 15,
        message: `已识别 ${chaptersData.length} 个章节，正在构建预览结构...`,
      })
      this.checkCancelled(task)

      this.setTaskState(task, {
        status: 'running',
        progress: 18,
        message: '正在构建全量章节预览结构...',
      })

      const preview = await this.buildPreview(task, chaptersData)
      this.checkCancelled(task)
      task.preview = preview
      this.setTaskState(task, {
        status: 'completed',
        progress: 100,
        message: '解析完成，可预览并确认导入',
      })
    } catch (e) {
      if (e instanceof TaskCancelledError) {
        this.setTaskState(task, {
          status: 'cancelled',
          progress: task.progress,
          message: '任务已取消',
        })
        return
      }
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[book-import] runPipeline failed', e)
      this.setTaskState(task, {
        status: 'failed',
        progress: task.progress,
        message: '解析失败',
        error: msg,
      })
    }
  }

  private async buildPreview(
    task: InternalTask,
    chaptersData: Array<{ title: string; content: string; chapter_number: number }>,
  ): Promise<BookImportPreviewResponse> {
    const stem = basenameStem(task.filename).slice(0, 200) || '拆书导入项目'
    let suggestion: ProjectSuggestion = {
      title: stem,
      description: '由拆书功能自动生成，可在导入前修改',
      theme: null,
      genre: null,
      narrative_perspective: '第三人称',
      target_words: 100000,
    }

    const chapters: BookImportChapter[] = []
    const warnings: BookImportWarning[] = []

    const selectedRaw = chaptersData
    const selectedTotal = selectedRaw.length

    const titleCount = new Map<string, number>()
    for (let idx = 0; idx < selectedRaw.length; idx++) {
      const chapter = selectedRaw[idx]!
      const rawTitle = (chapter.title || `第${idx + 1}章`).trim().slice(0, 200)
      const title = stripChapterPrefix(rawTitle).slice(0, 200)
      const content = (chapter.content || '').trim()
      const summary = buildSummary(content)

      chapters.push({
        title,
        content,
        summary,
        chapter_number: idx + 1,
        outline_title: title,
      })

      titleCount.set(title, (titleCount.get(title) ?? 0) + 1)
      if (content.length < 300) {
        warnings.push({
          code: 'chapter_too_short',
          message: `章节「${title}」内容较短，建议检查切分结果`,
          level: 'warning',
        })
      }
      if (content.length > 12000) {
        warnings.push({
          code: 'chapter_too_long',
          message: `章节「${title}」内容较长，建议确认是否应继续拆分`,
          level: 'info',
        })
      }

      const chapterProgress = 18 + Math.floor((2 * (idx + 1)) / Math.max(1, selectedTotal))
      if (
        (idx + 1) % Math.max(1, Math.floor(selectedTotal / 5)) === 0 ||
        idx + 1 === selectedTotal
      ) {
        this.setTaskState(task, {
          status: 'running',
          progress: chapterProgress,
          message: `已处理章节 ${idx + 1}/${selectedTotal} 个章节结构...`,
        })
      }
    }

    for (const [title, count] of titleCount) {
      if (count > 1) {
        warnings.push({
          code: 'duplicate_chapter_title',
          message: `检测到重复章节标题「${title}」共 ${count} 次`,
          level: 'warning',
        })
      }
    }

    this.setTaskState(task, {
      status: 'running',
      progress: 20,
      message: '正在调用AI反向生成项目信息（标题/简介/主题/类型）...',
    })

    suggestion = await this.generateReverseProjectSuggestion(
      task.userId,
      suggestion,
      chapters,
      task,
    )

    const { outlines, failedChapterErrors } = await this.generateReverseOutlines(
      task.userId,
      suggestion,
      chapters,
      task,
    )
    await this.persistPreviewChapters(
      task.taskId,
      chapters,
      outlines,
      failedChapterErrors,
    )

    if (Object.keys(failedChapterErrors).length > 0) {
      const n = Object.keys(failedChapterErrors).length
      warnings.push({
        code: 'outline_ai_partial_failed',
        message: `部分章节 AI 反向大纲失败或返回不完整，已用规则大纲占位，共 ${n} 章可在预览中重试`,
        level: 'warning',
      })
    }

    return {
      task_id: task.taskId,
      project_suggestion: suggestion,
      chapters,
      outlines,
      warnings,
    }
  }

  private async generateReverseProjectSuggestion(
    userId: string,
    suggestion: ProjectSuggestion,
    chapters: BookImportChapter[],
    task: InternalTask,
  ): Promise<ProjectSuggestion> {
    const fallback = buildFallbackProjectSuggestion(suggestion.title, chapters)

    const sampledChapters = chapters.slice(0, 3)
    const sampledText = sampledChapters
      .map(
        (ch, idx) =>
          `【第${idx + 1}章 ${ch.title}】\n${(ch.content || '').slice(0, 2000)}`,
      )
      .join('\n\n')
      .trim()

    if (!sampledText) {
      this.setTaskState(task, {
        status: 'running',
        progress: 95,
        message: '文本样本不足，使用规则推断项目信息',
      })
      return fallback
    }

    let ticker: ReturnType<typeof setInterval> | undefined
    try {
      this.setTaskState(task, {
        status: 'running',
        progress: 25,
        message: '正在初始化AI服务...',
      })

      const prompt = formatPrompt(BOOK_IMPORT_REVERSE_PROJECT_SUGGESTION, {
        title: suggestion.title || '拆书导入项目',
        sampled_text: sampledText,
      })

      this.setTaskState(task, {
        status: 'running',
        progress: 30,
        message: '正在准备AI提示词...',
      })

      let tickProgress = 35
      const messages = [
        'AI正在分析文本内容...',
        'AI正在识别故事主题与类型...',
        'AI正在推断叙事角度...',
        'AI正在生成项目简介...',
        'AI正在整理生成结果...',
      ]
      let msgIdx = 0
      ticker = setInterval(() => {
        if (tickProgress >= 85) return
        tickProgress = Math.min(tickProgress + 5, 85)
        const msg = messages[Math.min(msgIdx, messages.length - 1)]!
        msgIdx += 1
        this.setTaskState(task, {
          status: 'running',
          progress: tickProgress,
          message: msg,
        })
      }, 2000)

      this.setTaskState(task, {
        status: 'running',
        progress: 35,
        message: 'AI正在分析文本内容...',
      })

      const projectData = await callWithJsonObject(userId, prompt)

      if (ticker) {
        clearInterval(ticker)
        ticker = undefined
      }

      this.setTaskState(task, {
        status: 'running',
        progress: 90,
        message: 'AI生成完成，正在整理项目信息...',
      })

      const result: ProjectSuggestion = {
        title: suggestion.title,
        description: String(
          projectData.description ?? fallback.description ?? '',
        ).trim(),
        theme: String(projectData.theme ?? fallback.theme ?? '').trim() || fallback.theme,
        genre: String(projectData.genre ?? fallback.genre ?? '').trim() || fallback.genre,
        narrative_perspective: extractNarrativePerspective(
          projectData,
          fallback.narrative_perspective,
        ),
        target_words: normalizeTargetWords(
          projectData.target_words,
          fallback.target_words,
        ),
      }

      this.setTaskState(task, {
        status: 'running',
        progress: 95,
        message: '项目信息生成完毕，准备预览...',
      })

      return result
    } catch (e) {
      if (ticker) clearInterval(ticker)
      console.warn('[book-import] reverse project suggestion failed', e)
      this.setTaskState(task, {
        status: 'running',
        progress: 95,
        message: 'AI生成失败，使用规则推断项目信息',
      })
      return fallback
    }
  }

  private async generateReverseOutlines(
    userId: string,
    suggestion: ProjectSuggestion,
    chapters: BookImportChapter[],
    task: InternalTask,
  ): Promise<{
    outlines: BookImportOutline[]
    failedChapterErrors: Record<number, string>
  }> {
    if (chapters.length === 0) {
      return { outlines: [], failedChapterErrors: {} }
    }

    const failedChapterErrors: Record<number, string> = {}
    const markBatchFailed = (batch: BookImportChapter[], message: string) => {
      for (const ch of batch) {
        failedChapterErrors[ch.chapter_number] = message
      }
    }

    this.setTaskState(task, {
      status: 'running',
      progress: 95,
      message: '正在反向生成章节大纲（分批5章）...',
    })

    const batchSize = 5
    const totalBatches = Math.ceil(chapters.length / batchSize)
    const structures: OutlineStructure[] = chapters.map(ch =>
      buildFallbackOutlineStructure(ch),
    )

    for (let batchIdx = 0, start = 0; start < chapters.length; batchIdx++, start += batchSize) {
      const batch = chapters.slice(start, start + batchSize)
      if (batch.length === 0) break

      const startChapter = batch[0]!.chapter_number
      const endChapter = batch[batch.length - 1]!.chapter_number
      const chaptersText = buildReverseOutlineChaptersText(batch)
      const expectedCount = batch.length

      const progress = 95 + Math.floor((3 * batchIdx) / Math.max(1, totalBatches))
      this.setTaskState(task, {
        status: 'running',
        progress,
        message: `正在生成大纲批次 ${batchIdx + 1}/${totalBatches}（第${startChapter}-${endChapter}章）...`,
      })

      const prompt = formatPrompt(BOOK_IMPORT_REVERSE_OUTLINES, {
        title: suggestion.title || '拆书导入项目',
        genre: suggestion.genre || '通用',
        theme: suggestion.theme || '未设定',
        narrative_perspective: suggestion.narrative_perspective || '第三人称',
        start_chapter: startChapter,
        end_chapter: endChapter,
        expected_count: expectedCount,
        chapters_text: chaptersText,
      })

      try {
        const aiData = await callWithJsonArray(userId, prompt)
        const aiItems = Array.isArray(aiData) ? aiData : []
        const normalizedBatch = normalizeReverseOutlineBatch(aiData, batch)

        for (let i = 0; i < batch.length; i++) {
          const chapter = batch[i]!
          const globalIdx = start + i
          const slot = i < aiItems.length ? aiItems[i] : undefined
          const slotOk =
            slot !== undefined &&
            slot !== null &&
            typeof slot === 'object' &&
            !Array.isArray(slot)

          if (!slotOk) {
            failedChapterErrors[chapter.chapter_number] =
              'AI 返回的大纲条目缺失或格式无效，已使用规则大纲占位'
          }

          structures[globalIdx] = normalizedBatch[i]!
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        const short = msg.slice(0, 500)
        console.warn('[book-import] reverse outline batch failed', short)
        markBatchFailed(batch, `AI 反向大纲生成失败：${short}`)
        for (let i = 0; i < batch.length; i++) {
          const chapter = batch[i]!
          const globalIdx = start + i
          structures[globalIdx] = buildFallbackOutlineStructure(chapter)
        }
      }
    }

    const outlines: BookImportOutline[] = chapters.map((chapter, i) => {
      const structure = structures[i] ?? buildFallbackOutlineStructure(chapter)
      const summary = String(structure.summary ?? '').trim()
      return {
        title: chapter.title,
        content: summary,
        order_index: chapter.chapter_number,
        structure: structure as unknown as Record<string, unknown>,
      }
    })

    this.setTaskState(task, {
      status: 'running',
      progress: 99,
      message: '大纲反向生成完成，正在整理预览...',
    })

    if (Object.keys(failedChapterErrors).length === chapters.length) {
      this.setTaskState(task, {
        status: 'running',
        progress: 99,
        message: 'AI 大纲全部批次失败，已使用规则大纲',
      })
    }

    return { outlines, failedChapterErrors }
  }

  private async generateCharactersAndRelationships(
    userId: string,
    projectId: string,
    suggestion: ProjectSuggestion,
    chapters: BookImportChapter[],
    outlines: BookImportOutline[],
  ): Promise<void> {
    if (chapters.length === 0) return

    // Extract all characters from outline structures
    const characterSet = new Set<string>()
    const characterAppearances: Map<string, number[]> = new Map()

    for (let idx = 0; idx < outlines.length; idx++) {
      const outline = outlines[idx]
      if (outline.structure && typeof outline.structure === 'object') {
        const structure = outline.structure as Record<string, unknown>
        const characters = structure.characters as Array<{ name: string; type: string }> | undefined
        if (Array.isArray(characters)) {
          for (const char of characters) {
            if (char.type === 'character' && char.name && char.name.trim()) {
              const name = char.name.trim()
              characterSet.add(name)
              const appearances = characterAppearances.get(name) || []
              appearances.push(idx + 1) // Chapter numbers are 1-indexed
              characterAppearances.set(name, appearances)
            }
          }
        }
      }
    }

    if (characterSet.size === 0) {
      console.info('[book-import] no characters found in outlines')
      return
    }

    const characterList = Array.from(characterSet).slice(0, 20) // Limit to 20 main characters

    // Prepare chapter samples for AI (first 5 chapters)
    const sampleChapters = chapters.slice(0, 5)
    const chapterSamples = sampleChapters
      .map((ch, idx) => `【第${idx + 1}章 ${ch.title}】\n${(ch.content || '').slice(0, 1500)}`)
      .join('\n\n')

    // Prepare character appearances data
    const characterAppearancesText = characterList
      .map(name => {
        const chapters = characterAppearances.get(name) || []
        return `${name}: 出现于第${chapters.join('、')}章`
      })
      .join('\n')

    const prompt = formatPrompt(BOOK_IMPORT_CHARACTERS_AND_RELATIONSHIPS, {
      title: suggestion.title || '拆书导入项目',
      genre: suggestion.genre || '通用',
      theme: suggestion.theme || '未设定',
      narrative_perspective: suggestion.narrative_perspective || '第三人称',
      character_list: characterList.join('、'),
      chapter_samples: chapterSamples,
      character_appearances: characterAppearancesText,
    })

    try {
      const aiData = await callWithJsonObject(userId, prompt, {
        maxTokens: 4096,
        temperature: 0.3,
      })

      // Create characters
      const charactersRaw = aiData.characters as Array<Record<string, unknown>> | undefined
      if (Array.isArray(charactersRaw) && charactersRaw.length > 0) {
        const nameToId = new Map<string, string>()

        for (const charData of charactersRaw) {
          const name = String(charData.name || '').trim()
          if (!name) continue

          const character = await db.character.create({
            data: {
              projectId,
              name: name.slice(0, 100),
              nickname: charData.nickname ? String(charData.nickname).slice(0, 100) : null,
              age: charData.age && typeof charData.age === 'number' ? charData.age : null,
              gender: charData.gender ? String(charData.gender).slice(0, 20) : null,
              appearance: charData.appearance ? String(charData.appearance).slice(0, 2000) : null,
              personality: charData.personality ? String(charData.personality).slice(0, 2000) : null,
              background: charData.background ? String(charData.background).slice(0, 3000) : null,
              role: charData.role ? String(charData.role).slice(0, 50) : null,
            },
          })
          nameToId.set(name, character.id)
        }

        // Create relationships
        const relationshipsRaw = aiData.relationships as Array<Record<string, unknown>> | undefined
        if (Array.isArray(relationshipsRaw)) {
          for (const relData of relationshipsRaw) {
            const char1Name = String(relData.character1 || '').trim()
            const char2Name = String(relData.character2 || '').trim()

            if (!char1Name || !char2Name || char1Name === char2Name) continue

            const char1Id = nameToId.get(char1Name)
            const char2Id = nameToId.get(char2Name)

            if (!char1Id || !char2Id) continue

            // Check if relationship already exists
            const existing = await db.relationship.findUnique({
              where: {
                characterId_relatedId: {
                  characterId: char1Id,
                  relatedId: char2Id,
                },
              },
            })

            if (existing) continue

            await db.relationship.create({
              data: {
                characterId: char1Id,
                relatedId: char2Id,
                relationshipType: String(relData.type || '未知').slice(0, 50),
                description: relData.description ? String(relData.description).slice(0, 1000) : null,
                strength: typeof relData.strength === 'number' ? Math.max(1, Math.min(100, relData.strength)) : 50,
              },
            })
          }
        }

        console.info(`[book-import] created ${charactersRaw.length} characters and ${relationshipsRaw?.length || 0} relationships`)
      }
    } catch (e) {
      console.warn('[book-import] AI character generation failed, using fallback', e)
      // Fallback: create basic characters from extracted names
      await this.createFallbackCharacters(projectId, characterList, characterAppearances)
    }
  }

  private async createFallbackCharacters(
    projectId: string,
    characterNames: string[],
    characterAppearances: Map<string, number[]>,
  ): Promise<void> {
    const nameToId = new Map<string, string>()

    for (const name of characterNames) {
      const appearances = characterAppearances.get(name) || []
      const character = await db.character.create({
        data: {
          projectId,
          name: name.slice(0, 100),
          role: appearances.length > 5 ? '主要角色' : '配角',
          background: `出现在第${appearances.join('、')}章`,
        },
      })
      nameToId.set(name, character.id)
    }

    // Create basic relationships based on co-appearance
    const appearanceThreshold = 3 // Characters appearing in 3+ same chapters get a relationship
    for (let i = 0; i < characterNames.length; i++) {
      for (let j = i + 1; j < characterNames.length; j++) {
        const char1Appearances = new Set(characterAppearances.get(characterNames[i]) || [])
        const char2Appearances = new Set(characterAppearances.get(characterNames[j]) || [])

        let coAppearances = 0
        for (const chapter of char1Appearances) {
          if (char2Appearances.has(chapter)) coAppearances++
        }

        if (coAppearances >= appearanceThreshold) {
          const char1Id = nameToId.get(characterNames[i])
          const char2Id = nameToId.get(characterNames[j])

          if (char1Id && char2Id) {
            await db.relationship.create({
              data: {
                characterId: char1Id,
                relatedId: char2Id,
                relationshipType: '相识',
                description: `共同出现在${coAppearances}个章节中`,
                strength: Math.min(60, coAppearances * 10),
              },
            })
          }
        }
      }
    }

    console.info(`[book-import] created ${characterNames.length} fallback characters`)
  }

  private async generateWorldBuilding(
    userId: string,
    projectId: string,
    suggestion: ProjectSuggestion,
    chapters: BookImportChapter[],
    outlines: BookImportOutline[],
  ): Promise<void> {
    if (chapters.length === 0) return

    // Extract organizations from outline structures
    const organizationSet = new Set<string>()
    const organizationAppearances: Map<string, number[]> = new Map()

    for (let idx = 0; idx < outlines.length; idx++) {
      const outline = outlines[idx]
      if (outline.structure && typeof outline.structure === 'object') {
        const structure = outline.structure as Record<string, unknown>
        const characters = structure.characters as Array<{ name: string; type: string }> | undefined
        if (Array.isArray(characters)) {
          for (const char of characters) {
            if (char.type === 'organization' && char.name && char.name.trim()) {
              const name = char.name.trim()
              organizationSet.add(name)
              const appearances = organizationAppearances.get(name) || []
              appearances.push(idx + 1)
              organizationAppearances.set(name, appearances)
            }
          }
        }
      }
    }

    const organizations = Array.from(organizationSet).slice(0, 15)
    const organizationsText = organizations
      .map(name => {
        const chapters = organizationAppearances.get(name) || []
        return `${name}: 出现于第${chapters.join('、')}章`
      })
      .join('\n')

    // Prepare chapter samples (first 3 chapters)
    const sampleChapters = chapters.slice(0, 3)
    const chapterSamples = sampleChapters
      .map((ch, idx) => `【第${idx + 1}章 ${ch.title}】\n${(ch.content || '').slice(0, 2000)}`)
      .join('\n\n')

    const prompt = formatPrompt(BOOK_IMPORT_WORLD_BUILDING, {
      title: suggestion.title || '拆书导入项目',
      genre: suggestion.genre || '通用',
      theme: suggestion.theme || '未设定',
      time_period: '待详细设定',
      location: '待详细设定',
      atmosphere: '待详细设定',
      chapter_samples: chapterSamples,
      organizations: organizationsText || '未识别到具体组织',
    })

    try {
      const aiData = await callWithJsonObject(userId, prompt, {
        maxTokens: 4096,
        temperature: 0.3,
      })

      // Update project world building fields
      const worldUpdate: {
        worldTimePeriod?: string
        worldLocation?: string
        worldAtmosphere?: string
        worldRules?: string
      } = {}

      if (aiData.world_time_period && typeof aiData.world_time_period === 'string') {
        worldUpdate.worldTimePeriod = aiData.world_time_period.slice(0, 2000)
      }
      if (aiData.world_location && typeof aiData.world_location === 'string') {
        worldUpdate.worldLocation = aiData.world_location.slice(0, 2000)
      }
      if (aiData.world_atmosphere && typeof aiData.world_atmosphere === 'string') {
        worldUpdate.worldAtmosphere = aiData.world_atmosphere.slice(0, 1500)
      }
      if (aiData.world_rules && typeof aiData.world_rules === 'string') {
        worldUpdate.worldRules = aiData.world_rules.slice(0, 2000)
      }

      if (Object.keys(worldUpdate).length > 0) {
        await db.project.update({
          where: { id: projectId },
          data: worldUpdate,
        })
      }

      // Create locations
      const locationsRaw = aiData.locations as Array<Record<string, unknown>> | undefined
      if (Array.isArray(locationsRaw) && locationsRaw.length > 0) {
        for (const locData of locationsRaw) {
          const name = String(locData.name || '').trim()
          if (!name) continue

          await db.location.create({
            data: {
              projectId,
              name: name.slice(0, 100),
              type: String(locData.type || '未知').slice(0, 50),
              description: locData.description ? String(locData.description).slice(0, 2000) : null,
              climate: locData.climate ? String(locData.climate).slice(0, 100) : null,
              population: locData.population && typeof locData.population === 'number' ? locData.population : null,
              importance: typeof locData.importance === 'number' ? Math.max(1, Math.min(100, locData.importance)) : 50,
            },
          })
        }
      }

      // Create organizations
      const orgsRaw = aiData.organizations as Array<Record<string, unknown>> | undefined
      if (Array.isArray(orgsRaw) && orgsRaw.length > 0) {
        for (const orgData of orgsRaw) {
          const name = String(orgData.name || '').trim()
          if (!name) continue

          // Find location by name if specified
          let locationId: string | null = null
          if (orgData.location_name && typeof orgData.location_name === 'string') {
            const locationName = String(orgData.location_name).trim()
            const location = await db.location.findFirst({
              where: {
                projectId,
                name: { equals: locationName, mode: 'insensitive' },
              },
            })
            if (location) locationId = location.id
          }

          await db.organization.create({
            data: {
              projectId,
              name: name.slice(0, 100),
              type: String(orgData.type || '未知').slice(0, 50),
              description: orgData.description ? String(orgData.description).slice(0, 3000) : null,
              leader: orgData.leader ? String(orgData.leader).slice(0, 100) : null,
              size: typeof orgData.size === 'number' ? Math.max(1, Math.min(100, orgData.size)) : 50,
              influence: typeof orgData.influence === 'number' ? Math.max(1, Math.min(100, orgData.influence)) : 50,
              locationId,
            },
          })
        }
      }

      console.info(`[book-import] created world building: ${locationsRaw?.length || 0} locations, ${orgsRaw?.length || 0} organizations`)
    } catch (e) {
      console.warn('[book-import] AI world building generation failed, using basic info', e)
      // Continue with basic world info that was already set during project creation
    }
  }
}

export const bookImportService = new BookImportService()
