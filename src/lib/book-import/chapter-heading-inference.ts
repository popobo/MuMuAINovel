/**
 * 用 LLM 从正文片段推断章节标题样式（仅允许白名单 preset → 安全正则），
 * 经试切分校验后才覆盖默认强标题规则。
 */

import { splitChapters } from '@/lib/book-import/txt-parser'

export const CHAPTER_HEADING_PRESET_IDS = [
  'cn_di_zhang',
  'en_chapter',
  'cn_bracket_line',
  'leading_number_title',
  'cn_volume_colon_index',
  'hash_number_title',
  'cn_episode',
  'cn_vol_chapter_one_line',
] as const

export type ChapterHeadingPresetId = (typeof CHAPTER_HEADING_PRESET_IDS)[number]

/** 与 txt-parser 默认强规则对齐的预设，便于模型显式选用 */
const PRESET_TO_REGEX: Record<ChapterHeadingPresetId, RegExp[]> = {
  cn_di_zhang: [/^第[一二三四五六七八九十百千万零〇两\d]+[章节回卷集部篇].*$/],
  en_chapter: [/^chapter\s*\d+.*$/i, /^chap\.\s*\d+.*$/i],
  cn_bracket_line: [/^【[^】]{1,80}】$/],
  leading_number_title: [/^\d{1,4}[、．.\-]\s*\S.{0,120}$/],
  /** 如「上卷 : 001，死神」「下卷：12 标题」——整行须以「(上|中|下|前|后)?卷 + 冒号 + 序号」开头，而非行中仅出现编号 */
  cn_volume_colon_index: [
    /^(?:上|中|下|前|后)?卷\s*[:：]\s*\d{1,4}\s*[，,、．.]?\s*.{0,120}$/,
  ],
  hash_number_title: [/^#\s*(?:第|[\d零一二三四五六七八九十百千万〇两]+).*$/],
  cn_episode: [/^第[一二三四五六七八九十百千万零〇两\d]+集.*$/],
  cn_vol_chapter_one_line: [
    /^第[一二三四五六七八九十百千万零〇两\d]+卷[^。\n]{0,40}第[一二三四五六七八九十百千万零〇两\d]+章.*$/,
  ],
}

const PRESET_SET = new Set<string>(CHAPTER_HEADING_PRESET_IDS)

const SAMPLE_HEAD_LEN = 4_500
const SAMPLE_MID_START = 12_000
const SAMPLE_MID_LEN = 3_500
const TRIAL_SAMPLE_MAX = 25_000

export function buildChapterHeadingSample(fullText: string): string {
  const head = fullText.slice(0, SAMPLE_HEAD_LEN)
  if (fullText.length <= SAMPLE_HEAD_LEN) {
    return head
  }
  if (fullText.length >= SAMPLE_MID_START + SAMPLE_MID_LEN) {
    const mid = fullText.slice(SAMPLE_MID_START, SAMPLE_MID_START + SAMPLE_MID_LEN)
    return `${head}\n\n----------\n\n${mid}`
  }
  return head
}

function dedupePatterns(patterns: RegExp[]): RegExp[] {
  const seen = new Set<string>()
  const out: RegExp[] = []
  for (const p of patterns) {
    const key = p.source
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out
}

/**
 * 将模型返回的 preset 列表转为强标题正则（未知 id 丢弃）。
 */
export function strongPatternsFromPresets(
  presetIds: string[],
): RegExp[] | null {
  const list: RegExp[] = []
  for (const id of presetIds) {
    if (!PRESET_SET.has(id)) continue
    list.push(...PRESET_TO_REGEX[id as ChapterHeadingPresetId])
  }
  const deduped = dedupePatterns(list)
  return deduped.length > 0 ? deduped : null
}

function countStrongHeadingLines(text: string, patterns: RegExp[]): number {
  let n = 0
  for (const line of text.split('\n')) {
    const s = line.trim()
    if (!s) continue
    if (patterns.some(p => p.test(s))) n += 1
  }
  return n
}

export type StrongPatternValidationDiag =
  | { ok: true; strongHits: number; trialChapters: number }
  | {
      ok: false
      reason:
        | 'empty_sample'
        | 'strong_hits_lt_1'
        | 'strong_hits_gt_100'
        | 'trial_no_chapters'
        | 'trial_too_many_chapters'
      strongHits: number
      trialChapters: number
    }

/**
 * 在前若干字上试切分：章节数合理、强标题命中数合理则通过（并返回诊断信息便于日志）。
 */
export function diagnoseStrongPatternValidation(
  fullText: string,
  patterns: RegExp[],
): StrongPatternValidationDiag {
  const sample = fullText.slice(0, TRIAL_SAMPLE_MAX)
  if (!sample.trim()) {
    return {
      ok: false,
      reason: 'empty_sample',
      strongHits: 0,
      trialChapters: 0,
    }
  }

  const strongHits = countStrongHeadingLines(sample, patterns)
  if (strongHits < 1) {
    return {
      ok: false,
      reason: 'strong_hits_lt_1',
      strongHits,
      trialChapters: 0,
    }
  }
  if (strongHits > 100) {
    return {
      ok: false,
      reason: 'strong_hits_gt_100',
      strongHits,
      trialChapters: 0,
    }
  }

  const trial = splitChapters(sample, { strongPatterns: patterns })
  if (trial.length < 1) {
    return {
      ok: false,
      reason: 'trial_no_chapters',
      strongHits,
      trialChapters: trial.length,
    }
  }
  if (trial.length > 80) {
    return {
      ok: false,
      reason: 'trial_too_many_chapters',
      strongHits,
      trialChapters: trial.length,
    }
  }

  return { ok: true, strongHits, trialChapters: trial.length }
}

/**
 * 在前若干字上试切分：章节数合理、强标题命中数合理则通过。
 */
export function validateStrongPatternsOnSample(
  fullText: string,
  patterns: RegExp[],
): boolean {
  return diagnoseStrongPatternValidation(fullText, patterns).ok
}

export type HeadingInferenceParseResult =
  | { mode: 'builtin' }
  | { mode: 'presets'; presets: string[] }

/**
 * 解析模型 JSON；非法或缺失时回退 builtin。
 */
export function parseHeadingInferenceObject(
  obj: Record<string, unknown>,
): HeadingInferenceParseResult {
  const mode = obj.mode
  if (mode === 'builtin') {
    return { mode: 'builtin' }
  }
  if (mode !== 'presets') {
    return { mode: 'builtin' }
  }
  const raw = obj.presets
  if (!Array.isArray(raw) || raw.length === 0) {
    return { mode: 'builtin' }
  }
  const presets = raw
    .filter((x): x is string => typeof x === 'string')
    .map(s => s.trim())
    .filter(Boolean)
  if (presets.length === 0) {
    return { mode: 'builtin' }
  }
  return { mode: 'presets', presets }
}

/**
 * 从解析结果得到可用的强标题正则；builtin 或校验失败返回 null（调用方用默认规则）。
 */
export function strongPatternsFromInference(
  parsed: HeadingInferenceParseResult,
  fullCleanedText: string,
): RegExp[] | null {
  if (parsed.mode === 'builtin') return null
  const patterns = strongPatternsFromPresets(parsed.presets)
  if (!patterns) return null
  if (!validateStrongPatternsOnSample(fullCleanedText, patterns)) {
    return null
  }
  return patterns
}
