import { chartObjectives } from './objectives'
import { voyageWeather } from './weather'
import { cargoUsed, PORTS, type GameState } from './model'
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
    if (!reply && /\b(quest|order|objective|commission|next stop)\b/i.test(question))
      reply =
        chartObjectives(state)
          .map((o) => o.title + ' — ' + o.detail)
          .join(' ') ||
        'Your docket is clear. Speak to a port authority about freight, or visit a civic institution for a local order.'
    if (!reply && /\b(hold|crates|capacity)\b/i.test(question))
      reply = `Your hold carries ${cargoUsed(state)} of ${state.ship.hold} crates. Sunstep’s liftwrights fit cargo racks. Bonded mail travels in its own locker.`
    if (!reply && /\b(dodge|cannon|gun|broadside|fire|shoot)\b/i.test(question))
      reply = `You have ${state.ship.cannons} fitted cannon${state.ship.cannons === 1 ? '' : 's'}. Steer out of the incoming fire line, then turn until a fitted gun bears on the other ship. Fire with its numbered control. Copperfall refits add guns. Practice the sequence at a shipyard.`
    if (!reply && /\b(board|boarding|melee|grapple)\b/i.test(question))
      reply =
        'Use Ram to intercept. On hull contact, the grapples pull the ships together. Your crew fights on deck. Experienced hands and damage dealt before boarding improve your chances.'
    if (!reply && /\b(wind|squall|weather|drift)\b/i.test(question)) {
      const w = voyageWeather(state)
      reply = `${w.summary}. Wind blows toward ${w.bearing} at ${w.knots} knots. It carries ships and shots downwind. The chart shows the route forecast, and V sets the wind sight in battle.`
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
