'use client'

import { Project } from '@prisma/client'
import Link from 'next/link'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Trash2 } from 'lucide-react'

interface ProjectCardProps {
  project: Project
  onDelete?: (id: string) => void
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const { t, locale } = useI18n()
  const numberLocale = locale === 'zh' ? 'zh-CN' : 'en-US'
  const progress = project.targetWords > 0
    ? Math.round((project.currentWords / project.targetWords) * 100)
    : 0
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete project')
      }

      setIsDeleteDialogOpen(false)
      onDelete?.(project.id)
    } catch (error) {
      console.error('Failed to delete project:', error)
      // You might want to show a toast notification here
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{project.title}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{project.genre}</Badge>
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger
                render={
                  <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('projectCard.deleteConfirmTitle')}</DialogTitle>
                  <DialogDescription>
                    {t('projectCard.deleteConfirmDescription', { title: project.title })}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDeleteDialogOpen(false)}
                    disabled={isDeleting}
                  >
                    {t('projectCard.deleteCancel')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? t('projectCard.deleteLoading') : t('projectCard.deleteConfirm')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
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
              <span>{t('projectCard.progress')}</span>
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
            <span>
              {t('projectCard.wordsCount', {
                n: project.currentWords.toLocaleString(numberLocale),
              })}
            </span>
            <span>
              {t('projectCard.targetWords', {
                n: project.targetWords.toLocaleString(numberLocale),
              })}
            </span>
          </div>

          <Link href={`/projects/${project.id}`}>
            <Button className="w-full">{t('projectCard.openProject')}</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
