import assert from 'node:assert/strict'
import test from 'node:test'
import { assessPlaytest } from '../src/playtest-answers'
import { initialState, act } from '../src/model'
import { codexDraft, composeReport, describeGame, playtestThread } from '../src/playtest-report'

test('a playtest deep link accepts a thread UUID only and encodes the complete draft as one field', () => {
  const id = '12345678-1234-4234-9234-123456789abc'
  assert.equal(playtestThread(id.toUpperCase()), id)
  for (const invalid of ['new', '/etc/passwd', id + '?mode=work', 'https://example.com', null])
    assert.equal(playtestThread(invalid), null)
  const question = 'Where are my rations? & what about “melee” #2\nI’m at the quay.'
  for (const [value, expected] of [
    [id, id],
    ['a/b', 'new'],
    [null, 'new'],
  ] as const) {
    const url = new URL(codexDraft(value, question))
    assert.equal(url.protocol, 'codex:')
    assert.equal(url.host, 'threads')
    assert.equal(url.pathname, '/' + expected)
    assert.deepEqual([...url.searchParams], [['prompt', question]])
    assert.equal(url.hash, '')
  }
})

test('the report describes the moment without serializing the save or private chat history', () => {
  const start = initialState()
  const sailing = act(act(start, { type: 'sail', to: 'glasshouse' }),{type:'practiceDrill'})
  const context = describeGame(sailing, 'battle', '')
  assert.match(context, /Sunstep Quay → Glasshouse Reach/)
  assert.match(context, /Watch exercise: briefing/)
  assert.ok(!context.includes('pendingNotices'))
  assert.ok(!context.includes(start.log[0].text))
  assert.ok(composeReport('How do I dodge?', context).includes('How do I dodge?'))
})

test('a mechanic question earns both an actionable answer and a contextual clarity item', () => {
  const food = assessPlaytest('Do I need rations?', initialState(), 'chart')
  assert.match(food.answer, /without buying food/)
  assert.match(food.todo, /Sunstep Quay · chart/)
  const bug = assessPlaytest('The window is stuck.', initialState(), 'harbor')
  assert.equal(bug.asks, false)
  assert.match(bug.todo, /Reproduce/)
})
