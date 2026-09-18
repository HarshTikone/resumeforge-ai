import { Buffer } from 'node:buffer'
import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const MAX_REQUEST_BYTES = 1_000_000

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let received = 0
    const chunks = []

    request.on('data', (chunk) => {
      received += chunk.length
      if (received > MAX_REQUEST_BYTES) {
        reject(new Error('Request body is too large.'))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new Error('Request body must be valid JSON.'))
      }
    })
    request.on('error', reject)
  })
}

function sendJson(response, status, body) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(body))
}

function secureGeminiProxy(env) {
  return {
    name: 'secure-gemini-proxy',
    configureServer(server) {
      server.middlewares.use('/api/generate', async (request, response, next) => {
        if (request.method !== 'POST') {
          next()
          return
        }

        const apiKey = env.GEMINI_API_KEY?.trim()
        const model = env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash'
        if (!apiKey) {
          sendJson(response, 503, {
            error: 'Gemini is not configured. Add GEMINI_API_KEY to .env.local and restart.',
          })
          return
        }

        try {
          const body = await readJsonBody(request)
          const upstream = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
              },
              body: JSON.stringify(body),
            },
          )

          if (!upstream.ok) {
            console.error(`Gemini request failed with status ${upstream.status}.`)
            sendJson(response, upstream.status, {
              error: 'Gemini could not generate this application package. Please retry.',
            })
            return
          }

          sendJson(response, 200, await upstream.json())
        } catch (error) {
          console.error('Secure Gemini proxy failed.', error)
          sendJson(response, 400, {
            error: error instanceof Error ? error.message : 'Generation request failed.',
          })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), secureGeminiProxy(env)],
  }
})
