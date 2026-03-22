import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ProjectService } from '@/services/project.service'

export default async function ProjectSettingsPage({
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
  const project = await projectService.getById(id, session.user.id)

  if (!project) {
    redirect('/projects')
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Project Settings</h1>
          </div>

          {/* Project Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Project Information</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  defaultValue={project.title}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  defaultValue={project.description || ''}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Genre</label>
                  <input
                    type="text"
                    defaultValue={project.genre || ''}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Narrative Perspective
                  </label>
                  <select
                    defaultValue={project.narrativePerspective || ''}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="">Select...</option>
                    <option value="First Person">First Person</option>
                    <option value="Third Person Limited">
                      Third Person Limited
                    </option>
                    <option value="Third Person Omniscient">
                      Third Person Omniscient
                    </option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* Writing Goals */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Writing Goals</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Target Word Count
                </label>
                <input
                  type="number"
                  defaultValue={project.targetWords}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Main Character Count
                </label>
                <input
                  type="number"
                  defaultValue={project.characterCount}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Current Progress</span>
                <span>
                  {Math.round((project.currentWords / project.targetWords) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min(
                      (project.currentWords / project.targetWords) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* AI Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">AI Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Default AI Provider
                </label>
                <select className="w-full px-4 py-2 border rounded-lg">
                  <option value="openai">OpenAI (GPT)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="gemini">Google (Gemini)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Model</label>
                <input
                  type="text"
                  placeholder="e.g., gpt-4o-mini"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Temperature (Creativity)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  defaultValue="0.7"
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Focused</span>
                  <span>Creative</span>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-6">
            <h2 className="text-lg font-semibold mb-4 text-red-800 dark:text-red-200">
              Danger Zone
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Delete this project and all its data
                </p>
              </div>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
                Delete Project
              </button>
            </div>
          </div>
      </div>
    </div>
  )
}
