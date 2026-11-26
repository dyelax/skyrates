import { flyToNextStop, settleThenFlyToPort } from './passage-fixture'
import assert from 'node:assert/strict'
import test from 'node:test'
import { act, CAMPAIGN_RESULTS, checkpointBattle, initialState, loadGame, prizeManifest, raiderToll, skipperTerms, canLearnPerk, captainPoints, hasCaptainPerk, qualifiedMate, handLevel, priceAt, type Preparation, type SailorId, type PortId, type GameState } from '../src/model'
import { buildOpponent, buildShip, fireBroadside, moveShip } from '../src/battle-model'
import type { BattleEnding, BattleSnapshot } from '../src/battle-state'

const reload = (state:unknown) => loadGame({getItem:() => JSON.stringify(state)})
function departure(seed=5): GameState {
  let s = initialState(seed)
  s = act(s,{type:'sail',to:'glasshouse'})
  s = act(s,{type:'endDrill',skip:true})
  s = flyToNextStop(s)
  s = act(s,{type:'sail',to:'copperfall'})
  s = flyToNextStop(s)
  s = settleThenFlyToPort(s,{type:'tender',help:true})
  return {...s,coins:200}
}
function toBattle(s:GameState) {
  let n = act(s,{type:'sail',to:s.port === 'sunstep' ? 'copperfall' : 'sunstep'})
  n = flyToNextStop(n)
  n = act(n,{type:'engage'})
  assert.equal(n.voyage?.phase,'battle')
  return n
}
function checkpoint(s:GameState, ending:BattleEnding | null): BattleSnapshot {
  const enemy = buildOpponent({x:310,y:180},0,raiderToll(s).profile)
  const player = buildShip({x:300,y:180},0,0,0,64)
  enemy.hull = 21.25
  if (ending === 'victory' || ending === 'mutualWreck') enemy.hull = 0
  if (ending === 'defeat' || ending === 'mutualWreck') player.hull = 0
  return { version:1,player,enemy,playerCrew:ending === 'withdrawn' || ending === 'yielded' ? 0 : 4.2,
    enemyCrew:ending === 'withdrawn' || ending === 'boarded' ? 0 : 3,area:{top:0,bottom:400},
    contact:{armed:false,clearSeconds:0.2},projectiles:[],aiDelay:1,course:null,intercepting:false,escaping:false,
    windSight:true,terminal:ending }
}
test('an active six-gun reload queue and old four-gun independent timers round-trip through campaign storage', () => {
  const battle = toBattle(departure())
  for (const count of [4, 6]) {
    const snapshot = checkpoint(battle, null)
    snapshot.player = buildShip({ x: 150, y: 150 }, 0, 5, 0, 64, false, count)
    if (count === 4) {
      snapshot.player.guns[0].cooldown = 0.6
      snapshot.player.guns[2].cooldown = 0.6
    } else {
      fireBroadside(snapshot.player, 'port', 5)
      moveShip(snapshot.player, 0, 1.2)
      assert.equal(fireBroadside(snapshot.player, 'port', 5).length, 1)
    }
    const db = reload(checkpointBattle(battle, battle.voyage!.id, snapshot))
    const restored = db.voyage?.battle?.player
    assert.deepEqual(restored, snapshot.player)
    moveShip(restored!, 0, 0.8)
    assert.equal(fireBroadside(restored!, 'port', 5).length, count === 4 ? 2 : 1)
  }
})

function finish(s:GameState, ending:BattleEnding) {
  const id=s.voyage!.id
  const saved=checkpointBattle(s,id,checkpoint(s,ending))
  assert.notEqual(saved,s)
  const restored=reload(saved)
  assert.deepEqual(restored,saved)
  assert.equal(checkpointBattle(restored,id,checkpoint(s,null)),restored)
  return settleThenFlyToPort(restored,{type:'resolveBattle',id,result:CAMPAIGN_RESULTS[ending],hull:99,enemyHull:60})
}
const prepare = (s:GameState,course:Preparation,sailor?:SailorId) => act(s,{type:'prepareCommand',course,sailor})
const learn = (s:GameState,ability:Parameters<typeof canLearnPerk>[1]) => act(s,{type:'chooseAbility',ability})
const sailor = (s:GameState,id:SailorId) => s.command.aboard.find(member => member.id === id)!

function passage(state:GameState,to:PortId):GameState {
  let s=act(state,{type:'sail',to})
  s=flyToNextStop(s)
  if (s.voyage?.phase==='raider') {
    s=act(s,{type:'engage'})
    s=settleThenFlyToPort(s,{type:'resolveBattle',result:'escaped',id:s.voyage!.id,hull:s.ship.hull})
  }
  assert.equal(s.port,to)
  assert.equal(s.voyage,null)
  return s
}

function freightJob(state:GameState) {
  const signed=act(state,{type:'takeFreight'})
  assert.ok(signed.freight)
  return passage(signed,signed.freight.to)
}

function qualifyHand(id:SailorId):GameState {
  let s=departure()
  assert.equal(sailor(s,id).deckXP,1) // The rescue counted once for both hands.
  assert.equal(prepare(s,'appoint',id),s)
  const other=id==='kit' ? 'wren' : 'kit'
  const before=s.coins
  s=prepare(s,'coach',id)
  assert.equal(s.coins,before-18)
  assert.equal(prepare(s,'coach',id),s)
  assert.equal(prepare(s,'appoint',id),s)
  s=passage(s,'sunstep')
  s=passage(s,'copperfall')
  assert.equal(sailor(s,id).deckXP,1)
  assert.equal(sailor(s,id).coached,true)
  s=freightJob(s)
  assert.equal(sailor(s,id).deckXP,3)
  assert.equal(sailor(s,other).deckXP,2)
  assert.equal(sailor(s,id).coached,false)
  s=passage(s,'copperfall')
  s=reload(prepare(s,'appoint',id))
  assert.equal(sailor(s,id).role,'mate')
  assert.equal(prepare(s,'appoint',other),s)
  assert.equal(qualifiedMate(s),undefined)
  const back=prepare(s,'standDown',id)
  assert.equal(sailor(back,id).deckXP,3)
  assert.equal(sailor(prepare(back,'appoint',other),other).role,'mate')
  s=prepare(s,'coach',id)
  assert.equal(qualifiedMate(s),undefined)
  s=freightJob(s)
  assert.equal(sailor(s,id).mateXP,2)
  assert.equal(qualifiedMate(s)?.id,id)
  while (s.port!=='copperfall' || s.voyageCount%3!==2)
    s=passage(s,s.port==='copperfall'?'glasshouse':'copperfall')
  return s
}

test('a spare captain or either qualified first mate delivers the surviving ship, captain and single manifest to port', () => {
  for (const option of ['hired','wren','kit'] as const) {
    let s=option === 'hired' ? prepare(departure(),'hire') : qualifyHand(option)
    if (option==='hired') {
      assert.equal(s.coins,110)
      assert.equal(prepare(s,'hire'),s)
    }
    const crew=s.ship.crew, commander=option==='hired' ? 'hired' : 'mate'
    const hand=qualifiedMate(s)
    s=toBattle(s)
    const id=s.voyage!.id
    const manifest=prizeManifest(s,raiderToll(s).profile.id,id)
    s=reload(finish(s,'boarded'))
    assert.equal(s.voyage?.phase,'prize')
    assert.equal(s.voyage.prize?.hull,21.25)
    const before=s.coins
    const command={type:'commissionPrize',commander,id} as const
    s=reload(act(s,command))
    assert.equal(s.voyage,null)
    assert.equal(s.port,'sunstep')
    assert.equal(s.coins,before)
    assert.equal(s.ship.crew,crew)
    assert.equal(s.command.hired,false)
    assert.equal(qualifiedMate(s),undefined)
    assert.equal(s.command.prizes.length,1)
    const ship=s.command.prizes[0]
    assert.deepEqual(ship,{id,class:ship.class,hull:21.25,cargo:manifest,commander,port:'sunstep',
      ...(hand ? {captain:{...hand,role:'captain'}} : {})})
    if (ship.captain) {
      assert.ok(!s.command.aboard.some(hand=>hand.id===ship.captain!.id))
      assert.equal(handLevel(ship.captain),3)
      const repeated=structuredClone(s)
      repeated.command.aboard.push({...ship.captain,role:'mate'})
      assert.equal(reload(repeated).voyageCount,0)
    }
    assert.equal(act(s,command),s)
    const beforeUnloading=s.cargo[manifest.good].quantity
    const unload={type:'unloadPrize',id,remaining:manifest.quantity} as const
    const away={...s,port:'copperfall' as const}
    assert.equal(act(away,unload),away)
    s=reload(act(s,unload))
    assert.equal(s.cargo[manifest.good].quantity,beforeUnloading+manifest.quantity)
    assert.equal(s.command.prizes[0].cargo.quantity,0)
    assert.equal(act(s,unload),s)
  }
})

test('new captains can claim only agreed cargo that fits or grant free passage once', () => {
  const start=departure()
  start.cargo.glass={quantity:11,cost:121}
  start.freight={from:'sunstep',to:'glasshouse',pay:18,special:false}
  let s=reload(finish(toBattle(start),'boarded'))
  const id=s.voyage!.id, manifest=prizeManifest(s,s.voyage!.pirate!.opponent,id)
  assert.equal(act(s,{type:'offerCommand',id}),s)
  for (const commander of ['hired','mate','skipper'] as const)
    assert.equal(settleThenFlyToPort(s,{type:'commissionPrize',id,commander}),s)
  assert.equal(settleThenFlyToPort(s,{type:'releasePrize',id,crates:2}),s)
  assert.equal(settleThenFlyToPort(s,{type:'releasePrize',id,crates:-1}),s)
  const passage=settleThenFlyToPort(s,{type:'releasePrize',id,crates:0})
  assert.deepEqual(passage.cargo,start.cargo)
  s=reload(settleThenFlyToPort(s,{type:'releasePrize',id,crates:1}))
  assert.equal(s.cargo[manifest.good].quantity,start.cargo[manifest.good].quantity+1)
  assert.deepEqual(s.freight,start.freight)
  assert.deepEqual(s.command.prizes,[])
  assert.equal(settleThenFlyToPort(s,{type:'releasePrize',id,crates:1}),s)
})

function earnLevel(s:GameState) {
  const before=s.level
  // A returner sells a profitable, fully paid cargo lot. The public sell action grants XP.
  for (let i=0;i<140 && s.level===before;i++) {
    s.cargo.machinery={quantity:10,cost:10}
    s=act(s,{type:'sell',good:'machinery',quantity:10})
  }
  assert.equal(s.level,before+1)
  return reload(s)
}

test('new and returning captains can spend three separately earned perks; old specialties and every offer persist', () => {
  const seen = new Set<string>()
  for (let seed=0;seed<80 && seen.size<2;seed++) {
    const old:GameState={...departure(seed),port:'meridian',level:2,xp:199,mission:'lit',certificate:'paid',ability:'gunner'}
    old.pricesSeen.meridian=old.pricesSeen.sunstep
    const raw=JSON.parse(JSON.stringify(old)); delete raw.command
    let trained=reload(raw)
    assert.equal(trained.port,'meridian')
    assert.equal(trained.xp,199)
    assert.equal(learn(trained,'articles'),trained)
    assert.equal(learn(trained,'broker'),trained)
    const price=priceAt(trained,trained.port,'glass').buy
    assert.equal(captainPoints(trained),0)
    for (const perk of ['broker','readRoom','articles'] as const) {
      trained=earnLevel(trained)
      assert.equal(captainPoints(trained),1)
      if (perk!=='articles') assert.equal(learn(trained,'articles'),trained)
      trained=reload(learn(trained,perk))
      assert.equal(captainPoints(trained),0)
      assert.equal(hasCaptainPerk(trained,perk),true)
      assert.equal(learn(trained,perk),trained)
    }
    assert.equal(trained.level,5)
    assert.equal(trained.ability,'gunner')
    assert.ok(priceAt(trained,trained.port,'glass').buy < price)
    trained.port='copperfall'
    const battle=toBattle(prepare(trained,'hire'))
    const s=reload(finish(battle,'boarded')),id=s.voyage!.id
    const offer={type:'offerCommand',id} as const
    const answer=reload(act(s,offer))
    const choice=answer.voyage!.prize!.offer
    seen.add(choice)
    assert.equal(act(answer,offer),answer)
    assert.deepEqual(act(reload(s),offer),answer)
    if (choice==='accepted')
      assert.equal(settleThenFlyToPort(answer,{type:'commissionPrize',id,commander:'skipper'}).command.prizes[0].commander,'skipper')
    else {
      assert.equal(settleThenFlyToPort(answer,{type:'commissionPrize',id,commander:'skipper'}),answer)
      assert.equal(settleThenFlyToPort(answer,{type:'commissionPrize',id,commander:'hired'}).command.prizes[0].commander,'hired')
    }
  }
  assert.deepEqual(seen,new Set(['accepted','refused']))
  const broker={...departure(),ability:'broker' as const,level:2,xp:199,mission:'lit' as const,certificate:'paid' as const}
  assert.ok(hasCaptainPerk(broker,'broker'))
  assert.equal(learn(broker,'readRoom'),broker)
  const mid=learn(earnLevel(broker),'readRoom')
  assert.equal(learn(mid,'articles'),mid)
  const early=learn(earnLevel(mid),'articles')
  assert.equal(early.level,4)
  assert.ok(hasCaptainPerk(early,'articles'))
  const s=departure()
  let id=1; while(!skipperTerms(s,id).motive.includes('distress')) id++
  assert.equal(skipperTerms({...s,tender:'unseen'},id).chance,0.5)
  assert.equal(skipperTerms({...s,tender:'helped'},id).chance,0.85)
  assert.ok(Math.abs(skipperTerms({...s,tender:'passed'},id).chance-0.15)<1e-12)
})

test('wrecks, failed boarding, withdrawal and escape have distinct settlements, and a terminal save cannot be won twice', () => {
  const battle=toBattle(departure())
  const notices = new Set<string>()
  for (const ending of ['victory','defeat','mutualWreck','withdrawn','yielded','escaped'] as const) {
    const s=reload(finish(battle,ending))
    assert.equal(s.voyage,null)
    assert.deepEqual(s.command.prizes,[])
    notices.add(s.log[1].text)
    if (ending==='yielded' || ending==='withdrawn') assert.equal(s.ship.hull,64)
    if (ending==='mutualWreck') assert.equal(s.coins,battle.coins)
  }
  assert.equal(notices.size,6)
  const bad=checkpoint(battle,'boarded');bad.enemy.hull=0
  assert.equal(checkpointBattle(battle,battle.voyage!.id,bad),battle)
  const saved=checkpointBattle(battle,battle.voyage!.id,checkpoint(battle,'mutualWreck'))
  assert.equal(settleThenFlyToPort(saved,{type:'resolveBattle',id:saved.voyage!.id,result:'surrendered',hull:90,enemyHull:60}),saved)
})
