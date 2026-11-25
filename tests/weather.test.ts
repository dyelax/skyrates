import test from 'node:test'
import assert from 'node:assert/strict'
import { PORT_IDS } from '../src/data'
import { initialState, act } from '../src/model'
import {
  seasonAt,
  SEASON_DAYS,
  portWeather,
  routeWeather,
  voyageWeather,
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
