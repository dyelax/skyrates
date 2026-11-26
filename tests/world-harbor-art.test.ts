import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { PORT_IDS } from '../src/data'
import { WORLD_TOWNS } from '../src/world-flight'
import { flightLight } from '../src/world-flight-light'
import { portWeather } from '../src/weather'

interface HarborModel {
  nodes: { name: string; translation?: number[] }[]
  materials: { name: string; emissiveFactor?: number[] }[]
  meshes: { primitives: { attributes: { POSITION: number } }[] }[]
}
for (const port of PORT_IDS) {
  test(port + ' exports the actual buildings, berths and people at their physical positions', () => {
    const glb = readFileSync(new URL('../public/art/flight-town-' + port + '.glb', import.meta.url))
    assert.equal(glb.toString('utf8', 0, 4), 'glTF')
    assert.equal(glb.readUInt32LE(4), 2)
    assert.equal(glb.readUInt32LE(8), glb.length)
    assert.equal(glb.toString('utf8', 16, 20), 'JSON')
    const asset: HarborModel = JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)))
    const nodes = new Map(asset.nodes.map((n) => [n.name, n]))
    const town = WORLD_TOWNS[port]
    function anchor(name: string, at: { x: number; y: number }) {
      const position = nodes.get(name)?.translation
      assert.ok(position, name)
      assert.ok(Math.abs(position[0] * 8 + town.center.x - at.x) < 0.002, name + ' east')
      assert.ok(Math.abs(position[2] * 8 + town.center.y - at.y) < 0.002, name + ' south')
    }
    for (const site of town.sites) {
      anchor('service-' + site.id, site.position)
      anchor('berth-' + site.id, site.berth)
      assert.ok(nodes.has('npc-' + site.id))
      if (site.id === 'dockworker') anchor('player-berth', site.berth)
    }
    const lamps = asset.nodes.filter((node) => node.name.startsWith('practical-'))
    assert.equal(lamps.length, 4)
    assert.ok(lamps.every((node) => node.translation?.length === 3 && node.translation[1] > 0))
    assert.ok(asset.meshes.length > 10)
    assert.ok(asset.materials.some((material) => material.emissiveFactor?.some((channel) => channel > 0.2)))
    if (port === 'copperfall') assert.ok(nodes.has('winter-glass-repaired'))
    if (port === 'sunstep') assert.ok(nodes.has('mill-sails'))
  })
}

test('day, dusk and night vary with time flown; weather changes sunlight without changing its position', () => {
  const weather = portWeather('sunstep', 1)
  const day = flightLight(0, weather),
    dusk = flightLight(200, weather),
    night = flightLight(359, weather)
  assert.ok(day.height > 0.9 && day.night === 0)
  assert.ok(dusk.dusk > 0.9)
  assert.equal(night.night, 1)
  const squall = flightLight(200, { ...weather, kind: 'squall', severity: 0.98 })
  assert.equal(squall.height, dusk.height)
  assert.equal(squall.azimuth, dusk.azimuth)
  assert.ok(squall.storm > dusk.storm)
})
