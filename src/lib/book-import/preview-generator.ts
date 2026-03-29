import { callWithJsonObject, callWithJsonArray } from './ai-helpers'
import { formatPrompt } from './prompts'
import {
  BOOK_IMPORT_REVERSE_PROJECT_SUGGESTION,
  BOOK_IMPORT_REVERSE_OUTLINES,
} from './prompts'
import {
  buildFallbackProjectSuggestion,
  buildReverseOutlineChaptersText,
  buildSummary,
  buildFallbackOutlineStructure,
  extractNarrativePerspective,
  normalizeTargetWords,
  normalizeReverseOutlineBatch,
  stripChapterPrefix,
} from './metadata'
import type {
  BookImportChapter,
  BookImportOutline,
  BookImportPreviewResponse,
  BookImportWarning,
  ProjectSuggestion,
} from './types'
import type { InternalTask } from './task-manager'

/** 正文（trim 后）少于此字数视为误切分/空壳，不进入预览与导入（与原先「过短」告警阈值一致） */
export const BOOK_IMPORT_MIN_CHAPTER_CONTENT_CHARS = 300

/**
 * Generate complete preview from chapter data
 */
export async function buildPreview(
  task: InternalTask,
  chaptersData: Array<{ title: string; content: string; chapter_number: number }>,
  filename: string,
): Promise<BookImportPreviewResponse> {
  const stem = basenameStem(filename).slice(0, 200) || '拆书导入项目'
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

  const skippedShortTitles: string[] = []
  const eligible: Array<{ title: string; content: string }> = []

  for (let idx = 0; idx < selectedRaw.length; idx++) {
    const chapter = selectedRaw[idx]!
    const rawTitle = (chapter.title || `第${idx + 1}章`).trim().slice(0, 200)
    const title = stripChapterPrefix(rawTitle).slice(0, 200)
    const content = (chapter.content || '').trim()
    if (content.length < BOOK_IMPORT_MIN_CHAPTER_CONTENT_CHARS) {
      skippedShortTitles.push(title)
      continue
    }
    eligible.push({ title, content })
  }

  if (skippedShortTitles.length > 0) {
    const n = skippedShortTitles.length
    const min = BOOK_IMPORT_MIN_CHAPTER_CONTENT_CHARS
    if (n === selectedTotal) {
      warnings.push({
        code: 'all_chapters_filtered_too_short',
        message: `切分得到的 ${n} 个章节正文字数均少于 ${min} 字，已全部忽略，请检查 TXT 或章节标题规则。`,
        level: 'error',
      })
    } else {
      const sample = skippedShortTitles
        .slice(0, 3)
        .map(t => `「${t}」`)
        .join('、')
      const tail = n > 3 ? '…' : ''
      warnings.push({
        code: 'chapters_filtered_too_short',
        message: `已自动跳过 ${n} 个过短章节（正文少于 ${min} 字），例如：${sample}${tail}`,
        level: 'info',
      })
    }
  }

  const eligibleTotal = eligible.length
  const titleCount = new Map<string, number>()
  for (let idx = 0; idx < eligible.length; idx++) {
    const { title, content } = eligible[idx]!
    const summary = buildSummary(content)

    chapters.push({
      title,
      content,
      summary,
      chapter_number: idx + 1,
      outline_title: title,
    })

    titleCount.set(title, (titleCount.get(title) ?? 0) + 1)
    if (content.length > 12000) {
      warnings.push({
        code: 'chapter_too_long',
        message: `章节「${title}」内容较长，建议确认是否应继续拆分`,
        level: 'info',
      })
    }

    const chapterProgress = 18 + Math.floor((2 * (idx + 1)) / Math.max(1, eligibleTotal))
    if (
      (idx + 1) % Math.max(1, Math.floor(eligibleTotal / 5)) === 0 ||
      idx + 1 === eligibleTotal
    ) {
      task.progress = chapterProgress
      task.message = `已处理章节 ${idx + 1}/${eligibleTotal} 个章节结构...`
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

  task.progress = 20
  task.message = '正在调用AI反向生成项目信息（标题/简介/主题/类型）...'

  suggestion = await generateReverseProjectSuggestion(
    task,
    suggestion,
    chapters,
  )

  const { outlines, failedChapterErrors } = await generateReverseOutlines(
    task,
    suggestion,
    chapters,
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

/**
 * Generate reverse project suggestion using AI
 */
async function generateReverseProjectSuggestion(
  task: InternalTask,
  suggestion: ProjectSuggestion,
  chapters: BookImportChapter[],
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
    task.progress = 95
    task.message = '文本样本不足，使用规则推断项目信息'
    return fallback
  }

  let ticker: ReturnType<typeof setInterval> | undefined
  try {
    task.progress = 25
    task.message = '正在初始化AI服务...'

    const prompt = formatPrompt(BOOK_IMPORT_REVERSE_PROJECT_SUGGESTION, {
      title: suggestion.title || '拆书导入项目',
      sampled_text: sampledText,
    })

    task.progress = 30
    task.message = '正在准备AI提示词...'

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
      task.progress = tickProgress
      task.message = msg
    }, 2000)

    task.progress = 35
    task.message = 'AI正在分析文本内容...'

    const projectData = await callWithJsonObject(task.userId, prompt)

    if (ticker) {
      clearInterval(ticker)
      ticker = undefined
    }

    task.progress = 90
    task.message = 'AI生成完成，正在整理项目信息...'

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

    task.progress = 95
    task.message = '项目信息生成完毕，准备预览...'

    return result
  } catch (e) {
    if (ticker) clearInterval(ticker)
    console.warn('[book-import] reverse project suggestion failed', e)
    task.progress = 95
    task.message = 'AI生成失败，使用规则推断项目信息'
    return fallback
  }
}

/**
 * Generate reverse outlines using AI
 */
async function generateReverseOutlines(
  task: InternalTask,
  suggestion: ProjectSuggestion,
  chapters: BookImportChapter[],
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

  task.progress = 95
  task.message = '正在反向生成章节大纲（分批5章）...'

  const batchSize = 5
  const totalBatches = Math.ceil(chapters.length / batchSize)
  const structures = chapters.map(ch => buildFallbackOutlineStructure(ch))

  for (let batchIdx = 0, start = 0; start < chapters.length; batchIdx++, start += batchSize) {
    const batch = chapters.slice(start, start + batchSize)
    if (batch.length === 0) break

    const startChapter = batch[0]!.chapter_number
    const endChapter = batch[batch.length - 1]!.chapter_number
    const chaptersText = buildReverseOutlineChaptersText(batch)
    const expectedCount = batch.length

    const progress = 95 + Math.floor((3 * batchIdx) / Math.max(1, totalBatches))
    task.progress = progress
    task.message = `正在生成大纲批次 ${batchIdx + 1}/${totalBatches}（第${startChapter}-${endChapter}章）...`

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
      const aiData = await callWithJsonArray(task.userId, prompt)
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
    const outlineContent = String(structure.detailed_outline ?? '').trim()
    return {
      title: chapter.title,
      content: outlineContent,
      order_index: chapter.chapter_number,
      structure: structure as unknown as Record<string, unknown>,
    }
  })

  task.progress = 99
  task.message = '大纲反向生成完成，正在整理预览...'

  if (Object.keys(failedChapterErrors).length === chapters.length) {
    task.progress = 99
    task.message = 'AI 大纲全部批次失败，已使用规则大纲'
  }

  return { outlines, failedChapterErrors }
}

function basenameStem(name: string): string {
  const base = name.replace(/\\/g, '/').split('/').pop() ?? name
  const dot = base.lastIndexOf('.')
  return dot === -1 ? base : base.slice(0, dot)
}
