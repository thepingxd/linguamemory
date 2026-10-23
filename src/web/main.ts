import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { startServer } from './server.js'

const dataDir = process.env.LINGUAMEMORY_DATA_DIR ?? fileURLToPath(new URL('../../data', import.meta.url))
const port = process.env.PORT ? Number(process.env.PORT) : 3900

startServer({ dataDir, port })
