import { BEACON_COMMISSION, GOODS, GOOD_IDS, PORTS, type PortId } from './data'
import { CITY_ECONOMY } from './city-economy'
import type { GameState } from './model'
import { portWeather } from './weather'

export type NpcId = keyof typeof PEOPLE
export type ContactRole = 'authority' | 'dockworker' | 'market' | 'shipyard' | 'civic'
export type ContactCommand = { type: 'visitNpc'; npc: NpcId } | { type: 'rememberNpc'; npc: NpcId; memory: string }
export type ContactWriter = (command: ContactCommand) => GameState
export interface Relationship {
  visits: number
  lastVisit: number
  helpedCity: boolean
  memories: string[]
}
export type Contacts = Partial<Record<NpcId, Relationship>>

interface Person {
  port: PortId
  name: string
  role: string
  voice: string
  background: string
  knowledge: string[]
  personal: string
  confidence: string
}

// Only characterContext constructs material for the dialogue model or the player's conversation.
const PEOPLE = {
  moss: {
    port: 'sunstep',
    name: 'Moss Pellar',
    role: 'Orchard porter',
    voice: 'Speak like a man with a cart waiting. Weigh a promise as carefully as a crate. Keep the humor dry.',
    background:
      'My grandmother kept a brass weight in her apron through the whole fight for the porters’ seat. It rides under my cart now.',
    knowledge: [
      'Recognizes a bad lift bearing by sound. Knows terrace picking times, graft packing and the Glasshouse provision run.',
      'The public balance can be challenged by a porter or a grower. He cannot issue a charter.',
    ],
    personal:
      'My knees have begun to go. Everyone asks who inherits the cart. Nobody asks who will know the weight.',
    confidence:
      'There’s a girl weighing crates here after sunset. The growers dismissed her for correcting a tally. I gave her my grandmother’s weight. I intend to keep teaching her.',
  },
  vale: {
    port: 'sunstep',
    name: 'Harbormaster Vale',
    role: 'Harbormaster',
    voice:
      'Be exact about sums. Use the captain’s name when making a promise. Slip into plain dock speech when the ledger closes.',
    background:
      'Before the office, I carried the bonded mail. Ask me how a packet feels when every grower on the terrace has signed it.',
    knowledge: [
      'Knows the compact, charters, bonded mail and who must countersign the certificate.',
      'Can explain the public scales and the two elected seats. Furnace optics are Iona’s business.',
    ],
    personal:
      'I still go down before the weighing bell. It is the only hour in the day when nobody asks me to authorize anything.',
    confidence:
      'That south terrace on the mail bond is mine. I pledged my own allotment when the last bank withdrew. If the locker shuts, my family loses the trees.',
  },
  nettle: {
    port: 'sunstep',
    name: 'Nettle Arin',
    role: 'Public weigher',
    voice:
      'Use short questions and concrete measures. Invite anyone who doubts a figure to take the second weighing.',
    background:
      'I washed the town weights as a child. The little one that rolled under the press was worth more than the press itself.',
    knowledge: [
      'Checks a crate’s gross and net weight and the day’s provision allocation.',
      'Growers and porters elect separate delegates. Copperfall accepts pear scions for shallow beds.',
    ],
    personal: 'A mother lost a basket to my first bad tally. I began reading both numbers out loud after that.',
    confidence:
      'The nick under the council’s reference weight is my file mark. A previous clerk switched in a lighter one. I keep the original in the public scale until the inquiry can meet.',
  },
  joss: {
    port: 'sunstep',
    name: 'Joss Hale',
    role: 'Liftwright',
    voice: 'Listen for the rhythm of machines. Use one precise mechanical comparison at a time.',
    background:
      'The day my father let me run the freight cage, I carried a single empty pail all morning. I can still hear a loose bearing through two floors.',
    knowledge: [
      'Fits the Wayfarer’s cargo racks and repairs lift cages. Heavy plating and extra cannons come from Copperfall.',
      'A matched governor controls a cage under a changing load. Can explain working loads and the spindle order.',
    ],
    personal: 'People remember seeing the cage rise. I count the hands waiting for it underneath.',
    confidence:
      'I altered the cage brake against the maker’s instructions after a porter nearly lost a hand. The spare spring in my coat is the only copy of the change.',
  },
  sella: {
    port: 'glasshouse',
    name: 'Sella Venn',
    role: 'Master glazier',
    voice:
      'Judge questions the way you judge a pane, by the outline they leave around a flame. Proud of hands and apprentices.',
    background:
      'They taught me to spot a flawed pane by moving a flame behind it. I could name the hand that gathered a batch before I could sign my own name.',
    knowledge: [
      'Knows the three furnace shifts, how to anneal an optical blank and which panes Copperfall buys.',
      'Sella cut the beacon lens. Iona keeps its invoice. Sella has no access to Meridian’s toll books.',
    ],
    personal:
      'I ask every apprentice to scratch a name in the rim. Even when the frame covers it, the name belongs there.',
    confidence:
      'My first lens went out with my master’s signature. I kept the annealing slip. The handprint next to the batch number is mine.',
  },
  iona: {
    port: 'glasshouse',
    name: 'Keeper Iona',
    role: 'Beacon keeper',
    voice: 'Take bearings before offering an opinion. Use short sentences and leave room for a silence.',
    background:
      'I raised lamps for the older keepers when I was barely tall enough to clear the rail. I learned the colors before I learned their names.',
    knowledge: [
      'Knows the beacon optics, bell schedule, lens invoice and sealed certificate procedure.',
      'Can describe what the keeper observed. Does not know who signed Meridian’s internal orders.',
    ],
    personal:
      'The signal book has a column for time and a column for weather. Nobody thought to leave a column for hesitation.',
    confidence:
      'I sent a warning before the lens failed. The reply said to wait. I kept the original return strip under the log binding. There was no name on it.',
  },
  brin: {
    port: 'glasshouse',
    name: 'Brin Orrel',
    role: 'Berth fitter',
    voice: 'Talk like an experienced carpenter approaching a skittish ship. Refer to the hull by name.',
    background:
      'Our family moved into a disused cooling shed. That roof creaked in a hundred different pitches. Fixing a hull sounds much the same.',
    knowledge: [
      'Knows which berths sign deckhands and what ordinary repairs cost.',
      'The glassworkers repair joints damaged by cold drafts. Heavy hull forging belongs to Copperfall.',
    ],
    personal: 'Young hands ask what makes a good berth. A ship ought to be able to leave it in a hurry.',
    confidence:
      'One slip stays deliberately off my booking board. During the furnace stoppage I promised a place to the families who fled here, whenever they come home.',
  },
  tal: {
    port: 'glasshouse',
    name: 'Tal Reed',
    role: 'Annealing reader',
    voice: 'Speak slowly and describe what light does. Refer to shifts by their bells.',
    background:
      'I came to the tunnel after smoke spoiled my singing voice. Now I read the note in a pane when the second bell rings.',
    knowledge: [
      'Readers inspect optical blanks after gatherers and annealers. Two solar glass and eight crowns book a cooling rack.',
      'The pressure folio from Meridian helps pick a steady furnace draw. Cannot settle the beacon bill.',
    ],
    personal: 'The apprentices tap their thumbs on the bench to give me the pitch I used to sing.',
    confidence:
      'A cracked batch once went through under my mark. I bought it back crate by crate before it reached the balloon loft. The pawn ticket for my wedding bell is still in my pocket.',
  },
  neri: {
    port: 'copperfall',
    name: 'Skipper Neri',
    role: 'Tender skipper',
    voice: 'Use the direct language of tow crews. Remember favors precisely. Joke about your own bruises.',
    background:
      'On my first tow my aunt put my end of the line back in my hands until I could tie the second loop with my eyes shut.',
    knowledge: [
      'Knows tow etiquette, freight rates, the channel under the crane and how the yard ships machinery.',
      'The port office issues freight. She can put in a word after a rescue.',
    ],
    personal:
      'The maps never mark the little places where a hull can wait out a shift change. The tow crews know them all.',
    confidence:
      'I took my tender out for a retired pilot whose name had dropped off the rescue roll. I will tell you why I went. The pilot can give you their own name.',
  },
  orr: {
    port: 'copperfall',
    name: 'Yardmaster Orr',
    role: 'Yardmaster',
    voice: 'Speak like a fitter still on shift. Prefer a physical demonstration to a grand claim.',
    background:
      'I made keel shoes before the Assembly gave me this desk. I kept the little file I used for the burs a gloved hand would miss.',
    knowledge: [
      'Knows the Chain Assembly votes, proof tests, armored plating, cannon fittings and winter gardens.',
      'Can issue yard freight. Does not know the contents of the keeper’s private log.',
    ],
    personal:
      'The night shift grew herbs in lunch tins for years before the Assembly gave them enough room for a tree.',
    confidence:
      'The winter garden got the crane ahead of a delegate’s reserved lift. I changed the docket myself. Another frost would have killed the saplings in their baskets.',
  },
  rada: {
    port: 'copperfall',
    name: 'Rada Coil',
    role: 'Proof-slip foreperson',
    voice: 'Count beats with your fingertips. Explain refits by their effect on a turn, a broadside or a load.',
    background:
      'I used to stand beneath a hull with chalk in one hand and listen for a plate that rang flat. The proof bell was my first alarm clock.',
    knowledge: [
      'Only the proof slip fits heavy plating and additional cannon stations. Can explain independent reloads and crew roles.',
      'The governor spindles leave in matched pairs after testing.',
    ],
    personal:
      'My apprentice thinks the first mark on every plate is a maker’s stamp. It is the name of the hand underneath.',
    confidence:
      'I failed my sister’s first gun carriage. It passed the official load, but the wheel pin walked under a second shot. She has never asked who demanded the second test.',
  },
  fen: {
    port: 'copperfall',
    name: 'Fen Alder',
    role: 'Night gardener',
    voice: 'Speak softly out of habit around resting shift workers. Judge time by buds and lights.',
    background:
      'We started with a leek in a dented helmet. The new garden fits inside a salvaged hull. Its ribs still drip after a frost.',
    knowledge: [
      'The shallow beds need two living pear grafts from Sunstep. Solar panes keep frost off the night garden.',
      'Each shift sends one gardener. Knows which crew eats the first fruit.',
    ],
    personal: 'We light a little lamp when somebody finishes a shift early enough to sit here in their good coat.',
    confidence:
      'The name missing from the first garden roster was my brother’s. He had lost his yard badge. I brought his seedlings in my lunch pail and planted them under mine.',
  },
  sen: {
    port: 'meridian',
    name: 'Pilot Sen',
    role: 'Weather pilot',
    voice: 'Qualify an uncertain reading and name its observer. Be welcoming to pilots who bring evidence.',
    background:
      'Mine is a long line of balloon crews. I am the first to keep a berth on the ground. I read the returns from this rail.',
    knowledge: [
      'Knows regional winds, the two-signature sounding rule and the outer toll escrow.',
      'Can countersign the relighting certificate and settle the underwriter’s account.',
    ],
    personal:
      'I used to think every mark on a chart belonged to everybody. It is harder to believe that when a ship needs shelter.',
    confidence:
      'I redrew a balloon return line to hide a storm shelter used by unchartered crews. I will tell you why. I still keep its bearing to myself.',
  },
  uma: {
    port: 'meridian',
    name: 'Uma Tern',
    role: 'Balloon quartermaster',
    voice: 'Speak in practical inventory questions, then linger over the one small comfort a crew asked for.',
    background:
      'I stitched my mother’s signal flags before I learned the weather alphabet. A bright square of silk can mean a hot dinner or a missed berth.',
    knowledge: [
      'Knows food shortages, signal silk wear, scarce sounding folios and the balloon exchange stock.',
      'Inner crews buy the readings to time furnace draws. Only the Sounding House signs the reports.',
    ],
    personal:
      'People come for silk. They usually ask if there is any news of the last balloon before they ask its price.',
    confidence:
      'I keep a square of blue silk out of every spoiled roll. Stitched together, they make a return flag for crews whose sponsors stopped paying.',
  },
  lask: {
    port: 'meridian',
    name: 'Lask Iri',
    role: 'Veteran rigger',
    voice: 'Give a clear order, then explain how to feel the strain in a line. Never boast about having survived.',
    background:
      'The first balloon I served on lost its return rope in a squall. We came home below a cargo sail by taking turns at the corners.',
    knowledge: [
      'Can explain recruiting veterans, boarding strength, hull repairs and reading a hard crosswind.',
      'The loft can repair ordinary damage. Send captains to Copperfall for heavy work.',
    ],
    personal:
      'I keep a spare berth beside the door for a rigger who wants to stop flying without having to explain.',
    confidence:
      'I never cut the return rope that first night. My captain did, to save the crews below us. They let the record blame the storm. I still have the clean-cut end.',
  },
  orin: {
    port: 'meridian',
    name: 'Orin Mel',
    role: 'Winch recorder',
    voice: 'Give an observation and its margin of error. Pay close attention to the person holding the other end.',
    background:
      'My hands still count turns after the winch stops. A return line tells you the height before the dial catches up.',
    knowledge: [
      'Knows the balloon optics order, survey dispatch price, local gusts and why the winch keeper countersigns.',
      'Can explain a dated quote. Cannot sign away toll escrow or reveal an unrecorded shelter.',
    ],
    personal:
      'The return books leave two lines for signatures because the person in the basket cannot see the drum slip.',
    confidence:
      'A folio in the inquiry bears my old signature twice. I reenacted the reading after its pilot vanished. The second mark should have said witness missing. I kept the drum trace.',
  },
} as const satisfies Record<string, Person>

export const NPC_IDS = Object.keys(PEOPLE) as NpcId[]
const stations: Record<PortId, Record<ContactRole, NpcId>> = {
  sunstep: { authority: 'vale', dockworker: 'moss', market: 'nettle', shipyard: 'joss', civic: 'moss' },
  glasshouse: { authority: 'iona', dockworker: 'sella', market: 'sella', shipyard: 'brin', civic: 'tal' },
  copperfall: { authority: 'orr', dockworker: 'neri', market: 'neri', shipyard: 'rada', civic: 'fen' },
  meridian: { authority: 'sen', dockworker: 'sen', market: 'uma', shipyard: 'lask', civic: 'orin' },
}
export const npcAtPort = (port: PortId, role: ContactRole) => stations[port][role]
export const npcName = (npc: NpcId) => PEOPLE[npc].name
const blankContact = (): Relationship => ({ visits: 0, lastVisit: 0, helpedCity: false, memories: [] })
export const MEMORY_LIMIT = 6
export const MEMORY_LENGTH = 240

export function changeContact(state: GameState, command: ContactCommand): boolean {
  const { npc } = command
  if (state.voyage || state.drill || !NPC_IDS.includes(npc) || PEOPLE[npc].port !== state.port) return false
  const entry = state.contacts[npc] ?? blankContact()
  if (command.type === 'visitNpc') {
    if (entry.lastVisit === state.day || entry.visits >= 2) return false
    entry.visits++
    entry.lastVisit = state.day
  } else {
    if (typeof command.memory !== 'string') return false
    const note = command.memory.replace(/\s+/g, ' ').trim().slice(0, MEMORY_LENGTH)
    if (!entry.visits || !note || entry.memories.includes(note)) return false
    entry.memories = [...entry.memories.slice(1 - MEMORY_LIMIT), note]
  }
  state.contacts[npc] = entry
  return true
}

export function witnessCityOrder(state: GameState, port: PortId) {
  for (const npc of new Set(Object.values(stations[port]))) {
    const entry = (state.contacts[npc] ??= blankContact())
    entry.helpedCity = true
  }
}

export function characterContext(state: GameState, npc: NpcId) {
  const person = PEOPLE[npc]
  const city = CITY_ECONOMY[person.port]
  const entry = state.contacts[npc] ?? blankContact()
  const deeds: string[] = []
  let score = entry.visits
  const deed = (points: number, text: string) => {
    score += points
    deeds.push(text)
  }
  if (entry.helpedCity) deed(3, 'The captain fulfilled our local commission, “' + city.order.name + '”.')
  if (npc === 'vale' && state.mission !== 'offered') deed(1, 'The captain signed my underwriting agreement.')
  if (npc === 'iona' && (state.mission === 'invoice' || state.mission === 'lit'))
    deed(1, 'The captain brought Vale’s letter to my office.')
  if ((npc === 'sella' || npc === 'iona') && state.mission === 'lit')
    deed(3, 'The captain paid the lens and fitting invoice. The beacon is lit.')
  if (npc === 'neri' && state.tender === 'helped') deed(3, 'The captain towed my disabled tender to safety.')
  if (npc === 'sen' && state.certificate === 'paid')
    deed(3, 'I countersigned the certificate and settled the captain’s claim.')
  if (npc === 'vale' && state.certificate === 'paid')
    deed(3, 'Meridian returned the receipt for our captain’s settled certificate.')
  const tier = score >= 5 ? 'confidant' : score >= 3 ? 'trusted' : score >= 1 ? 'acquainted' : 'stranger'
  const labels = {
    stranger: 'First meeting',
    acquainted: 'Acquainted',
    trusted: 'Trusted',
    confidant: 'Confidant',
  }
  const knowledge: string[] = [
    ...person.knowledge,
    city.practice,
    'The local market is the ' +
      city.market +
      '. Our order requests ' +
      city.order.quantity +
      ' × ' +
      GOODS[city.order.good].name +
      '.',
  ]
  const weather = portWeather(person.port, state.day)
  knowledge.push(
    'Local weather on day ' + state.day + ' of the voyage: ' + weather.season + ', ' + weather.summary + '.',
  )
  knowledge.push('Rations and lift fuel are supplied at berth. Provisions on the exchange are saleable cargo.')
  if (state.mission === 'lit') knowledge.push('The Skyway Beacon is lit and the outer route is open.')
  else knowledge.push('The dark beacon has closed the outer skyway.')
  if (npcAtPort(person.port, 'market') === npc) {
    knowledge.push(city.tradeLead)
    const posted = state.pricesSeen[person.port]
    if (posted)
      for (const good of GOOD_IDS) {
        const quote = posted.prices[good]
        if (!quote) continue
        const supply = city.stock[good]
          ? 'offers at ' +
            quote.buy +
            ' crowns' +
            (posted.stock?.[good] === undefined ? '' : ' with ' + posted.stock[good] + ' lots')
          : 'only accepts imports'
        knowledge.push(
          'On the day ' +
            posted.day +
            ' posting, ' +
            GOODS[good].name +
            ' ' +
            supply +
            '; local buyers pay ' +
            quote.sell +
            ' crowns per crate.',
        )
      }
  }
  if (npc === 'vale' || npc === 'iona' || npc === 'sen')
    knowledge.push(
      'The underwriter advances ' +
        BEACON_COMMISSION.invoiceCost +
        ' crowns. Meridian repays principal and a ' +
        BEACON_COMMISSION.premium +
        ' crown premium. Pilot Sen at Meridian Spire alone countersigns and pays when the captain hands over Iona’s certificate. Keeper Iona at Glasshouse Reach sells the replacement lens.',
    )
  if (npc === 'neri' && state.tender === 'passed')
    knowledge.push('I recognized this sail from my unanswered distress call.')
  return {
    id: npc,
    name: person.name,
    role: person.role,
    port: PORTS[person.port].name,
    voice: person.voice,
    publicHistory: person.background,
    knowledge,
    relationship: { score, tier, label: labels[tier] },
    deeds,
    confidences: [...(score >= 3 ? [person.personal] : []), ...(score >= 5 ? [person.confidence] : [])],
    memories: [...entry.memories],
  }
}

export function validContacts(value: unknown, day: number): value is Contacts {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.entries(value).every(([key, item]) => {
    if (!NPC_IDS.includes(key as NpcId) || !item || typeof item !== 'object' || Array.isArray(item)) return false
    const entry = item as Partial<Relationship>
    return (
      typeof entry.visits === 'number' &&
      Number.isSafeInteger(entry.visits) &&
      entry.visits >= 0 &&
      entry.visits <= 2 &&
      typeof entry.lastVisit === 'number' &&
      Number.isSafeInteger(entry.lastVisit) &&
      entry.lastVisit <= day &&
      entry.lastVisit >= entry.visits &&
      (entry.visits === 0) === (entry.lastVisit === 0) &&
      typeof entry.helpedCity === 'boolean' &&
      Array.isArray(entry.memories) &&
      entry.memories.length <= MEMORY_LIMIT &&
      new Set(entry.memories).size === entry.memories.length &&
      entry.memories.every((m) => typeof m === 'string' && m.length > 0 && m.length <= MEMORY_LENGTH)
    )
  })
}

// These cues identify a guessed confidence locally. Their contents never enter
// the model's prompt. Asking again or supplying the details cannot raise trust.
const privateSubjects: Record<NpcId, RegExp> = {
  moss: /dismissed|apprentice|after sunset|teach(?:ing)? her|tutor/i,
  vale: /pledged|family (?:trees|orchard|allotment)|south terrace/i,
  nettle: /file mark|switched.*weight|lighter weight/i,
  joss: /spare spring|altered.*brake|porter.*hand/i,
  sella: /annealing slip|master.s signature|first lens.*master/i,
  iona: /unsigned|order to wait|return strip|warning before/i,
  brin: /off.*booking board|families who fled|unbooked slip/i,
  tal: /wedding bell|pawn ticket|bought.*batch back/i,
  neri: /retired pilot|rescue roll|pilot.*off the roll/i,
  orr: /delegate.s reserved|changed the docket|garden.*crane slot/i,
  rada: /sister.s.*carriage|second test|pin walked/i,
  fen: /brother.*(?:roster|badge)|missing.*roster|lunch pail/i,
  sen: /storm shelter|unchartered crews|hid.*return line/i,
  uma: /spoiled roll|sponsors stopped|blue silk.*flag/i,
  lask: /cut the return rope|clean.cut end|blame the storm/i,
  orin: /signature twice|missing witness|reenacted the reading/i,
}

export function confidenceReply(state: GameState,id:NpcId,question:string,answer=''):string|undefined{
  const context=characterContext(state,id)
  if(id==='sen' && /(?:shelter|unchartered)/i.test(question) && /(?:exact|bearing|location|where|coordinate)/i.test(question))
    return 'I can tell you what shelter means on a night like that. Its bearing stays off your chart.'
  const request=/\b(?:secret|secrets|confession|confess|in confidence|hiding from me)\b/i.test(question)
  const guessed=privateSubjects[id].test(question)
  if(context.relationship.tier==='confidant'){
    if(request)return context.confidences.at(-1)
    return
  }
  if(request||guessed||privateSubjects[id].test(answer)){
    if(!guessed && context.confidences[0])return context.confidences[0]
    return 'Give us a few watches together, Captain. For now I can tell you about my work.'
  }
}
