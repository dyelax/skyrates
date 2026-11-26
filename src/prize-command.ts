import { MERCHANT_SHIPS, type MerchantClass } from './merchant-ships'
import { ABILITIES, GOOD_IDS, PORT_IDS, type AbilityId, type GoodId, type PortId } from './data'
import { legacyPirateSeed, RAIDER_PROFILES, type RaiderProfile } from './raiders'
import type { GameState } from './model'

export const COMMAND_TRAINING = { hire: 90, coaching: 18, roleXP: 2 } as const
export type Preparation = 'hire' | 'coach' | 'appoint' | 'standDown'
export const CAPTAIN_XP_PER_LEVEL = 100
export const CAPTAIN_PERKS = {
  ...ABILITIES,
  readRoom: { name: 'Read the Room', description: 'Hear which raider is on the lane before you set sail, what its skipper values and how likely they are to sign articles.' },
  articles: { name: 'Articles of Surrender', description: 'Offer a surrendered skipper command of their own ship under your colors, once per skipper.' },
} as const
export type CaptainPerk = keyof typeof CAPTAIN_PERKS
export const NEGOTIATION = ['broker', 'readRoom', 'articles'] as const
export const LAST_CAPTAIN_LEVEL = 1 + Object.keys(CAPTAIN_PERKS).length

export const CREW_PROFILES = {
  wren: { name:'Wren Pell', trait:'A steady watchkeeper.', command:2 },
  kit: { name:'Kit Venn', trait:'A quick-eyed navigator.', command:1 },
} as const
export type SailorId = keyof typeof CREW_PROFILES
export const WAYFARER_BERTHS = { deckhand:2, mate:1 } as const
export interface ServingHand {
  id: SailorId
  role: 'deckhand' | 'mate' | 'captain'
  deckXP: number
  mateXP: number
  coached: boolean
}

export type Commander = 'hired' | 'mate' | 'skipper'
export interface PrizeManifest { good: GoodId; quantity: number }
export interface PrizeTerms { hull: number; offer: 'unasked' | 'refused' | 'accepted' }
export interface RegisteredPrize {
  id: number
  port: PortId
  class: RaiderProfile['id'] | MerchantClass
  hull: number
  commander: Commander
  captain?: ServingHand
  cargo: PrizeManifest
}
export interface CommandRegister {
  hired: boolean
  aboard: ServingHand[]
  perks: CaptainPerk[]
  prizes: RegisteredPrize[]
}

export type PrizeCommand =
  | { type: 'prepareCommand'; course: Preparation; sailor?: SailorId }
  | { type: 'offerCommand'; id: number }
  | { type: 'commissionPrize'; id: number; commander: Commander }
  | { type: 'releasePrize'; id: number; crates: number }
  | { type: 'unloadPrize'; id: number; remaining: number }

export function newRegister(): CommandRegister {
  const aboard = (Object.keys(CREW_PROFILES) as SailorId[]).map(id =>
    ({id, role:'deckhand' as const, deckXP:0, mateXP:0, coached:false}))
  return { hired: false, aboard, perks: [], prizes: [] }
}

export function hasCaptainPerk(state: GameState, perk: CaptainPerk) {
  return state.ability === perk || state.command.perks.includes(perk)
}

export function captainPoints(state: GameState) {
  return state.level - 1 - Number(state.ability !== null) - state.command.perks.length
}

export function canLearnPerk(state: GameState, perk: CaptainPerk) {
  if (!Object.hasOwn(CAPTAIN_PERKS, perk) || captainPoints(state) <= 0 || hasCaptainPerk(state, perk)) return false
  if (perk === 'readRoom') return hasCaptainPerk(state, 'broker')
  if (perk === 'articles') return hasCaptainPerk(state, 'readRoom')
  return true
}

export function handLevel(hand: ServingHand) {
  return 1 + Number(hand.deckXP >= COMMAND_TRAINING.roleXP) + Number(hand.mateXP >= COMMAND_TRAINING.roleXP)
}

export function qualifiedMate(state: GameState) {
  return state.command.aboard.find(hand => hand.role === 'mate' && handLevel(hand) >= 3)
}

export function creditMission(state: GameState) {
  for (const hand of state.command.aboard) {
    const before = handLevel(hand)
    const xp = hand.coached ? 2 : 1
    hand.coached = false
    if (hand.role === 'deckhand') hand.deckXP += xp
    else hand.mateXP += xp
    const level = handLevel(hand)
    if (level > before) {
      const name = CREW_PROFILES[hand.id].name
      state.pendingNotices.push(level === 2
        ? `${name} reached level 2 and can serve as first mate. Appoint an eligible sailor at Copperfall’s command desk.`
        : `${name} reached level 3 as first mate and can command a surrendered ship.`)
    }
  }
}

export function handRecord(hand: ServingHand) {
  const level = handLevel(hand)
  const person = CREW_PROFILES[hand.id]
  const role = { deckhand: 'Deckhand', mate: 'First mate', captain: 'Prize captain' }[hand.role]
  const step = hand.role === 'captain' ? 'Qualifications: Watch leader and Independent command.' : hand.role === 'mate'
    ? level === 3 ? 'Qualified for independent command.' : `First-mate service: ${hand.mateXP}/${COMMAND_TRAINING.roleXP} XP toward independent command.`
    : level >= 2 ? 'Watch leader. Eligible for the first-mate berth at Copperfall.' :
      `Deck service: ${hand.deckXP}/${COMMAND_TRAINING.roleXP} XP toward watch leader.`
  return `${person.name} · ${role} · Level ${level}. ${person.trait} Command ${person.command + level-1}. ${step}`
}

export function officerOffer(state: GameState, course: Preparation, sailor?: SailorId) {
  const { aboard, hired } = state.command
  const hand = aboard.find(member => member.id === sailor)
  const name = hand ? CREW_PROFILES[hand.id].name : 'sailor'
  switch (course) {
    case 'hire': return {
      title:'Hire a spare captain', cost:COMMAND_TRAINING.hire,
      detail:hired ? 'A spare captain is already aboard.' : 'A licensed captain sails with you until you assign a prize.',
      eligible:!hired && sailor === undefined,
    }
    case 'appoint': return {
      title:`Appoint ${name} first mate`, cost:0,
      detail:'A level-2 deckhand can take the Wayfarer’s first-mate berth. Earn 2 service XP in that berth to qualify for independent command.',
      eligible:!!hand && hand.role === 'deckhand' && handLevel(hand) >= 2 &&
        aboard.filter(other => other.role === 'mate').length < WAYFARER_BERTHS.mate,
    }
    case 'standDown': return {
      title:`Return ${name} to deck duty`, cost:0,
      detail:'Free the first-mate berth. This sailor keeps all service, stats and qualifications.',
      eligible:!!hand && hand.role === 'mate' && aboard.filter(other => other.role === 'deckhand').length < WAYFARER_BERTHS.deckhand,
    }
    case 'coach': return {
      title:`Coach ${name} for the next job`, cost:COMMAND_TRAINING.coaching,
      detail:hand?.coached ? 'Coaching booked. The next completed job earns this sailor 2 service XP.' :
        'Every assigned hand earns 1 service XP per completed freight run, buyer order, civic order, rescue or beacon commission. Coaching doubles this sailor’s next award.',
      eligible:!!hand && !hand.coached && (hand.role === 'deckhand' ? handLevel(hand) === 1 : handLevel(hand) === 2),
    }
  }
}

export function commandReadiness(state: GameState): string {
  const options = []
  if (state.command.hired) options.push('your spare captain')
  const mate = qualifiedMate(state)
  if (mate) options.push('First Mate ' + CREW_PROFILES[mate.id].name)
  const readiness = options.length ? 'Available to take command: ' + options.join(' or ') + '.' :
    'You have no qualified officer free. Copperfall hires spare captains and appoints experienced deckhands as first mate.'
  const rank = NEGOTIATION.filter(perk => hasCaptainPerk(state, perk)).length
  return readiness + (rank === 3 ? ' Articles of Surrender allows one offer to the opposing skipper.' :
    ` Charisma · Negotiation ${rank}/3. Learn the three perks in your captain’s log to recruit a skipper.`)
}

export function prizeManifest(state: Pick<GameState,'pirateSeed'>, opponent: RaiderProfile['id'], id: number): PrizeManifest {
  const stock: GoodId[] = ['provisions', 'glass', 'machinery']
  const index = legacyPirateSeed(`manifest/${state.pirateSeed}/${id}`) % stock.length
  return { good:stock[index], quantity:{scout:6,cutter:8,corsair:10}[opponent] }
}

// Each skipper's point of view is fixed for the encounter. Fame is public,
// while a skipper makes this decision from the particular deed they value.
export function skipperTerms(state: GameState, id: number) {
  const rescuer = legacyPirateSeed(`skipper/${state.pirateSeed}/${id}`) % 2 === 0
  const fen = state.buyers.orders.find(order => order.id === 'fen-first-panes')
  const alignment = rescuer
    ? state.tender === 'helped' ? 1 : state.tender === 'passed' ? -1 : 0
    : state.garden || fen?.status === 'filled' ? 1 : fen?.status === 'released' || fen?.status === 'expired' ? -1 : 0
  const evidence = rescuer
    ? alignment > 0 ? 'Word of your tow reached this crew.' : alignment < 0 ? 'They heard you passed Neri’s distress call.' : 'They have heard no account of your answer to a distress call.'
    : alignment > 0 ? 'They know you delivered Fen’s window glass.' : alignment < 0 ? 'They heard how Fen’s signed order went unfilled.' : 'They have heard no report of you keeping or breaking Fen’s agreement.'
  return { motive:rescuer ? 'This skipper stands by crews in distress.' : 'This skipper values a captain who keeps commercial promises.',
    evidence, chance:0.5 + 0.35 * alignment }
}

export function acceptsCommand(state: GameState, id: number): boolean {
  const draw = legacyPirateSeed(`offer/${state.pirateSeed}/${id}`) / 0x100000000
  return draw < skipperTerms(state,id).chance
}

export const COMMANDER_NAMES: Record<Commander,string> = {
  hired:'Hired captain', mate:'Promoted first mate', skipper:'Former enemy skipper',
}

function object(v:unknown):v is Record<string,unknown> { return v !== null && typeof v === 'object' && !Array.isArray(v) }
const integer = (v:unknown):v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
export const prizeProfile = (kind:string) => RAIDER_PROFILES.find(foe=>foe.id===kind) ?? Object.values(MERCHANT_SHIPS).find(merchant=>merchant.id===kind)
export function validPrizeTerms(v:unknown, profile:{hull:number} | undefined): v is PrizeTerms {
  return !!profile && object(v) && typeof v.hull === 'number' && Number.isFinite(v.hull) && v.hull > 0 &&
    v.hull <= profile.hull && ['unasked','accepted','refused'].includes(String(v.offer))
}

export function validRegister(v:unknown, voyages:number, primary:AbilityId | null, level:number): v is CommandRegister {
  if (!object(v) || typeof v.hired !== 'boolean' || !Array.isArray(v.aboard) || !Array.isArray(v.perks) || !Array.isArray(v.prizes)) return false
  const seen = new Set<string>()
  function checkSailor(hand:unknown, captain:boolean) {
    if (!object(hand) || typeof hand.id !== 'string' || !Object.hasOwn(CREW_PROFILES,hand.id) || seen.has(hand.id) ||
        !integer(hand.deckXP) || !integer(hand.mateXP) || typeof hand.coached !== 'boolean' ||
        (captain ? hand.role !== 'captain' : hand.role !== 'deckhand' && hand.role !== 'mate') ||
        ((hand.mateXP > 0 || hand.role !== 'deckhand') && hand.deckXP < COMMAND_TRAINING.roleXP) ||
        (captain && (hand.mateXP < COMMAND_TRAINING.roleXP || hand.coached))) return false
    seen.add(hand.id)
    return true
  }
  if (!v.aboard.every(hand => checkSailor(hand,false)) ||
    v.aboard.filter(hand => hand.role === 'mate').length > WAYFARER_BERTHS.mate ||
    v.aboard.filter(hand => hand.role === 'deckhand').length > WAYFARER_BERTHS.deckhand) return false
  const learned = new Set<CaptainPerk>()
  if (primary) learned.add(primary)
  if (v.perks.length && !primary) return false
  for (const perk of v.perks) {
    if (!Object.hasOwn(CAPTAIN_PERKS, perk) || learned.has(perk) ||
      (perk === 'readRoom' && !learned.has('broker')) || (perk === 'articles' && !learned.has('readRoom'))) return false
    learned.add(perk)
  }
  if (learned.size > level - 1) return false
  const ids = new Set<number>()
  const validPrizes = v.prizes.every(p => {
    if (!object(p) || !integer(p.id) || p.id < 1 || p.id > voyages || ids.has(p.id) ||
      !PORT_IDS.includes(p.port as PortId) || !Object.hasOwn(COMMANDER_NAMES,String(p.commander)) || !object(p.cargo) ||
      !GOOD_IDS.includes(p.cargo.good as GoodId) || !integer(p.cargo.quantity) || p.cargo.quantity > 10) return false
    if (p.commander === 'mate' ? !checkSailor(p.captain,true) : p.captain !== undefined) return false
    const profile = prizeProfile(String(p.class))
    ids.add(p.id)
    return !!profile && typeof p.hull === 'number' && Number.isFinite(p.hull) && p.hull > 0 && p.hull <= profile.hull
  })
  return validPrizes && seen.size === Object.keys(CREW_PROFILES).length
}
