import { PORT_IDS, type PortId } from './data'
import type { Point } from './battle-model'
import { prizeManifest, type PrizeManifest } from './prize-command'
import {
  collectCargo,
  fallingPoint,
  launchCargo,
  recovered,
  salvageReceipt,
  type SalvageArea,
  type SalvageLoad,
  type SalvageReceipt,
  type SalvageState,
} from './salvage'

export type TrialCargoId = 'first-raider' | 'wing-raider' | 'second-crossing'
export interface TrialCargoReceipt extends SalvageReceipt {
  sourceId: TrialCargoId
  name: string
}
interface WreckCargo {
  id: TrialCargoId
  name: string
  manifest: PrizeManifest
  state: SalvageState
}

export class TrialCargo {
  readonly fields: WreckCargo[] = []
  private readonly manifests: Record<TrialCargoId, PrizeManifest>
  constructor(
    private load: SalvageLoad,
    location: PortId,
  ) {
    const port = PORT_IDS.indexOf(location) + 1
    this.manifests = {
      'first-raider': load.manifest,
      'wing-raider': prizeManifest({ pirateSeed: 4817 }, 'cutter', 10 + port),
      'second-crossing': prizeManifest({ pirateSeed: 4817 }, 'corsair', 20 + port),
    }
  }

  drop(
    actor: { cargoId?: TrialCargoId; name: string; role: string; ship: Point & { hull: number } },
    player: Point,
    area: SalvageArea,
  ) {
    const id = actor.cargoId
    if (!id || actor.role !== 'hostile' || actor.ship.hull > 0 || this.fields.some((f) => f.id === id))
      return false
    const manifest = this.manifests[id]
    const state = launchCargo(id, manifest, player, actor.ship, area)
    if (this.count >= this.load.free) state.remaining = 0
    this.fields.push({ id, name: actor.name, manifest, state })
    return true
  }

  get count() {
    return this.fields.reduce((n, f) => n + recovered(f.state), 0)
  }
  get remaining() {
    return Math.max(0, ...this.fields.map((f) => f.state.remaining))
  }
  get receipts(): TrialCargoReceipt[] {
    return this.fields.map((f) => ({
      sourceId: f.id,
      name: f.name,
      ...salvageReceipt(f.manifest, recovered(f.state)),
    }))
  }

  advance(player: Point, wind: Point, area: SalvageArea, dt: number) {
    let room = this.load.free - this.count,
      picked = 0
    for (const { state, manifest } of this.fields) {
      const amount = collectCargo(state, { manifest, free: room + recovered(state) }, player, wind, area, dt)
      room -= amount
      picked += amount
    }
    if (room <= 0)
      this.fields.forEach((f) => {
        f.state.remaining = 0
      })
    return picked
  }

  nearest(player: Point, wind: Point, area: SalvageArea) {
    const targets = this.fields.flatMap(({ state }) =>
      state.remaining > 0
        ? state.crates.filter((c) => !c.taken).map((c) => fallingPoint(c, state.remaining, wind, area))
        : [],
    )
    const d = (p: Point) => Math.hypot(p.x - player.x, p.y - player.y)
    return targets.sort((a, b) => d(a) - d(b))[0]
  }
}
