export const ESCORT_HULL = 40
export const ESCORT_LEGS = 2

export function escortStep(
  leg: 1 | 2,
  merchantHull: number,
  attackerCleared: boolean,
  merchantAtExit: boolean,
  captainEscaped: boolean,
): 'continue' | 'next' | 'delivered' | 'lost' | 'escaped' {
  if (merchantHull <= 0) return 'lost'
  if (captainEscaped) return 'escaped'
  if (!attackerCleared && !merchantAtExit) return 'continue'
  return leg === ESCORT_LEGS ? 'delivered' : 'next'
}
