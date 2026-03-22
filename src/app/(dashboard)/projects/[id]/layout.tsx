import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ProjectService } from '@/services/project.service'
import { ChapterService } from '@/services/chapter.service'
import { CharacterService } from '@/services/character.service'
import { ProjectSidebar } from '@/components/dashboard/project-sidebar'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const { id } = await params

  const projectService = new ProjectService()
  const chapterService = new ChapterService()
  const characterService = new CharacterService()

  const [project, chapters, characters] = await Promise.all([
    projectService.getById(id, session.user.id),
    chapterService.listByProject(id),
    characterService.listByProject(id),
  ])

  if (!project) {
    redirect('/projects')
  }

  return (
    <div className="flex min-h-0 w-full flex-1">
      <ProjectSidebar
        projectId={id}
        title={project.title}
        genre={project.genre ?? ''}
        chapterCount={chapters.length}
        characterCount={characters.length}
      />
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}
