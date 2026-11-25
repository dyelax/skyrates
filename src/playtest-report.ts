import { GOODS, GOOD_IDS, PORTS, cargoUsed, type GameState } from './model'
import { chartObjectives } from './objectives'
import { voyageWeather } from './weather'

const threadId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function playtestThread(value: string | null): string | null {
  return value && threadId.test(value) ? value.toLowerCase() : null
}

export function describeGame(state: GameState, view: string, place: string): string {
  const ship = state.ship,
    weather = voyageWeather(state),
    voyage = state.voyage
  const cargo = GOOD_IDS.filter((id) => state.cargo[id].quantity > 0)
    .map((id) => `${state.cargo[id].quantity} ${GOODS[id].name}`)
    .join(', ')
  const jobs = chartObjectives(state).map((job) => job.title + ' — ' + job.detail)
  return [
    `Day ${state.day}, ${weather.season} · ${view}${place ? ' · ' + place : ''}`,
    voyage
      ? `Route: ${PORTS[voyage.from].name} → ${PORTS[voyage.to].name} (${voyage.phase})`
      : `Moored at ${PORTS[state.port].name}`,
    `Weather: ${weather.summary}, wind toward ${weather.bearing} at ${weather.knots} kn`,
    `Captain: level ${state.level}, notoriety ${state.notoriety}, ${state.coins} crowns`,
    `Ship: hull ${ship.hull}/${ship.maxHull}, ${ship.cannons} cannon${ship.cannons === 1 ? '' : 's'}, ${ship.crew} hands including ${ship.veterans} veteran${ship.veterans === 1 ? '' : 's'}`,
    `Hold: ${cargoUsed(state)}/${ship.hold} crates${cargo ? ' · ' + cargo : ''}`,
    ...(state.drill ? ['Watch exercise: ' + state.drill] : []),
    ...jobs.map((job) => 'Commission: ' + job),
  ].join('\n')
}

export function composeReport(question: string, context: string): string {
  return `Skyrates playtest\n\n${question.trim()}\n\nGame context when opened\n${context}\n\nCheck the current game at https://github.com/dyelax/skyrates and follow the skyrates-playtest skill in the repository. Answer mechanics questions directly. For each mechanics question, add or update a concrete TODO for making the answer clear where the player asked it. For a reported bug, add or update a fix TODO with the evidence and a verification step. Check the designated private tracker for duplicates before writing. If this chat has no tracker, return a copyable TODO.`
}

export function codexDraft(thread: string | null, report: string): string {
  const url = new URL('codex://threads/' + (playtestThread(thread) ?? 'new'))
  url.searchParams.set('prompt', report)
  return url.href
}
