import type { WeatherReport } from './weather'
import './scene-weather.css'

/** Weather and season tint the still painting for the current day. */
export function paintedWeather(report: WeatherReport): string {
  return `<div class="weather-film" aria-hidden="true" data-sky="${report.kind}" data-season="${report.season}"></div>`
}
