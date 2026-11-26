import assert from 'node:assert/strict'
import test from 'node:test'
import { buildOpponent, buildShip, STILL_AIR } from '../src/battle-model'
import type { BattleSnapshot } from '../src/battle-state'
import { act, checkpointBattle, initialState, loadGame, prizeManifest, raiderToll } from '../src/model'
import { collectCargo, dropCount, fallingPoint, launchCargo, recovered, validSalvage } from '../src/salvage'

const area = { width: 940, top: 0, bottom: 460 }
const player = { x: 340, y: 240 },
  wreck = { x: 490, y: 215 }
const manifest = { good: 'glass' as const, quantity: 8 }
test('reachable crates are a fraction of the same manifest, each physical pickup occurs once', () => {
  assert.deepEqual(
    [6, 8, 10].map((quantity) => dropCount({ ...manifest, quantity })),
    [2, 2, 3],
  )
  const s = launchCargo('raider-1', manifest, player, wreck, area),
    load = { manifest, free: 1 }
  assert(validSalvage(s))
  assert.equal(collectCargo(s, load, player, STILL_AIR, area, 0.01), 0)
  const first = fallingPoint(s.crates[0], s.remaining, STILL_AIR, area)
  assert.equal(collectCargo(s, load, first, STILL_AIR, area, 0.01), 1)
  assert.equal(s.remaining, 0)
  assert.equal(collectCargo(s, load, first, STILL_AIR, area, 0.01), 0)
  assert.equal(recovered(s), 1)
  const corner = { x: 24, y: 22 },
    edge = launchCargo('raider-2', manifest, corner, corner, area)
  assert(edge.crates.every((c) => Math.hypot(c.x - corner.x, c.y - corner.y) > 29))
  assert.equal(collectCargo(edge, { manifest, free: 12 }, corner, STILL_AIR, area, 14), 0)
  assert.equal(edge.remaining, 0)
})

test('terminal save resumes the same wreck and awards only the collected part, once', () => {
  let state = initialState(5)
  state = act(state, { type: 'sail', to: 'glasshouse' })
  state = act(state, { type: 'endDrill', skip: true })
  state = act(state, { type: 'continueVoyage' })
  state = act(state, { type: 'sail', to: 'copperfall' })
  state = act(state, { type: 'continueVoyage' })
  state = act(state, { type: 'tender', help: true })
  state = act(state, { type: 'sail', to: 'sunstep' })
  state = act(state, { type: 'continueVoyage' })
  state = act(state, { type: 'engage' })
  const id = state.voyage!.id,
    profile = raiderToll(state).profile,
    manifest = prizeManifest(state, profile.id, id)
  const foe = buildOpponent(wreck, 0, profile)
  foe.hull = 0
  const salvage = launchCargo('raider-1', manifest, player, wreck, area)
  const snapshot: BattleSnapshot = {
    version: 1,
    player: buildShip(player, 0, 0, 0),
    enemy: foe,
    playerCrew: 6,
    enemyCrew: 4,
    area,
    contact: { armed: true, clearSeconds: 0.4 },
    projectiles: [],
    aiDelay: 2,
    course: null,
    intercepting: false,
    escaping: false,
    terminal: 'victory',
    salvage,
  }
  const dead = checkpointBattle(state, id, snapshot)
  const picked = structuredClone(snapshot)
  picked.salvage!.crates[0].taken = true
  picked.salvage!.remaining = 9
  const chosen = checkpointBattle(dead, id, picked)
  assert.equal(checkpointBattle(chosen, id, snapshot), chosen)
  assert.equal(checkpointBattle(chosen, id, { ...snapshot, salvage: undefined }), chosen)
  assert.equal(checkpointBattle(chosen, id, { ...picked, terminal: 'boarded' }), chosen)
  const loaded = loadGame({ getItem: () => JSON.stringify(chosen) })
  assert.deepEqual(loaded.voyage?.battle?.salvage, picked.salvage)
  const resolve = { type: 'resolveBattle' as const, id, result: 'enemyWreck' as const, hull: 100 }
  const completed = act(loaded, resolve)
  assert.equal(completed.voyage, null)
  assert.equal(completed.coins, state.coins + 25)
  assert.equal(completed.cargo[manifest.good].quantity, state.cargo[manifest.good].quantity + 1)
  assert(completed.log.some((e) => e.text.includes('Recovered 1 of ' + dropCount(manifest))))
  assert.equal(act(completed, resolve), completed)
  const wrongGood = structuredClone(picked)
  wrongGood.salvage!.sourceId = 'other'
  assert.equal(checkpointBattle(dead, id, wrongGood), dead)
})
