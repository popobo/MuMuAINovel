'use client'

import { PenTool, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useI18n } from '@/i18n/context'

interface WritingStyleSummaryCardProps {
  projectId: string
  writingStyleSummary: string | null
  styleProseQuality: string | null
  styleTone: string | null
  stylePacing: string | null
}

export function WritingStyleSummaryCard({
  projectId,
  writingStyleSummary,
  styleProseQuality,
  styleTone,
  stylePacing,
}: WritingStyleSummaryCardProps) {
  const { t } = useI18n()

  // 如果没有风格数据，不显示卡片
  if (!writingStyleSummary) {
    return null
  }

  const getProseQualityLabel = (key: string | null) => {
    if (!key) return ''
    const labels: Record<string, string> = {
      descriptive: t('writingStyle.dimensions.proseQuality.descriptive'),
      action_oriented: t('writingStyle.dimensions.proseQuality.action_oriented'),
      balanced: t('writingStyle.dimensions.proseQuality.balanced'),
    }
    return labels[key] || key
  }

  const getToneLabel = (key: string | null) => {
    if (!key) return ''
    const labels: Record<string, string> = {
      serious: t('writingStyle.dimensions.tone.serious'),
      humorous: t('writingStyle.dimensions.tone.humorous'),
      mixed: t('writingStyle.dimensions.tone.mixed'),
      dark: t('writingStyle.dimensions.tone.dark'),
      light: t('writingStyle.dimensions.tone.light'),
    }
    return labels[key] || key
  }

  const getPacingLabel = (key: string | null) => {
    if (!key) return ''
    const labels: Record<string, string> = {
      fast: t('writingStyle.dimensions.pacing.fast'),
      slow: t('writingStyle.dimensions.pacing.slow'),
      variable: t('writingStyle.dimensions.pacing.variable'),
      tension_building: t('writingStyle.dimensions.pacing.tension_building'),
    }
    return labels[key] || key
  }

  return (
    <Link
      href={`/projects/${projectId}/style`}
      className="bg-white dark:bg-gray-800 rounded-lg p-6 border hover:shadow-md transition-shadow group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PenTool className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold">{t('writingStyle.pageTitle')}</h2>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
      </div>

      {/* 风格标签 */}
      {(styleProseQuality || styleTone || stylePacing) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {styleProseQuality && (
            <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-full text-xs font-medium">
              {getProseQualityLabel(styleProseQuality)}
            </span>
          )}
          {styleTone && (
            <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 rounded-full text-xs font-medium">
              {getToneLabel(styleTone)}
            </span>
          )}
          {stylePacing && (
            <span className="px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded-full text-xs font-medium">
              {getPacingLabel(stylePacing)}
            </span>
          )}
        </div>
      )}

      {/* 风格概述 */}
      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
        {writingStyleSummary}
      </p>

      {/* 点击提示 */}
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-500 group-hover:text-blue-600 transition-colors">
        {t('writingStyle.clickToViewDetails')}
      </div>
    </Link>
  )
}
