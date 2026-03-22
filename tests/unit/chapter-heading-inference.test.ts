import { describe, expect, it } from 'vitest'
import {
  buildChapterHeadingSample,
  parseHeadingInferenceObject,
  strongPatternsFromInference,
  strongPatternsFromPresets,
  validateStrongPatternsOnSample,
} from '@/lib/book-import/chapter-heading-inference'

describe('chapter-heading-inference', () => {
  it('buildChapterHeadingSample includes head and mid slice for long text', () => {
    const a = 'A'.repeat(5000)
    const b = 'B'.repeat(8000)
    const c = 'C'.repeat(5000)
    const text = `${a}\n${b}\n${c}`
    const s = buildChapterHeadingSample(text)
    expect(s).toContain('AAAA')
    expect(s).toContain('----------')
    expect(s).toContain('BBBB')
  })

  it('parseHeadingInferenceObject accepts presets mode', () => {
    expect(
      parseHeadingInferenceObject({
        mode: 'presets',
        presets: ['cn_di_zhang', 'unknown_drop'],
      }),
    ).toEqual({ mode: 'presets', presets: ['cn_di_zhang', 'unknown_drop'] })
  })

  it('parseHeadingInferenceObject falls back on invalid mode', () => {
    expect(
      parseHeadingInferenceObject({ mode: 'custom', presets: ['cn_di_zhang'] }),
    ).toEqual({ mode: 'builtin' })
  })

  it('strongPatternsFromPresets drops unknown ids', () => {
    const p = strongPatternsFromPresets(['nope', 'cn_di_zhang'])
    expect(p).not.toBeNull()
    expect(p!.length).toBeGreaterThan(0)
  })

  it('validateStrongPatternsOnSample passes for typical 第N章 text', () => {
    const body = `${'正文'.repeat(30)}\n`
    const text = `第一章 开端\n\n${body}\n\n第二章 发展\n\n${body}`
    const patterns = strongPatternsFromPresets(['cn_di_zhang'])
    expect(patterns).not.toBeNull()
    expect(validateStrongPatternsOnSample(text, patterns!)).toBe(true)
  })

  it('strongPatternsFromInference returns null when trial fails', () => {
    const text = `${'无标题一行'.repeat(50)}\n`
    const parsed = parseHeadingInferenceObject({
      mode: 'presets',
      presets: ['cn_di_zhang'],
    })
    expect(strongPatternsFromInference(parsed, text)).toBeNull()
  })

  it('strongPatternsFromInference returns patterns when trial passes', () => {
    const body = `${'正文'.repeat(30)}\n`
    const text = `第一章\n\n${body}\n\n第二章\n\n${body}`
    const parsed = parseHeadingInferenceObject({
      mode: 'presets',
      presets: ['cn_di_zhang'],
    })
    const p = strongPatternsFromInference(parsed, text)
    expect(p).not.toBeNull()
  })

  it('cn_volume_colon_index matches 上卷 : 001 style lines', () => {
    const body = `${'正文'.repeat(30)}\n`
    const text = `上卷 : 001，死神\n\n${body}\n\n上卷 : 002，继续\n\n${body}`
    const patterns = strongPatternsFromPresets(['cn_volume_colon_index'])
    expect(patterns).not.toBeNull()
    expect(validateStrongPatternsOnSample(text, patterns!)).toBe(true)
  })
})
