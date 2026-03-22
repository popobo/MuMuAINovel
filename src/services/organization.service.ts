import { db } from '@/lib/db'

export class OrganizationService {
  async create(data: {
    projectId: string
    name: string
    type: string
    description?: string
    leader?: string
    size?: number
    influence?: number
    locationId?: string
  }) {
    return db.organization.create({
      data: {
        projectId: data.projectId,
        name: data.name,
        type: data.type,
        description: data.description,
        leader: data.leader,
        size: data.size || 50,
        influence: data.influence || 50,
        locationId: data.locationId,
      },
    })
  }

  async getById(id: string) {
    return db.organization.findUnique({
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
    return db.organization.findMany({
      where: { projectId },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { influence: 'desc' },
    })
  }

  async update(id: string, data: {
    name?: string
    type?: string
    description?: string
    leader?: string
    size?: number
    influence?: number
    locationId?: string
  }) {
    return db.organization.update({
      where: { id },
      data,
    })
  }

  async delete(id: string) {
    return db.organization.delete({
      where: { id },
    })
  }
}
