import fs from 'node:fs'

const getCozeHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  Accept: 'text/event-stream',
})

const tryParseJson = (value) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) return null

  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

const getCozeErrorDetail = (payload, fallbackText) => (
  payload?.msg
  || payload?.error?.message
  || payload?.error
  || payload?.detail
  || fallbackText
)

const extractTextFromUnknown = (value) => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return ''

    const parsed = tryParseJson(trimmed)
    if (!parsed) return trimmed
    return extractTextFromUnknown(parsed)
  }

  if (Array.isArray(value)) {
    return value.map((item) => extractTextFromUnknown(item)).filter(Boolean).join('\n').trim()
  }

  if (value && typeof value === 'object') {
    const record = value
    const candidates = [
      record.content,
      record.text,
      record.answer,
      record.output,
      record.note,
      record.notes,
      record.data,
      record.message,
      record.messages,
      record.content_list,
    ]

    for (const candidate of candidates) {
      const extracted = extractTextFromUnknown(candidate)
      if (extracted) return extracted
    }
  }

  return ''
}

const isMeaningfulText = (value) => {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (trimmed === '~' || trimmed === '[DONE]') return false
  if (/^[~`\-_=+*#|\\/<>]+$/.test(trimmed)) return false
  return /[\u4e00-\u9fffA-Za-z0-9]/.test(trimmed)
}

const isAnswerChunk = (value) => {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (trimmed === '~' || trimmed === '[DONE]') return false
  return true
}

export const formatAssistantText = (value) => {
  let text = value.replace(/\r\n/g, '\n').trim()
  if (!text) return text

  const sectionKeywords = [
    '标准版本',
    '可选变体',
    '结论',
    '原因',
    '推荐说法',
    '注意事项',
    '示例话术',
  ]

  for (const keyword of sectionKeywords) {
    const pattern = new RegExp(`(?<!\\n)${keyword}(?=[：:])`, 'g')
    text = text.replace(pattern, `\n${keyword}`)
  }

  text = text
    .replace(/([。！？；])/g, '$1\n')
    .replace(/(比如|例如|第一|第二|第三|最后|另外|还有|同时|如果|但是|所以)(?=[^\n])/g, '\n$1')

  if (!/[。！？；\n]/.test(text) && text.length > 80) {
    const splitHints = [
      '结论',
      '原因',
      '推荐说法',
      '注意事项',
      '标准版本',
      '可选变体',
      '核心动作',
      '报价前',
      '常见问题',
      '到店',
      '邀约',
      '跟进',
      '不要',
      '建议',
      '如果',
    ]

    for (const hint of splitHints) {
      const pattern = new RegExp(`(?<!\\n)${hint}`, 'g')
      text = text.replace(pattern, `\n${hint}`)
    }
  }

  return text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '')
    .trim()
}

const parseSseEventBlock = (block) => {
  if (!block.trim()) return null

  const lines = block.split(/\r?\n/)
  let currentEvent = ''
  const dataLines = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('event:')) {
      currentEvent = trimmed.slice(6).trim()
      continue
    }

    if (trimmed.startsWith('data:')) {
      dataLines.push(trimmed.slice(5).trim())
    }
  }

  if (!dataLines.length) return null

  const dataStr = dataLines.join('\n').trim()
  if (!dataStr || dataStr === '[DONE]' || dataStr === '~') return null

  return {
    event: currentEvent,
    dataStr,
    data: tryParseJson(dataStr),
  }
}

const parseCozeSseText = (sseText) => {
  let rawText = ''
  const chunks = sseText.split(/\r?\n\r?\n/)

  for (const chunk of chunks) {
    const parsedEvent = parseSseEventBlock(chunk)
    if (!parsedEvent) continue

    const { event: currentEvent, data } = parsedEvent
    if (!data || typeof data !== 'object') continue

    if (data.error || data.last_error) {
      throw new Error(getCozeErrorDetail(data.last_error || data.error, 'Coze stream failed'))
    }

    if (data.type === 'answer') {
      const answerText = typeof data.content?.answer === 'string'
        ? data.content.answer
        : ''

      if (isAnswerChunk(answerText)) {
        rawText += answerText
      }
      continue
    }

    if (!rawText && (currentEvent === 'done' || currentEvent === 'message')) {
      const fallbackText = extractTextFromUnknown(data)
      if (isMeaningfulText(fallbackText)) {
        rawText = fallbackText
      }
    }
  }

  return { rawText: formatAssistantText(rawText) }
}

const createCozePayload = ({
  projectId,
  message,
  sessionId,
}) => ({
  content: {
    query: {
      prompt: [
        {
          type: 'text',
          content: {
            text: message,
          },
        },
      ],
    },
  },
  type: 'query',
  session_id: sessionId,
  project_id: projectId,
})

export const createLocalConversationId = () => (
  `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
)

export const callCozeProjectStream = async ({
  streamURL,
  token,
  projectId,
  message,
  sessionId,
  debugFilePath,
}) => {
  const response = await fetch(streamURL, {
    method: 'POST',
    headers: getCozeHeaders(token),
    body: JSON.stringify(createCozePayload({
      projectId,
      message,
      sessionId,
    })),
  })

  if (!response.ok) {
    const text = await response.text()
    const parsed = tryParseJson(text)
    throw new Error(getCozeErrorDetail(parsed, text || `Coze stream request failed: ${response.status}`))
  }

  const sseText = await response.text()
  if (debugFilePath) {
    fs.writeFileSync(debugFilePath, sseText, 'utf8')
  }
  return parseCozeSseText(sseText)
}

export const streamCozeProjectToClient = async ({
  streamURL,
  token,
  projectId,
  message,
  sessionId,
  res,
  writeSse,
  debugFilePath,
}) => {
  const response = await fetch(streamURL, {
    method: 'POST',
    headers: getCozeHeaders(token),
    body: JSON.stringify(createCozePayload({
      projectId,
      message,
      sessionId,
    })),
  })

  if (!response.ok) {
    const text = await response.text()
    const parsed = tryParseJson(text)
    throw new Error(getCozeErrorDetail(parsed, text || `Coze stream request failed: ${response.status}`))
  }

  if (!response.body) {
    throw new Error('Coze stream body is empty')
  }

  const decoder = new TextDecoder('utf-8')
  const reader = response.body.getReader()
  let buffer = ''
  let finalText = ''

  if (debugFilePath) {
    fs.writeFileSync(debugFilePath, '', 'utf8')
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const textChunk = decoder.decode(value, { stream: true })
    buffer += textChunk
    if (debugFilePath) {
      fs.appendFileSync(debugFilePath, textChunk, 'utf8')
    }

    const blocks = buffer.split(/\r?\n\r?\n/)
    buffer = blocks.pop() ?? ''

    for (const block of blocks) {
      const parsedEvent = parseSseEventBlock(block)
      if (!parsedEvent) continue

      const { data } = parsedEvent
      if (!data || typeof data !== 'object') continue

      if (data.error || data.last_error) {
        throw new Error(getCozeErrorDetail(data.last_error || data.error, 'Coze stream failed'))
      }

      if (data.type === 'answer') {
        const answerText = typeof data.content?.answer === 'string'
          ? data.content.answer
          : ''

        if (isAnswerChunk(answerText)) {
          finalText += answerText
          writeSse(res, 'delta', {
            text: answerText,
            conversationId: sessionId,
          })
        }
      }
    }
  }

  const tailText = decoder.decode()
  if (tailText) {
    buffer += tailText
    if (debugFilePath) {
      fs.appendFileSync(debugFilePath, tailText, 'utf8')
    }
  }

  if (buffer.trim()) {
    const parsedEvent = parseSseEventBlock(buffer)
    if (parsedEvent?.data?.type === 'answer') {
      const answerText = typeof parsedEvent.data.content?.answer === 'string'
        ? parsedEvent.data.content.answer
        : ''
      if (isAnswerChunk(answerText)) {
        finalText += answerText
        writeSse(res, 'delta', {
          text: answerText,
          conversationId: sessionId,
        })
      }
    }
  }

  writeSse(res, 'done', {
    text: formatAssistantText(finalText),
    conversationId: sessionId,
  })
}
