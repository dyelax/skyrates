import { GUN_POSITIONS } from './drill'
import type { Point, Shot, Vessel } from './battle-model'

export const BATTLE_ENDINGS = ['victory', 'defeat', 'escaped', 'boarded', 'yielded', 'withdrawn', 'mutualWreck'] as const
export type BattleEnding = typeof BATTLE_ENDINGS[number]

export interface ContactClock {
  armed: boolean
  clearSeconds: number
}

export interface BattleSnapshot {
  version: 1
  player: Vessel
  enemy: Vessel
  playerCrew: number
  enemyCrew: number
  area: { top: number; bottom: number }
  contact: ContactClock
  projectiles: (Shot & { enemy: boolean })[]
  aiDelay: number
  course: Point | null
  intercepting: boolean
  escaping: boolean
  windSight?: boolean // Retired control in version 1 saves.
  terminal: BattleEnding | null
}

const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const nonnegative = (v: unknown): v is number => finite(v) && v >= 0
const point = (v: unknown) => record(v) && finite(v.x) && finite(v.y)

function vessel(v: unknown): boolean {
  return record(v) && point(v) && [v.vx, v.vy, v.heading, v.angularSpeed, v.heel].every(finite)
    && nonnegative(v.hull) && finite(v.maxHull) && v.maxHull > 0 && v.hull <= v.maxHull
    && nonnegative(v.throttle) && Number.isInteger(v.throttle) && v.throttle <= 3
    && Array.isArray(v.guns) && v.guns.length >= 1 && v.guns.length <= GUN_POSITIONS.length
    && v.guns.every(g => record(g) && (g.side === 'port' || g.side === 'starboard')
      && (g.station === 0 || g.station === 1 || g.station === 2) && nonnegative(g.cooldown) && finite(g.reload) && g.reload > 0)
}

export function validBattleSnapshot(v: unknown): v is BattleSnapshot {
  return record(v) && v.version === 1 && vessel(v.player) && vessel(v.enemy)
    && nonnegative(v.playerCrew) && nonnegative(v.enemyCrew)
    && record(v.area) && finite(v.area.top) && finite(v.area.bottom) && v.area.bottom > v.area.top
    && record(v.contact) && typeof v.contact.armed === 'boolean' && nonnegative(v.contact.clearSeconds)
    && Array.isArray(v.projectiles) && v.projectiles.length <= 128 && v.projectiles.every(s =>
      record(s) && point(s) && finite(s.vx) && finite(s.vy) && nonnegative(s.damage) && nonnegative(s.lifetime) && typeof s.enemy === 'boolean')
    && finite(v.aiDelay) && (v.course === null || point(v.course))
    && [v.intercepting, v.escaping].every(f => typeof f === 'boolean')
    && (v.windSight === undefined || typeof v.windSight === 'boolean')
    && (v.terminal === null || BATTLE_ENDINGS.includes(v.terminal as BattleEnding))
}
