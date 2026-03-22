'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewChapterPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Get next chapter number
      const chaptersRes = await fetch(`/api/chapters?projectId=${params.id}`)
      const chaptersData = await chaptersRes.json()
      const nextNumber = (chaptersData.chapters?.length || 0) + 1

      // Create chapter
      const res = await fetch('/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: params.id,
          title: formData.title,
          chapterNumber: nextNumber,
          summary: formData.summary || null,
        }),
      })

      if (res.ok) {
        const chapter = await res.json()
        router.push(`/projects/${params.id}/chapters/${chapter.id}`)
      }
    } catch (error) {
      console.error('Failed to create chapter:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href={`/projects/${params.id}/chapters`}
          className="text-blue-600 hover:text-blue-700 mb-6 inline-block"
        >
          ← Back to Chapters
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-8">
          <h1 className="text-3xl font-bold mb-6">Create New Chapter</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="title">
                Chapter Title *
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter chapter title"
                required
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                htmlFor="summary"
              >
                Chapter Summary
              </label>
              <textarea
                id="summary"
                value={formData.summary}
                onChange={(e) =>
                  setFormData({ ...formData, summary: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief summary of what happens in this chapter..."
              />
            </div>

            <div className="flex justify-end gap-4">
              <Link
                href={`/projects/${params.id}/chapters`}
                className="px-6 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Chapter'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
