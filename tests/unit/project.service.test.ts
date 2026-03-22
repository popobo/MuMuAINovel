import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProjectService } from '@/services/project.service'

// Mock the database client
vi.mock('@/lib/db', () => ({
  db: {
    project: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    chapter: {
      findMany: vi.fn(),
    },
  },
}))

// Import the mocked db after mocking
import { db } from '@/lib/db'

describe('ProjectService', () => {
  let service: ProjectService

  beforeEach(() => {
    service = new ProjectService()
    vi.clearAllMocks()
  })

  it('should create a project with valid data', async () => {
    const projectData = {
      userId: 'test-user-id',
      title: 'Test Novel',
      genre: 'Fantasy',
      targetWords: 50000,
    }

    const mockProject = {
      id: 'project-id',
      ...projectData,
      currentWords: 0,
      characterCount: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    db.project.create.mockResolvedValue(mockProject)

    const project = await service.create(projectData)

    expect(project).toBeDefined()
    expect(project.title).toBe('Test Novel')
    expect(project.userId).toBe('test-user-id')
    expect(db.project.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'test-user-id',
        title: 'Test Novel',
        genre: 'Fantasy',
        targetWords: 50000,
      }),
    })
  })

  it('should list projects for a user', async () => {
    const mockProjects = [
      {
        id: 'project-1',
        title: 'Novel 1',
        userId: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'project-2',
        title: 'Novel 2',
        userId: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    db.project.findMany.mockResolvedValue(mockProjects)

    const projects = await service.listByUser('test-user-id')

    expect(Array.isArray(projects)).toBe(true)
    expect(projects).toHaveLength(2)
    expect(db.project.findMany).toHaveBeenCalledWith({
      where: { userId: 'test-user-id' },
      orderBy: { updatedAt: 'desc' },
    })
  })

  it('should get a project by id', async () => {
    const mockProject = {
      id: 'project-id',
      title: 'Test Novel',
      userId: 'test-user-id',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    db.project.findFirst.mockResolvedValue(mockProject)

    const project = await service.getById('project-id', 'test-user-id')

    expect(project).toBeDefined()
    expect(project?.id).toBe('project-id')
    expect(db.project.findFirst).toHaveBeenCalledWith({
      where: { id: 'project-id', userId: 'test-user-id' },
    })
  })

  it('should update project details', async () => {
    const mockUpdated = {
      id: 'project-id',
      title: 'Updated Title',
      userId: 'test-user-id',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    db.project.update.mockResolvedValue(mockUpdated)

    const updated = await service.update('project-id', 'test-user-id', {
      title: 'Updated Title',
    })

    expect(updated.title).toBe('Updated Title')
    expect(db.project.update).toHaveBeenCalledWith({
      where: { id: 'project-id' },
      data: { title: 'Updated Title' },
    })
  })

  it('should delete a project', async () => {
    const mockDeleted = {
      id: 'project-id',
      title: 'Deleted Novel',
      userId: 'test-user-id',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    db.project.delete.mockResolvedValue(mockDeleted)

    await service.delete('project-id', 'test-user-id')

    expect(db.project.delete).toHaveBeenCalledWith({
      where: { id: 'project-id', userId: 'test-user-id' },
    })
  })

  it('should update word count from chapters', async () => {
    const mockChapters = [
      { wordCount: 1000 },
      { wordCount: 2000 },
      { wordCount: 1500 },
    ]

    const mockUpdated = {
      id: 'project-id',
      currentWords: 4500,
      updatedAt: new Date(),
    }

    db.chapter.findMany.mockResolvedValue(mockChapters)
    db.project.update.mockResolvedValue(mockUpdated)

    const updated = await service.updateWordCount('project-id')

    expect(updated.currentWords).toBe(4500)
    expect(db.chapter.findMany).toHaveBeenCalledWith({
      where: { projectId: 'project-id' },
      select: { wordCount: true },
    })
    expect(db.project.update).toHaveBeenCalledWith({
      where: { id: 'project-id' },
      data: { currentWords: 4500 },
    })
  })
})
