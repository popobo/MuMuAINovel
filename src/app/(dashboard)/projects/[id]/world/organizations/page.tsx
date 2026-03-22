'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Building2, Plus, Edit, Trash2 } from 'lucide-react'

const organizationTypes = [
  'Government',
  'Guild',
  'Religion',
  'Cult',
  'Military',
  'Merchant',
  'Academic',
  'Criminal',
  'Tribal',
  'Other',
]

export default function OrganizationsPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOrganizations() {
      try {
        const res = await fetch(`/api/world/organizations?projectId=${params.id}`)
        if (res.ok) {
          const data = await res.json()
          setOrganizations(data.organizations)
        }
      } catch (error) {
        console.error('Failed to load organizations:', error)
      } finally {
        setLoading(false)
      }
    }

    loadOrganizations()
  }, [params.id])

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this organization?')) {
      return
    }

    try {
      const res = await fetch(`/api/world/organizations/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setOrganizations((prev) => prev.filter((org) => org.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete organization:', error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link
          href={`/projects/${params.id}/world`}
          className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          ← Back to World Building
        </Link>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Organizations</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {organizations.length} {organizations.length === 1 ? 'organization' : 'organizations'}
            </p>
          </div>
          <Link
            href={`/projects/${params.id}/world/organizations/new`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Add Organization
          </Link>
        </div>

        {organizations.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-4">No organizations yet</p>
            <Link
              href={`/projects/${params.id}/world/organizations/new`}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first organization →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {organizations.map((org) => (
              <Card key={org.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">{org.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {org.type}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => router.push(`/projects/${params.id}/world/organizations/${org.id}/edit`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleDelete(org.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {org.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {org.description}
                  </p>
                )}

                {org.leader && (
                  <div className="text-sm mb-2">
                    <span className="text-gray-500">Leader:</span>{' '}
                    <span className="font-medium">{org.leader}</span>
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Size:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{org.size}</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${org.size}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Influence:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{org.influence}</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${org.influence}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {org.location && (
                  <div className="mt-4 pt-4 border-t text-sm">
                    <span className="text-gray-500">Location:</span>{' '}
                    <span className="font-medium">{org.location.name}</span>
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
