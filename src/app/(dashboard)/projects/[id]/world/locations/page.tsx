'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Plus, Edit, Trash2, MapPin } from 'lucide-react'

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

export default function LocationsPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadLocations() {
      try {
        const res = await fetch(`/api/world/locations?projectId=${params.id}`)
        if (res.ok) {
          const data = await res.json()
          setLocations(data.locations)
        }
      } catch (error) {
        console.error('Failed to load locations:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLocations()
  }, [params.id])

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this location?')) {
      return
    }

    try {
      const res = await fetch(`/api/world/locations/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setLocations((prev) => prev.filter((loc) => loc.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete location:', error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/projects/${params.id}/world`}
            className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
          >
            ← Back to World Building
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Locations</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {locations.length} {locations.length === 1 ? 'location' : 'locations'}
              </p>
            </div>
            <Link
              href={`/projects/${params.id}/world/locations/new`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              + Add Location
            </Link>
          </div>
        </div>

        {/* Locations Grid */}
        {locations.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-4">No locations yet</p>
            <Link
              href={`/projects/${params.id}/world/locations/new`}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first location →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map((location) => (
              <Card key={location.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">
                      {location.name}
                    </h3>
                    <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {location.type}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() =>
                        router.push(
                          `/projects/${params.id}/world/locations/${location.id}/edit`
                        )
                      }
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleDelete(location.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {location.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                    {location.description}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  {location.climate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Climate:</span>
                      <span className="font-medium">{location.climate}</span>
                    </div>
                  )}
                  {location.population !== null && location.population !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Population:</span>
                      <span className="font-medium">
                        {location.population.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Importance:</span>
                    <span className="font-medium">{location.importance}%</span>
                  </div>
                </div>

                {location.importance >= 70 && (
                  <div className="mt-4 pt-4 border-t">
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                      Key Location
                    </span>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
