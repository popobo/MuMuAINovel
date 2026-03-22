/**
 * TXT 解析：编码识别、文本清洗与章节切分（自经典版 txt_parser_service 迁移）
 */

const STRONG_CHAPTER_PATTERNS: RegExp[] = [
  /^第[一二三四五六七八九十百千万零〇两\d]+[章节回卷集部篇].*$/,
  /^chapter\s*\d+.*$/i,
  /^chap\.\s*\d+.*$/i,
]

export type RawChapter = {
  title: string
  content: string
  chapter_number: number
}

function isStrongHeading(line: string): boolean {
  return STRONG_CHAPTER_PATTERNS.some(p => p.test(line))
}

function isWeakHeading(lines: string[], idx: number): boolean {
  const line = lines[idx]?.trim() ?? ''
  if (!line) return false
  if (line.length > 25) return false
  if (/[，。！？；：,.!?;:]/.test(line)) return false

  const prevBlank = idx === 0 || !lines[idx - 1]?.trim()
  const nextBlank =
    idx === lines.length - 1 || !lines[idx + 1]?.trim()
  return prevBlank && nextBlank
}

function fallbackSplit(
  text: string,
  minWindow = 3000,
  maxWindow = 5000,
): RawChapter[] {
  const chapters: RawChapter[] = []
  const n = text.length
  let start = 0
  let chapterNo = 1
  const boundaryPunctuations = '。！？!?\n'

  while (start < n) {
    const idealEnd = Math.min(start + maxWindow, n)
    let end: number
    if (idealEnd >= n) {
      end = n
    } else {
      const searchFrom = Math.min(start + minWindow, n)
      const segment = text.slice(searchFrom, idealEnd)
      let offset = -1
      for (const p of boundaryPunctuations) {
        const pos = segment.lastIndexOf(p)
        offset = Math.max(offset, pos)
      }
      end =
        offset >= 0 ? searchFrom + offset + 1 : idealEnd
    }

    const chunk = text.slice(start, end).trim()
    if (chunk) {
      chapters.push({
        title: `第${chapterNo}章`,
        content: chunk,
        chapter_number: chapterNo,
      })
      chapterNo += 1
    }
    start = end
  }

  return chapters
}

export function decodeBytes(content: Buffer): { text: string; encoding: string } {
  if (content.length >= 3 && content[0] === 0xef && content[1] === 0xbb && content[2] === 0xbf) {
    const slice = content.subarray(3)
    return {
      text: new TextDecoder('utf-8', { fatal: false }).decode(slice),
      encoding: 'utf-8-sig',
    }
  }

  const tryEncodings = ['utf-8', 'gb18030', 'gbk', 'big5'] as const
  for (const encoding of tryEncodings) {
    try {
      const text = new TextDecoder(encoding, { fatal: true }).decode(content)
      return { text, encoding }
    } catch {
      /* try next */
    }
  }

  return {
    text: new TextDecoder('utf-8', { fatal: false }).decode(content),
    encoding: 'utf-8(ignore)',
  }
}

export function cleanText(text: string): string {
  let normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\ufeff/g, '')
  normalized = normalized.replace(/\u3000/g, '  ')
  normalized = normalized.replace(/[ \t]+\n/g, '\n')
  normalized = normalized.replace(/\n{4,}/g, '\n\n\n')
  return normalized.trim()
}

export function splitChapters(text: string): RawChapter[] {
  if (!text.trim()) return []

  const lines = text.split('\n')
  const headingIndexes: number[] = []

  for (let idx = 0; idx < lines.length; idx++) {
    const stripped = lines[idx]?.trim() ?? ''
    if (!stripped) continue
    if (isStrongHeading(stripped) || isWeakHeading(lines, idx)) {
      headingIndexes.push(idx)
    }
  }

  const uniqueSorted = [...new Set(headingIndexes)].sort((a, b) => a - b)

  if (uniqueSorted.length === 0) {
    return fallbackSplit(text)
  }

  const chapters: RawChapter[] = []
  let chapterNo = 1

  const firstHeading = uniqueSorted[0] ?? 0
  if (firstHeading > 0) {
    const preface = lines.slice(0, firstHeading).join('\n').trim()
    if (preface.length >= 200) {
      chapters.push({
        title: '前言',
        content: preface,
        chapter_number: chapterNo,
      })
      chapterNo += 1
    }
  }

  for (let i = 0; i < uniqueSorted.length; i++) {
    const startIdx = uniqueSorted[i]!
    const endIdx =
      i + 1 < uniqueSorted.length ? uniqueSorted[i + 1]! : lines.length
    const titleLine = lines[startIdx]?.trim() ?? ''
    const title = titleLine.slice(0, 200) || `第${chapterNo}章`
    let body = lines.slice(startIdx + 1, endIdx).join('\n').trim()
    if (!body && i + 1 < uniqueSorted.length) {
      const nextLine = lines[startIdx + 1]?.trim() ?? ''
      body = nextLine
    }
    chapters.push({
      title,
      content: body,
      chapter_number: chapterNo,
    })
    chapterNo += 1
  }

  const filtered = chapters.filter(c => c.title || c.content)
  if (filtered.length > 0) return filtered

  return fallbackSplit(text)
}
