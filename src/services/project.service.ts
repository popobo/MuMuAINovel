import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export class ProjectService {
  async create(data: {
    userId: string
    title: string
    description?: string
    genre?: string
    targetWords?: number
    narrativePerspective?: string
    characterCount?: number
  }) {
    return db.project.create({
      data: {
        userId: data.userId,
        title: data.title,
        description: data.description,
        genre: data.genre,
        targetWords: data.targetWords || 0,
        narrativePerspective: data.narrativePerspective,
        characterCount: data.characterCount || 5,
      },
    })
  }

  async listByUser(userId: string) {
    return db.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async getById(id: string, userId: string) {
    return db.project.findFirst({
      where: { id, userId },
    })
  }

  async update(id: string, userId: string, data: Prisma.ProjectUpdateInput) {
    return db.project.update({
      where: { id },
      data,
    })
  }

  async delete(id: string, userId: string) {
    return db.project.delete({
      where: { id, userId },
    })
  }

  async updateWordCount(id: string) {
    // Calculate total word count from chapters
    const chapters = await db.chapter.findMany({
      where: { projectId: id },
      select: { wordCount: true },
    })

    const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0)

    return db.project.update({
      where: { id },
      data: { currentWords: totalWords },
    })
  }
}
