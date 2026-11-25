import { MINIMUM_RAIDER_TOLL, TRADE_PROFIT_PER_XP, PORTS, type GameState } from './model'
import { CITY_ECONOMY } from './city-economy'
import './handbook.css'

export function openHandbook(state: GameState) {
  const city = CITY_ECONOMY[state.port]
  const entries = [
    [
      'What must I buy before sailing?',
      'The galley and lift cells are supplied at the berth. Rations, drinking water and fuel cost you nothing. Provisions in the market are crates to sell. You can sail with an empty hold and an empty purse.',
    ],
    [
      'How do I earn my first crowns?',
      'Vale’s freight desk pays on delivery. A sealed dispatch takes no cargo space and needs no advance. For a first trade, buy a few crates of Sunstep provisions, carry them to Glasshouse, then sell through the Furnace Exchange. Copperfall buys Glasshouse solar glass for its winter garden.',
    ],
    [
      'How does trading earn captain XP?',
      `Every ${TRADE_PROFIT_PER_XP} crowns of profit from cargo sales earn 1 XP. Profit is your sale price less what you paid for the crates. Any crowns short of the next point carry over. Breaking even or taking a loss leaves that progress intact.`,
    ],
    [
      'Where do I go next?',
      'Open the sky chart and unfold Captain’s orders. Locate an order to mark its destination. Select a port to see the passage, recorded prices and Set sail. Present commissions to the named keeper in person.',
    ],
    [
      'Why underwrite the lens?',
      'Vale wants the mail lane open. You advance 240 crowns for Iona’s lens. First light earns your outer-route charter and a captain ability. Deliver the relighting certificate to Pilot Sen at Meridian to receive 300 crowns. The payment leaves you 60 crowns ahead.',
    ],
    [
      'What does a raider demand?',
      `Lookouts count your purse and each trade crate at its home-port list price. At 140 crowns a cutter takes interest. At 320 a corsair comes looking. The toll is five percent rounded up, with a ${MINIMUM_RAIDER_TOLL}-crown minimum. Pay cash or the exact cargo settlement shown. Raiders return change on whole crates. Refuse and fight or reach an edge to escape. Defeat takes the posted cargo settlement, capped at what you carry. Your papers and bonded mail are safe. The Harbor Watch drill remains free.`,
    ],
    [
      'How do I fight and board?',
      'Your first departure from Sunstep includes a Harbor Watch exercise with chalk rounds. Watch the incoming line, steer clear, turn your port gun toward the other ship and fire. Closing to hull contact starts a boarding action. Crew numbers, experienced hands and prior hull damage change the odds. Replay the drill at the yard.',
    ],
    [
      'What changes as people hear of me?',
      'Giving a stranded skipper a tow costs a day and earns a referral. Victories and public service bring renown. When the beacon lights, open your log to choose a trade, gunnery or leadership ability.',
    ],
    [
      'Where can I repair and refit?',
      'Every berth can repair your hull. Buy hold extensions at Sunstep or heavy plating and extra guns at Copperfall. Find experienced hands at Copperfall and Meridian. A freight run can pay for a repair even with an empty purse.',
    ],
  ]
  const dialog = document.createElement('dialog')
  dialog.className = 'watch-handbook'
  dialog.innerHTML = `<header><div><small>Ship’s papers · The Wayfarer</small><h2>Captain’s handbook</h2></div><button type="button" aria-label="Close handbook">×</button></header><p>Moored at ${PORTS[state.port].name}. ${city.tradeLead}</p>${entries.map(([question, answer], idx) => `<details ${idx === 0 ? 'open' : ''}><summary>${question}</summary><p>${answer}</p></details>`).join('')}`
  dialog.querySelector('button')!.onclick = () => dialog.close()
  dialog.addEventListener('close', () => dialog.remove(), { once: true })
  document.body.append(dialog)
  dialog.showModal()
}
export function firstWatchNote(
  host: HTMLElement,
  state: GameState,
  meetVale: () => void,
  acknowledge: () => void,
) {
  const note = document.createElement('aside')
  note.className = 'first-watch-note'
  note.setAttribute('aria-label', 'First watch orders')
  note.innerHTML =
    '<button type="button" class="watch-dismiss" aria-label="Stow first watch orders">×</button><small>Vale’s note · first watch</small><p>The galley is stocked. Come up to the port office for your papers, Captain.</p><div><button type="button" data-meet>Visit Vale</button><button type="button" data-read>Read handbook</button></div>'
  note.querySelector<HTMLElement>('[data-meet]')!.onclick = () => {
    acknowledge()
    meetVale()
  }
  note.querySelector<HTMLElement>('[data-read]')!.onclick = () =>
    openHandbook(state)
  note.querySelector<HTMLElement>('.watch-dismiss')!.onclick = () => {
    acknowledge()
    note.remove()
  }
  host.append(note)
}
