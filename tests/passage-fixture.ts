// These economic tests choose familiar routes and deliberately approach the
// named ship or berth. Free-helm, traffic and obstacle handling have dedicated tests.
import { act, checkpointFlight, type Command, type GameState } from '../src/model'
import { WORLD_PORTS, type WorldFlight } from '../src/world-flight'

function at(state: GameState, destination: { x: number; y: number }): GameState {
  const leg = state.voyage!
  const flight: WorldFlight = structuredClone(leg.flight!)
  Object.assign(flight.player, destination, { vx: 0, vy: 0, throttle: 0 })
  flight.departed = true
  flight.elapsed++
  return checkpointFlight(state, leg.id, flight)
}
export function flyToPort(state: GameState): GameState {
  const leg = state.voyage
  if (!leg?.flight || leg.phase !== 'underway' || state.drill) return state
  return act(at(state, WORLD_PORTS[leg.to]), { type: 'dockFlight', id: leg.id, port: leg.to })
}
export function flyToNextStop(state: GameState): GameState {
  const leg = state.voyage
  if (!leg?.flight || leg.phase !== 'underway' || state.drill) return state
  const chosen = leg.id === 1 ? 'safe' : state.tender === 'unseen' ? 'tender' : leg.id % 3 === 0 ? 'raider' : 'safe'
  const actor =
    leg.flight.traffic.find((ship) => ship.id === leg.flight!.contactId) ??
    leg.flight.traffic.find((ship) => ship.kind === 'raider' && !leg.flight!.spentIds.includes(ship.id))
  if (chosen === 'safe' || !actor) return flyToPort(state)
  return act(at(state, actor.ship), { type: 'hailFlight', id: leg.id, contact: actor.id, manual: true })
}
export function settleThenFlyToPort(state: GameState, command: Command): GameState {
  const settled = act(state, command)
  return settled !== state && settled.voyage?.phase === 'underway' ? flyToPort(settled) : settled
}
