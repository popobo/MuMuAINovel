import { db } from '@/lib/db'
import { AIService } from '@/lib/ai'
import type { AIMessage } from '@/lib/ai/types'
import { ProjectService } from './project.service'

export interface GenerateChapterOptions {
  projectId: string
  title: string
  summary?: string
  contextNotes?: string
}

export type CreateChapterPayload = {
  projectId: string
  title: string
  chapterNumber: number
  summary?: string | null
}

export class ChapterService {
  private projectService = new ProjectService()

  /**
   * Create a new chapter (empty body until content is written)
   */
  async create(data: CreateChapterPayload) {
    return db.chapter.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        chapterNumber: data.chapterNumber,
        summary: data.summary ?? undefined,
        content: null,
      },
    })
  }

  /**
   * Generate chapter content using AI
   */
  async generateContent(options: GenerateChapterOptions): Promise<string> {
    const project = await this.projectService.getById(options.projectId, '')
    if (!project) {
      throw new Error('Project not found')
    }

    // Get previous chapters for context
    const previousChapters = await db.chapter.findMany({
      where: { projectId: options.projectId },
      orderBy: { chapterNumber: 'desc' },
      take: 3,
    })

    const service = new AIService()

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are writing a novel with the following details:
- Title: ${project.title}
- Genre: ${project.genre}
- Narrative Perspective: ${project.narrativePerspective}

Write engaging, well-paced content that fits the genre and maintains consistency.`,
      },
      {
        role: 'user',
        content: `Write a chapter titled "${options.title}".

${options.summary ? `Chapter summary: ${options.summary}` : ''}

${options.contextNotes ? `Additional Context: ${options.contextNotes}` : ''}

${previousChapters.length > 0 ? `Recent story context:\n${previousChapters.reverse().map(ch => `- ${ch.title}: ${ch.summary ?? 'No summary'}`).join('\n')}` : 'This is the first chapter.'}

Write the full chapter content (approximately 2000-3000 words).`,
      },
    ]

    const response = await service.complete(messages, {
      temperature: 0.8,
      maxTokens: 4000,
    })

    return response.content
  }

  /**
   * Update chapter content
   */
  async updateContent(id: string, content: string) {
    const wordCount = content.split(/\s+/).filter(Boolean).length

    return db.chapter.update({
      where: { id },
      data: {
        content,
        wordCount,
      },
    })
  }

  /**
   * Get chapter by ID
   */
  async getById(id: string) {
    return db.chapter.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })
  }

  /**
   * List chapters for a project
   */
  async listByProject(projectId: string) {
    return db.chapter.findMany({
      where: { projectId },
      orderBy: { chapterNumber: 'asc' },
    })
  }

  /**
   * Delete chapter
   */
  async delete(id: string) {
    return db.chapter.delete({
      where: { id },
    })
  }
}
