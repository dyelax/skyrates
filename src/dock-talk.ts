import './dock-talk.css'
import { characterContext, npcAtPort, type ContactWriter, type NpcId } from './characters'
import { CITY_ECONOMY } from './city-economy'
import { GOODS, INVOICE_COST, PORTS, priceAt, TENDER_DEED, type GameState } from './model'

type Destination = 'authority' | 'market' | 'shipyard' | 'chart' | 'log'
interface Topic {
  ask: string
  answer: string
  visit?: { view: Destination }
  recall?: boolean
}
interface Conversation {
  name: string
  role: string
  greeting: string
  topics: Topic[]
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
            visit: { view: 'market' },
          },
          {
            ask: state.mission === 'lit' ? 'Who’s sailing the outer route?' : 'Where can a new captain find work?',
            answer:
              state.mission === 'lit'
                ? 'Weather boats out of Meridian. They go up for days, and every pair of hands wants dinner. Take them a few pears from me.'
                : 'Vale’s office. Mind the pear skins on her steps. She also has bonded mail for captains whose pockets have worn clean through.',
            visit:
              state.mission === 'lit'
                ? { view: 'chart' }
                : { view: 'authority' },
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
            visit: { view: 'market' },
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
                ? { view: 'chart' }
                : { view: 'authority' },
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
            visit: { view: 'authority' },
          },
          {
            ask: 'What leaves Copperfall in those crates?',
            answer:
              'Machinery. Listen close and you can hear the gears knock together. Sunstep’s orchard lifts chew through the stuff. I’ve hauled enough to rebuild the whole hillside.',
            visit: { view: 'market' },
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
            visit: { view: 'market' },
          },
          {
            ask: 'How do I find my way back?',
            answer:
              'Lay a course for Glasshouse Reach. Two days on that bearing and you’ll see Iona’s lamp across the bow. From there, Sunstep’s only another day.',
            visit: { view: 'chart' },
          },
        ],
      }
  }
}

/** Mount a conversation inside a positioned harbor scene. The host belongs to this panel. */
export function mountDockTalk(
  host: HTMLElement,
  state: GameState,
  onClose: () => void,
  recordContact: ContactWriter,
): void {
  mountStationTalk(host, state, npcAtPort(state.port, 'dockworker'), onClose, recordContact)
}

const work: Record<NpcId, string> = {
  moss: 'Spare a hand on that cart? The soft fruit goes to the kitchens. The green scions go to the winter garden.',
  vale: 'I am checking the weights against the manifest. Bring a letter or a question and I can make room on the desk.',
  nettle: 'There. The beam is level. You can watch me weigh the crate again if you like.',
  joss: 'Listen to that cage climb. It ought to tick like a clock, all the way to the top terrace.',
  sella: 'Hold that pane still. See how the flame stretches? That is where I need to grind.',
  iona: 'The lamp glass is clean. The books are open. Which have you come to see?',
  brin: 'A ship grew up in warm air like this one? I leave her seams a little room for the cold berth.',
  tal: 'Give that blank another turn and watch the flame. If the edges line up, it can go upstairs.',
  neri: 'Watch where you put your heels. I have two boats sharing this bollard until the shift bell.',
  orr: 'These keel plates have to ring true before they leave the slip. Give me a moment and I will show you.',
  rada: 'Two blows on the proof bell. Now listen to the plate sing back. We can fit another gun here when the hull is sound.',
  fen: 'Walk on the ribs. The boards between them are the roof of somebody’s roots.',
  sen: 'Come to the rail. You can tell which line has a balloon up by the way its shadow falls.',
  uma: 'The folios travel under a silk wrap. The peaches go on top, unless you want to drink them.',
  lask: 'You can feel a line start to fail before you see it. Keep one hand here. I will take the load.',
  orin: 'That needle has been bouncing since dawn. I wait until a pilot tells me what the basket itself felt like.',
}

export function mountStationTalk(
  host: HTMLElement,
  state: GameState,
  id: NpcId,
  onClose: () => void,
  recordContact: ContactWriter,
): void {
  state = recordContact({ type: 'visitNpc', npc: id })
  const npc = characterContext(state,id)
  const city = CITY_ECONOMY[state.port]
  const quayLocal = id === npcAtPort(state.port,'dockworker')
  const local: Conversation = quayLocal ? conversation(state) : {
    name: npc.name, role: npc.role, greeting: work[id],
    topics: [{ask:'What does this port need?', answer:city.order.need},{ask:'Where should I take a trade cargo?',answer:city.tradeLead}],
  }
  local.topics.push({ask:'How did you come to this work?',answer:npc.publicHistory})
  if (npc.memories.length) local.topics.push({ ask:'Where did we leave off last time?', answer:npc.memories.at(-1)!, recall:true })
  for (const [index,answer] of npc.confidences.entries()) {
    local.topics.push({ask:index===0?'What matters to you here?':'What would you tell me in confidence?',answer})
  }
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const panel = document.createElement('section')
  panel.className = 'dock-talk' + (quayLocal ? '' : ' station-voice')
  panel.dataset.npcId = id
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
  role.textContent = local.role + ' · ' + npc.relationship.label
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
    if (topic && !topic.recall) recordContact({type:'rememberNpc', npc:id, memory:'You asked me, “'+topic.ask+'”'})
    speech.textContent = topic?.answer ?? local.greeting
    replies.replaceChildren()
    const destination = topic?.visit?.view
    if (destination) {
      addReply('Where can I find that?', () => {
        const directions: Record<Destination, string> = {
          authority: `Look for the port authority sign. ${PORTS[state.port].keeper} receives captains inside.`,
          market: 'Follow the buyers to the market stalls. The exchange clerk has today’s prices.',
          chart: 'Your chart is aboard the Wayfarer. The compass at your belt opens it too.',
          shipyard: 'Look for the workshop by the rigging. Ask the shipwright there.',
          log: 'It’s written in your captain’s log. Look for the book at your belt.',
        }
        speech.textContent = directions[destination]
        replies.replaceChildren()
        addReply('Ask something else', () => speak())
        addReply('Take your leave', leave)
        speech.focus({ preventScroll: true })
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
  if (quayLocal) panel.append(portrait)
  panel.append(copy, close)
  host.replaceChildren(panel)
  speak()
}
