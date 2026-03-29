import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Chapter } from '@prisma/client'
import { ProjectService } from '@/services/project.service'
import { ChapterService } from '@/services/chapter.service'
import { OutlineService } from '@/services/outline.service'

function groupChaptersByOutline(chapters: Chapter[]) {
  const byOutlineId = new Map<string, Chapter[]>()
  const unassigned: Chapter[] = []
  for (const ch of chapters) {
    if (ch.outlineId) {
      const list = byOutlineId.get(ch.outlineId) ?? []
      list.push(ch)
      byOutlineId.set(ch.outlineId, list)
    } else {
      unassigned.push(ch)
    }
  }
  for (const list of byOutlineId.values()) {
    list.sort((a, b) => a.chapterNumber - b.chapterNumber)
  }
  unassigned.sort((a, b) => a.chapterNumber - b.chapterNumber)
  return { byOutlineId, unassigned }
}

export default async function OutlinePage({
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
  const chapterService = new ChapterService()
  const outlineService = new OutlineService()

  const [project, chapters, outlines] = await Promise.all([
    projectService.getById(id, session.user.id),
    chapterService.listByProject(id),
    outlineService.listByProject(id),
  ])

  if (!project) {
    redirect('/projects')
  }

  const { byOutlineId, unassigned } = groupChaptersByOutline(chapters)

  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Story outline</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Beat sheets per outline node, plus draft size and status for linked
                chapters
              </p>
            </div>
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              AI Generate Outline
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Genre:</span>
              <span className="ml-2 font-medium">{project.genre || 'Not set'}</span>
            </div>
            <div>
              <span className="text-gray-500">Perspective:</span>
              <span className="ml-2 font-medium">
                {project.narrativePerspective || 'Not set'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Target words:</span>
              <span className="ml-2 font-medium">
                {project.targetWords.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Main characters:</span>
              <span className="ml-2 font-medium">{project.characterCount}</span>
            </div>
          </div>
        </div>

        {outlines.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-2">Outline nodes</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Text below is the stored outline (synopsis / beats), not the chapter
              manuscript. Body size counts characters in the linked chapter draft.
            </p>
            <div className="space-y-4">
              {outlines.map(outline => {
                const linked = byOutlineId.get(outline.id) ?? []
                const desc = outline.description?.trim() ?? ''
                return (
                  <div
                    key={outline.id}
                    className="bg-white dark:bg-gray-800 rounded-lg border p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center text-violet-700 dark:text-violet-300 font-semibold text-sm">
                        {outline.orderIndex}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold">{outline.title}</h3>
                        {desc ? (
                          <p className="text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-wrap wrap-break-word">
                            {desc}
                          </p>
                        ) : (
                          <p className="text-gray-400 dark:text-gray-500 mt-2 italic">
                            No beat sheet for this node yet.
                          </p>
                        )}
                        <div className="mt-2 text-xs text-gray-500">
                          Beat sheet · {desc.length.toLocaleString()} characters
                        </div>

                        {linked.length > 0 ? (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                              Linked chapters
                            </p>
                            <ul className="space-y-2">
                              {linked.map(ch => (
                                <li
                                  key={ch.id}
                                  className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
                                >
                                  <Link
                                    href={`/projects/${id}/chapters/${ch.id}`}
                                    className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                  >
                                    Ch.{ch.chapterNumber} {ch.title}
                                  </Link>
                                  <span className="text-gray-500">
                                    Body · {ch.wordCount.toLocaleString()} characters
                                  </span>
                                  {ch.content ? (
                                    <span className="text-green-600 dark:text-green-500">
                                      Draft has content
                                    </span>
                                  ) : (
                                    <span className="text-amber-600 dark:text-amber-500">
                                      No draft yet
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="mt-4 text-sm text-amber-600 dark:text-amber-500">
                            No chapter linked to this outline node.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : chapters.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
            <p className="text-gray-500 mb-4">No chapters yet</p>
            <Link
              href={`/projects/${id}/chapters/new`}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first chapter →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
              This project has no outline nodes yet. Below is each chapter&apos;s
              short summary (if any) and draft stats — not a formal beat sheet.
            </div>
            <h2 className="text-xl font-semibold">Chapters</h2>
            <div className="space-y-3">
              {chapters.map(chapter => (
                <div
                  key={chapter.id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-6 border"
                >
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold">
                      {chapter.chapterNumber}
                    </div>
                    <div className="flex-1">
                      <Link
                        href={`/projects/${id}/chapters/${chapter.id}`}
                        className="text-lg font-semibold hover:text-blue-600"
                      >
                        {chapter.title}
                      </Link>
                      {chapter.summary ? (
                        <p className="text-gray-600 dark:text-gray-400 mt-2">
                          {chapter.summary}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span>
                          Body · {chapter.wordCount.toLocaleString()} characters
                        </span>
                        {chapter.content ? (
                          <span className="text-green-600">Draft has content</span>
                        ) : (
                          <span className="text-amber-600">No draft yet</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {outlines.length > 0 && unassigned.length > 0 ? (
          <div className="mt-8 space-y-3">
            <h2 className="text-xl font-semibold">Chapters not linked to an outline</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              These chapters exist but are not attached to any outline node.
            </p>
            <div className="space-y-3">
              {unassigned.map(chapter => (
                <div
                  key={chapter.id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 border"
                >
                  <Link
                    href={`/projects/${id}/chapters/${chapter.id}`}
                    className="font-medium text-blue-600 hover:text-blue-700"
                  >
                    Ch.{chapter.chapterNumber} {chapter.title}
                  </Link>
                  <span className="ml-3 text-sm text-gray-500">
                    Body · {chapter.wordCount.toLocaleString()} characters
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Story notes</h2>
          <textarea
            className="w-full h-48 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none dark:bg-gray-900"
            placeholder="Add your story notes, plot ideas, themes, motifs..."
          />
        </div>
      </div>
    </div>
  )
}
