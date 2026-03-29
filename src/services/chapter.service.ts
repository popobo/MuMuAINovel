import { db } from '@/lib/db'
import { completeWithUserOrEnv } from '@/lib/ai/complete-with-user-settings'
import type { AIMessage } from '@/lib/ai/types'
import { ProjectService } from './project.service'

export interface GenerateChapterOptions {
  projectId: string
  userId: string
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
    const project = await this.projectService.getById(
      options.projectId,
      options.userId,
    )
    if (!project) {
      throw new Error('Project not found')
    }

    // Get previous chapters for context
    const previousChapters = await db.chapter.findMany({
      where: { projectId: options.projectId },
      orderBy: { chapterNumber: 'desc' },
      take: 3,
    })

    // Build style guidance from project style data
    const styleGuidance = this.buildStyleGuidance(project)

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are writing a novel with the following details:
- Title: ${project.title}
- Genre: ${project.genre || '未设定'}
- Narrative Perspective: ${project.narrativePerspective || '第三人称'}

${styleGuidance}

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

    const response = await completeWithUserOrEnv(options.userId, messages, {
      temperature: 0.8,
      maxTokens: 4000,
    })

    return response.content
  }

  /**
   * Build style guidance from project style data
   */
  private buildStyleGuidance(project: {
    writingStyleSummary?: string | null
    styleProseQuality?: string | null
    styleTone?: string | null
    stylePacing?: string | null
    styleVoice?: string | null
  }): string {
    if (!project.writingStyleSummary) {
      return ''
    }

    let guidance = '\nWriting Style Guidelines:\n'

    if (project.writingStyleSummary) {
      guidance += `- Overall Style: ${project.writingStyleSummary}\n`
    }

    if (project.styleProseQuality) {
      const proseMap: Record<string, string> = {
        descriptive: 'Use rich, detailed descriptions with emphasis on imagery and atmosphere',
        action_oriented: 'Focus on action and plot progression with concise, direct prose',
        balanced: 'Balance descriptive passages with action sequences',
      }
      guidance += `- Prose Style: ${proseMap[project.styleProseQuality] || project.styleProseQuality}\n`
    }

    if (project.styleTone) {
      const toneMap: Record<string, string> = {
        serious: 'Maintain a serious, thoughtful tone throughout',
        humorous: 'Incorporate humor and wit appropriately',
        mixed: 'Balance serious and humorous moments',
        dark: 'Use darker, more intense themes and imagery',
        light: 'Keep the tone upbeat and optimistic',
      }
      guidance += `- Tone: ${toneMap[project.styleTone] || project.styleTone}\n`
    }

    if (project.stylePacing) {
      const pacingMap: Record<string, string> = {
        fast: 'Maintain a fast-paced narrative with quick scene transitions',
        slow: 'Take time with scenes, allowing for detailed exploration',
        variable: 'Vary pacing appropriately - fast for action, slow for introspection',
        tension_building: 'Build tension gradually through the chapter',
      }
      guidance += `- Pacing: ${pacingMap[project.stylePacing] || project.stylePacing}\n`
    }

    if (project.styleVoice) {
      const voiceMap: Record<string, string> = {
        poetic: 'Use poetic language with attention to rhythm and metaphor',
        direct: 'Write in a direct, straightforward manner',
        metaphorical: 'Employ metaphors and symbolic language',
        literal: 'Use literal, concrete language',
      }
      guidance += `- Narrative Voice: ${voiceMap[project.styleVoice] || project.styleVoice}\n`
    }

    return guidance
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
