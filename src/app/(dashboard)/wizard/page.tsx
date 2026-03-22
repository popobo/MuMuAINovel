'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const steps = [
  { id: 'basic', title: 'Basic Info', description: 'Tell us about your novel' },
  { id: 'details', title: 'Story Details', description: 'Genre and perspective' },
  { id: 'characters', title: 'Characters', description: 'Main cast' },
  { id: 'generate', title: 'Generate', description: 'AI creates your project' },
]

export default function WizardPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    genre: '',
    narrativePerspective: '',
    characterCount: 5,
    targetWords: 50000,
  })

  function handleNext() {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/wizard/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        const result = await res.json()
        router.push(`/projects/${result.project.id}`)
      }
    } catch (error) {
      console.error('Failed to generate project:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Create Your Novel</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Let AI help you start your writing journey
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex-1 flex items-center">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      index === currentStep
                        ? 'bg-blue-600 text-white'
                        : index < currentStep
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {index < currentStep ? '✓' : index + 1}
                  </div>
                  <div className="mt-2 text-center">
                    <div className="text-sm font-medium">{step.title}</div>
                    <div className="text-xs text-gray-500">{step.description}</div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      index < currentStep ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border p-8">
          {currentStep === 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Basic Information</h2>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Novel Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your novel's title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Brief Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="What's your novel about?"
                />
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Story Details</h2>
              <div>
                <label className="block text-sm font-medium mb-2">Genre *</label>
                <select
                  value={formData.genre}
                  onChange={(e) =>
                    setFormData({ ...formData, genre: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a genre</option>
                  <option value="Fantasy">Fantasy</option>
                  <option value="Science Fiction">Science Fiction</option>
                  <option value="Romance">Romance</option>
                  <option value="Mystery">Mystery</option>
                  <option value="Thriller">Thriller</option>
                  <option value="Horror">Horror</option>
                  <option value="Literary Fiction">Literary Fiction</option>
                  <option value="Historical Fiction">Historical Fiction</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Narrative Perspective *
                </label>
                <select
                  value={formData.narrativePerspective}
                  onChange={(e) =>
                    setFormData({ ...formData, narrativePerspective: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select perspective</option>
                  <option value="First Person">First Person</option>
                  <option value="Third Person Limited">
                    Third Person Limited
                  </option>
                  <option value="Third Person Omniscient">
                    Third Person Omniscient
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Target Word Count
                </label>
                <input
                  type="number"
                  value={formData.targetWords}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      targetWords: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="10000"
                  step="5000"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Typical novels: 50,000-100,000 words
                </p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Main Characters</h2>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Number of Main Characters
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.characterCount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      characterCount: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>1</span>
                  <span className="text-lg font-semibold text-blue-600">
                    {formData.characterCount}
                  </span>
                  <span>10</span>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold mb-2">✨ AI Character Generation</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  AI will generate detailed character profiles including names,
                  backgrounds, personalities, and relationships based on your
                  novel's genre and premise.
                </p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Ready to Create!</h2>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <h3 className="font-semibold mb-4">Project Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Title:</span>
                    <span className="font-medium">{formData.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Genre:</span>
                    <span className="font-medium">{formData.genre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Perspective:
                    </span>
                    <span className="font-medium">
                      {formData.narrativePerspective}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Characters:
                    </span>
                    <span className="font-medium">
                      {formData.characterCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Target Words:
                    </span>
                    <span className="font-medium">
                      {formData.targetWords.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border">
                <h3 className="font-semibold mb-2">🎬 What AI Will Create</h3>
                <ul className="text-sm space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Complete story outline with chapter breakdown</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>
                      {formData.characterCount} detailed character profiles
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Plot suggestions and story arcs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>World-building notes</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={handleBack}
              disabled={currentStep === 0 || isGenerating}
              className="px-6 py-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Back
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={
                  !formData.title ||
                  (currentStep === 1 &&
                    (!formData.genre || !formData.narrativePerspective))
                }
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
              >
                {isGenerating ? 'Creating Project...' : '✨ Create Project with AI'}
              </button>
            )}
          </div>
        </div>

        {/* Cancel Link */}
        <div className="text-center mt-6">
          <Link
            href="/projects"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            Cancel and return to projects
          </Link>
        </div>
      </div>
    </div>
  )
}
