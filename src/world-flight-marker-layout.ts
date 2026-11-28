type Point = { x: number; y: number }

/** Pin a bearing along the ray from the viewport center. The inside and edge
 * solutions share the same boundary, so a bearing follows a continuous path. */
export function bearingPosition(
  point: Point,
  width: number,
  height: number,
  underway: boolean,
  chipWidth: number,
) {
  const cx = width / 2,
    cy = height / 2
  const dx = point.x - cx,
    dy = point.y - cy
  const marginX = Math.max(12 + chipWidth / 2, width < 550 ? 30 : 50),
    marginY = underway ? 92 : 66
  const factor = Math.max(
    0,
    Math.min(1, (cx - marginX) / Math.max(0.001, Math.abs(dx)), (cy - marginY) / Math.max(0.001, Math.abs(dy))),
  )
  return { x: cx + dx * factor, y: cy + dy * factor, edge: factor < 1 }
}

/** Split overlapping hull labels progressively, including when ships cross. */
export function combatLabelPosition(player: Point, opponent: Point, enemy: boolean): Point {
  const gap = Math.hypot(player.x - opponent.x, player.y - opponent.y)
  const t = Math.max(0, Math.min(1, (155 - gap) / 95))
  const blend = t * t * (3 - 2 * t)
  return enemy
    ? { x: opponent.x + 30 * blend, y: opponent.y - 36 }
    : { x: player.x - 28 * blend, y: player.y - 36 + 67 * blend }
}
