import { db } from '@/lib/db'

export class OutlineService {
  async listByProject(projectId: string) {
    return db.outline.findMany({
      where: { projectId },
      orderBy: { orderIndex: 'asc' },
    })
  }
}
