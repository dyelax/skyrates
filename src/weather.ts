import { PORTS, type PortId } from './data'
import type { GameState } from './model'

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const
export type Season = (typeof SEASONS)[number]
export type WeatherKind = 'clear' | 'haze' | 'rain' | 'frost' | 'squall'
export const SEASON_DAYS = 12
export function seasonAt(day: number): Season {
  return SEASONS[Math.floor((Math.max(1, day) - 1) / SEASON_DAYS) % 4]
}

type WeatherTable = Record<Season, WeatherKind[]>
interface Climate {
  region: string
  heading: number
  wind: number
  weather: WeatherTable
}
export const CLIMATES: Record<PortId, Climate> = {
  sunstep: {
    region: 'Warm orchard terraces',
    heading: 35,
    wind: 6,
    weather: {
      spring: ['rain', 'rain', 'clear', 'haze'],
      summer: ['clear', 'haze', 'clear', 'rain'],
      autumn: ['clear', 'haze', 'rain', 'clear'],
      winter: ['frost', 'rain', 'clear', 'haze'],
    },
  },
  glasshouse: {
    region: 'High inversion shelf',
    heading: 78,
    wind: 10,
    weather: {
      spring: ['haze', 'rain', 'frost', 'haze'],
      summer: ['clear', 'haze', 'clear', 'rain'],
      autumn: ['haze', 'frost', 'rain', 'clear'],
      winter: ['frost', 'frost', 'squall', 'haze'],
    },
  },
  copperfall: {
    region: 'Leeward industrial basin',
    heading: 304,
    wind: 7,
    weather: {
      spring: ['clear', 'rain', 'haze', 'clear'],
      summer: ['haze', 'clear', 'haze', 'clear'],
      autumn: ['clear', 'haze', 'rain', 'clear'],
      winter: ['frost', 'clear', 'haze', 'frost'],
    },
  },
  meridian: {
    region: 'Exposed survey spire',
    heading: 250,
    wind: 17,
    weather: {
      spring: ['squall', 'rain', 'clear', 'haze'],
      summer: ['clear', 'squall', 'haze', 'clear'],
      autumn: ['squall', 'rain', 'squall', 'clear'],
      winter: ['frost', 'squall', 'haze', 'frost'],
    },
  },
}

export interface WeatherReport {
  kind: WeatherKind
  season: Season
  wind: { x: number; y: number }
  severity: number
  summary: string
  bearing: string
  knots: number
}
const bands: Record<
  WeatherKind,
  [name: string, severity: number, extraKnots: number]
> = {
  clear: ['Clear skies', 0.12, 0],
  haze: ['High haze', 0.25, 1],
  rain: ['Rain bands', 0.55, 4],
  frost: ['Ice crystals', 0.43, 2],
  squall: ['Passing squalls', 0.9, 8],
}
const compass = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
const portIndex: Record<PortId, number> = {
  sunstep: 0,
  glasshouse: 1,
  copperfall: 2,
  meridian: 3,
}

// A daily synoptic pattern keyed only to the saved game day. Checking the
// chart, reloading, or reaching a port by another route preserves the weather.
function pattern(day: number, salt: number) {
  let value = Math.imul(day + 41, 0x45d9f3b) ^ Math.imul(salt + 7, 0x119de1f3)
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b)
  return (value ^ (value >>> 16)) >>> 0
}
function report(
  kind: WeatherKind,
  season: Season,
  x: number,
  y: number,
): WeatherReport {
  const knots = Math.round(Math.hypot(x, y))
  const angle = ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360
  return {
    kind,
    season,
    wind: { x: x / 24, y: y / 24 },
    severity: bands[kind][1],
    summary: bands[kind][0],
    bearing: compass[Math.round(angle / 45) % 8],
    knots,
  }
}
export function portWeather(port: PortId, day: number): WeatherReport {
  const climate = CLIMATES[port],
    season = seasonAt(day)
  const phase = pattern(day, portIndex[port]),
    days = climate.weather[season]
  const kind = days[phase % days.length]
  const angle =
    ((climate.heading +
      ((phase >>> 5) % 67) -
      33 +
      SEASONS.indexOf(season) * 13) *
      Math.PI) /
    180
  const knots = climate.wind + bands[kind][2] + ((phase >>> 12) % 5)
  return report(kind, season, Math.sin(angle) * knots, -Math.cos(angle) * knots)
}
export function routeWeather(
  from: PortId,
  to: PortId,
  departureDay: number,
): WeatherReport {
  if (from === to) return portWeather(from, departureDay)
  const arrival = departureDay + PORTS[from].daysTo[to]
  const start = portWeather(from, departureDay),
    end = portWeather(to, arrival)
  const front = start.severity > end.severity ? start : end
  return report(
    front.kind,
    seasonAt(departureDay + Math.floor((arrival - departureDay) / 2)),
    24 * (start.wind.x * 0.4 + end.wind.x * 0.6),
    24 * (start.wind.y * 0.4 + end.wind.y * 0.6),
  )
}
export function voyageWeather(
  state: Pick<GameState, 'voyage' | 'port' | 'day'>,
) {
  const leg = state.voyage
  return leg
    ? routeWeather(leg.from, leg.to, state.day - PORTS[leg.from].daysTo[leg.to])
    : portWeather(state.port, state.day)
}

// Raiders meet the ship on approach to its destination. The Watch begins its
// first exercise at castoff; repeat exercises fly over the home port.
export function battleLocation(state: Pick<GameState, 'voyage' | 'port' | 'drill'>): PortId {
  if (!state.voyage) return state.port
  return state.drill ? state.voyage.from : state.voyage.to
}
