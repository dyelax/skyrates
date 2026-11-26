import type { WeatherReport } from './weather'

export function flightLight(elapsed: number, weather: WeatherReport) {
  const phase = 2 * Math.PI * (0.205 + elapsed / 680)
  const height = Math.sin(phase),
    storm = weather.kind === 'squall' ? weather.severity : weather.severity * 0.32
  const dusk = Math.max(0, 1 - Math.abs(height - 0.02) * 1.62),
    night = Math.max(0, Math.min(1, (0.14 - height) * 1.48))
  return { azimuth: Math.cos(phase), height, dusk, night, storm }
}
export type FlightLight = ReturnType<typeof flightLight>
