import { auth } from '@/lib/auth'
import { ProjectService } from '@/services/project.service'
import { ProjectList } from '@/components/projects/project-list'

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
        <h1 className="text-3xl font-bold">My Projects</h1>
        {/* <CreateProjectButton /> */}
      </div>
      <ProjectList projects={projects} />
    </div>
  )
}
