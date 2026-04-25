import fs from 'node:fs'
import path from 'node:path'

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

const isAnswerChunk = (value) => {
  if (typeof value !== 'string' || value.length === 0) return false
  const trimmed = value.trim()
  if (trimmed === '~' || trimmed === '[DONE]') return false
  return true
}

const getAnswerText = (payload) => (
  typeof payload?.content?.answer === 'string'
    ? payload.content.answer
    : ''
)

const parseSseEventBlock = (block) => {
  if (!block.trim()) return null

  const lines = block.split(/\r?\n/)
  let currentEvent = ''
  const dataLines = []

  for (const line of lines) {
    if (!line) continue

    if (line.startsWith('event:')) {
      currentEvent = line.slice(6).trim()
      continue
    }

    if (line.startsWith('data:')) {
      let dataLine = line.slice(5)
      if (dataLine.startsWith(' ')) {
        dataLine = dataLine.slice(1)
      }
      dataLines.push(dataLine)
    }
  }

  if (!dataLines.length) return null

  const dataStr = dataLines.join('\n')
  const trimmed = dataStr.trim()
  if (!trimmed || trimmed === '[DONE]' || trimmed === '~') return null

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

    const { data } = parsedEvent
    if (!data || typeof data !== 'object') continue

    if (data.error || data.last_error) {
      throw new Error(getCozeErrorDetail(data.last_error || data.error, 'Coze stream failed'))
    }

    if (data.type !== 'answer') {
      continue
    }

    const answerText = getAnswerText(data)
    if (isAnswerChunk(answerText)) {
      rawText += answerText
    }
  }

  return { rawText }
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

const writeDebugFile = (filePath, content, { append = false } = {}) => {
  if (!filePath) return

  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    if (append) {
      fs.appendFileSync(filePath, content, 'utf8')
      return
    }

    fs.writeFileSync(filePath, content, 'utf8')
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error'
    console.warn('Unable to write Coze debug output:', detail)
  }
}

export const createLocalConversationId = () => (
  `local-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
)

export const callCozeProjectStream = async ({
  streamURL,
  token,
  projectId,
  message,
  sessionId,
  debugFilePath,
  signal,
}) => {
  const response = await fetch(streamURL, {
    method: 'POST',
    headers: getCozeHeaders(token),
    signal,
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
    writeDebugFile(debugFilePath, sseText)
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
  signal,
}) => {
  const response = await fetch(streamURL, {
    method: 'POST',
    headers: getCozeHeaders(token),
    signal,
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
    writeDebugFile(debugFilePath, '')
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const textChunk = decoder.decode(value, { stream: true })
    buffer += textChunk
    if (debugFilePath) {
      writeDebugFile(debugFilePath, textChunk, { append: true })
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

      if (data.type !== 'answer') {
        continue
      }

      const answerText = getAnswerText(data)
      if (isAnswerChunk(answerText)) {
        finalText += answerText
        writeSse(res, 'delta', {
          text: answerText,
          conversationId: sessionId,
        })
      }
    }
  }

  const tailText = decoder.decode()
  if (tailText) {
    buffer += tailText
    if (debugFilePath) {
      writeDebugFile(debugFilePath, tailText, { append: true })
    }
  }

  if (buffer.trim()) {
    const parsedEvent = parseSseEventBlock(buffer)
    if (parsedEvent?.data?.type === 'answer') {
      const answerText = getAnswerText(parsedEvent.data)
      if (isAnswerChunk(answerText)) {
        finalText += answerText
        writeSse(res, 'delta', {
          text: answerText,
          conversationId: sessionId,
        })
      }
    }
  }

  if (!signal?.aborted) {
    writeSse(res, 'done', {
      text: finalText,
      conversationId: sessionId,
    })
  }
}
