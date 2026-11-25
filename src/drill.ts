import type { Point, Side } from './battle-model'

export const DRILL_STAGES = ['briefing', 'dodge', 'fire', 'board', 'melee', 'debrief'] as const
export type DrillStage = (typeof DRILL_STAGES)[number]

export function nextStage(stage: DrillStage): DrillStage | undefined {
  return DRILL_STAGES[DRILL_STAGES.indexOf(stage) + 1]
}

export const GUN_POSITIONS: { side: Side; station: number; key: number }[] = [
  { side: 'port', station: 0, key: 1 },
  { side: 'starboard', station: 0, key: 3 },
  { side: 'port', station: 1, key: 2 },
  { side: 'starboard', station: 1, key: 4 },
]

export function gunKey(gun: { side: Side; station: number }): number {
  return (gun.side === 'port' ? 1 : 3) + gun.station
}

export interface ChalkRun {
  origin: Point
  aim: Point
  direction: Point
  traveled: number
  length: number
  cue: number
}

export function chalkRun(origin: Point, target: Point): ChalkRun {
  const aim = { ...target }
  const length = Math.max(1, Math.hypot(aim.x - origin.x, aim.y - origin.y))
  return {
    origin: { ...origin },
    aim,
    length,
    direction: { x: (aim.x - origin.x) / length, y: (aim.y - origin.y) / length },
    traveled: 0,
    cue: 1.6,
  }
}

export function chalkPoint(run: ChalkRun): Point {
  return { x: run.origin.x + run.direction.x * run.traveled, y: run.origin.y + run.direction.y * run.traveled }
}

// Measure lateral travel against the locked line when the practice round passes the hull.
export function evadedRound(run: ChalkRun, ship: Point): boolean {
  const dx = ship.x - run.origin.x,
    dy = ship.y - run.origin.y
  const ahead = dx * run.direction.x + dy * run.direction.y
  const abeam = Math.abs(dx * run.direction.y - dy * run.direction.x)
  return run.traveled > ahead + 40 && abeam >= 35
}

export const COACH: Record<DrillStage, { chapter: string; title: string; text: string }> = {
  briefing: {
    chapter: 'Harbor Watch',
    title: 'Take the helm',
    text: 'The cream sails are yours. The red cutter is flying the watch pennant for a chalk-round exercise. Your cargo, coins and hull are safe. Move, fire once, then bring a boarding party alongside.',
  },
  dodge: {
    chapter: '01 / 03 · Helm',
    title: 'Leave the red firing lane',
    text: 'The dashed line shows where the cutter has aimed. Press W to sail forward, or order a course to the green buoy. Your wake shows where you’ve been.',
  },
  fire: {
    chapter: '02 / 03 · Gunnery',
    title: 'Bring your port cannon to bear',
    text: 'Round clear. Your cannon fires from the left rail. Turn with A / D or use the helm order below. When the fan turns gold, click the cutter or press 1. Watch the reload strip under the gun.',
  },
  board: {
    chapter: '03 / 03 · Boarding',
    title: 'Bring the hulls together',
    text: 'Shot landed. Order a boarding run with B, or steer into the cutter yourself. The grapples catch when the hulls touch.',
  },
  melee: {
    chapter: '03 / 03 · Boarding',
    title: 'Your crew takes the deck',
    text: 'Watch your deckhands cross the lines. They fight on their own. More hands and veteran fighters improve your odds, especially against a damaged enemy.',
  },
  debrief: {
    chapter: 'Watch exercise complete',
    title: 'Cleared for the skyway',
    text: 'The watch recalls its boarding party. In a real encounter you can also break away at the edge of the engagement. The shipyard can fit more guns for a broadside.',
  },
}
