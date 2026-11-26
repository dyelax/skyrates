import {
  advanceBroadside,
  buildOpponent,
  fireBroadside,
  gunBearsOn,
  hitsShip,
  moveShot,
  type BattleOpponent,
  type Side,
  type Vessel,
} from './battle-model'
import type { BattleSnapshot } from './battle-state'
import { combatEnding, contactStep, hullContact } from './contact-combat'
import { collectCargo, launchCargo, type SalvageLoad } from './salvage'
import { stepWorldFlight, type Throttle, type WorldFlight, type WorldPose } from './world-flight'

const field = { left: -1e8, width: 1e8, top: -1e8, bottom: 1e8 }

export function launchWorldCombat(
  sky: WorldFlight,
  target: string,
  player: Vessel,
  crew: number,
  opponent: BattleOpponent,
  prior?: BattleSnapshot,
): BattleSnapshot | undefined {
  const actor = sky.traffic.find((ship) => ship.id === target)
  if (!actor) return
  if (prior?.worldActor === target) return prior
  const foe = buildOpponent(actor.ship, actor.ship.heading, opponent)
  if (!prior) {
    Object.assign(player, sky.player)
    Object.assign(foe, actor.ship)
    return {
      version: 1,
      worldActor: target,
      player,
      enemy: foe,
      playerCrew: crew,
      enemyCrew: opponent.crew,
      area: { top: field.top, bottom: field.bottom },
      contact: { armed: true, clearSeconds: 0.4 },
      projectiles: [],
      aiDelay: 0.7,
      course: null,
      intercepting: false,
      escaping: false,
      terminal: null,
    }
  }
  // An old range save contains genuine live damage, shots, gun timers and cargo.
  // Translate that scene once, anchoring the captain to the reconstructed physical hail.
  const battle = structuredClone(prior)
  const dx = sky.player.x - battle.player.x,
    dy = sky.player.y - battle.player.y
  for (const p of [
    battle.player,
    battle.enemy,
    ...battle.projectiles,
    ...(battle.salvage?.crates ?? []),
    ...(battle.course ? [battle.course] : []),
  ]) {
    p.x += dx
    p.y += dy
  }
  battle.worldActor = target
  battle.area = { top: field.top, bottom: field.bottom }
  copyMotion(battle.player, sky.player)
  copyMotion(battle.enemy, actor.ship)
  return battle
}

function copyMotion(from: Vessel, to: WorldPose) {
  to.x = from.x
  to.y = from.y
  to.vx = from.vx
  to.vy = from.vy
  to.heading = from.heading
  to.angularSpeed = from.angularSpeed
  to.heel = from.heel
  to.throttle = from.throttle as Throttle
}
function fire(battle: BattleSnapshot, vessel: Vessel, side: Side, tier: number, enemy: boolean) {
  const shots = fireBroadside(vessel, side, tier)
  battle.projectiles.push(...shots.map((shot) => ({ ...shot, enemy })))
  return shots.length > 0
}
export function fireWorldRail(flight: WorldFlight, battle: BattleSnapshot, side: Side, tier: number): boolean {
  if (battle.terminal || !battle.worldActor) return false
  Object.assign(battle.player, flight.player)
  const fired = fire(battle, battle.player, side, tier, false)
  if (fired) copyMotion(battle.player, flight.player)
  return fired
}
export function pushWorldContact(flight: WorldFlight, battle: BattleSnapshot): boolean {
  const other = flight.traffic.find((actor) => actor.id === battle.worldActor)
  if (battle.terminal || !other) return false
  const rails = hullContact(battle.player, battle.enemy)
  if (rails.gap > 5) return false
  flight.player.vx -= rails.nx * 45
  flight.player.vy -= rails.ny * 45
  other.ship.vx += rails.nx * 30
  other.ship.vy += rails.ny * 30
  return true
}

function fightTick(sky: WorldFlight, battle: BattleSnapshot, tier: number, load: SalvageLoad | undefined, dt: number) {
  const other = sky.traffic.find((actor) => actor.id === battle.worldActor)
  if (!other) return
  Object.assign(battle.player, sky.player)
  if (battle.terminal) {
    if (battle.salvage && load) collectCargo(battle.salvage, load, sky.player, sky.weather.wind, field, dt)
    return
  }
  Object.assign(battle.enemy, other.ship)
  const { player, enemy } = battle
  for (const vessel of [player, enemy]) {
    for (const gun of vessel.guns) gun.cooldown = gun.cooldown <= dt + 1e-9 ? 0 : gun.cooldown - dt
    battle.projectiles.push(
      ...advanceBroadside(vessel, dt, vessel === enemy ? 0 : tier).map((shot) => ({
        ...shot,
        enemy: vessel === enemy,
      })),
    )
  }
  battle.aiDelay -= dt
  if (battle.aiDelay <= 0 && Math.hypot(player.x - enemy.x, player.y - enemy.y) < 540 && other.behavior !== 'evading') {
    const gun = enemy.guns.find((gun) => !gun.cooldown && gunBearsOn(enemy, gun, player))
    if (gun && fire(battle, enemy, gun.side, 0, true)) battle.aiDelay = 1.6
  }
  for (let i = battle.projectiles.length - 1; i >= 0; i--) {
    const shot = battle.projectiles[i]
    moveShot(shot, dt, sky.weather.wind)
    const target = shot.enemy ? player : enemy
    const hit = hitsShip(shot, target)
    if (hit) target.hull = Math.max(0, target.hull - shot.damage)
    if (hit || shot.lifetime <= 0) battle.projectiles.splice(i, 1)
  }
  const crew = { player: battle.playerCrew, enemy: battle.enemyCrew }
  contactStep(player, enemy, crew, battle.contact, dt)
  battle.playerCrew = crew.player
  battle.enemyCrew = crew.enemy
  copyMotion(player, sky.player)
  copyMotion(enemy, other.ship)
  battle.terminal = combatEnding(player, enemy, crew)
  if (!battle.terminal && other.behavior === 'sailing' && sky.spentIds.includes(other.id)) battle.terminal = 'escaped'
  if (battle.terminal) {
    if (battle.terminal === 'victory' && load) {
      battle.salvage = launchCargo('raider-1', load.manifest, player, enemy, field)
      if (load.free <= 0) battle.salvage.remaining = 0
    }
    if (battle.terminal !== 'escaped') other.behavior = 'struck'
  }
}
export function stepCampaignSky(
  flight: WorldFlight,
  input: { helm: number; throttle: Throttle },
  seconds: number,
  battle?: BattleSnapshot,
  gunTier = 0,
  load?: SalvageLoad,
) {
  stepWorldFlight(flight, input, seconds, battle ? (dt) => fightTick(flight, battle, gunTier, load, dt) : undefined)
}
