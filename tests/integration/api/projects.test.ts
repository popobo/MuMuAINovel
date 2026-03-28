import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    project: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { ProjectService } from '@/services/project.service'
import { db } from '@/lib/db'

describe('Project API Integration', () => {
  let service: ProjectService
  const mockUserId = 'test-user-id'

  beforeEach(async () => {
    service = new ProjectService()
    vi.clearAllMocks()
  })

  it('should create a new project', async () => {
    const mockProject = {
      id: 'project-1',
      userId: mockUserId,
      title: 'Test Project',
      genre: 'Fantasy',
      targetWords: 0,
      characterCount: 5,
      currentWords: 0,
      status: 'planning',
      wizardStatus: 'incomplete',
      wizardStep: 0,
      outlineMode: 'one-to-many',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(db.project.create).mockResolvedValue(mockProject)

    const project = await service.create({
      userId: mockUserId,
      title: 'Test Project',
      genre: 'Fantasy',
    })

    expect(db.project.create).toHaveBeenCalledWith({
      data: {
        userId: mockUserId,
        title: 'Test Project',
        genre: 'Fantasy',
        targetWords: 0,
        characterCount: 5,
      },
    })
    expect(project).toEqual(mockProject)
  })

  it('should list user projects', async () => {
    const mockProjects = [
      {
        id: 'project-1',
        userId: mockUserId,
        title: 'Project 1',
        updatedAt: new Date('2024-01-02'),
      },
      {
        id: 'project-2',
        userId: mockUserId,
        title: 'Project 2',
        updatedAt: new Date('2024-01-01'),
      },
    ]

    vi.mocked(db.project.findMany).mockResolvedValue(mockProjects as never)

    const projects = await service.listByUser(mockUserId)

    expect(db.project.findMany).toHaveBeenCalledWith({
      where: { userId: mockUserId },
      orderBy: { updatedAt: 'desc' },
    })
    expect(projects).toEqual(mockProjects)
  })

  it('should get project by id', async () => {
    const mockProject = {
      id: 'project-1',
      userId: mockUserId,
      title: 'Test Project',
    }

    vi.mocked(db.project.findFirst).mockResolvedValue(mockProject as never)

    const project = await service.getById('project-1', mockUserId)

    expect(db.project.findFirst).toHaveBeenCalledWith({
      where: { id: 'project-1', userId: mockUserId },
    })
    expect(project).toEqual(mockProject)
  })

  it('should update project', async () => {
    const mockUpdated = {
      id: 'project-1',
      userId: mockUserId,
      title: 'Updated Title',
      description: 'New description',
    }

    vi.mocked(db.project.update).mockResolvedValue(mockUpdated as never)

    const project = await service.update('project-1', mockUserId, {
      title: 'Updated Title',
      description: 'New description',
    })

    expect(db.project.update).toHaveBeenCalledWith({
      where: { id: 'project-1' },
      data: {
        title: 'Updated Title',
        description: 'New description',
      },
    })
    expect(project).toEqual(mockUpdated)
  })

  it('should delete project', async () => {
    const mockDeleted = {
      id: 'project-1',
      userId: mockUserId,
    }

    vi.mocked(db.project.delete).mockResolvedValue(mockDeleted as never)

    await service.delete('project-1', mockUserId)

    expect(db.project.delete).toHaveBeenCalledWith({
      where: { id: 'project-1', userId: mockUserId },
    })
  })
})
