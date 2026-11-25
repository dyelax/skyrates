import test from 'node:test'
import assert from 'node:assert/strict'
import { readCompletion } from '../companion/chatgpt.mjs'
const streamed = (chunks: string[]) =>
  new ReadableStream({
    start(c) {
      for (const x of chunks) c.enqueue(new TextEncoder().encode(x))
      c.close()
    },
  })
test('dialogue waits for completed model responses across arbitrary SSE boundaries', async () => {
  const events = [
    'data: {"type":"response.output_text.delta","delta":"Hold "}\r',
    '\n\r\ndata: {"type":"response.output_text.delta","delta":"fast."}\n\ndat',
    'a: {"type":"response.completed"}\n\n',
  ]
  assert.equal(await readCompletion(streamed(events)), 'Hold fast.')
  await assert.rejects(
    () => readCompletion(streamed(events.slice(0, 2))),
    /interrupted/,
  )
  await assert.rejects(
    () =>
      readCompletion(streamed(['data: {"type":"response.incomplete"}\n\n'])),
    /before finishing/,
  )
})

test('the local edition registers as Skyrates, verifies the account and renews its grant', async (t) => {
  const { createChatGPT } = await import('../companion/chatgpt.mjs')
  const { generateKeyPair, exportJWK, SignJWT } = await import('jose')
  const { publicKey, privateKey } = await generateKeyPair('RS256')
  const key = { ...(await exportJWK(publicKey)), kid: 'fixture', alg: 'RS256' }
  const issuer = 'https://auth.openai.com',
    client = 'skyrates-local-test',
    saved = []
  let authorize: URL,
    refreshes = 0
  const signed = async () =>
    new SignJWT({ nonce: authorize.searchParams.get('nonce') })
      .setProtectedHeader({ alg: 'RS256', kid: 'fixture' })
      .setSubject('captain')
      .setIssuer(issuer)
      .setAudience(client)
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(privateKey)
  const fetchMock = t.mock.method(
    globalThis,
    'fetch',
    async (input, options = {}) => {
      const url = new URL(input.toString())
      if (url.pathname === '/.well-known/openid-configuration')
        return Response.json({
          issuer,
          authorization_endpoint: issuer + '/authorize',
          token_endpoint: issuer + '/tokens',
          jwks_uri: issuer + '/keys',
          revocation_endpoint: issuer + '/revoke',
        })
      if (url.pathname === '/keys') return Response.json({ keys: [key] })
      if (url.pathname === '/tokens') {
        const fields = options.body as URLSearchParams
        assert.equal(fields.get('client_id'), client)
        assert.equal(fields.get('resource'), 'https://api.openai.com/v1')
        if (fields.get('grant_type') === 'authorization_code') {
          const { createHash } = await import('node:crypto')
          assert.equal(
            createHash('sha256')
              .update(fields.get('code_verifier')!)
              .digest('base64url'),
            authorize.searchParams.get('code_challenge'),
          )
          return Response.json({
            id_token: await signed(),
            access_token: 'unit-first',
            refresh_token: 'unit-renew',
            expires_in: 10,
          })
        }
        refreshes++
        assert.equal(fields.get('refresh_token'), 'unit-renew')
        return Response.json({
          access_token: 'unit-current',
          refresh_token: 'unit-rotated',
          expires_in: 3600,
        })
      }
      if (url.pathname === '/v1/models') {
        assert.equal(options.headers.authorization, 'Bearer unit-current')
        return Response.json({
          models: [
            {
              slug: 'visible',
              display_name: 'Visible model',
              visibility: 'list',
            },
            { slug: 'hidden', display_name: 'Internal', visibility: 'hidden' },
          ],
        })
      }
      if (url.pathname === '/v1/responses') {
        const body = JSON.parse(options.body)
        assert.equal(body.store, false)
        assert.equal(body.stream, true)
        assert.equal(body.model, 'visible')
        return new Response(
          streamed([
            'data: {"type":"response.output_text.delta","delta":"Clear skies."}\n\ndata: {"type":"response.completed"}\n\n',
          ]),
        )
      }
      if (url.pathname === '/revoke') {
        assert.equal(options.body.get('token'), 'unit-rotated')
        return new Response(null, { status: 204 })
      }
      throw Error('Unexpected fixture URL')
    },
  )
  const game = createChatGPT({
    origin: 'http://127.0.0.1:4817',
    registration: { host: 'urn:uuid:700624c4-acb1-4211-aae3-c6aa16a1594b' },
    saveRegistration: async (value) => saved.push(value),
  })
  authorize = new URL(await game.start())
  assert.equal(authorize.searchParams.get('client_id'), 'dynamic_agent_client')
  assert.equal(authorize.searchParams.get('agent_name_hint'), 'Skyrates')
  assert.equal(
    authorize.searchParams.get('redirect_uri'),
    'http://127.0.0.1:4817/auth/callback',
  )
  await game.finish(
    new URLSearchParams({
      code: 'one-time-fixture',
      client_id: client,
      state: authorize.searchParams.get('state')!,
    }),
  )
  assert.ok(game.connected())
  assert.deepEqual(Object.keys(saved[0]).sort(), ['client', 'host'])
  const [models] = await Promise.all([game.models(), game.models()])
  assert.deepEqual(models, [{ id: 'visible', name: 'Visible model' }])
  assert.equal(refreshes, 1)
  assert.equal(
    await game.respond(
      'visible',
      'Speak as a porter',
      [{ role: 'user', content: 'Weather?' }],
      AbortSignal.timeout(2000),
    ),
    'Clear skies.',
  )
  await game.disconnect()
  assert.equal(game.connected(), false)
  assert.ok(fetchMock.mock.callCount() > 6)
})
