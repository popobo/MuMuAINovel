'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Edit } from 'lucide-react'

interface Character {
  id: string
  name: string
  role?: string
}

interface Relationship {
  id: string
  characterId: string
  relatedId: string
  relationshipType: string
  description?: string
  strength: number
  character: { id: string; name: string }
  related: { id: string; name: string }
}

interface RelationshipListProps {
  projectId: string
}

export function RelationshipList({ projectId }: RelationshipListProps) {
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadRelationships() {
      try {
        const res = await fetch(`/api/projects/${projectId}/relationships`)
        if (res.ok) {
          const data = await res.json()
          // Transform edges to relationships
          const rels: Relationship[] = data.edges.map((edge: any) => ({
            id: edge.id,
            characterId: edge.source,
            relatedId: edge.target,
            relationshipType: edge.data.type,
            description: edge.data.description,
            strength: edge.data.strength,
            character: {
              id: edge.source,
              name: data.nodes.find((n: any) => n.id === edge.source)?.data
                .label || '',
            },
            related: {
              id: edge.target,
              name: data.nodes.find((n: any) => n.id === edge.target)?.data
                .label || '',
            },
          }))
          setRelationships(rels)
        }
      } catch (error) {
        console.error('Failed to load relationships:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRelationships()
  }, [projectId])

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this relationship?')) {
      return
    }

    try {
      const res = await fetch(`/api/relationships/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setRelationships((prev) => prev.filter((r) => r.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete relationship:', error)
    }
  }

  if (loading) {
    return <div>Loading relationships...</div>
  }

  if (relationships.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
        <p className="text-gray-500 mb-4">No relationships defined yet</p>
        <p className="text-sm text-gray-400">
          Use the graph above to create relationships between characters
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">All Relationships</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {relationships.map((rel) => (
          <Card key={rel.id} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold">{rel.character.name}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-semibold">{rel.related.name}</span>
                </div>
                <Badge variant="secondary">{rel.relationshipType}</Badge>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => handleDelete(rel.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {rel.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {rel.description}
              </p>
            )}

            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Strength:</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${rel.strength}%` }}
                />
              </div>
              <span className="text-gray-600 w-8 text-right">
                {rel.strength}%
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
