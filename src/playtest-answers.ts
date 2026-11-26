import { chartObjectives } from './objectives'
import { voyageWeather } from './weather'
import { cargoUsed, forecastText, PORTS, raiderForecast, raiderToll, tollSettlementLabel, type GameState } from './model'
import { docketAnswer } from './dialogue-facts'

export function assessPlaytest(text: string, state: GameState, view: string) {
  const question = text.trim()
  const at = PORTS[state.port].name + ' · ' + view
  const failure =
    /\b(bug|crash(?:ed|es)?|broken|overlap\w*|stuck|unreachable|scroll(?:ing)? sideways|disappear(?:ed|s)?|doesn.t work|won.t open)\b/i.test(
      question,
    )
  const asks =
    !failure &&
    (question.includes('?') ||
      /^(how|why|when|where|which|what|do I|can I|is there|tell me|explain)\b/i.test(question))
  let reply = ''
  if (asks) {
    reply = docketAnswer('vale', question) ?? ''
    if (/\b(raider|pirate|toll|highwayman)\b/i.test(question)) {
      if (state.voyage?.phase === 'raider' || state.voyage?.phase === 'battle') {
        const toll = raiderToll(state)
        const cargo = toll.settlement.cargo.length ? ' They also accept ' + tollSettlementLabel(toll.settlement) + '.' : ''
        const cash = state.coins >= toll.crowns ? 'You can pay from your purse.' : 'Your purse alone cannot cover it.'
        reply = toll.crowns === 0 ? 'Your manifest is too light for a levy. Accept clear passage to keep sailing.' :
          `Your purse and trade goods are appraised at ${toll.exposedValue} crowns. A ${toll.profile.name.toLowerCase()} demands ${toll.crowns} crowns. ${cash}${cargo} Take the helm to fight or escape at an edge. On defeat the settlement is ${tollSettlementLabel(toll.settlement)}. Papers and bonded mail stay aboard.`
      } else if (state.drill || state.voyageCount === 0 || state.voyage?.id === 1) {
        reply = 'The Harbor Watch drill and your first passage are free. Your purse and cargo are safe.'
      } else {
        const forecast = raiderForecast(state)
        reply = `Your purse and trade goods are appraised at ${forecast.exposedValue} crowns. A raider might ask ${forecast.low}–${forecast.high} crowns. ${forecastText(forecast)} The actual terms come with the hail.`
      }
    }
    if (!reply && /\b(quest|order|objective|commission|next stop)\b/i.test(question))
      reply =
        chartObjectives(state)
          .map((o) => o.title + ' — ' + o.detail)
          .join(' ') ||
        'Your docket is clear. Speak to a port authority about freight, or visit a civic institution for a local order.'
    if (!reply && /\b(hold|crates|capacity)\b/i.test(question))
      reply = `Your hold carries ${cargoUsed(state)} of ${state.ship.hold} crates. Sunstep’s liftwrights fit cargo racks. Bonded mail travels in its own locker.`
    if (!reply && /\b(dodge|cannon|gun|broadside|fire|shoot)\b/i.test(question))
      reply = `You have ${state.ship.cannons} fitted cannon${state.ship.cannons === 1 ? '' : 's'}. Steer out of the incoming fire line, then turn until a fitted gun bears on the other ship. Tap Port or Starboard to fire every ready gun on that rail. Guns reload one at a time on each side. Shoot early or hold for the whole broadside. Later Copperfall refits add matched banks, up to 24 guns per rail. Practice the sequence at a shipyard.`
    if (!reply && /\b(board|boarding|melee|grapple)\b/i.test(question))
      reply =
        'Steer alongside or choose Close in. The crew meters drain only while the hulls touch. Steer clear or use Push off to disengage. New hands and veterans increase your starting strength. If the enemy crew yields while its hull is afloat, you can negotiate over the prize.'
    if (!reply && /\b(wind|squall|weather|drift)\b/i.test(question)) {
      const w = voyageWeather(state)
      reply = `${w.summary}. Wind blows toward ${w.bearing} at ${w.knots} knots. The chart shows the route forecast. In battle, each gun fires straight out from its rail. Wind carries both ships and rounds downwind.`
    }
    if (!reply && /\b(trust|relationship|secret)\b/i.test(question))
      reply =
        'Come back on another voyage and do something for the port. Local commissions and deeds earn trust. A person remembers earlier conversations, and speaking repeatedly on one visit earns a single visit.'
  }
  const answer =
    reply ||
    (asks
      ? 'Send this question to the playtest desk for a code-checked answer.'
      : 'Your observation and current game context are ready for the playtest desk.')
  const todo = asks
    ? `Clarify in ${at} what the captain needs to know to answer “${question}”. Verify that a player can find the answer here during play.`
    : `Investigate in ${at}: “${question}”. Reproduce with the attached game context and verify the corrected behavior.`
  return { answer, todo, asks }
}
