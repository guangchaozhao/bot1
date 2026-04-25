import { httpServerHandler } from 'cloudflare:node'

import './server.js'
import { serverConfig } from './server-config.js'

export default httpServerHandler({ port: serverConfig.port })
