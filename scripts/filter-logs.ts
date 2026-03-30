#!/usr/bin/env tsx

/**
 * Log Filter for Development
 *
 * Usage:
 *   pnpm dev 2>&1 | tsx scripts/filter-logs.ts
 *   Or pipe existing log file:
 *   cat temp.log | tsx scripts/filter-logs.ts
 */

import readline from 'readline'

const FILTER_PATTERNS = [
  // Skip frequent GET requests to book-import tasks
  /^GET \/api\/book-import\/tasks\/[a-f0-9-]+ 200/,
  // Skip GET requests to projects API
  /^GET \/api\/projects\/[a-f0-9-]+\/relationships 200/,
  // Skip performance breakdown logs
  /in \d+ms \(next\.js:/,
  // Skip cache skip messages
  /Cache skipped reason:/,
  /│ GET http:\/\/localhost:3000/,
]

const HIGHLIGHT_PATTERNS = [
  // Keep important business logs
  /\[context-aware\]/,
  /\[book-import\]/,
  /error|Error|ERROR/,
  /warn|Warn|WARN/,
  /Batch \d+\/\d+/,
  /Processing batch/,
  /Global analysis/,
  /Outline generation/,
]

let lineCount = 0
let filteredCount = 0

function shouldFilter(line: string): boolean {
  // Check if line matches any filter pattern
  for (const pattern of FILTER_PATTERNS) {
    if (pattern.test(line)) {
      return true
    }
  }
  return false
}

function shouldHighlight(line: string): boolean {
  // Check if line matches any highlight pattern
  for (const pattern of HIGHLIGHT_PATTERNS) {
    if (pattern.test(line)) {
      return true
    }
  }
  return false
}

function processLine(line: string) {
  lineCount++

  if (shouldFilter(line)) {
    filteredCount++
    return
  }

  // Highlight important logs
  if (shouldHighlight(line)) {
    process.stdout.write(`\x1b[36m${line}\x1b[0m\n`) // Cyan color
  } else {
    process.stdout.write(line + '\n')
  }

  // Show filter statistics every 100 lines
  if (lineCount % 100 === 0) {
    const percentage = ((filteredCount / lineCount) * 100).toFixed(1)
    process.stdout.write(`\x1b[90m[Filtered ${filteredCount}/${lineCount} (${percentage}%)]\x1b[0m\n`)
  }
}

// Process stdin line by line
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
})

rl.on('line', processLine)

rl.on('close', () => {
  const percentage = ((filteredCount / lineCount) * 100).toFixed(1)
  console.log(`\n\x1b[36m=== Log Filter Summary ===\x1b[0m`)
  console.log(`Total lines: ${lineCount}`)
  console.log(`Filtered: ${filteredCount} (${percentage}%)`)
  console.log(`Shown: ${lineCount - filteredCount} (${(100 - parseFloat(percentage)).toFixed(1)}%)`)
})