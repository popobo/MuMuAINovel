'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus } from 'lucide-react'

interface AddRelationshipDialogProps {
  characters: Array<{ id: string; name: string }>
  onAdd: (relationship: {
    characterId: string
    relatedId: string
    relationshipType: string
    description?: string
    strength?: number
  }) => void
}

const relationshipTypes = [
  'Family',
  'Friend',
  'Enemy',
  'Rival',
  'Mentor',
  'Student',
  'Love Interest',
  'Spouse',
  'Sibling',
  'Parent',
  'Child',
  'Colleague',
  'Partner',
  'Ally',
  'Neutral',
  'Other',
]

export function AddRelationshipDialog({
  characters,
  onAdd,
}: AddRelationshipDialogProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    characterId: '',
    relatedId: '',
    relationshipType: '',
    description: '',
    strength: 50,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onAdd(formData)
    setOpen(false)
    setFormData({
      characterId: '',
      relatedId: '',
      relationshipType: '',
      description: '',
      strength: 50,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Relationship
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Character Relationship</DialogTitle>
          <DialogDescription>
            Define how two characters are connected in your story
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="character">From Character</Label>
            <select
              id="character"
              value={formData.characterId}
              onChange={(e) =>
                setFormData({ ...formData, characterId: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
              required
            >
              <option value="">Select character...</option>
              {characters.map((char) => (
                <option key={char.id} value={char.id}>
                  {char.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="related">To Character</Label>
            <select
              id="related"
              value={formData.relatedId}
              onChange={(e) =>
                setFormData({ ...formData, relatedId: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
              required
            >
              <option value="">Select character...</option>
              {characters
                .filter((c) => c.id !== formData.characterId)
                .map((char) => (
                  <option key={char.id} value={char.id}>
                    {char.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <Label htmlFor="type">Relationship Type</Label>
            <select
              id="type"
              value={formData.relationshipType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  relationshipType: e.target.value,
                })
              }
              className="w-full px-3 py-2 border rounded-lg"
              required
            >
              <option value="">Select type...</option>
              {relationshipTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="strength">
              Relationship Strength: {formData.strength}%
            </Label>
            <input
              id="strength"
              type="range"
              min="0"
              max="100"
              value={formData.strength}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  strength: parseInt(e.target.value),
                })
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Weak</span>
              <span>Strong</span>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              placeholder="Describe this relationship..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add Relationship</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
