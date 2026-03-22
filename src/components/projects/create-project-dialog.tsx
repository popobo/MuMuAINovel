'use client'

import { useState } from 'react'
import type { Project } from '@prisma/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { useI18n } from '@/i18n/context'

interface CreateProjectDialogProps {
  onCreate: (project: Project) => void
}

export function CreateProjectDialog({ onCreate }: CreateProjectDialogProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    genre: '',
    targetWords: 50000,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const project = await response.json()
        onCreate(project)
        setOpen(false)
        setFormData({ title: '', description: '', genre: '', targetWords: 50000 })
      }
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Card className="border-dashed flex items-center justify-center min-h-[300px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
          <div className="text-center">
            <Plus className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">{t('createProject.cardTrigger')}</p>
          </div>
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('createProject.dialogTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">{t('createProject.fieldTitle')}</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">{t('createProject.fieldDescription')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="genre">{t('createProject.fieldGenre')}</Label>
            <Input
              id="genre"
              value={formData.genre}
              onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
              placeholder={t('createProject.genrePlaceholder')}
            />
          </div>

          <div>
            <Label htmlFor="targetWords">{t('createProject.fieldTargetWords')}</Label>
            <Input
              id="targetWords"
              type="number"
              value={formData.targetWords}
              onChange={(e) => setFormData({ ...formData, targetWords: parseInt(e.target.value) })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('createProject.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('createProject.creating') : t('createProject.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
