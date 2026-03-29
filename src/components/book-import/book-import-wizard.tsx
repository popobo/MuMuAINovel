'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CircleCheck,
  FileText,
  Inbox,
  Loader2,
  Play,
  RefreshCw,
  X,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import type {
  BookImportApplyRequest,
  BookImportChapter,
  BookImportOutline,
  BookImportPreviewResponse,
  BookImportTaskStatusResponse,
} from '@/lib/book-import/types'

type SseMessage = {
  type: string
  message?: string
  progress?: number
  status?: string
  data?: Record<string, unknown>
  error?: string
  code?: number
}

async function ssePostRetryStream(
  url: string,
  body: { chapter_numbers?: number[] },
  options: {
    onProgress?: (message: string, progress: number, status: string) => void
    onResult?: (data: Record<string, unknown>) => void
    onError?: (error: string) => void
    onComplete?: () => void
  },
): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() ?? ''

    for (const block of chunks) {
      const line = block.trim()
      if (!line || line.startsWith(':')) continue
      const m = line.match(/^data:\s*(.+)$/m)
      if (!m) continue
      let msg: SseMessage
      try {
        msg = JSON.parse(m[1]!) as SseMessage
      } catch {
        continue
      }

      if (msg.type === 'progress' && msg.progress !== undefined) {
        options.onProgress?.(
          msg.message ?? '',
          msg.progress,
          msg.status ?? 'processing',
        )
      } else if (msg.type === 'result' && msg.data) {
        options.onResult?.(msg.data)
      } else if (msg.type === 'error') {
        options.onError?.(msg.error ?? 'Error')
        return
      } else if (msg.type === 'done') {
        options.onComplete?.()
      }
    }
  }
}

async function ssePostApply(
  url: string,
  body: BookImportApplyRequest,
  options: {
    onProgress?: (message: string, progress: number, status: string) => void
    onResult?: (data: Record<string, unknown>) => void
    onError?: (error: string) => void
    onComplete?: () => void
  },
): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() ?? ''

    for (const block of chunks) {
      const line = block.trim()
      if (!line || line.startsWith(':')) continue
      const m = line.match(/^data:\s*(.+)$/m)
      if (!m) continue
      let msg: SseMessage
      try {
        msg = JSON.parse(m[1]!) as SseMessage
      } catch {
        continue
      }

      if (msg.type === 'progress' && msg.progress !== undefined) {
        options.onProgress?.(
          msg.message ?? '',
          msg.progress,
          msg.status ?? 'processing',
        )
      } else if (msg.type === 'result' && msg.data) {
        options.onResult?.(msg.data)
      } else if (msg.type === 'error') {
        options.onError?.(msg.error ?? 'Error')
        return
      } else if (msg.type === 'done') {
        options.onComplete?.()
      }
    }
  }
}

export function BookImportWizard() {
  const { t } = useI18n()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [taskStatus, setTaskStatus] = useState<BookImportTaskStatusResponse | null>(
    null,
  )
  const [preview, setPreview] = useState<BookImportPreviewResponse | null>(null)
  const [creatingTask, setCreatingTask] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewPage, setPreviewPage] = useState(1)
  const [previewPageSize] = useState(20)
  const [previewTotalPages, setPreviewTotalPages] = useState(1)
  const [applying, setApplying] = useState(false)
  const [applyProgress, setApplyProgress] = useState(0)
  const [applyMessage, setApplyMessage] = useState('')
  const [openChapter, setOpenChapter] = useState<number | null>(0)
  const [chapterEdits, setChapterEdits] = useState<
    Record<number, Partial<BookImportChapter>>
  >({})
  const [savingChapters, setSavingChapters] = useState<Record<number, boolean>>({})
  const chapterSaveTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  const [retrySelected, setRetrySelected] = useState<Record<number, boolean>>({})

  useEffect(() => {
    const timers = chapterSaveTimersRef.current
    return () => {
      for (const key of Object.keys(timers)) {
        const chapterNumber = Number(key)
        const timer = timers[chapterNumber]
        if (timer) clearTimeout(timer)
      }
    }
  }, [])

  const failedChapterKey = preview?.staging?.failed_chapter_numbers?.join(',') ?? ''
  useEffect(() => {
    const nums = preview?.staging?.failed_chapter_numbers
    if (!nums?.length) {
      setRetrySelected({})
      return
    }
    setRetrySelected(Object.fromEntries(nums.map(n => [n, true])))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 用 failedChapterKey 序列化避免数组引用抖动
  }, [taskId, failedChapterKey])

  const isTaskTerminal = useMemo(() => {
    return (
      !!taskStatus &&
      ['completed', 'failed', 'cancelled'].includes(taskStatus.status)
    )
  }, [taskStatus])

  const showPreviewPanel = Boolean(
    taskId &&
      (preview ||
        loadingPreview ||
        taskStatus?.status === 'completed'),
  )

  const showParsingPanel = Boolean(taskId && !showPreviewPanel)

  useEffect(() => {
    const restoreTask = async () => {
      if (taskId) return
      const res = await fetch('/api/book-import/tasks/active')
      if (!res.ok) return
      const data = (await res.json()) as BookImportTaskStatusResponse | null
      if (!data?.task_id) return
      setTaskId(data.task_id)
      setTaskStatus(data)
    }
    void restoreTask()
  }, [taskId])

  const currentStep = useMemo(() => {
    if (!taskId) return 0
    if (applying) return 3
    if (preview || loadingPreview || taskStatus?.status === 'completed') return 2
    if (taskStatus && ['pending', 'running'].includes(taskStatus.status)) return 1
    if (
      taskStatus &&
      ['failed', 'cancelled'].includes(taskStatus.status)
    ) {
      return 1
    }
    return 1
  }, [taskId, taskStatus, preview, applying, loadingPreview])

  const stepLabels = [
    t('bookImport.steps.upload'),
    t('bookImport.steps.parsing'),
    t('bookImport.steps.preview'),
    t('bookImport.steps.importing'),
  ]

  const currentStepText = stepLabels[currentStep] ?? stepLabels[0]

  const pollTask = useCallback(async () => {
    if (!taskId) return
    const res = await fetch(`/api/book-import/tasks/${taskId}`)
    if (res.status === 404) {
      setTaskId(null)
      setTaskStatus(null)
      setPreview(null)
      alert(t('bookImport.taskStale'))
      return
    }
    if (!res.ok) return
    const data = (await res.json()) as BookImportTaskStatusResponse
    setTaskStatus(data)
  }, [taskId, t])

  useEffect(() => {
    if (!taskId || isTaskTerminal) return
    const id = setInterval(() => {
      void pollTask()
    }, 3000) // 从 1.5 秒改为 3 秒，减少轮询频率
    return () => clearInterval(id)
  }, [taskId, isTaskTerminal, pollTask])

  const loadPreviewPage = useCallback(
    async (page: number) => {
      if (!taskId) return
      try {
        setLoadingPreview(true)
        const res = await fetch(
          `/api/book-import/tasks/${taskId}/preview?page=${page}&pageSize=${previewPageSize}`,
        )
        if (res.status === 404) {
          setTaskId(null)
          setTaskStatus(null)
          setPreview(null)
          alert(t('bookImport.taskStale'))
          return
        }
        if (!res.ok) throw new Error('preview')
        const data = (await res.json()) as BookImportPreviewResponse
        const merged = data.chapters.map(item => ({
          ...item,
          ...(chapterEdits[item.chapter_number] ?? {}),
        }))
        setPreview({ ...data, chapters: merged })
        setPreviewPage(data.pagination?.page ?? page)
        setPreviewTotalPages(data.pagination?.total_pages ?? 1)
      } catch {
        alert(t('bookImport.previewFailed'))
      } finally {
        setLoadingPreview(false)
      }
    },
    [taskId, previewPageSize, t, chapterEdits],
  )

  useEffect(() => {
    if (!taskId || !taskStatus || taskStatus.status !== 'completed' || preview) {
      return
    }
    void loadPreviewPage(1)
  }, [taskId, taskStatus, preview, loadPreviewPage])

  const startTask = async () => {
    if (!file) {
      alert(t('bookImport.selectFileFirst'))
      return
    }
    setCreatingTask(true)
    setPreview(null)
    setTaskStatus(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('create_new_project', 'true')
      fd.append('import_mode', 'append')
      const res = await fetch('/api/book-import/tasks', {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { detail?: string }
        throw new Error(err.detail ?? res.statusText)
      }
      const data = (await res.json()) as { task_id: string }
      setTaskId(data.task_id)
    } catch {
      alert(t('bookImport.parseFailed'))
    } finally {
      setCreatingTask(false)
    }
  }

  const cancelTask = async () => {
    if (!taskId) return
    await fetch(`/api/book-import/tasks/${taskId}`, { method: 'DELETE' })
    void pollTask()
  }

  const applyImport = async () => {
    if (!taskId || !preview) return

    setApplying(true)
    setApplyProgress(0)
    setApplyMessage('')

    try {
      const firstPage = preview.pagination?.page ?? previewPage
      const totalPages = preview.pagination?.total_pages ?? previewTotalPages
      const allChapters: BookImportChapter[] = []
      const allOutlines: BookImportOutline[] = []

      for (let page = 1; page <= totalPages; page++) {
        const pageData =
          page === firstPage
            ? preview
            : await (async () => {
                const res = await fetch(
                  `/api/book-import/tasks/${taskId}/preview?page=${page}&pageSize=${previewPageSize}`,
                )
                if (!res.ok) {
                  throw new Error(`preview page ${page} load failed`)
                }
                return (await res.json()) as BookImportPreviewResponse
              })()

        for (const chapter of pageData.chapters) {
          allChapters.push({
            ...chapter,
            ...(chapterEdits[chapter.chapter_number] ?? {}),
          })
        }
        allOutlines.push(...pageData.outlines)
      }

      const payload: BookImportApplyRequest = {
        project_suggestion: preview.project_suggestion,
        chapters: allChapters,
        outlines: allOutlines,
        import_mode: 'append',
      }

      await ssePostApply(
        `/api/book-import/tasks/${taskId}/apply-stream`,
        payload,
        {
          onProgress: (msg, prog) => {
            setApplyMessage(msg)
            setApplyProgress(prog)
          },
          onResult: data => {
            const pid = data.project_id as string
            if (pid) {
              alert(t('bookImport.successImport'))
              router.push(`/projects/${pid}/chapters`)
            }
          },
          onError: err => {
            alert(`${t('bookImport.importFailed')}: ${err}`)
            setApplying(false)
          },
          onComplete: () => {
            setApplyProgress(100)
            setApplying(false)
          },
        },
      )
    } catch {
      alert(t('bookImport.importFailed'))
      setApplying(false)
    }
  }

  const updateChapter = (index: number, patch: Partial<BookImportChapter>) => {
    setPreview(prev => {
      if (!prev) return prev
      const next = [...prev.chapters]
      next[index] = { ...next[index]!, ...patch }
      const chapterNumber = next[index]!.chapter_number
      setChapterEdits(edits => ({
        ...edits,
        [chapterNumber]: {
          ...(edits[chapterNumber] ?? {}),
          ...patch,
        },
      }))
      if (taskId) {
        const prevTimer = chapterSaveTimersRef.current[chapterNumber]
        if (prevTimer) {
          clearTimeout(prevTimer)
        }
        chapterSaveTimersRef.current[chapterNumber] = setTimeout(() => {
          const chapterPayload = {
            title: next[index]!.title,
            summary: next[index]!.summary ?? null,
            content: next[index]!.content,
          }
          setSavingChapters(s => ({ ...s, [chapterNumber]: true }))
          void fetch(
            `/api/book-import/tasks/${taskId}/chapters/${chapterNumber}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(chapterPayload),
            },
          )
            .catch(() => {
              // Keep UI editable even when save failed.
            })
            .finally(() => {
              setSavingChapters(s => ({ ...s, [chapterNumber]: false }))
            })
        }, 450)
      }
      return { ...prev, chapters: next }
    })
  }

  const runChapterRetryStream = async (chapterNumbers?: number[]) => {
    if (!taskId) return
    setApplying(true)
    setApplyProgress(0)
    setApplyMessage('正在重试失败章节...')
    try {
      const payload =
        chapterNumbers && chapterNumbers.length > 0
          ? { chapter_numbers: chapterNumbers }
          : {}
      await ssePostRetryStream(`/api/book-import/tasks/${taskId}/retry-stream`, payload, {
        onProgress: (msg, prog) => {
          setApplyMessage(msg)
          setApplyProgress(prog)
        },
        onComplete: () => {
          setApplying(false)
          void loadPreviewPage(previewPage)
        },
        onError: err => {
          alert(`重试失败：${err}`)
          setApplying(false)
        },
      })
    } catch {
      setApplying(false)
      alert('重试失败章节时发生错误')
    }
  }

  const retrySelectedFailedChapters = async () => {
    const nums = preview?.staging?.failed_chapter_numbers ?? []
    const picked = nums.filter(n => retrySelected[n])
    if (picked.length === 0) {
      alert('请至少勾选一章再重试')
      return
    }
    await runChapterRetryStream(picked)
  }

  const retryAllFailedChapters = async () => {
    await runChapterRetryStream(undefined)
  }

  const restart = () => {
    if (!confirm(t('bookImport.restartConfirm'))) return
    setFile(null)
    setTaskId(null)
    setTaskStatus(null)
    setPreview(null)
    setApplying(false)
    setApplyProgress(0)
    setApplyMessage('')
    setChapterEdits({})
    setPreviewPage(1)
    setPreviewTotalPages(1)
    setRetrySelected({})
    setOpenChapter(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f?.name.toLowerCase().endsWith('.txt')) setFile(f)
  }

  const clearSelectedFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="mx-auto max-w-5xl pb-16">
      <div className="mb-6 rounded-2xl bg-linear-to-br from-teal-600 to-cyan-700 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Inbox className="h-8 w-8 opacity-90" aria-hidden />
              {t('bookImport.title')}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-teal-50/90">
              {t('bookImport.subtitle')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium text-white">
              {t('bookImport.currentProgress', { step: currentStepText })}
            </span>
            <button
              type="button"
              onClick={restart}
              className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/30 hover:bg-white/30"
            >
              <RefreshCw className="h-4 w-4" />
              {t('bookImport.restart')}
            </button>
          </div>
        </div>

        <ol className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stepLabels.map((label, i) => (
            <li
              key={label}
              className={`rounded-lg px-3 py-2 text-center text-xs font-medium sm:text-sm ${
                i === currentStep
                  ? 'bg-white text-teal-800 shadow'
                  : i < currentStep
                    ? 'bg-white/25 text-white'
                    : 'bg-white/10 text-teal-100'
              }`}
            >
              {label}
            </li>
          ))}
        </ol>
      </div>

      {!taskId && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold">{t('bookImport.uploadTitle')}</h2>
          <div
            role={file ? 'region' : 'button'}
            tabIndex={0}
            aria-label={file ? t('bookImport.fileSelectedBadge') : undefined}
            onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
              file
                ? 'border-teal-400 bg-teal-50/90 ring-2 ring-teal-200/70 dark:border-teal-500 dark:bg-teal-950/40 dark:ring-teal-800/80'
                : 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/50'
            }`}
          >
            {file ? (
              <div className="flex w-full max-w-lg flex-col items-center">
                <button
                  type="button"
                  onClick={clearSelectedFile}
                  className="absolute right-3 top-3 inline-flex rounded-lg p-2 text-gray-500 hover:bg-white/80 hover:text-gray-800 dark:hover:bg-gray-800/80 dark:hover:text-gray-200"
                  aria-label={t('bookImport.removeFile')}
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-600/10 px-3 py-1 text-sm font-semibold text-teal-800 dark:bg-teal-400/15 dark:text-teal-200">
                  <CircleCheck className="h-4 w-4 shrink-0" aria-hidden />
                  {t('bookImport.fileSelectedBadge')}
                </div>
                <FileText
                  className="mb-2 h-11 w-11 text-teal-600 dark:text-teal-400"
                  aria-hidden
                />
                <p className="max-w-full break-words text-base font-semibold text-gray-900 dark:text-gray-100">
                  {file.name}
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <p className="mt-4 text-sm font-medium text-teal-800 dark:text-teal-200">
                  {t('bookImport.fileSelectedHint')}
                </p>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {t('bookImport.changeFileHint')}
                </p>
              </div>
            ) : (
              <>
                <Inbox className="mb-3 h-12 w-12 text-gray-400" />
                <p className="font-medium text-gray-700 dark:text-gray-200">
                  {t('bookImport.dropHint')}
                </p>
                <p className="mt-1 text-sm text-gray-500">{t('bookImport.dropSub')}</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) setFile(f)
              }}
            />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={creatingTask}
              onClick={() => void startTask()}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {creatingTask ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {t('bookImport.startParse')}
            </button>
            {taskId && (
              <span className="text-xs text-gray-500">
                {t('bookImport.taskId')}: {taskId}
              </span>
            )}
          </div>
        </section>
      )}

      {showParsingPanel && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold">{t('bookImport.parseStatus')}</h2>
          <div className="flex flex-col items-center py-8">
              <div
                className="relative flex h-36 w-36 items-center justify-center rounded-full border-4 border-teal-100 dark:border-teal-900"
                style={{
                  background: `conic-gradient(rgb(13 148 136) ${(taskStatus?.progress ?? 0) * 3.6}deg, rgb(243 244 246) 0deg)`,
                }}
              >
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white dark:bg-gray-900">
                  <span className="text-xl font-bold text-teal-700 dark:text-teal-400">
                    {taskStatus?.progress ?? 0}%
                  </span>
                </div>
              </div>
              <p className="mt-6 text-center font-medium">
                {taskStatus?.status === 'pending' && t('bookImport.statusPending')}
                {taskStatus?.status === 'running' && t('bookImport.statusRunning')}
                {taskStatus?.status === 'completed' && t('bookImport.statusDone')}
                {taskStatus?.status === 'failed' && t('bookImport.statusFailed')}
                {taskStatus?.status === 'cancelled' && t('bookImport.statusCancelled')}
              </p>
              {taskStatus?.message && (
                <p className="mt-2 max-w-md text-center text-sm text-gray-500">
                  {taskStatus.message}
                </p>
              )}
              {taskStatus?.error && (
                <p className="mt-4 max-w-lg rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                  {taskStatus.error}
                </p>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => void pollTask()}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
                >
                  {t('bookImport.refresh')}
                </button>
                {taskStatus &&
                  ['pending', 'running'].includes(taskStatus.status) && (
                    <button
                      type="button"
                      onClick={() => void cancelTask()}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                    >
                      {t('bookImport.cancelTask')}
                    </button>
                  )}
              </div>
            </div>
        </section>
      )}

      {showPreviewPanel && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t('bookImport.previewCard')}</h2>
            <button
              type="button"
              disabled={!preview || applying}
              onClick={() => void applyImport()}
              className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {applying ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {applyProgress}%
                </span>
              ) : (
                t('bookImport.confirmImport')
              )}
            </button>
          </div>

          {applying && applyMessage && (
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {applyMessage}
            </p>
          )}

          {loadingPreview ? (
            <div className="flex items-center gap-2 py-12 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('bookImport.loadingPreview')}
            </div>
          ) : !preview ? (
            <p className="text-gray-500">{t('bookImport.noPreview')}</p>
          ) : (
            <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-1">
              {preview.warnings.length > 0 && (
                <div
                  role="alert"
                  className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/40"
                >
                  <p className="font-medium text-amber-900 dark:text-amber-100">
                    {t('bookImport.warnings')}
                  </p>
                  <ul className="mt-2 list-disc pl-5 text-amber-900/90 dark:text-amber-100/90">
                    {preview.warnings.map((w, idx) => (
                      <li key={`${w.code}-${idx}`}>
                        [{w.level}] {w.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.staging &&
                preview.staging.failed_chapter_numbers.length > 0 && (
                  <div
                    role="region"
                    aria-label="失败章节重试"
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900 dark:bg-red-950/30"
                  >
                    <p className="font-medium text-red-900 dark:text-red-100">
                      失败章节（共 {preview.staging.failed_chapter_numbers.length}{' '}
                      章）— 可勾选后仅重试所选
                    </p>
                    <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto pl-1">
                      {preview.staging.failed_chapter_numbers.map(n => (
                        <li key={n}>
                          <label className="flex cursor-pointer items-center gap-2 text-red-900/90 dark:text-red-100/90">
                            <input
                              type="checkbox"
                              className="rounded border-red-300"
                              checked={Boolean(retrySelected[n])}
                              onChange={e =>
                                setRetrySelected(prev => ({
                                  ...prev,
                                  [n]: e.target.checked,
                                }))
                              }
                            />
                            <span>第 {n} 章</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={applying}
                        onClick={() => void retrySelectedFailedChapters()}
                        className="rounded border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-900/40 dark:text-red-100"
                      >
                        重试所选
                      </button>
                      <button
                        type="button"
                        disabled={applying}
                        onClick={() => void retryAllFailedChapters()}
                        className="rounded border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-900/40 dark:text-red-100"
                      >
                        重试全部失败
                      </button>
                    </div>
                  </div>
                )}

              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <h3 className="mb-3 font-medium">{t('bookImport.projectBlock')}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('createProject.fieldTitle')}
                    </span>
                    <input
                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                      value={preview.project_suggestion.title}
                      onChange={e =>
                        setPreview(p =>
                          p
                            ? {
                                ...p,
                                project_suggestion: {
                                  ...p.project_suggestion,
                                  title: e.target.value,
                                },
                              }
                            : p,
                        )
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('createProject.fieldGenre')}
                    </span>
                    <input
                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                      value={preview.project_suggestion.genre ?? ''}
                      onChange={e =>
                        setPreview(p =>
                          p
                            ? {
                                ...p,
                                project_suggestion: {
                                  ...p.project_suggestion,
                                  genre: e.target.value,
                                },
                              }
                            : p,
                        )
                      }
                    />
                  </label>
                  <label className="col-span-full block text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('bookImport.fieldTheme')}
                    </span>
                    <textarea
                      rows={2}
                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                      value={preview.project_suggestion.theme ?? ''}
                      onChange={e =>
                        setPreview(p =>
                          p
                            ? {
                                ...p,
                                project_suggestion: {
                                  ...p.project_suggestion,
                                  theme: e.target.value,
                                },
                              }
                            : p,
                        )
                      }
                    />
                  </label>
                  <label className="col-span-full block text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('createProject.fieldDescription')}
                    </span>
                    <textarea
                      rows={3}
                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                      value={preview.project_suggestion.description ?? ''}
                      onChange={e =>
                        setPreview(p =>
                          p
                            ? {
                                ...p,
                                project_suggestion: {
                                  ...p.project_suggestion,
                                  description: e.target.value,
                                },
                              }
                            : p,
                        )
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('bookImport.fieldNarrativePerspective')}
                    </span>
                    <select
                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                      value={preview.project_suggestion.narrative_perspective}
                      onChange={e =>
                        setPreview(p =>
                          p
                            ? {
                                ...p,
                                project_suggestion: {
                                  ...p.project_suggestion,
                                  narrative_perspective: e.target.value,
                                },
                              }
                            : p,
                        )
                      }
                    >
                      <option value="第一人称">{t('bookImport.perspectiveFirst')}</option>
                      <option value="第三人称">{t('bookImport.perspectiveThird')}</option>
                      <option value="全知视角">{t('bookImport.perspectiveOmni')}</option>
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('createProject.fieldTargetWords')}
                    </span>
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                      value={preview.project_suggestion.target_words}
                      onChange={e =>
                        setPreview(p =>
                          p
                            ? {
                                ...p,
                                project_suggestion: {
                                  ...p.project_suggestion,
                                  target_words: Number(e.target.value) || 100000,
                                },
                              }
                            : p,
                        )
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                  <h3 className="font-medium">
                    {t('bookImport.chaptersBlock', {
                      count: preview.pagination?.total_items ?? preview.chapters.length,
                    })}
                  </h3>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      disabled={loadingPreview || previewPage <= 1}
                      onClick={() => void loadPreviewPage(previewPage - 1)}
                      className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40 dark:border-gray-600"
                    >
                      上一页
                    </button>
                    <span className="text-gray-500">
                      {previewPage}/{previewTotalPages}
                    </span>
                    <button
                      type="button"
                      disabled={loadingPreview || previewPage >= previewTotalPages}
                      onClick={() => void loadPreviewPage(previewPage + 1)}
                      className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40 dark:border-gray-600"
                    >
                      下一页
                    </button>
                  </div>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {preview.chapters.map((ch, idx) => {
                    const open = openChapter === idx
                    return (
                      <li key={idx}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800/80"
                          onClick={() => setOpenChapter(open ? null : idx)}
                        >
                          <span className="flex flex-wrap items-center gap-2">
                            {t('bookImport.chapterHeading', {
                              n: ch.chapter_number,
                              title: ch.title,
                            })}
                            {ch.staging_status === 'failed' && (
                              <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-800 dark:bg-red-900/50 dark:text-red-200">
                                失败
                              </span>
                            )}
                          </span>
                          <span className="text-gray-400">{open ? '−' : '+'}</span>
                        </button>
                        {open && (
                          <div className="space-y-3 border-t border-gray-100 px-4 py-3 dark:border-gray-800">
                            <input
                              className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                              value={ch.title}
                              onChange={e =>
                                updateChapter(idx, { title: e.target.value })
                              }
                            />
                            {savingChapters[ch.chapter_number] && (
                              <p className="text-xs text-gray-500">正在保存...</p>
                            )}
                            <textarea
                              rows={2}
                              placeholder={t('bookImport.fieldSummary')}
                              className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                              value={ch.summary ?? ''}
                              onChange={e =>
                                updateChapter(idx, { summary: e.target.value })
                              }
                            />
                            <textarea
                              rows={8}
                              className="w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-800"
                              value={ch.content}
                              onChange={e =>
                                updateChapter(idx, { content: e.target.value })
                              }
                            />
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
