'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { FocusMode } from '@/components/editor/focus-mode'
import { Loader2, Save, Sparkles, Maximize2 } from 'lucide-react'

interface ChapterEditorWrapperProps {
  chapterId: string
  projectId: string
  initialContent: string
  title: string
  summary?: string | null
  chapterNumber: number
}

export function ChapterEditorWrapper({
  chapterId,
  projectId,
  initialContent,
  title,
  summary,
  chapterNumber,
}: ChapterEditorWrapperProps) {
  const [content, setContent] = useState(initialContent)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isFocusMode, setIsFocusMode] = useState(false)

  async function handleSave() {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/chapters/${chapterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (response.ok) {
        setLastSaved(new Date())
      }
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleAIGenerate() {
    if (!confirm('This will replace your current content. Continue?')) {
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch(`/api/chapters/${chapterId}/generate`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        setContent(data.content)
        setLastSaved(new Date())
      }
    } catch (error) {
      console.error('Failed to generate:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-none mb-6">
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        {summary && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="text-sm text-blue-800 dark:text-blue-200 mb-1">
              Chapter Summary
            </div>
            <p className="text-gray-700 dark:text-gray-300">{summary}</p>
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <div className="flex-none mb-4 flex justify-between items-center bg-white dark:bg-gray-800 rounded-lg border p-4">
        <div className="flex gap-2">
          <Button
            onClick={handleAIGenerate}
            disabled={isGenerating}
            variant="outline"
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                AI Generate
              </>
            )}
          </Button>
          <Button
            onClick={() => setIsFocusMode(true)}
            variant="outline"
            className="gap-2"
          >
            <Maximize2 className="h-4 w-4" />
            Focus Mode
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {lastSaved && (
            <span className="text-sm text-gray-500">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="Start writing your chapter here..."
        />
      </div>

      {/* Footer Stats */}
      <div className="flex-none mt-4 flex justify-between text-sm text-gray-500">
        <span>Chapter {chapterNumber}</span>
        <span>
          {content.split(/\s+/).filter(Boolean).length} words
        </span>
      </div>

      {/* Focus Mode */}
      <FocusMode isOpen={isFocusMode} onClose={() => setIsFocusMode(false)}>
        <div className="max-w-4xl mx-auto p-8">
          <h1 className="text-3xl font-bold mb-6">{title}</h1>
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Start writing your chapter here..."
          />
        </div>
      </FocusMode>
    </div>
  )
}
