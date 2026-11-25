import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'
import { PORT_IDS } from '../src/data'
import { ROOM_SCENES, roomTargets } from '../src/workshop-scenes'
import { stations } from '../src/voxel/workroom-plan'

test('every workshop has its own published painting and reachable, distinct points of interest', () => {
  const illustrations = new Set<string>()
  for (const port of PORT_IDS) {
    for (const station of stations) {
      const room = ROOM_SCENES[port][station]
      const key = port + '/' + station
      assert.ok(existsSync(new URL('../public/art/' + room.art + '.webp', import.meta.url)), key)
      assert.ok(!illustrations.has(room.art), key + ' reuses another workshop')
      illustrations.add(room.art)
      const targets = roomTargets(room)
      assert.equal(targets.includes('guest'), station === 'market', key)
      const coordinates = targets.map(target => room[target]!)
      for (const [x, y] of coordinates) assert.ok(x > 0 && x < 100 && y > 0 && y < 100, key)
      assert.equal(new Set(coordinates.map(point => point.join(','))).size, coordinates.length, key)
    }
  }
  assert.equal(illustrations.size, 16)
})
