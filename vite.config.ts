import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

const DB_FILE = path.resolve(__dirname, 'data/db.json')

function ensureDataDir() {
  const dir = path.dirname(DB_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    {
      name: 'local-db-api',
      configureServer(server) {
        server.middlewares.use('/api/db', (req, res) => {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            res.end()
            return
          }

          if (req.method === 'GET') {
            ensureDataDir()
            if (fs.existsSync(DB_FILE)) {
              const data = fs.readFileSync(DB_FILE, 'utf-8')
              res.end(data)
            } else {
              res.end('null')
            }
            return
          }

          if (req.method === 'POST') {
            ensureDataDir()
            let body = ''
            req.on('data', (chunk: Buffer) => { body += chunk.toString() })
            req.on('end', () => {
              try {
                fs.writeFileSync(DB_FILE, body, 'utf-8')
                res.end('{"ok":true}')
              } catch {
                res.statusCode = 500
                res.end('{"error":"write failed"}')
              }
            })
            return
          }

          res.statusCode = 405
          res.end('{"error":"Method not allowed"}')
        })
      },
    },
  ],
  server: {
    host: true,   // доступ по локальной сети (0.0.0.0)
    port: 5173,
  },
})
