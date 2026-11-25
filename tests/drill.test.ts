import assert from 'node:assert/strict'
import test from 'node:test'
import { chalkRun, chalkPoint, evadedRound } from '../src/drill'

test('a dodged round must actually pass the hull and its locked lane must be clear', () => {
  const run = chalkRun({ x: 0, y: 0 }, { x: 100, y: 0 })
  run.traveled = 75
  assert.equal(evadedRound(run, { x: 100, y: 60 }), false)
  run.traveled = 165
  assert.deepEqual(chalkPoint(run), { x: 165, y: 0 })
  assert.equal(evadedRound(run, { x: 100, y: 0 }), false)
  assert.equal(evadedRound(run, { x: 100, y: 50 }), true)
})
