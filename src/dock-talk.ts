import './dock-talk.css'
import { GOODS, INVOICE_COST, PORTS, priceAt, TENDER_DEED, type GameState } from './model'

type Destination = 'authority' | 'market' | 'shipyard' | 'chart' | 'log'
interface Topic {
  ask: string
  answer: string
  visit: { label: string; view: Destination }
}
interface Conversation {
  name: string
  role: string
  greeting: string
  topics: [Topic, Topic]
}

function conversation(state: GameState): Conversation {
  switch (state.port) {
    case 'sunstep':
      return {
        name: 'Moss Pellar',
        role: 'Orchard porter',
        greeting:
          state.mission === 'lit'
            ? 'Saw your light come on last night. The night shift cheered so loud my mule dropped a whole basket of pears.'
            : 'Hold the rope a tick, Captain. These pears bruise if you look at them cross-eyed. There. What can I do for you?',
        topics: [
          {
            ask: 'Where would you take a hold full of pears?',
            answer: `Glasshouse Reach. All those mouths at the furnaces and hardly a pear tree between them. Provisions buy here for ${priceAt(state, 'sunstep', 'provisions').buy} crowns a crate today.`,
            visit: { label: 'Buy provisions at the market', view: 'market' },
          },
          {
            ask: state.mission === 'lit' ? 'Who’s sailing the outer route?' : 'Where can a new captain find work?',
            answer:
              state.mission === 'lit'
                ? 'Weather boats out of Meridian. They go up for days, and every pair of hands wants dinner. Take them a few pears from me.'
                : 'Vale’s office. Mind the pear skins on her steps. She also has bonded mail for captains whose pockets have worn clean through.',
            visit:
              state.mission === 'lit'
                ? { label: 'Find Meridian on the chart', view: 'chart' }
                : { label: 'Call on Harbormaster Vale', view: 'authority' },
          },
        ],
      }
    case 'glasshouse':
      return {
        name: 'Sella Venn',
        role: 'Master glazier',
        greeting:
          state.mission === 'lit'
            ? 'Look there. See that clean edge on the beam? Three days I spent grinding that edge.'
            : 'Watch your sleeves. A pane can look perfectly cold and still take the hem clean off your coat.',
        topics: [
          {
            ask: 'Who buys all this glass?',
            answer: `Copperfall’s fitting out winter gardens. They’ll buy panes faster than I can anneal them. A crate of ${GOODS.glass.name.toLowerCase()} goes for ${priceAt(state, 'glasshouse', 'glass').buy} crowns here today.`,
            visit: { label: 'Look at the glass stalls', view: 'market' },
          },
          {
            ask: state.mission === 'lit' ? 'How far does that light carry?' : 'What’s keeping the beacon dark?',
            answer:
              state.mission === 'lit'
                ? 'On a clear watch you can see it from Sunstep. Pilots can make the passage to Meridian Spire again, and I can finally get some sleep.'
                : state.mission === 'invoice'
                  ? `That lens has my thumbprint in the rim. Keeper Iona has it packed upstairs. She’s waiting on the ${INVOICE_COST} crowns for the glass and fitting.`
                  : 'I finished the replacement. Iona minds the lamp and the bill. She’s in the port office, counting the hours till a captain comes through with Vale’s commission.',
            visit:
              state.mission === 'lit'
                ? { label: 'Examine the outer passage', view: 'chart' }
                : { label: 'Speak with Keeper Iona', view: 'authority' },
          },
        ],
      }
    case 'copperfall': {
      const helped = state.tender === 'helped'
      const hasContract = helped && !state.specialFreightTaken
      const job = TENDER_DEED.contract
      return {
        name: 'Skipper Neri',
        role: 'Tender skipper',
        greeting: helped
          ? 'I’d know that mainsail anywhere. I was still waving at the cloud where you’d been when the towline finally came off. Sit a minute.'
          : state.tender === 'passed'
            ? 'I remember that sail. Looked a fair bit smaller from the deck of a dead tender. Anyway. You wanted something?'
            : 'Keep a hand on your hat. When that yard crane swings, it kicks up a crosswind fit to steal the pins out of your hair.',
        topics: [
          {
            ask: helped ? 'How’s the tender holding up?' : 'Any work on these docks?',
            answer: hasContract
              ? `Dry as a biscuit, thanks to you. I saved you a freight run to ${PORTS[job.to].name}. Pays ${job.pay} crowns. Tell the clerk Neri sent you.`
              : helped
                ? 'Better every day. I put my name down beside yours in the freight ledger. Ask the clerk what’s headed out next.'
                : 'There’s ordinary bonded mail at the office. Take it to the port on the docket and the receiver pays you there.',
            visit: { label: 'Check the freight desk', view: 'authority' },
          },
          {
            ask: 'What leaves Copperfall in those crates?',
            answer:
              'Machinery. Listen close and you can hear the gears knock together. Sunstep’s orchard lifts chew through the stuff. I’ve hauled enough to rebuild the whole hillside.',
            visit: { label: 'Price a crate of machinery', view: 'market' },
          },
        ],
      }
    }
    case 'meridian':
      return {
        name: 'Pilot Sen',
        role: 'Weather pilot',
        greeting:
          'I keep the old bearing chalked on this rail. See? That’s where the beacon came up. We’ve been launching sounding balloons ever since.',
        topics: [
          {
            ask: 'What do your crews run short of?',
            answer: `Food. One tin of peaches gets six grown pilots arguing over a spoon. Today our market pays ${priceAt(state, 'meridian', 'provisions').sell} crowns per crate of provisions.`,
            visit: { label: 'Visit the provisions buyers', view: 'market' },
          },
          {
            ask: 'How do I find my way back?',
            answer:
              'Lay a course for Glasshouse Reach. Two days on that bearing and you’ll see Iona’s lamp across the bow. From there, Sunstep’s only another day.',
            visit: { label: 'Spread out the sky chart', view: 'chart' },
          },
        ],
      }
  }
}

/** Mount a conversation inside a positioned harbor scene. The host belongs to this panel. */
export function mountDockTalk(
  host: HTMLElement,
  state: GameState,
  navigate: (view: Destination) => void,
  onClose: () => void,
): void {
  const local = conversation(state)
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const panel = document.createElement('section')
  panel.className = 'dock-talk'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-label', 'Conversation with ' + local.name)

  const portrait = document.createElement('img')
  portrait.src = import.meta.env.BASE_URL + 'art/talk-' + state.port + '.webp'
  portrait.alt = ''
  portrait.className = 'talk-portrait'
  const copy = document.createElement('div')
  copy.className = 'talk-copy'
  const role = document.createElement('p')
  role.className = 'talk-role'
  role.textContent = local.role
  const name = document.createElement('h2')
  name.textContent = local.name
  const speech = document.createElement('p')
  speech.className = 'talk-speech'
  speech.tabIndex = -1
  const replies = document.createElement('div')
  replies.className = 'talk-replies'
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'talk-close'
  close.setAttribute('aria-label', 'End conversation')
  close.title = 'End conversation (Escape)'
  close.textContent = '×'

  function leave() {
    panel.remove()
    onClose()
    if (opener?.isConnected) opener.focus({ preventScroll: true })
  }
  function addReply(label: string, action: () => void) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = label
    button.addEventListener('click', action)
    replies.append(button)
  }
  function speak(topic?: Topic) {
    speech.textContent = topic?.answer ?? local.greeting
    replies.replaceChildren()
    if (topic) {
      addReply(topic.visit.label, () => {
        leave()
        navigate(topic.visit.view)
      })
    }
    for (const next of local.topics) {
      if (next !== topic) addReply(next.ask, () => speak(next))
    }
    addReply('Take your leave', leave)
    speech.focus({ preventScroll: true })
  }
  close.addEventListener('click', leave)
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      leave()
    }
  })
  copy.append(role, name, speech, replies)
  panel.append(portrait, copy, close)
  host.replaceChildren(panel)
  speak()
}
