import test from 'node:test'
import assert from 'node:assert/strict'
import { initialState, INVOICE_COST } from '../src/model'
import { chartObjectives } from '../src/objectives'

test('the chart locates the next quest stop and tracks freight independently', () => {
  const captain = initialState()
  assert.equal(chartObjectives(captain)[0].destination, 'sunstep')
  captain.mission = 'invoice'
  captain.coins = INVOICE_COST - 17
  captain.freight = { from:'sunstep',to:'copperfall',pay:20,special:false }
  const [lens, cargo] = chartObjectives(captain)
  assert.equal(lens.destination, 'glasshouse')
  assert.match(lens.detail, /17 more crowns/)
  assert.equal(cargo.destination, 'copperfall')
  captain.mission = 'lit'
  assert.ok(chartObjectives(captain).some(job => job.title === 'Bonded freight'))
})
