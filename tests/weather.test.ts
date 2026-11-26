import test from 'node:test'
import assert from 'node:assert/strict'
import { PORT_IDS } from '../src/data'
import { initialState, act, saveGame, loadGame } from '../src/model'
import {
  seasonAt,
  SEASON_DAYS,
  portWeather,
  routeWeather,
  voyageWeather,
  battleLocation,
} from '../src/weather'

test('calendar turns on voyage days, repeats and retains distinct regional climates', () => {
  assert.equal(seasonAt(1), 'spring')
  assert.equal(seasonAt(SEASON_DAYS), 'spring')
  assert.equal(seasonAt(13), 'summer')
  assert.equal(seasonAt(37), 'winter')
  assert.equal(seasonAt(49), 'spring')
  for (let day = 1; day < 98; day++) {
    const weather = PORT_IDS.map((p) => portWeather(p, day))
    for (const w of weather)
      assert.ok(
        w.knots > 0 && Number.isFinite(w.wind.x) && Number.isFinite(w.wind.y),
      )
    assert.ok(weather[3].knots > weather[0].knots)
    assert.deepEqual(portWeather('glasshouse', day), weather[1])
  }
})
test('the weather forecast survives departure and save round trips across a seasonal boundary', () => {
  const s = initialState()
  s.day = 12
  const forecast = routeWeather('sunstep', 'copperfall', 12)
  const sailed = act(s, { type: 'sail', to: 'copperfall' })
  assert.deepEqual(voyageWeather(JSON.parse(JSON.stringify(sailed))), forecast)
  assert.equal(forecast.season, 'summer')
})

test('approach battles and Watch drills keep their regional ground on reload', () => {
  const captain = initialState(17)
  captain.day = 12
  let stored = ''
  const storage = {
    setItem(_key: string, raw: string) { stored = raw },
    getItem() { return stored },
  }
  for (const port of PORT_IDS) {
    assert.equal(battleLocation({ port, voyage: null, drill: 'briefing' }), port)
  }
  const first = act(captain, { type: 'sail', to: 'copperfall' })
  assert.equal(battleLocation(first), 'sunstep')
  assert.ok(saveGame(first, storage))
  assert.equal(battleLocation(loadGame(storage)), 'sunstep')

  const docked = act(act(first, { type: 'endDrill', skip: true }), { type: 'continueVoyage' })
  const replay = act(docked, { type: 'practiceDrill' })
  assert.ok(saveGame(replay, storage))
  assert.equal(battleLocation(loadGame(storage)), 'copperfall')

  // Version-one saves already have both ports even without regional art data.
  const third = act({ ...captain, voyageCount: 2, tender: 'helped' }, { type: 'sail', to: 'glasshouse' })
  const hail = act(third, { type: 'continueVoyage' })
  const fight = act(hail, { type: 'engage' })
  assert.equal(fight.voyage?.phase, 'battle')
  assert.ok(saveGame(fight, storage))
  assert.equal(battleLocation(loadGame(storage)), 'glasshouse')
  assert.deepEqual(voyageWeather(fight), routeWeather('sunstep', 'glasshouse', 12))
})
