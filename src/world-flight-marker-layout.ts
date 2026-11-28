export type MapBounds = { left: number; top: number; bottom: number }

type Point = { x: number; y: number }

/** Pin a bearing along the ray from the viewport center. The inside and edge
 * solutions share the same boundary, so a bearing follows a continuous path. */
export function bearingPosition(
  point: Point,
  width: number,
  height: number,
  underway: boolean,
  chipWidth: number,
  map?: MapBounds,
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
  const x = cx + dx * factor
  const onRay = cy + dy * factor
  if (!map) return { x, y: onRay, edge: factor < 1 }
  // Form a smooth shoulder alongside the navigator. The full chip has already
  // cleared its lower (or upper) rim before their horizontal footprints meet.
  const clearance = 22,
    chase = Math.min(96, width * 0.22)
  const t = Math.min(1, Math.max(0, (x + chipWidth / 2 + 6 - map.left + chase) / chase))
  const weight = t * t * (3 - 2 * t)
  const lower = map.top + map.bottom > height
  const limit = lower
    ? Math.min(onRay, height - marginY + (map.top - clearance - height + marginY) * weight)
    : Math.max(onRay, marginY + (map.bottom + clearance - marginY) * weight)
  return { x, y: limit, edge: factor < 1 || Math.abs(limit - onRay) > 0.01 }
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
