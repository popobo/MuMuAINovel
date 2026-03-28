'use client'

import { useState, useEffect } from 'react'
import type { Prisma } from '@prisma/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Scroll, Edit, Trash2 } from 'lucide-react'

type EventWithLocation = Prisma.EventGetPayload<{
  include: { location: { select: { id: true; name: true } } }
}>

const eventTypes = [
  'Battle',
  'Treaty',
  'Discovery',
  'Meeting',
  'Death',
  'Birth',
  'Coronation',
  'Rebellion',
  'Natural Disaster',
  'Political Change',
  'Other',
]

export default function EventsPage() {
  const routeParams = useParams()
  const projectId =
    typeof routeParams.id === 'string'
      ? routeParams.id
      : routeParams.id?.[0] ?? ''
  const router = useRouter()
  const [events, setEvents] = useState<EventWithLocation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch(`/api/world/events?projectId=${projectId}`)
        if (res.ok) {
          const data = await res.json()
          setEvents(data.events as EventWithLocation[])
        }
      } catch (error) {
        console.error('Failed to load events:', error)
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [projectId])

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this event?')) {
      return
    }

    try {
      const res = await fetch(`/api/world/events/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setEvents((prev) => prev.filter((evt) => evt.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete event:', error)
    }
  }

  // Sort events by date if available
  const sortedEvents = [...events].sort((a, b) => {
    if (!a.date) return 1
    if (!b.date) return -1
    return a.date.localeCompare(b.date)
  })

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link
          href={`/projects/${projectId}/world`}
          className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          ← Back to World Building
        </Link>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Events</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {events.length} {events.length === 1 ? 'event' : 'events'}
            </p>
          </div>
          <Link
            href={`/projects/${projectId}/world/events/new`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Add Event
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
            <Scroll className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-4">No events yet</p>
            <Link
              href={`/projects/${projectId}/world/events/new`}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first event →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Timeline */}
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-700" />

              {sortedEvents.map((event, index) => (
                <div key={event.id} className="relative pl-12 pb-8">
                  {/* Timeline dot */}
                  <div className="absolute left-0 w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Scroll className="h-4 w-4" />
                  </div>

                  <Card className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold">{event.name}</h3>
                          <span className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded capitalize">
                            {event.type}
                          </span>
                        </div>
                        {event.date && (
                          <div className="text-sm text-gray-500">
                            📅 {event.date}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() =>
                            router.push(`/projects/${projectId}/world/events/${event.id}/edit`)
                          }
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDelete(event.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {event.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {event.description}
                      </p>
                    )}

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Importance:</span>
                      <span className="font-medium">{event.importance}%</span>
                    </div>

                    {event.location && (
                      <div className="mt-4 pt-4 border-t text-sm">
                        <span className="text-gray-500">Location:</span>{' '}
                        <span className="font-medium">{event.location.name}</span>
                      </div>
                    )}
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
