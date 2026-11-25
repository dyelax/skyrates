import assert from 'node:assert/strict'
import test from 'node:test'
import { act, CAMPAIGN_RESULTS, checkpointBattle, initialState, loadGame, prizeManifest, raiderToll, skipperTerms, type GameState } from '../src/model'
import { buildOpponent, buildShip } from '../src/battle-model'
import type { BattleEnding, BattleSnapshot } from '../src/battle-state'

const reload = (state:unknown) => loadGame({getItem:() => JSON.stringify(state)})
function departure(seed=5): GameState {
  let s = initialState(seed)
  s = act(s,{type:'sail',to:'glasshouse'})
  s = act(s,{type:'endDrill',skip:true})
  s = act(s,{type:'continueVoyage'})
  s = act(s,{type:'sail',to:'copperfall'})
  s = act(s,{type:'continueVoyage'})
  s = act(s,{type:'tender',help:true})
  return {...s,coins:200}
}
function toBattle(s:GameState) {
  let n = act(s,{type:'sail',to:s.port === 'sunstep' ? 'copperfall' : 'sunstep'})
  n = act(n,{type:'continueVoyage'})
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
function finish(s:GameState, ending:BattleEnding) {
  const id=s.voyage!.id
  const saved=checkpointBattle(s,id,checkpoint(s,ending))
  assert.notEqual(saved,s)
  const restored=reload(saved)
  assert.deepEqual(restored,saved)
  assert.equal(checkpointBattle(restored,id,checkpoint(s,null)),restored)
  return act(restored,{type:'resolveBattle',id,result:CAMPAIGN_RESULTS[ending],hull:99,enemyHull:60})
}
const prepare = (s:GameState,course:'hire'|'train'|'terms') => act(s,{type:'prepareCommand',course})

test('a paid spare captain or qualified mate takes the surviving hull and only its manifest into port', () => {
  for (const [course,commander,fee] of [['hire','hired',90],['train','mate',44]] as const) {
    const start=departure()
    let s=prepare(start,course)
    assert.equal(s.coins,start.coins-fee)
    assert.equal(prepare(s,course),s)
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
    assert.equal(s.ship.crew,start.ship.crew)
    assert.equal(s.command.hired,false)
    assert.equal(s.command.mateTrained,false)
    assert.equal(s.command.prizes.length,1)
    assert.deepEqual(s.command.prizes[0],{id,class:s.command.prizes[0].class,hull:21.25,cargo:manifest,commander,port:'sunstep'})
    assert.equal(act(s,command),s)
    const beforeUnloading=s.cargo[manifest.good].quantity
    const unload={type:'unloadPrize',id,remaining:manifest.quantity} as const
    const away={...s,port:'copperfall' as const}
    assert.equal(act(away,unload),away)
    s=reload(act(s,unload))
    assert.equal(s.cargo[manifest.good].quantity,beforeUnloading+manifest.quantity)
    assert.equal(s.command.prizes[0].cargo.quantity,0)
    assert.equal(act(s,unload),s)
    if (course==='train') {
      const back={...s,port:'copperfall' as const}
      assert.equal(prepare(back,'train'),back)
    }
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
    assert.equal(act(s,{type:'commissionPrize',id,commander}),s)
  assert.equal(act(s,{type:'releasePrize',id,crates:2}),s)
  assert.equal(act(s,{type:'releasePrize',id,crates:-1}),s)
  const passage=act(s,{type:'releasePrize',id,crates:0})
  assert.deepEqual(passage.cargo,start.cargo)
  s=reload(act(s,{type:'releasePrize',id,crates:1}))
  assert.equal(s.cargo[manifest.good].quantity,start.cargo[manifest.good].quantity+1)
  assert.deepEqual(s.freight,start.freight)
  assert.deepEqual(s.command.prizes,[])
  assert.equal(act(s,{type:'releasePrize',id,crates:1}),s)
})

test('a level-earned negotiation course works with an existing talent; offer decisions persist across reload', () => {
  const seen = new Set<string>()
  for (let seed=0;seed<80 && seen.size<2;seed++) {
    const old:GameState={...departure(seed),port:'meridian',level:2,mission:'lit',certificate:'paid',ability:'gunner'}
    // Preserve old talent choices and offer the same training opportunity on returning saves.
    old.pricesSeen.meridian=old.pricesSeen.sunstep
    const raw=JSON.parse(JSON.stringify(old)); delete raw.command
    const trained=prepare(reload(raw),'terms')
    assert.equal(trained.command.terms,true)
    assert.equal(trained.ability,'gunner')
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
      assert.equal(act(answer,{type:'commissionPrize',id,commander:'skipper'}).command.prizes[0].commander,'skipper')
    else {
      assert.equal(act(answer,{type:'commissionPrize',id,commander:'skipper'}),answer)
      assert.equal(act(answer,{type:'commissionPrize',id,commander:'hired'}).command.prizes[0].commander,'hired')
    }
  }
  assert.deepEqual(seen,new Set(['accepted','refused']))
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
  assert.equal(act(saved,{type:'resolveBattle',id:saved.voyage!.id,result:'surrendered',hull:90,enemyHull:60}),saved)
})
