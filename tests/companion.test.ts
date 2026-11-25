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
