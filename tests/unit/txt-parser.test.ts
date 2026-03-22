import { describe, expect, it } from 'vitest'
import { cleanText, decodeBytes, splitChapters } from '@/lib/book-import/txt-parser'

describe('txt-parser', () => {
  it('cleanText normalizes newlines and spaces', () => {
    expect(cleanText('a\r\nb\r\nc')).toBe('a\nb\nc')
    expect(cleanText('  x  \n')).toBe('x')
  })

  it('decodeBytes reads utf-8', () => {
    const { text, encoding } = decodeBytes(Buffer.from('你好', 'utf8'))
    expect(text).toBe('你好')
    expect(encoding).toBe('utf-8')
  })

  it('splitChapters detects 第N章 headings', () => {
    const body1 = `${'正文A'.repeat(20)}\n`
    const body2 = `${'正文B'.repeat(20)}\n`
    const raw = `第一章 开端\n\n${body1}\n\n第二章 发展\n\n${body2}`
    const ch = splitChapters(raw)
    expect(ch.length).toBe(2)
    expect(ch[0]!.title).toContain('第一章')
    expect(ch[0]!.content).toContain('正文A')
    expect(ch[1]!.title).toContain('第二章')
  })
})
