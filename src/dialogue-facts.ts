import { BEACON_COMMISSION, INVOICE_COST } from './data'

// A captain must be able to rely on a quoted contract. When a model omits or
// changes the operative clause, the speaker reads it directly from the docket.
export function docketAnswer(
  speaker: string,
  question: string,
  paneDocket?: string,
  firstPaneOrderOpen = false,
  harvestDocket?: string,
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
  if (harvestDocket && /\b(harvest|winter pears?|first refusal|first picking|shift kitchens?)\b/i.test(question))
    return harvestDocket
  const asksPanes = /\b(panes?|solar glass|gardener.s order|glaz(?:e|ing)|greenhouse roof)\b/i.test(question)
  const asksFenTerms = speaker === 'fen' && /\b(how many|how much|deadline|when.*due|your order)\b/i.test(question)
  if (paneDocket && (firstPaneOrderOpen ? asksPanes || asksFenTerms : asksPanes && /\b(first|original)\b/i.test(question))) return paneDocket
  return undefined
}
