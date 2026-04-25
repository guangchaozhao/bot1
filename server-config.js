import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const moduleUrl = typeof import.meta !== 'undefined' ? import.meta.url : undefined
const rootDir = typeof moduleUrl === 'string' && moduleUrl.startsWith('file:')
  ? path.dirname(fileURLToPath(moduleUrl))
  : process.cwd()
const isWorkersBundle = rootDir.startsWith('/bundle')
const runtimeBaseDir = isWorkersBundle
  ? path.join('/tmp', 'bot1-runtime')
  : rootDir

export const runtimePaths = {
  rootDir,
  publicDir: path.join(rootDir, 'public'),
  debugDir: path.join(runtimeBaseDir, 'debug'),
  debugSseFile: path.join(runtimeBaseDir, 'debug', 'last-coze-sse.txt'),
}

const loadEnvFile = () => {
  const envPath = path.join(rootDir, '.env')
  if (!fs.existsSync(envPath)) return

  const envContent = fs.readFileSync(envPath, 'utf8')
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()
    if (key && !process.env[key]) {
      process.env[key] = value
    }
  }
}

loadEnvFile()

export const ensureRuntimeDirs = () => {
  if (!fs.existsSync(runtimePaths.debugDir)) {
    fs.mkdirSync(runtimePaths.debugDir, { recursive: true })
  }
}

export const serverConfig = {
  port: Number(process.env.PORT || 3020),
}

export const getCozeProjectConfig = () => ({
  token: process.env.COZE_API_TOKEN?.trim() || '',
  streamURL: process.env.COZE_STREAM_URL?.trim() || '',
  projectId: process.env.COZE_PROJECT_ID?.trim() || '',
})
