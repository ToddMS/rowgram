import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import handler from './dist/server/server.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const port = process.env.PORT || 3000

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`)

    // Serve static files from dist/client for assets
    if (url.pathname.startsWith('/assets/')) {
      try {
        const filePath = join(__dirname, 'dist/client', url.pathname)
        const file = await readFile(filePath)

        // Set appropriate content type
        const ext = url.pathname.split('.').pop()
        const contentTypes = {
          'js': 'application/javascript',
          'css': 'text/css',
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'svg': 'image/svg+xml'
        }

        res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream')
        res.setHeader('Cache-Control', 'public, max-age=31536000') // 1 year cache
        res.end(file)
        return
      } catch (err) {
        // Fall through to TanStack Start handler
      }
    }

    // Create a proper Request object for the TanStack Start handler
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined,
    })

    // Call the TanStack Start handler
    const response = await handler.fetch(request)

    // Set response status and headers
    res.statusCode = response.status
    for (const [key, value] of response.headers) {
      res.setHeader(key, value)
    }

    // Stream the response body
    if (response.body) {
      const reader = response.body.getReader()
      const pump = async () => {
        const { done, value } = await reader.read()
        if (done) {
          res.end()
        } else {
          res.write(value)
          await pump()
        }
      }
      await pump()
    } else {
      res.end()
    }
  } catch (error) {
    console.error('Server error:', error)
    res.statusCode = 500
    res.end('Internal Server Error')
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${port}`)
})

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...')
  server.close(() => {
    process.exit(0)
  })
})