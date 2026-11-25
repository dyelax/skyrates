import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync } from 'node:fs'
import { PORT_IDS } from '../src/data'
import { npcAtPort, npcName } from '../src/characters'
import { roomPlan, stations } from '../src/voxel/workroom-plan'
import { mayWalk, walkingPath } from '../src/voxel/navigation'

for (const port of PORT_IDS) {
  test(port + ' has a reachable room counter and quay door for each named worker', () => {
    const identities = new Set<string>()
    for (const station of stations) {
      const room = roomPlan(port, station)
      const approach: [number, number] = [room.desk[0] - 0.45, room.desk[1] + 0.95]
      for (const target of [approach, room.entry]) {
        const route = walkingPath(room.spawn, target, room.decks, room.blocks)
        assert.ok(route.length > 0, station + ' is traversable')
        assert.ok(route.every((p) => mayWalk(...p, room.decks, room.blocks)))
      }
      assert.equal(mayWalk(...room.desk, room.decks, room.blocks), false)
      assert.equal(mayWalk(room.w, 0, room.decks, room.blocks), false)
      assert.ok(existsSync(new URL('../public/art/cabinet-' + station + '-' + port + '.webp', import.meta.url)))
      identities.add(npcName(npcAtPort(port, station)))
    }
    assert.equal(identities.size, 4)
  })
}
