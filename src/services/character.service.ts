import { db } from '@/lib/db'

export class CharacterService {
  /**
   * Create a new character
   */
  async create(data: {
    projectId: string
    name: string
    description?: string
    personality?: string
    background?: string
    appearance?: string
  }) {
    return db.character.create({
      data,
    })
  }

  /**
   * Get character by ID
   */
  async getById(id: string) {
    return db.character.findUnique({
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
   * List characters for a project
   */
  async listByProject(projectId: string) {
    return db.character.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    })
  }

  /**
   * Update character
   */
  async update(id: string, data: {
    name?: string
    description?: string
    personality?: string
    background?: string
    appearance?: string
  }) {
    return db.character.update({
      where: { id },
      data,
    })
  }

  /**
   * Delete character
   */
  async delete(id: string) {
    return db.character.delete({
      where: { id },
    })
  }

  /**
   * Generate character bio using AI
   */
  async expandBio(id: string): Promise<string> {
    const character = await this.getById(id)
    if (!character) {
      throw new Error('Character not found')
    }

    // This would use AIService to expand the character bio
    // For now, return existing text fields from the schema
    return (
      character.background ||
      character.personality ||
      character.appearance ||
      ''
    )
  }
}
