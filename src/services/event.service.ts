import { db } from '@/lib/db'

export class EventService {
  async create(data: {
    projectId: string
    name: string
    type: string
    description?: string
    date?: string
    importance?: number
    locationId?: string
  }) {
    return db.event.create({
      data: {
        projectId: data.projectId,
        name: data.name,
        type: data.type,
        description: data.description,
        date: data.date,
        importance: data.importance || 50,
        locationId: data.locationId,
      },
    })
  }

  async getById(id: string) {
    return db.event.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })
  }

  async listByProject(projectId: string) {
    return db.event.findMany({
      where: { projectId },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { importance: 'desc' },
    })
  }

  async update(id: string, data: {
    name?: string
    type?: string
    description?: string
    date?: string
    importance?: number
    locationId?: string
  }) {
    return db.event.update({
      where: { id },
      data,
    })
  }

  async delete(id: string) {
    return db.event.delete({
      where: { id },
    })
  }
}
