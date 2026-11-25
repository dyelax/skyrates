import { GOOD_IDS, PORT_IDS, type GoodId, type PortId } from './data'
import { legacyPirateSeed, RAIDER_PROFILES, type RaiderProfile } from './raiders'
import type { GameState } from './model'

export const COMMAND_TRAINING = { hire: 90, exam: 44, passages: 2, termsLevel: 2 } as const
export type Preparation = 'hire' | 'train' | 'terms'
export type Commander = 'hired' | 'mate' | 'skipper'
export interface PrizeManifest { good: GoodId; quantity: number }
export interface PrizeTerms { hull: number; offer: 'unasked' | 'refused' | 'accepted' }
export interface RegisteredPrize {
  id: number
  port: PortId
  class: RaiderProfile['id']
  hull: number
  commander: Commander
  cargo: PrizeManifest
}
export interface CommandRegister {
  hired: boolean
  mateTrained: boolean
  mateSincePassage: number
  terms: boolean
  prizes: RegisteredPrize[]
}

export type PrizeCommand =
  | { type: 'prepareCommand'; course: Preparation }
  | { type: 'offerCommand'; id: number }
  | { type: 'commissionPrize'; id: number; commander: Commander }
  | { type: 'releasePrize'; id: number; crates: number }
  | { type: 'unloadPrize'; id: number; remaining: number }

export function newRegister(): CommandRegister {
  return { hired: false, mateTrained: false, mateSincePassage: 0, terms: false, prizes: [] }
}

export function officerOffer(state: GameState, course: Preparation) {
  const register = state.command
  switch (course) {
    case 'hire': return {
      title:'Hire a spare captain', cost:COMMAND_TRAINING.hire, port:'copperfall' as const,
      detail:register.hired ? 'A spare captain is already aboard.' : 'A licensed captain sails with you until you give them command of a prize.',
      eligible:!register.hired,
    }
    case 'train': {
      const remaining = Math.max(0, COMMAND_TRAINING.passages - (state.voyageCount - register.mateSincePassage))
      return { title:'Qualify the first mate', cost:COMMAND_TRAINING.exam, port:'copperfall' as const,
        detail:register.mateTrained ? 'Your first mate is qualified to take command.' :
          remaining ? `The acting mate needs ${remaining} more completed passage${remaining === 1 ? '' : 's'} before the command examination.` :
          'The acting mate has stood the required watches. The command examination qualifies them for promotion aboard a prize.',
        eligible:!register.mateTrained && remaining === 0 }
    }
    case 'terms': return { title:'Learn articles of surrender', cost:0, port:'meridian' as const,
      detail:register.terms ? 'You can offer a surrendered skipper command of their own ship.' :
        `At level ${COMMAND_TRAINING.termsLevel}, the pilots teach captains to offer surrendered skippers a place under their colors.`,
      eligible:!register.terms && state.level >= COMMAND_TRAINING.termsLevel }
  }
}

export function commandReadiness(state: GameState): string {
  const options = []
  if (state.command.hired) options.push('your spare captain')
  if (state.command.mateTrained) options.push('your qualified first mate')
  const officers = options.length ? 'Available to take command: ' + options.join(' or ') + '.' :
    'You have no spare captain or qualified first mate. Copperfall’s proof slip hires captains and examines mates.'
  return officers + (state.command.terms ? ' You can also make one offer to the opposing skipper.' :
    ' Meridian teaches articles of surrender at level 2.')
}

export function prizeManifest(state: GameState, opponent: RaiderProfile['id'], id: number): PrizeManifest {
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
export function validPrizeTerms(v:unknown, profile:RaiderProfile | undefined): v is PrizeTerms {
  return !!profile && object(v) && typeof v.hull === 'number' && Number.isFinite(v.hull) && v.hull > 0 &&
    v.hull <= profile.hull && ['unasked','accepted','refused'].includes(String(v.offer))
}

export function validRegister(v:unknown, voyages:number): v is CommandRegister {
  if (!object(v) || ![v.hired,v.mateTrained,v.terms].every(x => typeof x === 'boolean') || !integer(v.mateSincePassage) ||
    v.mateSincePassage > voyages || !Array.isArray(v.prizes)) return false
  const ids = new Set<number>()
  return v.prizes.every(p => {
    if (!object(p) || !integer(p.id) || p.id < 1 || p.id > voyages || ids.has(p.id) ||
      !PORT_IDS.includes(p.port as PortId) || !Object.hasOwn(COMMANDER_NAMES,String(p.commander)) || !object(p.cargo) ||
      !GOOD_IDS.includes(p.cargo.good as GoodId) || !integer(p.cargo.quantity) || p.cargo.quantity > 10) return false
    const profile = RAIDER_PROFILES.find(foe => foe.id === p.class)
    ids.add(p.id)
    return !!profile && typeof p.hull === 'number' && Number.isFinite(p.hull) && p.hull > 0 && p.hull <= profile.hull
  })
}
