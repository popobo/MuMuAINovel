'use client'

import {
  BookOpen,
  MessageSquare,
  Zap,
  GraduationCap,
  PenTool,
  Clock,
  Quote,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'

interface WritingStyleDisplayProps {
  writingStyleAnalysis: string | null
  writingStyleSummary: string | null
  styleProseQuality: string | null
  styleTone: string | null
  stylePacing: string | null
  styleLanguageLevel: string | null
  styleVoice: string | null
  styleAnalysisConfidence: number | null
}

interface StyleDimension {
  label: string
  value: string | null
  icon: React.ElementType
  color: string
  description: string
}

const STYLE_DESCRIPTIONS: Record<string, Record<string, string>> = {
  prose_quality: {
    descriptive: '重视描写，文笔细腻，环境/心理描写占比高',
    action_oriented: '重视动作和情节推进，节奏快',
    balanced: '描写与动作并重',
  },
  tone: {
    serious: '严肃、沉重',
    humorous: '幽默、轻松',
    mixed: '严肃与幽默交织',
    dark: '黑暗、压抑',
    light: '明快、积极',
  },
  pacing: {
    fast: '快节奏，情节推进迅速',
    slow: '慢节奏，注重细节铺陈',
    variable: '节奏变化明显',
    tension_building: '张力递进式',
  },
  language_level: {
    simple: '简洁直白，易懂',
    complex: '复杂，句式丰富',
    literary: '文学性强，用词考究',
    casual: '口语化，随意',
  },
  voice: {
    poetic: '诗意化，抒情性强',
    direct: '直截了当，简洁明快',
    metaphorical: '善用隐喻和象征',
    literal: '写实，平铺直叙',
  },
}

const STYLE_COLORS: Record<string, Record<string, string>> = {
  prose_quality: {
    descriptive: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    action_oriented: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    balanced: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  tone: {
    serious: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    humorous: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    mixed: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    dark: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300',
    light: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  },
  pacing: {
    fast: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    slow: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    variable: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    tension_building: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  },
  language_level: {
    simple: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    complex: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
    literary: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
    casual: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300',
  },
  voice: {
    poetic: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
    direct: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
    metaphorical: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    literal: 'bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-300',
  },
}

export function WritingStyleDisplay({
  writingStyleAnalysis,
  writingStyleSummary,
  styleProseQuality,
  styleTone,
  stylePacing,
  styleLanguageLevel,
  styleVoice,
  styleAnalysisConfidence,
}: WritingStyleDisplayProps) {
  const { t } = useI18n()

  // 如果没有风格数据，显示空状态
  if (!writingStyleAnalysis || !writingStyleSummary) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <PenTool className="w-5 h-5" />
          {t('writingStyle.pageTitle')}
        </h2>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <PenTool className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">{t('writingStyle.noAnalysis')}</p>
          <p className="text-xs mt-1">
            {t('writingStyle.noAnalysisHint')}
          </p>
        </div>
      </div>
    )
  }

  // 解析风格分析JSON
  let styleData: Record<string, unknown> | null = null
  try {
    styleData = writingStyleAnalysis ? JSON.parse(writingStyleAnalysis) : null
  } catch (e) {
    console.warn('[book-import] failed to parse writing style analysis', e)
  }

  const dimensions: StyleDimension[] = [
    {
      label: 'Prose Quality',
      value: styleProseQuality,
      icon: BookOpen,
      color: styleProseQuality
        ? STYLE_COLORS.prose_quality[styleProseQuality]
        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      description:
        STYLE_DESCRIPTIONS.prose_quality[styleProseQuality || ''] || '',
    },
    {
      label: 'Tone',
      value: styleTone,
      icon: MessageSquare,
      color: styleTone
        ? STYLE_COLORS.tone[styleTone]
        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      description: STYLE_DESCRIPTIONS.tone[styleTone || ''] || '',
    },
    {
      label: 'Pacing',
      value: stylePacing,
      icon: Zap,
      color: stylePacing
        ? STYLE_COLORS.pacing[stylePacing]
        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      description: STYLE_DESCRIPTIONS.pacing[stylePacing || ''] || '',
    },
    {
      label: 'Language Level',
      value: styleLanguageLevel,
      icon: GraduationCap,
      color: styleLanguageLevel
        ? STYLE_COLORS.language_level[styleLanguageLevel]
        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      description:
        STYLE_DESCRIPTIONS.language_level[styleLanguageLevel || ''] || '',
    },
    {
      label: 'Voice',
      value: styleVoice,
      icon: PenTool,
      color: styleVoice
        ? STYLE_COLORS.voice[styleVoice]
        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      description: STYLE_DESCRIPTIONS.voice[styleVoice || ''] || '',
    },
  ]

  // 提取示例
  const examples = styleData
    ? {
        prose_quality: (styleData.prose_quality_examples as string[]) || [],
        tone: (styleData.tone_examples as string[]) || [],
        pacing: (styleData.pacing_examples as string[]) || [],
        language_level: (styleData.language_level_examples as string[]) || [],
        voice: (styleData.voice_examples as string[]) || [],
      }
    : null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <PenTool className="w-5 h-5" />
          {t('writingStyle.pageTitle')}
        </h2>
        {styleAnalysisConfidence !== null && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400">
              {t('writingStyle.confidenceLabel', { percent: Math.round(styleAnalysisConfidence * 100) })}
            </span>
          </div>
        )}
      </div>

      {/* 风格概述 */}
      {writingStyleSummary && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <Quote className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {writingStyleSummary}
            </p>
          </div>
        </div>
      )}

      {/* 风格维度卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {dimensions.map((dimension) => {
          const Icon = dimension.icon
          return (
            <div
              key={dimension.label}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium">{dimension.label}</span>
                </div>
                {dimension.value && (
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${dimension.color}`}
                  >
                    {dimension.value
                      .split('_')
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ')}
                  </span>
                )}
              </div>
              {dimension.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {dimension.description}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* 原文示例 */}
      {examples && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Quote className="w-4 h-4" />
            {t('writingStyle.originalTextExamples')}
          </h3>

          {Object.entries(examples).map(([key, exampleList]) => {
            if (!exampleList || exampleList.length === 0) return null

            const dimension = dimensions.find((d) =>
              d.label.toLowerCase().replace(' ', '_') === key
            )

            return (
              <div
                key={key}
                className="border rounded-lg overflow-hidden"
              >
                <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-2 border-b">
                  <span className="text-sm font-medium flex items-center gap-2">
                    {dimension && <dimension.icon className="w-4 h-4" />}
                    {dimension?.label || key}
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  {exampleList.map((example, idx) => (
                    <div
                      key={idx}
                      className="relative pl-4 border-l-2 border-blue-300 dark:border-blue-700"
                    >
                      <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">
                        &ldquo;{example}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
