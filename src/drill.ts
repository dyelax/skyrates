import type { Point, Side } from './battle-model'

export const DRILL_STAGES = ['briefing', 'dodge', 'fire', 'board', 'melee', 'return', 'debrief'] as const
export type DrillStage = (typeof DRILL_STAGES)[number]

export function nextStage(stage: DrillStage): DrillStage | undefined {
  return DRILL_STAGES[DRILL_STAGES.indexOf(stage) + 1]
}

// The original bow, aft and amidships mounts keep their station IDs in old saves.
const STATION_OFFSET = [11, -12, 0, 28, -28, 19, -20, 35, -35, 6, -6, 24, -24, 15, -16, 31, -31, 3, -3, 8.5, -9, 21.5, -22, 33]
export const FITTED_CANNONS = [1, 2, 3, 4, 5, 6, 10, 16, 24, 36, 48] as const
export const GUN_POSITIONS: { side: Side; station: number }[] = STATION_OFFSET.flatMap((_, station) => [
  { side: 'port', station }, { side: 'starboard', station },
])

export function stationOffset(station: number): number {
  return STATION_OFFSET[station]
}

export function nextCannonFit(cannons: number, rating: number): number {
  // Older captains could own four guns before paying for any gunnery refits.
  // Keep those installations and their original one-at-a-time refit path.
  const nextRating = Math.min(FITTED_CANNONS.length - 1, rating + 1)
  if (rating < 5) return Math.max(cannons, Math.min(6, cannons + 1), FITTED_CANNONS[nextRating])
  return Math.max(cannons, FITTED_CANNONS[nextRating])
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
    title: 'Dodge the chalk round',
    text: 'Watch for the flash at the cutter’s port gun. Press W or steer to the green buoy before the chalk round reaches you.',
  },
  fire: {
    chapter: '02 / 03 · Gunnery',
    title: 'Bring your port cannon to bear',
    text: 'Your cannon fires straight out from the left rail. Turn with A / D, tap open sky, or choose Line up port gun. When the cutter is abeam and the Port button brightens, press Q or tap Port to fire. On a larger ship, that order fires every loaded gun on the rail.',
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
