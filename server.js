import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

import {
  createLocalConversationId,
  streamCozeProjectToClient,
} from './providers/coze-project.js'
import {
  ensureRuntimeDirs,
  getCozeProjectConfig,
  runtimePaths,
  serverConfig,
} from './server-config.js'

ensureRuntimeDirs()

const writeSse = (res, event, payload) => {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(payload))
}

const sendFile = (res, filePath) => {
  if (!fs.existsSync(filePath)) {
    sendJson(res, 404, { success: false, error: 'Not found' })
    return
  }

  const extension = path.extname(filePath).toLowerCase()
  const contentTypeMap = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  }

  res.writeHead(200, {
    'Content-Type': contentTypeMap[extension] || 'application/octet-stream',
  })

  fs.createReadStream(filePath).pipe(res)
}

const readRequestBody = async (req) => {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

const getConversationIdFromBody = (body) => (
  typeof body?.conversationId === 'string' && body.conversationId.trim()
    ? body.conversationId.trim()
    : createLocalConversationId()
)

const sendSseError = (res, statusCode, error) => {
  res.writeHead(statusCode, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  })
  writeSse(res, 'error', { error })
  res.end()
}

const validateChatRequest = async (req, res, { stream = false } = {}) => {
  const providerConfig = getCozeProjectConfig()
  if (!providerConfig.token || !providerConfig.streamURL || !providerConfig.projectId) {
    if (stream) {
      sendSseError(res, 503, 'Coze agent is not configured')
      return null
    }

    sendJson(res, 503, {
      success: false,
      error: 'Coze agent is not configured',
    })
    return null
  }

  let body = {}
  try {
    body = await readRequestBody(req)
  } catch {
    if (stream) {
      sendSseError(res, 400, 'Invalid JSON body')
      return null
    }

    sendJson(res, 400, {
      success: false,
      error: 'Invalid JSON body',
    })
    return null
  }

  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  if (!message) {
    if (stream) {
      sendSseError(res, 400, 'Message is required')
      return null
    }

    sendJson(res, 400, {
      success: false,
      error: 'Message is required',
    })
    return null
  }

  return {
    ...providerConfig,
    message,
    sessionId: getConversationIdFromBody(body),
  }
}

const handleLegacyChatRequest = (res) => {
  sendJson(res, 410, {
    success: false,
    error: 'The /api/chat endpoint has been retired. Use /api/chat/stream instead.',
  })
}

const handleChatStreamRequest = async (req, res) => {
  const requestData = await validateChatRequest(req, res, { stream: true })
  if (!requestData) return

  const upstreamController = new AbortController()
  const handleClientClose = () => {
    upstreamController.abort()
  }

  req.once('aborted', handleClientClose)

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  })

  try {
    await streamCozeProjectToClient({
      ...requestData,
      signal: upstreamController.signal,
      res,
      writeSse,
      debugFilePath: runtimePaths.debugSseFile,
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error'
    if (!upstreamController.signal.aborted) {
      console.error('Coze stream proxy failed:', detail)
      if (!res.destroyed && !res.writableEnded) {
        writeSse(res, 'error', { error: detail })
      }
    }
  } finally {
    req.off('aborted', handleClientClose)

    if (!res.destroyed && !res.writableEnded) {
      res.end()
    }
  }
}

const server = http.createServer(async (req, res) => {
  if (!req.url || !req.method) {
    sendJson(res, 400, { success: false, error: 'Bad request' })
    return
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { success: true, message: 'ok' })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/chat') {
    handleLegacyChatRequest(res)
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/chat/stream') {
    await handleChatStreamRequest(req, res)
    return
  }

  const sanitizedPath = url.pathname === '/'
    ? 'index.html'
    : url.pathname.replace(/^\/+/, '')
  const filePath = path.join(runtimePaths.publicDir, sanitizedPath)

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    sendFile(res, filePath)
    return
  }

  sendFile(res, path.join(runtimePaths.publicDir, 'index.html'))
})

server.listen(serverConfig.port, () => {
  console.log(`Bot1 server ready on port ${serverConfig.port}`)
})
