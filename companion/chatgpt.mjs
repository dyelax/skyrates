import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const issuer = 'https://auth.openai.com'
const resource = 'https://api.openai.com/v1'
const scopes =
  'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct'
const secret = () => randomBytes(32).toString('base64url')
const equal = (a, b) =>
  typeof a === 'string' &&
  Buffer.byteLength(a) === Buffer.byteLength(b) &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b))
async function request(url, options = {}) {
  return fetch(url, {
    ...options,
    redirect: 'error',
    signal: options.signal ?? AbortSignal.timeout(25000),
  })
}
async function json(response, message) {
  if (!response.ok)
    throw Error(
      response.status === 429
        ? 'ChatGPT usage limit reached. Review Manage usage or choose a local model.'
        : message,
    )
  return response.json()
}
export function createChatGPT({ origin, registration, saveRegistration }) {
  let session,
    attempt,
    renewing,
    metadata,
    keys,
    epoch = 0
  async function discover() {
    if (metadata) return metadata
    const doc = await json(
      await request(issuer + '/.well-known/openid-configuration'),
      'Could not reach ChatGPT sign-in.',
    )
    if (
      doc.issuer !== issuer ||
      !['authorization_endpoint', 'token_endpoint', 'jwks_uri'].every(
        (k) => new URL(doc[k]).origin === issuer,
      )
    )
      throw Error('The sign-in provider could not be verified.')
    keys = createRemoteJWKSet(new URL(doc.jwks_uri))
    metadata = doc
    return doc
  }
  async function tokens(fields) {
    const doc = await discover()
    return json(
      await request(doc.token_endpoint, {
        method: 'POST',
        body: new URLSearchParams({ ...fields, resource }),
      }),
      'ChatGPT did not accept this connection. Please sign in again.',
    )
  }
  async function identify(data, client, nonce) {
    const { payload } = await jwtVerify(data.id_token, keys, {
      issuer,
      audience: client,
      requiredClaims: ['exp', 'sub'],
      algorithms: ['RS256'],
    })
    if (
      !payload.sub ||
      (nonce && payload.nonce !== nonce) ||
      (payload.azp && payload.azp !== client) ||
      (Array.isArray(payload.aud) &&
        payload.aud.length > 1 &&
        payload.azp !== client)
    )
      throw Error('This sign-in could not be verified.')
    return payload.sub
  }
  function granted(data, client, sub, previousRefresh) {
    if (
      typeof data.access_token !== 'string' ||
      !data.access_token.length ||
      !Number.isFinite(data.expires_in) ||
      data.expires_in <= 0
    )
      throw Error('ChatGPT returned an incomplete connection.')
    if (
      data.scope &&
      !data.scope.split(' ').includes('chatgpt.tokens.use.direct')
    )
      throw Error('ChatGPT plan usage was not granted.')
    return {
      token: data.access_token,
      refresh: data.refresh_token ?? previousRefresh,
      expires: Date.now() + data.expires_in * 1000,
      client,
      sub,
    }
  }
  async function access() {
    if (!session) throw Error('Sign in with ChatGPT first.')
    if (session.expires > Date.now() + 60000) return session.token
    if (!renewing) {
      const current = session
      const ticket = epoch
      renewing = (async () => {
        const data = await tokens({
          grant_type: 'refresh_token',
          refresh_token: current.refresh,
          client_id: current.client,
        })
        if (
          data.id_token &&
          (await identify(data, current.client)) !== current.sub
        )
          throw Error('The connected account changed. Please sign in again.')
        if (epoch !== ticket) throw Error('The connection was closed.')
        session = granted(data, current.client, current.sub, current.refresh)
        return session.token
      })().finally(() => {
        renewing = undefined
      })
    }
    return renewing
  }
  return {
    connected: () => Boolean(session),
    async start() {
      const doc = await discover()
      const verifier = secret(),
        nonce = secret(),
        state = secret()
      attempt = {
        nonce,
        state,
        verifier,
        until: Date.now() + 600000,
        ticket: ++epoch,
      }
      const url = new URL(doc.authorization_endpoint)
      url.search = new URLSearchParams({
        client_id: registration.client ?? 'dynamic_agent_client',
        response_type: 'code',
        scope: scopes,
        redirect_uri: origin + '/auth/callback',
        resource,
        state,
        nonce,
        code_challenge: createHash('sha256')
          .update(verifier)
          .digest('base64url'),
        code_challenge_method: 'S256',
        ext_agent_host_id: registration.host,
        ...(!registration.client && { agent_name_hint: 'Skyrates' }),
      })
      return url.href
    },
    async finish(params) {
      const a = attempt
      if (
        !a ||
        Date.now() > a.until ||
        params.getAll('state').length !== 1 ||
        !equal(params.get('state'), a.state)
      )
        throw Error('Sign-in has expired or belongs to another window.')
      attempt = undefined
      if (params.has('error'))
        throw Error(
          'Sign-in was declined. Return to your game to choose another voice.',
        )
      const code = params.get('code'),
        client = params.get('client_id') || registration.client
      if (
        !code ||
        params.getAll('code').length !== 1 ||
        params.getAll('client_id').length > 1 ||
        typeof client !== 'string' ||
        !client ||
        client === 'dynamic_agent_client' ||
        (registration.client && registration.client !== client)
      )
        throw Error('ChatGPT returned an incomplete registration.')
      const data = await tokens({
        grant_type: 'authorization_code',
        client_id: client,
        code,
        code_verifier: a.verifier,
        redirect_uri: origin + '/auth/callback',
      })
      const sub = await identify(data, client, a.nonce)
      const verified = granted(data, client, sub)
      if (epoch !== a.ticket)
        throw Error('This sign-in was superseded. Use the newest window.')
      await saveRegistration({ ...registration, client })
      if (epoch !== a.ticket) throw Error('This sign-in was cancelled.')
      registration.client = client
      session = verified
    },
    async models() {
      const data = await json(
        await request(resource + '/models', {
          headers: { authorization: 'Bearer ' + (await access()) },
        }),
        'Could not read your available ChatGPT models.',
      )
      if (!Array.isArray(data.models))
        throw Error('Unexpected ChatGPT model catalog.')
      return data.models
        .filter(
          (x) =>
            x.visibility === 'list' &&
            typeof x.slug === 'string' &&
            typeof x.display_name === 'string',
        )
        .map((x) => ({ id: x.slug, name: x.display_name }))
    },
    async respond(model, instructions, input, signal) {
      const response = await request(resource + '/responses', {
        method: 'POST',
        headers: {
          authorization: 'Bearer ' + (await access()),
          'content-type': 'application/json',
          accept: 'text/event-stream',
        },
        body: JSON.stringify({
          model,
          input,
          instructions,
          store: false,
          stream: true,
        }),
        signal,
      })
      if (!response.ok)
        await json(
          response,
          'ChatGPT could not complete this turn. Check your connection or sign in again.',
        )
      return readCompletion(response.body)
    },
    async disconnect() {
      const old = session
      epoch++
      session = undefined
      attempt = undefined
      if (
        old?.refresh &&
        metadata?.revocation_endpoint &&
        new URL(metadata.revocation_endpoint).origin === issuer
      ) {
        const result = await request(metadata.revocation_endpoint, {
          method: 'POST',
          body: new URLSearchParams({
            token: old.refresh,
            token_type_hint: 'refresh_token',
            client_id: old.client,
          }),
        })
        if (!result.ok)
          throw Error(
            'Signed out locally. You can review the grant in ChatGPT Settings.',
          )
      }
    },
  }
}
export async function readCompletion(body) {
  if (!body) throw Error('ChatGPT sent an empty response.')
  let buffer = '',
    answer = ''
  const decoder = new TextDecoder()
  for await (const part of body) {
    buffer += decoder.decode(part, { stream: true })
    let split
    while ((split = /\r?\n\r?\n/.exec(buffer))) {
      const packet = buffer.slice(0, split.index)
      buffer = buffer.slice(split.index + split[0].length)
      const data = packet
        .split(/\r?\n/)
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trimStart())
        .join('\n')
      if (!data || data === '[DONE]') continue
      const event = JSON.parse(data)
      if (
        event.type === 'response.output_text.delta' &&
        typeof event.delta === 'string'
      )
        answer += event.delta
      if (event.type === 'response.completed' && answer.trim())
        return answer.trim()
      if (
        ['response.failed', 'error', 'response.incomplete'].includes(event.type)
      )
        throw Error('The model stopped before finishing. Try this turn again.')
      if (answer.length > 64000)
        throw Error('The conversation exceeded its reply limit.')
    }
    if (buffer.length > 2000000) throw Error('The response could not be read.')
  }
  throw Error('The conversation stream was interrupted. Please try again.')
}
