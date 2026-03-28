'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewCharacterPage() {
  const routeParams = useParams()
  const projectId =
    typeof routeParams.id === 'string'
      ? routeParams.id
      : routeParams.id?.[0] ?? ''
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    personality: '',
    background: '',
    appearance: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId,
          ...formData,
        }),
      })

      if (res.ok) {
        const character = await res.json()
        router.push(`/projects/${projectId}/characters/${character.id}`)
      }
    } catch (error) {
      console.error('Failed to create character:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href={`/projects/${projectId}/characters`}
          className="text-blue-600 hover:text-blue-700 mb-6 inline-block"
        >
          ← Back to Characters
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-8">
          <h1 className="text-3xl font-bold mb-6">Create New Character</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="name">
                Name *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Character name"
                required
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                htmlFor="description"
              >
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief description of the character..."
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                htmlFor="personality"
              >
                Personality
              </label>
              <textarea
                id="personality"
                value={formData.personality}
                onChange={(e) =>
                  setFormData({ ...formData, personality: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Personality traits, quirks, mannerisms..."
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                htmlFor="background"
              >
                Background
              </label>
              <textarea
                id="background"
                value={formData.background}
                onChange={(e) =>
                  setFormData({ ...formData, background: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Character history, upbringing, past events..."
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                htmlFor="appearance"
              >
                Appearance
              </label>
              <textarea
                id="appearance"
                value={formData.appearance}
                onChange={(e) =>
                  setFormData({ ...formData, appearance: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Physical appearance, clothing, distinctive features..."
              />
            </div>

            <div className="flex justify-end gap-4">
              <Link
                href={`/projects/${projectId}/characters`}
                className="px-6 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Character'}
              </button>
            </div>
          </form>
        </div>

        {/* AI Assistant */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border">
          <h3 className="font-semibold mb-2">✨ AI Assistant</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Let AI help you create a detailed character profile
          </p>
          <button
            type="button"
            className="px-4 py-2 bg-white dark:bg-gray-800 border rounded-lg hover:shadow-md text-sm"
          >
            Generate with AI
          </button>
        </div>
      </div>
    </div>
  )
}
