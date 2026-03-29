import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import type {
  BookImportTaskStatusResponse,
  BookImportPreviewResponse,
} from '@/lib/book-import/types'

export type TaskStatus = BookImportTaskStatusResponse['status']

export interface InternalTask {
  taskId: string
  userId: string
  filename: string
  status: TaskStatus
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

export class TaskManager {
  private readonly tasks = new Map<string, InternalTask>()

  create(params: {
    userId: string
    filename: string
  }): InternalTask {
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
    return task
  }

  get(taskId: string): InternalTask | undefined {
    return this.tasks.get(taskId)
  }

  async getOrThrow(taskId: string, userId: string): Promise<InternalTask> {
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
      status: dbTask.status as TaskStatus,
      progress: dbTask.progress,
      message: dbTask.message,
      error: dbTask.error,
      createdAt: dbTask.createdAt,
      updatedAt: dbTask.updatedAt,
      preview: (dbTask.preview as BookImportPreviewResponse | null) ?? null,
      cancelled: dbTask.cancelled,
      importedProjectId: dbTask.importedProjectId,
      failedSteps: (dbTask.failedSteps as InternalTask['failedSteps'] | null) ?? [],
    }
    this.tasks.set(taskId, hydrated)
    return hydrated
  }

  getActiveTasksByUser(userId: string): InternalTask[] {
    return [...this.tasks.values()].filter(
      task => task.userId === userId && !task.importedProjectId,
    )
  }

  setState(
    task: InternalTask,
    params: {
      status: TaskStatus
      progress: number
      message: string | null
      error?: string | null
    },
  ): void {
    task.status = params.status
    task.progress = Math.max(0, Math.min(100, params.progress))
    task.message = params.message
    task.error = params.error ?? null
    task.updatedAt = new Date()
  }

  async persist(task: InternalTask): Promise<void> {
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

  toStatus(task: InternalTask): BookImportTaskStatusResponse {
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
}

export class BookImportError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message)
    this.name = 'BookImportError'
  }
}

export class TaskCancelledError extends Error {
  constructor() {
    super('任务已取消')
    this.name = 'TaskCancelledError'
  }
}
