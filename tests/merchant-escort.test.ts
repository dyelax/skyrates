import assert from 'node:assert/strict'
import test from 'node:test'
import { ESCORT_HULL, escortStep } from '../src/merchant-escort'

test('the merchant can clear either passage by reaching shelter or by outlasting its attacker', () => {
  assert.equal(escortStep(1, ESCORT_HULL, false, false, false), 'continue')
  assert.equal(escortStep(1, 36, false, true, false), 'next')
  assert.equal(escortStep(1, 36, true, false, false), 'next')
  assert.equal(escortStep(2, 0.1, false, true, false), 'delivered')
  assert.equal(escortStep(2, 0.1, true, false, false), 'delivered')
})

test('abandoning the convoy ends the trial and a simultaneous loss cannot be reported as a delivery', () => {
  assert.equal(escortStep(1, 36, false, false, true), 'escaped')
  assert.equal(escortStep(2, 36, true, true, true), 'escaped')
  assert.equal(escortStep(2, 0, true, true, true), 'lost')
})
