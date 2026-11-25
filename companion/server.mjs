import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createChatGPT } from './chatgpt.mjs'

const root = fileURLToPath(new URL('../dist/', import.meta.url)),
  port = Number(process.env.SKYRATES_PORT || 4817)
const origin = 'http://127.0.0.1:' + port
const settings = join(
  process.env.SKYRATES_DATA_DIR || join(homedir(), '.skyrates'),
  'registration.json',
)
await mkdir(dirname(settings), { recursive: true, mode: 0o700 })
async function saveRegistration(value) {
  const temp = settings + '.' + randomUUID() + '.tmp'
  await writeFile(temp, JSON.stringify(value), { flag: 'wx', mode: 0o600 })
  await rename(temp, settings)
}
let registration
try {
  registration = JSON.parse(await readFile(settings, 'utf8'))
} catch (e) {
  if (e.code !== 'ENOENT') throw e
  registration = { host: 'urn:uuid:' + randomUUID() }
  await saveRegistration(registration)
}
const chat = createChatGPT({ origin, registration, saveRegistration })
const ollama = 'http://127.0.0.1:11434'
const catalog = new Map()
async function localModels() {
  try {
    const r = await fetch(ollama + '/api/tags', {
      signal: AbortSignal.timeout(1800),
    })
    if (!r.ok) return []
    const data = await r.json()
    return (data.models || [])
      .filter((x) => !/(flux|embed|stable.diffusion)/i.test(x.name))
      .map((x) => ({ id: x.name, name: x.name }))
  } catch {
    return []
  }
}
const mime = {
  '.js': 'text/javascript',
  '.html': 'text/html',
  '.css': 'text/css',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.png': 'image/png',
}
const safeHTML = (s) =>
  s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  )
function send(res, status, data, type = 'application/json') {
  res.writeHead(status, {
    'content-type': type + '; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(type === 'application/json' ? JSON.stringify(data) : data)
}
async function receive(req) {
  const chunks = []
  let bytes = 0
  for await (const chunk of req) {
    bytes += chunk.length
    if (bytes > 65000) throw Error('This turn is too long.')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString() || '{}')
}
const server = http.createServer(async (req, res) => {
  res.setHeader('referrer-policy', 'no-referrer')
  res.setHeader('x-content-type-options', 'nosniff')
  if (req.headers.host !== '127.0.0.1:' + port)
    return send(res, 403, { error: 'Open Skyrates on its loopback address.' })
  try {
    const url = new URL(req.url, origin)
    if (url.pathname === '/auth/callback') {
      let message =
        'Connected to ChatGPT. Return to the game window to choose your model.'
      try {
        await chat.finish(url.searchParams)
      } catch (e) {
        message = e.message
      }
      return send(
        res,
        200,
        '<!doctype html><meta name="viewport" content="width=device-width"><title>Skyrates · Sign in</title><main><h1>Skyrates</h1><p>' +
          safeHTML(message) +
          '</p><a href="/">Return to Skyrates</a></main>',
        'text/html',
      )
    }
    if (url.pathname.startsWith('/api/')) {
      if (
        req.method !== 'POST' ||
        req.headers.origin !== origin ||
        req.headers['content-type']?.split(';')[0] !== 'application/json'
      )
        return send(res, 403, {
          error: 'Open this action from the local game.',
        })
      const body = await receive(req)
      if (url.pathname === '/api/status')
        return send(res, 200, {
          local: true,
          connected: chat.connected(),
          ollama: await localModels(),
        })
      if (url.pathname === '/api/connect')
        return send(res, 200, { authorize: await chat.start() })
      if (url.pathname === '/api/disconnect') {
        catalog.clear()
        await chat.disconnect()
        return send(res, 200, { connected: false })
      }
      if (url.pathname === '/api/models') {
        const models = await chat.models()
        catalog.clear()
        models.forEach((m) => catalog.set(m.id, m))
        return send(res, 200, { models })
      }
      if (url.pathname === '/api/talk') {
        const { provider, model, instructions, input } = body
        if (
          !['chatgpt', 'ollama'].includes(provider) ||
          typeof model !== 'string' ||
          typeof instructions !== 'string' ||
          !Array.isArray(input) ||
          input.length > 18 ||
          !input.length ||
          input.some(
            (m) =>
              !['user', 'assistant'].includes(m?.role) ||
              typeof m.content !== 'string' ||
              m.content.length > 3200,
          )
        )
          return send(res, 400, { error: 'Invalid conversation turn.' })
        const abort = new AbortController()
        res.on('close', () => abort.abort())
        const signal = AbortSignal.any([
          abort.signal,
          AbortSignal.timeout(160000),
        ])
        let reply
        if (provider === 'chatgpt') {
          if (!catalog.has(model))
            return send(res, 400, {
              error: 'Choose an available ChatGPT model.',
            })
          reply = await chat.respond(model, instructions, input, signal)
        } else {
          if (!(await localModels()).some((m) => m.id === model))
            return send(res, 400, { error: 'Choose an installed local model.' })
          const r = await fetch(ollama + '/api/chat', {
            method: 'POST',
            signal,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              model,
              messages: [{ role: 'system', content: instructions }, ...input],
              stream: false,
              think: false,
              options: { num_predict: 220 },
            }),
          })
          if (!r.ok)
            throw Error('Your local model could not complete the turn.')
          reply = (await r.json()).message?.content?.trim()
        }
        if (!reply)
          throw Error('The character gave an empty reply. Please try again.')
        return send(res, 200, { reply })
      }
      return send(res, 404, { error: 'Unknown action.' })
    }
    if (req.method !== 'GET' && req.method !== 'HEAD')
      return send(res, 405, { error: 'Method unavailable.' })
    const path = resolve(
      root,
      '.' +
        decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname),
    )
    if (!path.startsWith(resolve(root) + sep))
      return send(res, 404, { error: 'Not found.' })
    const info = await stat(path).catch(() => null)
    if (!info?.isFile()) return send(res, 404, { error: 'Not found.' })
    res.writeHead(200, {
      'content-type': mime[extname(path)] || 'application/octet-stream',
      'content-length': info.size,
    })
    if (req.method === 'HEAD') res.end()
    else
      createReadStream(path)
        .on('error', () => res.destroy())
        .pipe(res)
  } catch (e) {
    if (!res.headersSent && !res.destroyed)
      send(res, 400, {
        error: e instanceof Error ? e.message : 'The request failed.',
      })
  }
})
server.listen(port, '127.0.0.1', () =>
  console.log('Skyrates local edition · ' + origin),
)
