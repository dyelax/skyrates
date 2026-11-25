import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import test from 'node:test'

test('the preview and fine ship lattices contain solid volumes and exterior faces on all six sides', () => {
  for (const width of [576, 1536]) {
    const data = gunzipSync(
      readFileSync(new URL('../public/study/wayfarer-' + width + '.vox.gz', import.meta.url)),
    )
    assert.equal(data.toString('ascii', 0, 4), 'SKV1')
    assert.equal(data.readUInt32LE(4), width)
    const height = data.readUInt32LE(8)
    const depth = data.readUInt32LE(12)
    const faces = data.readUInt32LE(16)
    const occupied = data.readUInt32LE(20)
    assert.equal(data.length, 24 + 10 * faces)
    assert.ok(occupied > faces && occupied < width * height * depth)
    const counts = [0, 0, 0, 0, 0, 0]
    for (let offset = 24; offset < data.length; offset += 10) {
      const normal = data[offset + 9]
      assert.ok(normal < 6)
      assert.ok(
        data.readUInt16LE(offset) < width &&
          data.readUInt16LE(offset + 2) < height &&
          data.readUInt16LE(offset + 4) < depth,
      )
      counts[normal]++
    }
    for (const count of counts) assert.ok(count > 1000)
  }
})
