import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'

describe('Database Client', () => {
  it('should export a database client', () => {
    expect(db).toBeDefined()
    expect(typeof db.$connect).toBe('function')
    expect(typeof db.$disconnect).toBe('function')
  })

  it('should have all required models', () => {
    const models = [
      'user',
      'account',
      'session',
      'verificationToken',
      'project',
      'outline',
      'chapter',
      'character',
      'relationship',
      'career',
      'characterCareerLevel',
      'writingStyle',
      'promptTemplate',
      'userSettings',
    ] as const

    models.forEach((model) => {
      expect(db[model]).toBeDefined()
    })
  })

  // Note: We're not testing actual database connections here
  // as that would require a running database instance.
  // These tests verify the client is properly configured.
})
