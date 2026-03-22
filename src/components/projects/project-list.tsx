'use client'

import { Project } from '@prisma/client'
import { ProjectCard } from './project-card'
import { CreateProjectDialog } from './create-project-dialog'
import { useState } from 'react'

interface ProjectListProps {
  projects: Project[]
}

export function ProjectList({ projects }: ProjectListProps) {
  const [localProjects, setLocalProjects] = useState(projects)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {localProjects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
      <CreateProjectDialog
        onCreate={(newProject) =>
          setLocalProjects([...localProjects, newProject])
        }
      />
    </div>
  )
}
