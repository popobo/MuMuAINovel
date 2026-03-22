'use client'

import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '@/i18n/context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { USE_STORED_API_KEY } from '@/lib/user-ai-api-constants'
import { cn } from '@/lib/utils'

type ApiProvider = 'openai' | 'openrouter' | 'mumu' | 'anthropic'

type SettingsDto = {
  id: string | null
  apiProvider: ApiProvider
  apiBaseUrl: string | null
  llmModel: string
  temperature: number
  maxTokens: number
  hasApiKey: boolean
}

const PROVIDER_DEFAULTS: Record<
  ApiProvider,
  { baseUrl: string; model: string }
> = {
  mumu: {
    baseUrl: 'https://api.mumuverse.space/v1',
    model: 'gemini-3-flash-preview',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o-mini',
  },
  anthropic: {
    baseUrl: '',
    model: 'claude-3-5-sonnet-20241022',
  },
}

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-gray-900'

export function AiSettingsForm() {
  const { t } = useI18n()
  /** 避免 SSR 与客户端首帧文案不一致导致 hydration mismatch（如旧 chunk 仍用 login.signingIn） */
  const [hydrated, setHydrated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [fetchingModels, setFetchingModels] = useState(false)
  const [banner, setBanner] = useState<{
    type: 'ok' | 'err' | 'info'
    text: string
  } | null>(null)

  const [id, setId] = useState<string | null>(null)
  const [apiProvider, setApiProvider] = useState<ApiProvider>('openai')
  const [apiBaseUrl, setApiBaseUrl] = useState('')
  const [llmModel, setLlmModel] = useState('gpt-4o-mini')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(2000)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [modelOptions, setModelOptions] = useState<string[]>([])

  const applyProviderDefaults = useCallback((p: ApiProvider) => {
    const d = PROVIDER_DEFAULTS[p]
    setApiBaseUrl(d.baseUrl)
    setLlmModel(d.model)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setBanner(null)
    try {
      const res = await fetch('/api/user/ai-settings')
      if (!res.ok) throw new Error('load')
      const data = (await res.json()) as SettingsDto
      setId(data.id)
      setApiProvider(data.apiProvider)
      setApiBaseUrl(data.apiBaseUrl ?? PROVIDER_DEFAULTS[data.apiProvider].baseUrl)
      setLlmModel(data.llmModel)
      setTemperature(data.temperature)
      setMaxTokens(data.maxTokens)
      setHasApiKey(data.hasApiKey)
      setApiKeyInput('')
      setModelOptions([])
    } catch {
      setBanner({ type: 'err', text: t('settings.loadFailed') })
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    setHydrated(true)
    void load()
  }, [load])

  const onProviderChange = (value: ApiProvider) => {
    setApiProvider(value)
    applyProviderDefaults(value)
    setModelOptions([])
    setBanner(null)
  }

  const resolveKeyForRequest = (): string | null => {
    const trimmed = apiKeyInput.trim()
    if (trimmed) return trimmed
    if (hasApiKey) return USE_STORED_API_KEY
    return null
  }

  const handleSave = async () => {
    if (!hasApiKey && !apiKeyInput.trim()) {
      setBanner({ type: 'info', text: t('settings.needKeyToSave') })
      return
    }
    setSaving(true)
    setBanner(null)
    try {
      const body: Record<string, unknown> = {
        apiProvider,
        apiBaseUrl: apiBaseUrl.trim() || null,
        llmModel: llmModel.trim(),
        temperature,
        maxTokens,
      }
      const trimmed = apiKeyInput.trim()
      if (trimmed) {
        body.apiKey = trimmed
      }

      const res = await fetch('/api/user/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('save')
      const data = (await res.json()) as SettingsDto
      setId(data.id)
      setHasApiKey(data.hasApiKey)
      setApiKeyInput('')
      setBanner({ type: 'ok', text: t('settings.saved') })
    } catch {
      setBanner({ type: 'err', text: t('settings.saveFailed') })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    const key = resolveKeyForRequest()
    if (!key) {
      setBanner({ type: 'info', text: t('settings.needKeyForTest') })
      return
    }
    setTesting(true)
    setBanner(null)
    try {
      const res = await fetch('/api/user/ai-settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiProvider,
          apiKey: key,
          apiBaseUrl: apiBaseUrl.trim() || null,
          llmModel: llmModel.trim(),
          temperature: 0.3,
          maxTokens: 64,
        }),
      })
      const data = (await res.json()) as {
        success: boolean
        message?: string
        responseTimeMs?: number
      }
      if (data.success && data.responseTimeMs !== undefined) {
        setBanner({
          type: 'ok',
          text: t('settings.testOk', { ms: data.responseTimeMs }),
        })
      } else {
        setBanner({
          type: 'err',
          text: `${t('settings.testFailed')}: ${data.message ?? res.statusText}`,
        })
      }
    } catch {
      setBanner({ type: 'err', text: t('settings.testFailed') })
    } finally {
      setTesting(false)
    }
  }

  const handleFetchModels = async () => {
    if (apiProvider === 'anthropic') {
      setBanner({ type: 'info', text: t('settings.fetchModelsAnthropicHint') })
      return
    }
    const key = resolveKeyForRequest()
    if (!key) {
      setBanner({ type: 'info', text: t('settings.apiKeyHintSaved') })
      return
    }
    setFetchingModels(true)
    setBanner(null)
    try {
      const res = await fetch('/api/user/ai-settings/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiProvider,
          apiKey: key,
          apiBaseUrl: apiBaseUrl.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        throw new Error(err.error ?? 'models')
      }
      const data = (await res.json()) as { models: string[] }
      setModelOptions(data.models)
      setBanner({
        type: 'ok',
        text: t('settings.modelsLoaded', { count: data.models.length }),
      })
    } catch (e) {
      setBanner({
        type: 'err',
        text: e instanceof Error ? e.message : 'models',
      })
    } finally {
      setFetchingModels(false)
    }
  }

  const handleResetLocal = () => {
    setBanner(null)
    applyProviderDefaults(apiProvider)
    setTemperature(0.7)
    setMaxTokens(2000)
    setApiKeyInput('')
    setModelOptions([])
  }

  const handleDelete = async () => {
    if (!window.confirm(t('settings.deleteConfirm'))) return
    setSaving(true)
    setBanner(null)
    try {
      const res = await fetch('/api/user/ai-settings', { method: 'DELETE' })
      if (!res.ok) throw new Error('del')
      await load()
      setBanner({ type: 'ok', text: t('settings.deleted') })
    } catch {
      setBanner({ type: 'err', text: t('settings.deleteFailed') })
    } finally {
      setSaving(false)
    }
  }

  if (!hydrated) {
    return (
      <div
        className="mx-auto max-h-52 max-w-2xl animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
        aria-hidden
      />
    )
  }

  if (loading) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t('settings.loading')}
      </p>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {banner && (
        <div
          className={cn(
            'rounded-lg border px-4 py-3 text-sm',
            banner.type === 'ok' &&
              'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-100',
            banner.type === 'err' &&
              'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100',
            banner.type === 'info' &&
              'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100',
          )}
          role="status"
        >
          {banner.text}
        </div>
      )}

      <Card>
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <CardTitle className="text-lg">{t('settings.cardLlm')}</CardTitle>
          <p className="text-muted-foreground text-sm font-normal">
            {t('settings.openAiCompatHint')}
          </p>
        </CardHeader>
        <CardContent className="grid gap-5 pt-4">
          <div className="grid gap-2">
            <Label htmlFor="apiProvider">{t('settings.provider')}</Label>
            <select
              id="apiProvider"
              className={selectClass}
              value={apiProvider}
              onChange={(e) =>
                onProviderChange(e.target.value as ApiProvider)
              }
            >
              <option value="mumu">MuMuのAPI</option>
              <option value="openai">OpenAI Compatible</option>
              <option value="openrouter">OpenRouter</option>
              <option value="anthropic">Anthropic (Claude)</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="apiBaseUrl">{t('settings.apiBaseUrl')}</Label>
            <Input
              id="apiBaseUrl"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              autoComplete="off"
            />
            {apiProvider === 'anthropic' && (
              <p className="text-muted-foreground text-xs">
                {t('settings.anthropicUrlHint')}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="apiKey">{t('settings.apiKey')}</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={t('settings.apiKeyPlaceholder')}
              autoComplete="off"
            />
            {hasApiKey && (
              <p className="text-muted-foreground text-xs">
                {t('settings.apiKeyHintSaved')}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="llmModel">{t('settings.llmModel')}</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="llmModel"
                className="flex-1"
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                list="llm-model-suggestions"
                autoComplete="off"
              />
              <datalist id="llm-model-suggestions">
                {modelOptions.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              <Button
                type="button"
                variant="outline"
                disabled={fetchingModels}
                onClick={() => void handleFetchModels()}
              >
                {fetchingModels ? '…' : t('settings.fetchModels')}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="temperature">{t('settings.temperature')}</Label>
              <Input
                id="temperature"
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxTokens">{t('settings.maxTokens')}</Label>
              <Input
                id="maxTokens"
                type="number"
                min={64}
                max={200000}
                step={64}
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? t('settings.saving') : t('settings.save')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleTest()}
              disabled={testing}
            >
              {testing ? '…' : t('settings.testConnection')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleResetLocal}
            >
              {t('settings.resetForm')}
            </Button>
            {id && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleDelete()}
                disabled={saving}
              >
                {t('settings.deleteStored')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
