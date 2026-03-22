import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { completeWithUserOrEnv } from '@/lib/ai/complete-with-user-settings'
import {
  BOOK_IMPORT_REVERSE_OUTLINES,
  BOOK_IMPORT_REVERSE_PROJECT_SUGGESTION,
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
): Promise<Record<string, unknown>> {
  let lastErr: Error = new Error('AI JSON 解析失败')
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { content } = await completeWithUserOrEnv(
        userId,
        [{ role: 'user', content: prompt }],
        { maxTokens: 4096, temperature: 0.35 },
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

function trimLastTenForApply(
  chapters: BookImportChapter[],
  outlines: BookImportOutline[],
): {
  chapters: BookImportChapter[]
  outlines: BookImportOutline[]
  wasTrimmed: boolean
} {
  if (chapters.length === 0) {
    return { chapters: [], outlines: [], wasTrimmed: false }
  }

  const sortedChapters = [...chapters].sort((a, b) => a.chapter_number - b.chapter_number)
  const selected = sortedChapters.slice(-10)
  const wasTrimmed =
    sortedChapters.length > selected.length || outlines.length > 10

  const normalizedChapters: BookImportChapter[] = selected.map((item, idx) => ({
    title: item.title,
    content: item.content,
    summary: item.summary,
    chapter_number: idx + 1,
    outline_title: item.outline_title || item.title,
  }))

  const sortedOutlines = outlines.length
    ? [...outlines].sort((a, b) => a.order_index - b.order_index)
    : []
  let normalizedOutlines: BookImportOutline[] = []
  if (sortedOutlines.length > 0) {
    const selectedOutlines = sortedOutlines.slice(-normalizedChapters.length)
    normalizedOutlines = selectedOutlines.map((item, idx) => ({
      title: item.title,
      content: item.content,
      order_index: idx + 1,
      structure: item.structure,
    }))
  }

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
    wasTrimmed,
  }
}

export class BookImportService {
  private readonly tasks = new Map<string, InternalTask>()

  createTask(params: {
    userId: string
    filename: string
    fileContent: Buffer
    importMode: 'append' | 'overwrite'
  }): BookImportTaskCreateResponse {
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

    void this.runPipeline(taskId, params.fileContent).catch(err => {
      console.error('[book-import] pipeline error', err)
    })

    return { task_id: taskId, status: 'pending' }
  }

  getTaskStatus(taskId: string, userId: string): BookImportTaskStatusResponse {
    const task = this.getTaskOrThrow(taskId, userId)
    return this.toStatus(task)
  }

  getPreview(taskId: string, userId: string): BookImportPreviewResponse {
    const task = this.getTaskOrThrow(taskId, userId)
    if (task.status !== 'completed') {
      throw new BookImportError('任务尚未完成，无法获取预览', 400)
    }
    if (!task.preview) {
      throw new BookImportError('预览数据不存在', 500)
    }
    return task.preview
  }

  /** 供重试 SSE 等场景读取最近一次导入成功的项目 ID */
  getImportedProjectId(taskId: string, userId: string): string | null {
    const task = this.tasks.get(taskId)
    if (!task || task.userId !== userId) return null
    return task.importedProjectId
  }

  cancelTask(taskId: string, userId: string): { success: boolean; message: string } {
    const task = this.getTaskOrThrow(taskId, userId)
    if (['completed', 'failed', 'cancelled'].includes(task.status)) {
      return { success: true, message: `任务已是终态：${task.status}` }
    }
    task.cancelled = true
    this.setTaskState(task, {
      status: 'cancelled',
      progress: task.progress,
      message: '任务已取消',
    })
    return { success: true, message: '取消成功' }
  }

  async applyImport(
    taskId: string,
    userId: string,
    payload: BookImportApplyRequest,
  ): Promise<BookImportApplyResponse> {
    const task = this.getTaskOrThrow(taskId, userId)
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
    const { chapters: chaptersToImport, outlines: outlinesToImport, wasTrimmed } =
      trimLastTenForApply(payload.chapters, payload.outlines)

    if (wasTrimmed) {
      warnings.push({
        code: 'apply_trimmed_to_last_ten',
        message: `导入阶段已强制仅保留最后 ${chaptersToImport.length} 章`,
        level: 'info',
      })
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

    task.importedProjectId = project.id
    task.failedSteps = []

    return {
      success: true,
      project_id: project.id,
      statistics,
      warnings,
    }
  }

  private getTaskOrThrow(taskId: string, userId: string): InternalTask {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new BookImportError('任务不存在', 404)
    }
    if (task.userId !== userId) {
      throw new BookImportError('无权访问该任务', 403)
    }
    return task
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

      const chaptersData = splitChapters(cleaned)
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
        message: '仅保留末10章并重建预览结构...',
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

    const selectedRaw =
      chaptersData.length > 10 ? chaptersData.slice(-10) : chaptersData
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
          message: `已处理末章 ${idx + 1}/${selectedTotal} 个章节结构...`,
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

    if (chaptersData.length > selectedTotal) {
      warnings.push({
        code: 'trimmed_to_last_ten_chapters',
        message: `已按规则仅保留最后 ${selectedTotal} 章用于导入（原始识别 ${chaptersData.length} 章）`,
        level: 'info',
      })
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

    const outlines = await this.generateReverseOutlines(
      task.userId,
      suggestion,
      chapters,
      task,
    )

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
  ): Promise<BookImportOutline[]> {
    if (chapters.length === 0) return []

    const fallbackOutlines: BookImportOutline[] = chapters.map(chapter => {
      const structure = buildFallbackOutlineStructure(chapter)
      return {
        title: chapter.title,
        content: chapter.summary || buildSummary(chapter.content || ''),
        order_index: chapter.chapter_number,
        structure: structure as unknown as Record<string, unknown>,
      }
    })

    try {
      this.setTaskState(task, {
        status: 'running',
        progress: 95,
        message: '正在反向生成章节大纲（分批5章）...',
      })

      const batchSize = 5
      const totalBatches = Math.ceil(chapters.length / batchSize)
      const allStructures: OutlineStructure[] = []

      for (let batchIdx = 0, start = 0; start < chapters.length; batchIdx++, start += batchSize) {
        const batch = chapters.slice(start, start + batchSize)
        if (batch.length === 0) break

        const startChapter = batch[0]!.chapter_number
        const endChapter = batch[batch.length - 1]!.chapter_number
        const chaptersText = buildReverseOutlineChaptersText(batch)
        const expectedCount = batch.length

        const progress =
          95 + Math.floor((3 * batchIdx) / Math.max(1, totalBatches))
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

        const aiData = await callWithJsonArray(userId, prompt)
        const normalizedBatch = normalizeReverseOutlineBatch(aiData, batch)
        allStructures.push(...normalizedBatch)
      }

      let structures: OutlineStructure[] = allStructures
      if (structures.length !== chapters.length) {
        console.warn(
          `[book-import] outline count mismatch: ${structures.length} vs ${chapters.length}`,
        )
        structures = chapters.map(ch => buildFallbackOutlineStructure(ch))
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

      return outlines
    } catch (e) {
      console.warn('[book-import] reverse outlines failed', e)
      this.setTaskState(task, {
        status: 'running',
        progress: 99,
        message: 'AI大纲生成失败，使用规则大纲',
      })
      return fallbackOutlines
    }
  }
}

export const bookImportService = new BookImportService()
