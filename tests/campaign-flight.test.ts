import test from 'node:test'
import assert from 'node:assert/strict'
import {
  act, checkpointFlight, encounterId, initialState, loadGame, raiderToll, worldAtBerth,
  worldCombatLoad, type GameState, type PortId,
} from '../src/model'
import { WORLD_PORTS, WORLD_TOWNS, WORLD_STEP, nearbyDock, nearbyHail, type WorldFlight } from '../src/world-flight'
import { fireWorldRail, stepCampaignSky } from '../src/world-combat'

const reload = (s:GameState) => loadGame({getItem:()=>JSON.stringify(s)})
function depart(voyageCount=2) {
  const s=initialState(7)
  s.voyageCount=voyageCount
  s.tender='passed'
  return act(s,{type:'sail',to:'glasshouse'})
}
function fly(s:GameState, place:{x:number;y:number},params:Partial<WorldFlight>={}) {
  const leg=s.voyage!,sky=structuredClone(leg.flight!)
  sky.elapsed += WORLD_STEP
  Object.assign(sky,params)
  Object.assign(sky.player,place,{vx:0,vy:0,throttle:0})
  return checkpointFlight(s,leg.id,sky)
}
function atId(s:GameState,id:string) {
  const leg=s.voyage!,actor=leg.flight!.traffic.find(a=>a.id===id)!
  return fly(s,actor.ship,{departed:true,cooldown:0})
}
function demand() {
  const s=depart(),leg=s.voyage!,id=leg.flight!.contactId!
  return act(atId(s,id),{type:'hailFlight',id:leg.id,contact:id,manual:true})
}
test('the actual berth settles the clock and mail once; setting a waypoint or being in flight does neither',()=>{
  const s=act(initialState(17),{type:'takeFreight'})
  const sail=act(s,{type:'castOff'}),atHome=WORLD_PORTS.sunstep
  assert.deepEqual([sail.voyage!.flight!.player.x,sail.voyage!.flight!.player.y],[atHome.x,atHome.y])
  assert.equal(sail.voyage!.waypoint,null)
  const started=act(sail,{type:'endDrill',skip:true}),id=started.voyage!.id
  assert.equal(started.day,s.day)
  assert.equal(act(started,{type:'dockFlight',id,port:'glasshouse'}),started)
  assert.equal(act(started,{type:'setWaypoint',id,port:'meridian'}),started)
  const diverted=act(started,{type:'setWaypoint',id,port:'copperfall'})
  assert.deepEqual(diverted.voyage!.flight,started.voyage!.flight)
  const atGlass=fly(diverted,WORLD_TOWNS.glasshouse.sites[2].berth,{departed:true})
  const docked=act(reload(atGlass),{type:'dockFlight',id,port:'glasshouse'})
  assert.equal(docked.port,'glasshouse'); assert.equal(docked.day,2)
  assert.equal(docked.coins,s.coins+s.freight!.pay); assert.equal(docked.freight,null)
  assert.equal(worldAtBerth(docked).player.throttle,0)
  assert.equal(act(docked,{type:'dockFlight',id,port:'glasshouse'}),docked)
})
test('diverting to origin or a different unlocked harbor keeps physical flight and allows a longer day count',()=>{
  let s=depart(),leg=s.voyage!,id=leg.id
  const start=structuredClone(leg.flight!)
  assert.equal(act(s,{type:'dockFlight',id,port:'sunstep'}),s)
  s=act(s,{type:'setWaypoint',id,port:'sunstep'})
  assert.deepEqual(reload(s).voyage!.flight,start)
  s=fly(s,WORLD_PORTS.sunstep,{departed:true,distance:28000})
  assert.equal(nearbyDock(s.voyage!.flight!),'sunstep')
  const landed=act(s,{type:'dockFlight',id,port:'sunstep'})
  assert.equal(landed.port,'sunstep');assert.equal(landed.day,4)
})
test('a paid ship stays spent over a reload and another ship retains its own chance to hail',()=>{
  let s=demand()
  const leg=s.voyage!, id=encounterId(leg), actor=leg.hailed!, cost=raiderToll(s).crowns
  const before=structuredClone(leg.flight!.player), purse=s.coins
  s=act(s,{type:'payToll',id,payment:'crowns'})
  assert.equal(s.coins,purse-cost)
  assert.equal(s.voyage!.phase,'underway')
  assert.deepEqual(s.voyage!.flight!.player,before)
  assert.ok(s.voyage!.flight!.spentIds.includes(actor))
  s=reload(s)
  assert.equal(act(s,{type:'payToll',id,payment:'crowns'}),s)
  const others=s.voyage!.flight!.traffic.filter(a=>a.id!==actor && a.kind==='merchant')
  assert.ok(others.length)
  s=atId(s,others[0].id)
  assert.equal(nearbyHail(s.voyage!.flight!,true)!.id,others[0].id)
  const hail=act(s,{type:'hailFlight',id:leg.id,contact:others[0].id,manual:true})
  assert.equal(hail.voyage!.phase,'merchant')
  assert.notEqual(encounterId(hail.voyage!),id)
})
test('declining starts a battle in absolute sky coordinates, preserving helm, velocities, gun queue and actor identity on reload',()=>{
  let s=demand()
  const p=structuredClone(s.voyage!.flight!.player)
  s=act(s,{type:'engage'})
  const leg=s.voyage!, sky=structuredClone(leg.flight!), b=structuredClone(leg.battle!)
  assert.equal(b.worldActor,leg.hailed)
  assert.deepEqual([b.player.x,b.player.y,b.player.heading],[p.x,p.y,p.heading])
  assert.equal(fireWorldRail(sky,b,'port',s.ship.guns),true)
  for(let i=0;i<8;i++)stepCampaignSky(sky,{helm:1,throttle:3},WORLD_STEP,b,s.ship.guns,worldCombatLoad(s))
  s=checkpointFlight(s,leg.id,sky,b)
  assert.notDeepEqual(s.voyage!.battle,leg.battle)
  assert.deepEqual(reload(s).voyage!.battle,b)
  assert.deepEqual(reload(s).voyage!.flight,sky)
})
test('a merchant remains peaceful unless attacked; the same neutral hull cannot yield a defense bounty',()=>{
  let s=depart(),leg=s.voyage!
  const id=leg.flight!.traffic.find(a=>a.kind==='merchant')!.id
  s=atId(s,id)
  const attack=act(s,{type:'attackMerchant',id:leg.id,contact:id})
  assert.equal(attack.voyage!.aggressor,'player')
  assert.equal(attack.voyage!.battle!.worldActor,id)
  const snap=structuredClone(attack.voyage!.battle!)
  snap.enemy.hull=0; snap.terminal='victory'
  const staged=checkpointFlight(attack,leg.id,attack.voyage!.flight!,snap)
  const won=act(staged,{type:'resolveBattle',id:encounterId(staged.voyage!),result:'enemyWreck',hull:snap.player.hull})
  assert.equal(won.coins,s.coins);assert.equal(won.xp,s.xp)
  assert.equal(won.voyage!.flight!.traffic.some(a=>a.id===id),false)
  assert.ok(won.voyage!.flight!.spentIds.includes(id))
})
test('an older paid-for voyage migrates into its physical hail without double-charging days or its saved terms',()=>{
  const state=initialState(8)
  state.day=4;state.voyageCount=3;state.tender='passed'
  state.voyage={id:3,from:'sunstep',to:'copperfall',phase:'raider'}
  const sailed=reload(state)
  assert.equal(sailed.voyage!.prepaidDays,2)
  assert.ok(sailed.voyage!.hailed); assert.ok(sailed.voyage!.flight!.departed)
  const terms=raiderToll(sailed)
  const paid=act(reload(sailed),{type:'payToll',id:3,payment:'crowns'})
  assert.equal(paid.coins,state.coins-terms.crowns)
  const at=fly(paid,WORLD_PORTS.copperfall)
  const docked=act(at,{type:'dockFlight',id:3,port:'copperfall'})
  assert.equal(docked.day,state.day);assert.equal(docked.port,'copperfall')
})

test('a demand carried astern automatically dismisses and does not block a later landing',()=>{
  let s=demand()
  const leg=s.voyage!,actor=leg.flight!.traffic.find(a=>a.id===leg.hailed)!
  const coins=s.coins,position=actor.ship
  s=fly(s,{x:position.x+700,y:position.y})
  assert.equal(s.voyage!.phase,'underway'); assert.equal(s.coins,coins)
  assert.ok(s.voyage!.flight!.spentIds.includes(actor.id))
  assert.equal(act(s,{type:'engage'}),s)
  const approach=fly(s,WORLD_PORTS.glasshouse,{departed:true})
  assert.equal(act(approach,{type:'dockFlight',id:leg.id,port:'glasshouse'}).port,'glasshouse')
})

test('a surrendered Glass Carrier remains that ship, with her own goods, even after commissioning and reload',()=>{
  let s=depart()
  s.command.hired=true
  s=atId(s,'lane-1')
  s=act(s,{type:'attackMerchant',id:s.voyage!.id,contact:'lane-1'})
  assert.equal(s.voyage!.pirate,undefined)
  let load=worldCombatLoad(s)!
  assert.deepEqual(load.manifest,{good:'glass',quantity:6})
  const snap=structuredClone(s.voyage!.battle!)
  assert.deepEqual([snap.enemy.maxHull,snap.enemy.guns.length,snap.enemyCrew],[74,2,5])
  snap.enemy.hull=24;snap.enemyCrew=0;snap.terminal='boarded'
  const staged=checkpointFlight(s,s.voyage!.id,s.voyage!.flight!,snap)
  const n=encounterId(staged.voyage!)
  const prize=reload(act(staged,{type:'resolveBattle',id:n,result:'surrendered',hull:snap.player.hull}))
  assert.equal(prize.voyage?.phase,'prize')
  assert.deepEqual(worldCombatLoad(prize)!.manifest,load.manifest)
  const accepted=reload(act(prize,{type:'commissionPrize',id:n,commander:'hired'}))
  assert.deepEqual(accepted.command.prizes[0],{id:n,port:'glasshouse',class:'glass-carrier',hull:24,commander:'hired',cargo:load.manifest})
  assert.equal(accepted.voyage!.flight!.traffic.some(actor=>actor.id==='lane-1'),false)
})
test('late-range live combat snapshots translate into world coordinates once while retaining per-rail damage, recoil and timers',()=>{
  let s=act(demand(),{type:'engage'})
  const leg=s.voyage!, old=structuredClone(leg.battle!)
  delete old.worldActor
  delete leg.flight;delete leg.hailed; delete leg.waypoint
  old.player.x=320;old.player.y=282;old.enemy.x=470;old.enemy.y=240
  old.enemy.hull=19;old.player.guns[0].cooldown=2.3;leg.battle=old
  const restored=reload(s),m=restored.voyage!.battle!
  assert.deepEqual([m.enemy.x-m.player.x,m.enemy.y-m.player.y,m.enemy.hull,m.player.guns[0].cooldown],[150,-42,19,2.3])
  assert.deepEqual(reload(restored),restored)
})
