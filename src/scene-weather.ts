import type { WeatherReport } from './weather'
import './scene-weather.css'

/** An optical layer over an illustrated scene. In the walkable port the same report drives world-space materials. */
export function paintedWeather(report: WeatherReport): string {
  const rain = report.kind === 'rain' || report.kind === 'squall'
  const frost = report.kind === 'frost'
  const count = rain ? Math.round(24 + 24 * report.severity) : frost ? 20 : 0
  const dx = Math.round(report.wind.x * (rain ? 26 : 14))
  const slant = (-Math.atan2(dx, 104) * 180) / Math.PI
  const drops = Array.from({ length: count }, (_, i) => {
    const x = ((17 + i * 71.441) % 129) - 13
    const duration = (rain ? 1.25 : 5.2) * (0.8 + (i % 7) * 0.075)
    return `<i style="left:${x.toFixed(2)}%;--period:${duration.toFixed(2)}s;--delay:-${(duration * ((i * 0.61803) % 1)).toFixed(2)}s;opacity:${(0.18 + (i % 4) * 0.08).toFixed(2)}"></i>`
  }).join('')
  return `<div class="weather-film" aria-hidden="true" data-sky="${report.kind}" data-season="${report.season}" style="--wind-x:${dx}vw;--slant:${slant.toFixed(1)}deg">${drops}</div>`
}
