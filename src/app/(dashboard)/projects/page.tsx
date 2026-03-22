import { auth } from '@/lib/auth'
import { ProjectService } from '@/services/project.service'
import { ProjectList } from '@/components/projects/project-list'
import Link from 'next/link'

export default async function ProjectsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    return <div>Please log in</div>
  }

  const service = new ProjectService()
  const projects = await service.listByUser(session.user.id)

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Projects</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/wizard"
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium"
          >
            ✨ AI Project Wizard
          </Link>
        </div>
      </div>
      <ProjectList projects={projects} />
    </div>
  )
}
