import { db } from '@/lib/db'

export class LocationService {
  async create(data: {
    projectId: string
    name: string
    type: string
    description?: string
    climate?: string
    population?: number
    importance?: number
  }) {
    return db.location.create({
      data: {
        projectId: data.projectId,
        name: data.name,
        type: data.type,
        description: data.description,
        climate: data.climate,
        population: data.population,
        importance: data.importance || 50,
      },
    })
  }

  async getById(id: string) {
    return db.location.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        events: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        organizations: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    })
  }

  async listByProject(projectId: string) {
    return db.location.findMany({
      where: { projectId },
      orderBy: { importance: 'desc' },
    })
  }

  async update(id: string, data: {
    name?: string
    type?: string
    description?: string
    climate?: string
    population?: number
    importance?: number
  }) {
    return db.location.update({
      where: { id },
      data,
    })
  }

  async delete(id: string) {
    return db.location.delete({
      where: { id },
    })
  }
}
