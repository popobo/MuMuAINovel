'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const locationTypes = [
  'City',
  'Town',
  'Village',
  'Castle',
  'Fortress',
  'Temple',
  'Forest',
  'Mountain',
  'River',
  'Ocean',
  'Desert',
  'Dungeon',
  'Cave',
  'Ruins',
  'Other',
]

const climates = [
  'Tropical',
  'Temperate',
  'Arid',
  'Continental',
  'Polar',
  'Subtropical',
  'Other',
]

export default function NewLocationPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'City',
    description: '',
    climate: '',
    population: '',
    importance: 50,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/world/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: params.id,
          ...formData,
          population: formData.population ? parseInt(formData.population) : null,
        }),
      })

      if (response.ok) {
        router.push(`/projects/${params.id}/world/locations`)
      }
    } catch (error) {
      console.error('Failed to create location:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href={`/projects/${params.id}/world/locations`}
          className="text-blue-600 hover:text-blue-700 mb-6 inline-block"
        >
          ← Back to Locations
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-8">
          <h1 className="text-3xl font-bold mb-6">Create New Location</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">Location Name *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., The Kingdom of Azora"
                required
              />
            </div>

            <div>
              <Label htmlFor="type">Type *</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                {locationTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                placeholder="Describe this location, its significance, atmosphere..."
              />
            </div>

            <div>
              <Label htmlFor="climate">Climate</Label>
              <select
                id="climate"
                value={formData.climate}
                onChange={(e) =>
                  setFormData({ ...formData, climate: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select climate...</option>
                {climates.map((climate) => (
                  <option key={climate} value={climate}>
                    {climate}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="population">Population</Label>
              <Input
                id="population"
                type="number"
                value={formData.population}
                onChange={(e) =>
                  setFormData({ ...formData, population: e.target.value })
                }
                placeholder="e.g., 1000000"
              />
            </div>

            <div>
              <Label htmlFor="importance">
                Story Importance: {formData.importance}%
              </Label>
              <input
                id="importance"
                type="range"
                min="0"
                max="100"
                value={formData.importance}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    importance: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Minor</span>
                <span>Major</span>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Link
                href={`/projects/${params.id}/world/locations`}
                className="px-6 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </Link>
              <Button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Location'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
