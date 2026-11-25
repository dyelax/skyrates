import type { Point, Side } from './battle-model'

export const DRILL_STAGES = ['briefing', 'dodge', 'fire', 'board', 'melee', 'return', 'debrief'] as const
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
    text: 'You command the cream-sailed Wayfarer. The cutter marked WATCH · LARK will fire chalk rounds. Your cargo, coins and hull are safe. Dodge one round, fire your port gun, and feel what happens when the hulls meet.',
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
    chapter: '03 / 03 · Close action',
    title: 'Bring the hulls together',
    text: 'Turn your bow into the cutter’s rail. A square hit hurts their hull more than yours. A slow approach preserves the prize. Both crews start fighting the moment the hulls touch.',
  },
  melee: {
    chapter: '03 / 03 · Close action',
    title: 'Shear away from the cutter',
    text: 'The hull blow landed once. Watch both crew bars fall while the rails touch. Push off or steer clear and the crews stop fighting.',
  },
  return: {
    chapter: '03 / 03 · Close action',
    title: 'Come alongside for their surrender',
    text: 'The crew bars held at separation. Close gently and stay in contact until the Watch training party yields. Keep the hull afloat.',
  },
  debrief: {
    chapter: 'Watch exercise complete',
    title: 'Cleared for the skyway',
    text: 'Their crew yielded with the hull afloat. In a live encounter that leaves a prize to negotiate over. A wreck leaves no ship to command. Use Break away to leave a fight at the edge.',
  },
}
