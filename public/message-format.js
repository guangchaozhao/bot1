export const escapeHtml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')

const formatInline = (value) => escapeHtml(value)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/`([^`]+)`/g, '<code>$1</code>')

export const stripLayoutWhitespace = (value) => value.replace(/\s+/g, '')

const isTableDividerLine = (line) => /^\|?[\s:-]+\|[\s|:-]*$/.test(line.trim())

const splitTableRow = (line) => {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map((cell) => cell.trim())
}

const isFenceMarker = (line) => line.trim().startsWith('```')
const inlineTableDividerPattern = /\|?\s*:?-{3,}\s*(?:\|\s*:?-{3,}\s*)+\|?/

const decodeBasicHtmlEntities = (value) => value
  .replace(/&nbsp;/gi, ' ')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, '\'')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&amp;/gi, '&')

const normalizeHtmlArtifacts = (value) => decodeBasicHtmlEntities(value)
  .replace(/<pre\b[^>]*>\s*<code\b[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_, content) => `\n\`\`\`\n${decodeBasicHtmlEntities(content).trim()}\n\`\`\`\n`)
  .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, content) => `\n${'#'.repeat(Number(level))} ${decodeBasicHtmlEntities(content).trim()}\n`)
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/?(?:div|p|section|article|header|footer|main|aside)\b[^>]*>/gi, '\n')
  .replace(/<li\b[^>]*>/gi, '\n- ')
  .replace(/<\/li>/gi, '\n')
  .replace(/<\/?(?:ul|ol)\b[^>]*>/gi, '\n')
  .replace(/<\/?(?:table|thead|tbody|tfoot)\b[^>]*>/gi, '\n')
  .replace(/<tr\b[^>]*>/gi, '\n')
  .replace(/<\/tr>/gi, '|\n')
  .replace(/<(?:th|td)\b[^>]*>/gi, '| ')
  .replace(/<\/(?:th|td)>/gi, ' ')
  .replace(/<\/?(?:strong|b)\b[^>]*>/gi, '**')
  .replace(/<\/?(?:em|i)\b[^>]*>/gi, '*')
  .replace(/<\/?code\b[^>]*>/gi, '`')
  .replace(/<\/?span\b[^>]*>/gi, '')

const repairBrokenMarkdownLines = (value) => {
  const sourceLines = value.split('\n')
  const repaired = []
  let inCodeBlock = false

  for (let index = 0; index < sourceLines.length; index += 1) {
    const current = sourceLines[index]
    const trimmed = current.trim()

    if (isFenceMarker(current)) {
      repaired.push(current)
      inCodeBlock = !inCodeBlock
      continue
    }

    if (!inCodeBlock && /^#{1,6}$/.test(trimmed)) {
      const nextLine = sourceLines[index + 1]
      if (nextLine && nextLine.trim()) {
        repaired.push(`${trimmed} ${nextLine.trimStart()}`)
        index += 1
        continue
      }
    }

    if (!inCodeBlock && /^(\*{1,2}|_{1,2})$/.test(trimmed) && repaired.length) {
      repaired[repaired.length - 1] += trimmed
      continue
    }

    repaired.push(current)
  }

  return repaired.join('\n')
}

const repairInlineTableBlocks = (value) => {
  const sourceLines = value.split('\n')
  const repaired = []
  let inCodeBlock = false

  for (const current of sourceLines) {
    if (isFenceMarker(current)) {
      repaired.push(current)
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock || !current.includes('|')) {
      repaired.push(current)
      continue
    }

    const dividerMatch = current.match(inlineTableDividerPattern)
    if (!dividerMatch || dividerMatch.index === undefined) {
      repaired.push(current)
      continue
    }

    const before = current.slice(0, dividerMatch.index).trimEnd()
    const divider = dividerMatch[0].trim()
    const after = current.slice(dividerMatch.index + dividerMatch[0].length).trimStart()

    if (before) {
      repaired.push(before)
    }
    repaired.push(divider)
    if (after) {
      repaired.push(after)
    }
  }

  return repaired.join('\n')
}

const insertSoftBreaks = (line) => {
  let next = line

  next = next
    .replace(/(?<!^)(#{1,6})(?=[\u4e00-\u9fa5A-Za-z])/g, '\n$1')
    .replace(/(?<!^)(结论|原因|推荐说法|注意事项|标准版本|可选变体|补充说明)(?=[:：])/g, '\n$1')
    .replace(/(?<!^)((?:\d+)[.)]\s+)/g, '\n$1')
    .replace(/(?<!^)([-*•]\s+)/g, '\n$1')
    .replace(/([。！？；][”’"』」】）]?)\s*(?=[^\n])/g, '$1\n')

  return next
}

const prepareBlockSource = (value) => {
  const source = repairInlineTableBlocks(
    repairBrokenMarkdownLines(
      normalizeHtmlArtifacts(
        value
          .replace(/\r\n/g, '\n')
          .replace(/\u00a0/g, ' '),
      ),
    ),
  )

  const preparedLines = []
  let inCodeBlock = false

  for (const rawLine of source.split('\n')) {
    if (isFenceMarker(rawLine)) {
      preparedLines.push(rawLine)
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock) {
      preparedLines.push(rawLine)
      continue
    }

    const trimmed = rawLine.trim()
    if (!trimmed) {
      preparedLines.push('')
      continue
    }

    if (rawLine.includes('|') || trimmed.startsWith('>')) {
      preparedLines.push(rawLine)
      continue
    }

    preparedLines.push(...insertSoftBreaks(rawLine).split('\n'))
  }

  return preparedLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
}

export const normalizeAssistantText = (value, { streaming = false } = {}) => {
  const prepared = prepareBlockSource(value)
  return streaming ? prepared.trimStart() : prepared.trim()
}

export const formatAssistantContent = (value) => {
  const source = prepareBlockSource(value).trim()
  if (!source) return ''

  const html = []
  let activeList = ''
  let activeQuote = []
  let inCodeBlock = false
  let codeBlockLanguage = ''
  let codeBlockLines = []

  const closeList = () => {
    if (!activeList) return
    html.push(activeList === 'ol' ? '</ol>' : '</ul>')
    activeList = ''
  }

  const closeQuote = () => {
    if (!activeQuote.length) return
    html.push(`<blockquote>${activeQuote.map((line) => `<p>${formatInline(line)}</p>`).join('')}</blockquote>`)
    activeQuote = []
  }

  const closeCodeBlock = () => {
    if (!inCodeBlock) return
    const languageTag = codeBlockLanguage
      ? `<div class="message-code-label">${escapeHtml(codeBlockLanguage)}</div>`
      : ''
    html.push(
      `<div class="message-code">${languageTag}<pre><code>${escapeHtml(codeBlockLines.join('\n'))}</code></pre></div>`,
    )
    inCodeBlock = false
    codeBlockLanguage = ''
    codeBlockLines = []
  }

  const flushStructuredBlocks = () => {
    closeList()
    closeQuote()
    closeCodeBlock()
  }

  const lines = source.split('\n')

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index]
    const line = rawLine.trim()

    if (line.startsWith('```')) {
      closeList()
      closeQuote()
      if (inCodeBlock) {
        closeCodeBlock()
      } else {
        inCodeBlock = true
        codeBlockLanguage = line.slice(3).trim()
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine)
      continue
    }

    if (!line) {
      closeList()
      closeQuote()
      continue
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushStructuredBlocks()
      html.push('<hr />')
      continue
    }

    if (line.startsWith('>')) {
      closeList()
      activeQuote.push(line.replace(/^>\s?/, ''))
      continue
    }

    if (line.includes('|')) {
      const nextLine = lines[index + 1]?.trim() || ''
      if (nextLine && isTableDividerLine(nextLine)) {
        flushStructuredBlocks()
        const headerCells = splitTableRow(line)
        const bodyRows = []
        index += 2

        while (index < lines.length) {
          const rowLine = lines[index].trim()
          if (!rowLine || !rowLine.includes('|')) {
            index -= 1
            break
          }
          bodyRows.push(splitTableRow(rowLine))
          index += 1
        }

        html.push(`
          <div class="message-table-wrap">
            <table class="message-table">
              <thead>
                <tr>${headerCells.map((cell) => `<th>${formatInline(cell)}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${bodyRows.map((row) => `<tr>${row.map((cell) => `<td>${formatInline(cell)}</td>`).join('')}</tr>`).join('')}
              </tbody>
            </table>
          </div>
        `)
        continue
      }
    }

    const heading = line.match(/^(#{1,6})\s*(.+)$/)
    if (heading) {
      closeList()
      closeQuote()
      const level = Math.min(heading[1].length, 6)
      html.push(`<h${level}>${formatInline(heading[2])}</h${level}>`)
      continue
    }

    const chineseSectionHeading = line.match(/^([一二三四五六七八九十]+)、\s*(.+)$/)
    if (chineseSectionHeading) {
      closeList()
      closeQuote()
      html.push(`<h3>${formatInline(`${chineseSectionHeading[1]}、${chineseSectionHeading[2]}`)}</h3>`)
      continue
    }

    const ordered = line.match(/^(\d+)[.)、]\s+(.+)$/)
    if (ordered) {
      closeQuote()
      if (activeList !== 'ol') {
        closeList()
        html.push('<ol>')
        activeList = 'ol'
      }
      html.push(`<li>${formatInline(ordered[2])}</li>`)
      continue
    }

    const unordered = line.match(/^[-*•]\s+(.+)$/)
    if (unordered) {
      closeQuote()
      if (activeList !== 'ul') {
        closeList()
        html.push('<ul>')
        activeList = 'ul'
      }
      html.push(`<li>${formatInline(unordered[1])}</li>`)
      continue
    }

    closeList()
    closeQuote()

    const labeled = line.match(/^([\u4e00-\u9fa5A-Za-z]{1,14})[:：]\s*(.+)$/)
    if (labeled) {
      html.push(`<p><strong>${escapeHtml(labeled[1])}：</strong>${formatInline(labeled[2])}</p>`)
      continue
    }

    html.push(`<p>${formatInline(line)}</p>`)
  }

  flushStructuredBlocks()
  return html.join('')
}
