import { GOODS } from './data'
import type { Point } from './battle-model'
import type { PrizeManifest } from './prize-command'

export const SALVAGE_SECONDS = 14
export interface SalvageCrate extends Point {
  taken: boolean
}
export interface SalvageState {
  sourceId: string
  remaining: number
  crates: SalvageCrate[]
}
export interface SalvageReceipt extends PrizeManifest {
  dropped: number
}
export interface SalvageArea {
  left?: number
  width: number
  top: number
  bottom: number
}
export interface SalvageLoad {
  manifest: PrizeManifest
  free: number
}

const bound = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const dropCount = (manifest: PrizeManifest) => Math.min(3, Math.floor(manifest.quantity / 3))
export const recovered = (s: SalvageState) => s.crates.filter((crate) => crate.taken).length

export function salvageReceipt(manifest: PrizeManifest, quantity: number): SalvageReceipt {
  const dropped = dropCount(manifest)
  return { good: manifest.good, quantity: bound(quantity, 0, dropped), dropped }
}

export function salvageLabel(receipt: SalvageReceipt) {
  return (
    'Recovered ' +
    receipt.quantity +
    ' of ' +
    receipt.dropped +
    ' falling crates of ' +
    GOODS[receipt.good].name.toLowerCase() +
    '.'
  )
}

export function validSalvage(value: unknown): value is SalvageState {
  if (!value || typeof value !== 'object') return false
  const s = value as Partial<SalvageState>
  return (
    typeof s.sourceId === 'string' &&
    s.sourceId.length > 0 &&
    s.sourceId.length <= 64 &&
    typeof s.remaining === 'number' &&
    Number.isFinite(s.remaining) &&
    s.remaining >= 0 &&
    s.remaining <= SALVAGE_SECONDS &&
    Array.isArray(s.crates) &&
    s.crates.length > 0 &&
    s.crates.length <= 3 &&
    s.crates.every((c) => c && Number.isFinite(c.x) && Number.isFinite(c.y) && typeof c.taken === 'boolean')
  )
}

export function launchCargo(
  sourceId: string,
  manifest: PrizeManifest,
  player: Point,
  wreck: Point,
  area: SalvageArea,
): SalvageState {
  const direction = Math.atan2(wreck.y - player.y, wreck.x - player.x)
  const inward = Math.atan2((area.top + area.bottom) / 2 - player.y, ((area.left ?? 0) + area.width) / 2 - player.x)
  const inside = (x: number, y: number) => ({
    x: bound(x, (area.left ?? 0) + 28, area.width - 28),
    y: bound(y, area.top + 25, area.bottom - 25),
  })
  const crates = Array.from({ length: dropCount(manifest) }, (_, i) => {
    const angle = direction + [-0.95, 0.95, 0][i],
      range = i === 2 ? 88 : 57
    let point = inside(wreck.x + Math.cos(angle) * range, wreck.y + Math.sin(angle) * range)
    if (Math.hypot(point.x - player.x, point.y - player.y) < 42) {
      const bearing = inward + (i - 1) * 0.65
      point = inside(player.x + Math.cos(bearing) * 68, player.y + Math.sin(bearing) * 68)
    }
    return { ...point, taken: false }
  })
  return { sourceId, remaining: SALVAGE_SECONDS, crates }
}

export function fallingPoint(crate: SalvageCrate, secondsLeft: number, wind: Point, area: SalvageArea): Point {
  const age = SALVAGE_SECONDS - secondsLeft
  return {
    x: bound(crate.x + wind.x * age * 1.9, (area.left ?? 0) + 28, area.width - 28),
    y: bound(crate.y + wind.y * age * 1.9 + age * 0.7, area.top + 25, area.bottom - 25),
  }
}

export function collectCargo(
  s: SalvageState,
  load: SalvageLoad,
  ship: Point,
  wind: Point,
  area: SalvageArea,
  dt: number,
) {
  if (s.remaining <= 0) return 0
  s.remaining = Math.max(0, s.remaining - dt)
  let room = load.free - recovered(s),
    picked = 0
  if (s.remaining > 0)
    for (const c of s.crates) {
      if (c.taken || room <= 0) continue
      const p = fallingPoint(c, s.remaining, wind, area)
      if (Math.hypot(p.x - ship.x, p.y - ship.y) <= 29) {
        c.taken = true
        room--
        picked++
      }
    }
  if (room <= 0 || s.crates.every((c) => c.taken)) s.remaining = 0
  return picked
}
