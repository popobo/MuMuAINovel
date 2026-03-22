'use client'

import { Project } from '@prisma/client'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const progress = project.targetWords > 0
    ? Math.round((project.currentWords / project.targetWords) * 100)
    : 0

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{project.title}</CardTitle>
          <Badge variant="secondary">{project.genre}</Badge>
        </div>
        {project.description && (
          <CardDescription className="line-clamp-2">
            {project.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between text-sm text-gray-600">
            <span>{project.currentWords.toLocaleString()} words</span>
            <span>of {project.targetWords.toLocaleString()}</span>
          </div>

          <Link href={`/projects/${project.id}`}>
            <Button className="w-full">Open Project</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
