import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProjectService } from '@/services/project.service'
import { LocationService } from '@/services/location.service'
import { OrganizationService } from '@/services/organization.service'
import { EventService } from '@/services/event.service'

export default async function WorldBuildingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const { id } = await params

  const projectService = new ProjectService()
  const locationService = new LocationService()
  const organizationService = new OrganizationService()
  const eventService = new EventService()

  const [project, locations, organizations, events] = await Promise.all([
    projectService.getById(id, session.user.id),
    locationService.listByProject(id),
    organizationService.listByProject(id),
    eventService.listByProject(id),
  ])

  if (!project) {
    redirect('/projects')
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">World Building</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Create the world your story takes place in
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Link
              href={`/projects/${id}/world/locations`}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Locations
                  </div>
                  <div className="text-3xl font-bold group-hover:text-blue-600 transition-colors">
                    {locations.length}
                  </div>
                </div>
                <div className="text-4xl">🏰</div>
              </div>
              <div className="text-sm text-gray-500">
                Cities, forests, dungeons, and more
              </div>
            </Link>

            <Link
              href={`/projects/${id}/world/organizations`}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Organizations
                  </div>
                  <div className="text-3xl font-bold group-hover:text-blue-600 transition-colors">
                    {organizations.length}
                  </div>
                </div>
                <div className="text-4xl">🏛️</div>
              </div>
              <div className="text-sm text-gray-500">
                Guilds, governments, cults, and factions
              </div>
            </Link>

            <Link
              href={`/projects/${id}/world/events`}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Events
                  </div>
                  <div className="text-3xl font-bold group-hover:text-blue-600 transition-colors">
                    {events.length}
                  </div>
                </div>
                <div className="text-4xl">📜</div>
              </div>
              <div className="text-sm text-gray-500">
                Battles, treaties, discoveries, and more
              </div>
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href={`/projects/${id}/world/locations/new`}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center font-medium"
            >
              + Add Location
            </Link>
            <Link
              href={`/projects/${id}/world/organizations/new`}
              className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-center font-medium"
            >
              + Add Organization
            </Link>
            <Link
              href={`/projects/${id}/world/events/new`}
              className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-center font-medium"
            >
              + Add Event
            </Link>
          </div>

          {/* Recent Items */}
          {(locations.length > 0 || organizations.length > 0 || events.length > 0) && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6">Recently Added</h2>

              {locations.slice(0, 3).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Locations</h3>
                  <div className="space-y-2">
                    {locations.slice(0, 3).map((location) => (
                      <Link
                        key={location.id}
                        href={`/projects/${id}/world/locations/${location.id}`}
                        className="block bg-white dark:bg-gray-800 rounded-lg p-4 border hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{location.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                              {location.type}
                            </p>
                          </div>
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                            {location.importance}% importance
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {organizations.slice(0, 3).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Organizations</h3>
                  <div className="space-y-2">
                    {organizations.slice(0, 3).map((org) => (
                      <Link
                        key={org.id}
                        href={`/projects/${id}/world/organizations/${org.id}`}
                        className="block bg-white dark:bg-gray-800 rounded-lg p-4 border hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{org.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                              {org.type}
                            </p>
                          </div>
                          <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                            {org.influence}% influence
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {events.slice(0, 3).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Events</h3>
                  <div className="space-y-2">
                    {events.slice(0, 3).map((event) => (
                      <Link
                        key={event.id}
                        href={`/projects/${id}/world/events/${event.id}`}
                        className="block bg-white dark:bg-gray-800 rounded-lg p-4 border hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{event.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                              {event.type}
                            </p>
                          </div>
                          <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded">
                            {event.importance}% importance
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  )
}
