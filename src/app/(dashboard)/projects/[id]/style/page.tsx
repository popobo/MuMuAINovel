import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ProjectService } from '@/services/project.service'
import { WritingStyleDisplay } from '@/components/writing-style/writing-style-display'
import { getServerLocale } from '@/i18n/config'

export default async function WritingStylePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const { id } = await params
  const locale = getServerLocale()

  const projectService = new ProjectService()
  const project = await projectService.getById(id, session.user.id)

  if (!project) {
    redirect('/projects')
  }

  // i18n messages
  const messages = {
    en: {
      title: 'Writing Style',
      subtitle: 'Analysis of writing style characteristics based on imported content',
    },
    zh: {
      title: '写作风格',
      subtitle: '基于导入内容分析的写作风格特征',
    },
  }

  const currentMessages = messages[locale] || messages.en

  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{currentMessages.title}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {currentMessages.subtitle}
          </p>
        </div>

        {/* Writing Style Display */}
        <WritingStyleDisplay
          writingStyleAnalysis={project.writingStyleAnalysis}
          writingStyleSummary={project.writingStyleSummary}
          styleProseQuality={project.styleProseQuality}
          styleTone={project.styleTone}
          stylePacing={project.stylePacing}
          styleLanguageLevel={project.styleLanguageLevel}
          styleVoice={project.styleVoice}
          styleAnalysisConfidence={project.styleAnalysisConfidence}
        />
      </div>
    </div>
  )
}
