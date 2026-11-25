import { BEACON_COMMISSION, INVOICE_COST } from './data'

// A captain must be able to rely on a quoted contract. When a model omits or
// changes the operative clause, the speaker reads it directly from the docket.
export function docketAnswer(
  speaker: string,
  question: string,
): string | undefined {
  const asksPrice =
    /\b(pay|pays|repay\w*|reimburs\w*|collect|refund|owe|worth|cost|how much|invest|underwrit\w*|why should|money|crowns)\b/i.test(
      question,
    )
  if (
    asksPrice &&
    /\b(lens|certificate|beacon|underwrit\w*|compact)\b/i.test(question)
  ) {
    if (['vale', 'iona', 'sen'].includes(speaker))
      return `Advance ${INVOICE_COST} crowns to Keeper Iona at Glasshouse Reach for the lens. Present her relighting certificate to Pilot Sen at Meridian Spire to collect ${INVOICE_COST + BEACON_COMMISSION.premium} crowns, including your ${BEACON_COMMISSION.premium}-crown premium.`
    return 'Vale keeps the signed terms in the Sunstep port office. Iona handles the lens up at Glasshouse Reach.'
  }
  if (
    /\b(rations?|food|fuel|provisions|water)\b/i.test(question) &&
    /\b(need|required|have to|run out|must|leave|sail|survive|departure|feed|supplies)\b/i.test(
      question,
    )
  )
    return 'The galley and lift cells are supplied at berth. You can sail without buying food or fuel. Provisions on the exchange are trade cargo.'
  return undefined
}
