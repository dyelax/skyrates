import test from 'node:test'
import assert from 'node:assert/strict'
import { initialState, priceAt, PORT_IDS, GOOD_IDS, act } from '../src/model'
import { seasonalAdjustment } from '../src/seasonal-trade'
test('a harvest depresses orchard prices as cold industrial gardens bid for glass', () => {
  const s = initialState()
  s.day = 25
  assert.equal(seasonalAdjustment('sunstep', 'provisions', s.day), -2)
  assert.equal(seasonalAdjustment('copperfall', 'glass', s.day), 6)
  s.port = 'copperfall'
  s.cargo.glass = { quantity: 1, cost: 12 }
  const quoted = priceAt(s, s.port, 'glass').sell
  assert.equal(
    act(s, { type: 'sell', quantity: 1, good: 'glass' }).coins,
    s.coins + quoted,
  )
})
test('every seasonal market retains a positive spread at broker and retail prices', () => {
  const state = initialState()
  for (let day = 1; day <= 96; day++)
    for (const port of PORT_IDS)
      for (const good of GOOD_IDS)
        for (const ability of [null, 'broker'] as const) {
          const { buy, sell } = priceAt({ ...state, day, ability }, port, good)
          assert.ok(sell > 0 && buy > sell)
        }
})
