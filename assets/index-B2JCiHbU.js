const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./battle-gGUFq2NQ.js","./phaser-DFK5Ua9d.js","./battle-CunrWvWQ.css"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const a of i)if(a.type==="childList")for(const s of a.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&o(s)}).observe(document,{childList:!0,subtree:!0});function n(i){const a={};return i.integrity&&(a.integrity=i.integrity),i.referrerPolicy&&(a.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?a.credentials="include":i.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function o(i){if(i.ep)return;i.ep=!0;const a=n(i);fetch(i.href,a)}})();const je="modulepreload",Ne=function(e,t){return new URL(e,t).href},be={},De=function(t,n,o){let i=Promise.resolve();if(n&&n.length>0){let c=function(d){return Promise.all(d.map(h=>Promise.resolve(h).then(g=>({status:"fulfilled",value:g}),g=>({status:"rejected",reason:g}))))};const s=document.getElementsByTagName("link"),r=document.querySelector("meta[property=csp-nonce]"),l=r?.nonce||r?.getAttribute("nonce");i=c(n.map(d=>{if(d=Ne(d,o),d in be)return;be[d]=!0;const h=d.endsWith(".css"),g=h?'[rel="stylesheet"]':"";if(o)for(let k=s.length-1;k>=0;k--){const w=s[k];if(w.href===d&&(!h||w.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${d}"]${g}`))return;const f=document.createElement("link");if(f.rel=h?"stylesheet":je,h||(f.as="script"),f.crossOrigin="",f.href=d,l&&f.setAttribute("nonce",l),document.head.appendChild(f),h)return new Promise((k,w)=>{f.addEventListener("load",k),f.addEventListener("error",()=>w(new Error(`Unable to preload CSS for ${d}`)))})}))}function a(s){const r=new Event("vite:preloadError",{cancelable:!0});if(r.payload=s,window.dispatchEvent(r),!r.defaultPrevented)throw s}return i.then(s=>{for(const r of s||[])r.status==="rejected"&&a(r.reason);return t().catch(a)})},p={sunstep:{name:"Sunstep Quay",subtitle:"Agricultural skyport",description:"Orchards climb the mooring towers. Crates of pears ride the same cables down to market that carry engine parts back up.",keeper:"Harbormaster Vale",requiredLevel:1,mailTo:"glasshouse",daysTo:{sunstep:0,glasshouse:1,copperfall:2,meridian:3},specialty:"provisions",prices:{provisions:5,glass:19,machinery:32}},glasshouse:{name:"Glasshouse Reach",subtitle:"Beacon station",description:"Violet furnaces burn beneath acres of glass. Beyond the terraces, the Skyway Beacon stands dark above the cloud sea.",keeper:"Keeper Iona",requiredLevel:1,mailTo:"copperfall",daysTo:{sunstep:1,glasshouse:0,copperfall:1,meridian:2},specialty:"glass",prices:{provisions:14,glass:11,machinery:25}},copperfall:{name:"Copperfall Yard",subtitle:"Industrial skyport",description:"Copper cranes swing half-built keels over the mist. The yard crews are fitting their new winter gardens with glazing.",keeper:"Yardmaster Orr",requiredLevel:1,mailTo:"sunstep",daysTo:{sunstep:2,glasshouse:1,copperfall:0,meridian:3},specialty:"machinery",prices:{provisions:11,glass:24,machinery:16}},meridian:{name:"Meridian Spire",subtitle:"Outer skyways",description:"Beyond the beacon, chart balloons launch from a white spire. The weather crews pay handsomely for provisions.",keeper:"Pilot Sen",requiredLevel:2,mailTo:"glasshouse",daysTo:{sunstep:3,glasshouse:2,copperfall:3,meridian:0},specialty:"glass",prices:{provisions:19,glass:15,machinery:29}}},j={provisions:{name:"Provisions",description:"Orchard fruit and grain, packed for the skyways."},glass:{name:"Solar glass",description:"Cut panes that gather sunlight for gardens and sails."},machinery:{name:"Machinery",description:"Brass gearsets and governors for working keels."}},Q={broker:{name:"Silver Tongue",description:"Pay 10% less when buying cargo."},gunner:{name:"Quick Gunnery",description:"Your cannon crews reload faster."},leader:{name:"Boarding Captain",description:"Your crew fights 25% more effectively when boarding."}},E={home:"sunstep",keeperPort:"glasshouse",opens:"meridian",startingCoins:78,invoiceCost:240,xp:100,notoriety:3},te={safeOpeningVoyages:1,tenderFromVoyage:2,raiderInterval:3},R={towDays:1,notoriety:1,xp:10,contract:{from:"copperfall",to:"sunstep",pay:85,xp:12}},ae={basePay:14,payPerDay:4,xp:3},A=E.invoiceCost,O=["provisions","glass","machinery"],V=["sunstep","glasshouse","copperfall","meridian"],de=["broker","gunner","leader"],Fe=["hold","hull","guns","crew","veteran","repair"],Me="skyrates.save.v1",J=p[E.opens].requiredLevel;function We(){const e={version:1,port:E.home,day:1,coins:E.startingCoins,cargo:{provisions:{quantity:0,cost:0},glass:{quantity:0,cost:0},machinery:{quantity:0,cost:0}},ship:{hold:12,hull:100,maxHull:100,guns:0,crew:6,veterans:1},level:1,xp:0,notoriety:0,ability:null,mission:"offered",tender:"unseen",specialFreightTaken:!1,voyageCount:0,voyage:null,pricesSeen:{},freight:null,log:[{day:1,text:"Took the helm at Sunstep Quay. Harbormaster Vale has a commission waiting."}],notice:""};return pe(e),e}function he(e,t){return p[e].daysTo[t]}function G(e,t){return V.includes(t)&&e.level>=p[t].requiredLevel}function ue(e){return O.reduce((t,n)=>t+e.cargo[n].quantity,0)}function H(e,t,n){const o=(Math.floor((e.day-1)/3)+V.indexOf(t)+O.indexOf(n))%3,i=p[t].prices[n]+o-1,a=Math.floor(i*.9),s=Math.max(1,Math.min(i-2,a-1));return{buy:e.ability==="broker"?a:i,sell:s}}function pe(e){e.pricesSeen[e.port]={day:e.day,prices:{provisions:H(e,e.port,"provisions"),glass:H(e,e.port,"glass"),machinery:H(e,e.port,"machinery")}}}function Te(e){return(e.ship.crew+1.5*e.ship.veterans)*(e.ability==="leader"?1.25:1)}function Ge(e){return e.notoriety>=6?"Famed sky captain":e.notoriety>=3?"Known on the skyways":e.notoriety>=1?"Familiar face":"Unknown captain"}function ze(e){switch(e.port){case"sunstep":return e.mission==="lit"?"“I saw it from the quay last night. First light on the outer route in six weeks.” Vale makes room for you at the chart table.":e.mission==="offered"?"“The Skyway Beacon has gone dark. Take this commission to Keeper Iona at Glasshouse Reach. We need that light back.”":e.notoriety>0?"Vale puts down her manifest. “The pilots have been talking about you. How fares the beacon?”":"“A light for every ship past the horizon,” Vale says. “You’ll find the keeper above the glassworks.”";case"glasshouse":return e.mission==="invoice"?`Iona sets a brass-bound crate on the counter. “Lens is cut. Fitting is included. That’ll be ${A} crowns.” A dockworker mentions Copperfall is buying glass for its greenhouses.`:e.mission==="lit"?"“Come up and see it tonight,” Iona says. A ribbon of light sweeps the glazing sheds.":"The keeper polishes a lens beside the cold lamp. “Vale at Sunstep is still looking for a captain.”";case"copperfall":return e.tender==="helped"&&!e.specialFreightTaken?"“That’s the captain who towed me in!” Skipper Neri waves from the freight desk. “I’ve a good run reserved for you.”":e.tender==="helped"?"Neri greets you by name. The freight hands shift a bench over to make room for you.":e.tender==="passed"?"Neri has lashed a spare towline to the tender. At the desk, the yardmaster points you to the ordinary freight board.":"“Our furnace crews can make a keel in a week,” Orr says. “But every pane in our new greenhouses has to be shipped in.”";case"meridian":return e.notoriety>=3?"“There’s the beacon captain!” Pilot Sen beckons you to the front berth. “We’ve a hungry weather crew up here.”":"Pilot Sen ties off your bowline. “Welcome to the outer skyways.”"}}function Ae(e){if(e.voyage||e.freight)return null;const t=R.contract;if(e.port===t.from&&e.tender==="helped"&&!e.specialFreightTaken)return{to:t.to,pay:t.pay,special:!0};const n=p[e.port].mailTo;return{to:n,pay:ae.basePay+ae.payPerDay*he(e.port,n),special:!1}}function Ie(e,t){const n=e.ship;switch(t){case"hold":return{name:"Hold extension",description:"Fit racks for 4 more crates.",cost:48+(n.hold-12)*5,available:n.hold<32};case"hull":return{name:"Hull plating",description:"Increase maximum and current hull by 25.",cost:65+(n.maxHull-100),available:n.maxHull<200};case"guns":return{name:"Cannon refit",description:"Improve the power of both gun batteries.",cost:70+40*n.guns,available:n.guns<3};case"crew":return{name:"Hire deckhands",description:"Sign on two novice deckhands.",cost:26,available:n.crew+2<=24};case"veteran":return{name:"Hire a veteran",description:"Sign on one fighter worth 2½ novice hands in a boarding action.",cost:44,available:n.crew<24};case"repair":return{name:"Repair hull",description:"Restore the hull to full strength.",cost:Math.ceil((n.maxHull-n.hull)/2),available:n.hull<n.maxHull}}}function _(e,t){e.notice=t,e.log.unshift({day:e.day,text:t})}function X(e,t){e.xp=Math.min(e.level===1?90:199,e.xp+t)}function F(e,t=""){const n=e.voyage;if(!n)return;const o=n.from;if(e.port=n.to,e.voyage=null,pe(e),_(e,"Docked at "+p[e.port].name+" after leaving "+p[o].name+"."),e.freight?.to===e.port){const a=e.freight;e.coins+=a.pay,e.freight=null,X(e,a.special?R.contract.xp:ae.xp),_(e,(a.special?"Delivered Neri’s freight":"Delivered the bonded freight")+" and earned "+a.pay+" crowns.")}e.port===E.keeperPort&&e.mission==="accepted"&&(e.mission="invoice",_(e,`Keeper Iona presents a ${A}-crown invoice for the beacon lens. Copperfall is buying solar glass for its new greenhouses.`));const i=R.contract;e.port===i.from&&e.tender==="helped"&&!e.specialFreightTaken&&_(e,`Skipper Neri remembers your tow. A freight run to ${p[i.to].name} is yours for ${i.pay} crowns.`),t&&(e.notice=t+" "+e.notice)}function Ke(e,t){const{good:n,quantity:o}=t;if(!O.includes(n)||!Number.isSafeInteger(o)||o<=0)return!1;const i=e.cargo[n],a=H(e,e.port,n);if(t.type==="buy"){const s=o*a.buy;if(s>e.coins||o>e.ship.hold-ue(e))return!1;e.coins-=s,i.quantity+=o,i.cost+=s,_(e,"Bought "+o+" "+j[n].name.toLowerCase()+" for "+s+" crowns.")}else{if(o>i.quantity)return!1;const s=o*a.sell,r=Math.round(i.cost*o/i.quantity);i.quantity-=o,i.cost-=r,e.coins+=s;const l=s-r;l>0&&X(e,Math.min(6,l));const c=l===0?"Broke even.":`${Math.abs(l)}-crown ${l>0?"profit":"loss"}.`;_(e,`Sold ${o} ${j[n].name.toLowerCase()} for ${s} crowns. ${c}`)}return!0}function Ue(e,t){const n=e.voyage;if(!n)return!1;switch(t.type){case"continueVoyage":return n.phase!=="underway"?!1:(n.id<=te.safeOpeningVoyages?F(e):e.tender==="unseen"&&n.id>=te.tenderFromVoyage?(n.phase="tender",e.notice="A tender hangs under a torn solar sail. Its skipper signals for a tow."):n.id%te.raiderInterval===0?(n.phase="raider",e.notice="A raider crosses your wake. You have room to give her the slip."):F(e),!0);case"tender":return n.phase!=="tender"?!1:(t.help?(e.tender="helped",e.day+=R.towDays,e.notoriety+=R.notoriety,X(e,R.xp),_(e,`Gave Skipper Neri’s tender a tow. She works out of ${p[R.contract.from].name}.`)):(e.tender="passed",_(e,"Passed the stranded tender and kept to the sailing schedule.")),F(e,e.notice),!0);case"evade":return n.phase!=="raider"?!1:(_(e,"Evaded a raider among the cloud banks."),F(e,e.notice),!0);case"engage":return n.phase!=="raider"?!1:(n.phase="battle",e.notice="Battle stations. The raider is closing.",!0);case"resolveBattle":{if(n.phase!=="battle"||t.id!==n.id||!Number.isFinite(t.hull)||!["lost","won","boarded","escaped"].includes(t.result))return!1;if(e.ship.hull=Math.min(e.ship.maxHull,Math.max(1,Math.round(t.hull))),t.result==="lost"){e.ship.hull=Math.max(e.ship.hull,Math.ceil(e.ship.maxHull*.35));const o=Math.floor(e.coins*.2);e.coins-=o,_(e,"The raider took "+o+" crowns in ransom and let you limp into port.")}else if(t.result==="escaped")_(e,"Broke contact with the raider and reached friendly skies.");else{const o=t.result==="boarded"?40:25;e.coins+=o,e.notoriety+=1,X(e,12),_(e,(t.result==="boarded"?"The crew took the raider by boarding":"Drove off the raider")+" and claimed "+o+" crowns.")}return F(e,e.notice),!0}default:return!1}}function Ye(e,t){switch(t.type){case"buy":case"sell":return Ke(e,t);case"acceptMission":return e.port!==E.home||e.mission!=="offered"?!1:(e.mission="accepted",_(e,"Accepted Vale’s commission. Visit Keeper Iona at Glasshouse Reach to relight the Skyway Beacon."),!0);case"payInvoice":return e.port!==E.keeperPort||e.mission!=="invoice"||e.coins<A?!1:(e.coins-=A,e.mission="lit",e.level=J,e.xp+=E.xp,e.notoriety+=E.notoriety,_(e,`Paid the lens invoice. The Skyway Beacon shines again. Reached level ${e.level}, gained a captain ability, and unlocked ${p[E.opens].name}.`),!0);case"sail":return t.to===e.port||!G(e,t.to)?!1:(e.voyageCount+=1,e.day+=he(e.port,t.to),e.voyage={id:e.voyageCount,from:e.port,to:t.to,phase:"underway"},e.notice="Underway for "+p[t.to].name+".",!0);case"takeFreight":{const n=Ae(e);return n?(e.freight={...n,from:e.port},n.special&&(e.specialFreightTaken=!0),_(e,"Signed for "+(n.special?"Neri’s cargo":"bonded mail")+" to "+p[n.to].name+" for "+n.pay+" crowns. The dispatch travels in the ship’s mail locker."),!0):!1}case"upgrade":{if(!Fe.includes(t.upgrade))return!1;const n=Ie(e,t.upgrade);if(!n.available||e.coins<n.cost)return!1;e.coins-=n.cost;const o=e.ship;switch(t.upgrade){case"hold":o.hold+=4;break;case"hull":o.maxHull+=25,o.hull+=25;break;case"guns":o.guns+=1;break;case"crew":o.crew+=2;break;case"veteran":o.crew+=1,o.veterans+=1;break;case"repair":o.hull=o.maxHull;break}return _(e,n.name+" at "+p[e.port].name+" for "+n.cost+" crowns."),!0}case"chooseAbility":return e.level<J||e.ability||!de.includes(t.ability)?!1:(e.ability=t.ability,pe(e),_(e,"Learned "+Q[t.ability].name+"."),!0);default:return!1}}function Qe(e,t){const n=structuredClone(e);return(e.voyage?Ue(n,t):Ye(n,t))?n:e}function T(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function S(e,t=0){return typeof e=="number"&&Number.isSafeInteger(e)&&e>=t}function D(e){return V.includes(e)}function Je(e){return T(e)&&S(e.buy,1)&&S(e.sell,1)&&e.sell<e.buy}function $e(e){if(!T(e)||!S(e.day,1)||!T(e.prices))return!1;const t=e.prices;return O.every(n=>Je(t[n]))}function Xe(e,t,n){return e===null||T(e)&&S(e.id,1)&&e.id===n&&e.from===t&&D(e.to)&&e.from!==e.to&&typeof e.phase=="string"&&["underway","tender","raider","battle"].includes(e.phase)}function Ze(e){return e===null||T(e)&&D(e.from)&&D(e.to)&&e.from!==e.to&&S(e.pay,1)&&typeof e.special=="boolean"}function et(e){return T(e)&&S(e.hold,1)&&S(e.hull,1)&&S(e.maxHull,e.hull)&&S(e.guns)&&S(e.crew,1)&&S(e.veterans)&&e.veterans<=e.crew}function tt(e){if(!T(e)||e.version!==1||!D(e.port)||!S(e.day,1)||!S(e.coins)||!S(e.xp)||!S(e.notoriety)||!S(e.voyageCount)||e.level!==1&&e.level!==J||!(e.ability===null||de.includes(e.ability))||typeof e.mission!="string"||!["offered","accepted","invoice","lit"].includes(e.mission)||typeof e.tender!="string"||!["unseen","helped","passed"].includes(e.tender)||typeof e.specialFreightTaken!="boolean"||typeof e.notice!="string"||!Array.isArray(e.log)||e.level===J!=(e.mission==="lit")||e.level===1&&(e.ability!==null||e.level<p[e.port].requiredLevel||T(e.voyage)&&D(e.voyage.to)&&e.level<p[e.voyage.to].requiredLevel)||e.specialFreightTaken&&e.tender!=="helped"||!e.log.every(o=>T(o)&&S(o.day,1)&&typeof o.text=="string")||!Xe(e.voyage,e.port,e.voyageCount)||!Ze(e.freight)||!et(e.ship)||!T(e.cargo)||!T(e.pricesSeen))return!1;const t=e.cargo;let n=0;for(const o of O){const i=t[o];if(!T(i)||!S(i.quantity)||!S(i.cost)||i.quantity===0&&i.cost!==0)return!1;n+=i.quantity}return n<=e.ship.hold&&$e(e.pricesSeen[e.port])&&Object.entries(e.pricesSeen).every(([o,i])=>D(o)&&$e(i))}function qe(e,t){try{return(t??globalThis.localStorage).setItem(Me,JSON.stringify(e)),!0}catch{return!1}}function nt(e){try{const t=(e??globalThis.localStorage).getItem(Me);if(t){const n=JSON.parse(t);if(tt(n))return n}}catch{}return We()}const Se=new WeakMap,N=e=>`./art/${e}.webp`,C=e=>`${e.toLocaleString("en-US")} cr`,le=e=>e.replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]),ce={sunstep:[16,70],glasshouse:[41,15],copperfall:[79,75],meridian:[85,31]};function L(e,t){return`<dl class="sk-metric"><dt>${e}</dt><dd>${t}</dd></dl>`}function Z(e,t,n=""){return`<header class="sk-heading"><div><div class="sk-kicker">${e}</div><h1>${t}</h1></div>
    ${n?`<div class="sk-metrics">${n}</div>`:""}</header>`}function Ee(e){return`<dl class="sk-statlist">${e.map(([t,n])=>`<div><dt>${t}</dt><dd>${n}</dd></div>`).join("")}</dl>`}function ot(e,t){const{side:n}=t.settings,o=ue(e),i=O.map(r=>{const l=j[r],c=H(e,e.port,r)[n],d=e.cargo[r],h=n==="buy"?Math.min(e.ship.hold-o,Math.floor(e.coins/c)):d.quantity,g=`sk-order-${r}`,f=()=>t.page.querySelector(`#${g}`),k=t.register(()=>{f().value=String(h),f().dispatchEvent(new Event("input",{bubbles:!0}))}),w=t.register(()=>{const m=f().valueAsNumber;Number.isSafeInteger(m)&&m>0&&m<=h&&t.act({type:n,good:r,quantity:m})});return`<li><div class="sk-good-top"><div class="sk-sample" aria-hidden="true"><img src="${N(r)}" alt="" loading="lazy"></div>
      <div><h3>${l.name}</h3><p>${l.description}</p></div><span class="sk-price">${C(c)} <small>/ unit</small></span></div>
      <div class="sk-order" data-side="${n}" data-price="${c}" data-limit="${h}">
      <label for="${g}">Qty</label><input class="sk-qty" id="${g}" aria-label="${l.name} quantity" type="number" step="1" min="1" max="${Math.max(h,1)}" value="${h?1:0}" ${h?"":"disabled"}>
      <button type="button" class="sk-text-button" data-action="${k}" ${h?"":"disabled"} aria-label="Select maximum ${l.name}">Max</button>
      <button type="button" class="sk-button sk-submit" aria-label="${n==="buy"?"Buy":"Sell"} ${l.name}" data-action="${w}" ${h?"":"disabled"}>${n==="buy"?"Buy":"Sell"} · ${C(h?c:0)}</button></div></li>`}).join(""),a=O.filter(r=>e.cargo[r].quantity>0),s=r=>t.register(()=>{t.settings.side=r,t.refresh()});return Z(p[e.port].name,"Port market",L("Purse",C(e.coins))+L("Hold",`${o} / ${e.ship.hold}`))+`<div class="sk-layout"><article class="sk-card"><div class="sk-card-head"><h2>Exchange floor</h2><div class="sk-switch" aria-label="Trade direction">
    <button type="button" data-action="${s("buy")}" aria-pressed="${n==="buy"}">Buy</button>
    <button type="button" data-action="${s("sell")}" aria-pressed="${n==="sell"}">Sell</button></div></div>
    <ul class="sk-goods">${i}</ul></article>
    <aside class="sk-stack"><details class="sk-fold sk-ledger-fold"><summary>Cargo manifest · ${o} / ${e.ship.hold}</summary>
    ${a.length?`<ul class="sk-cargo">${a.map(r=>{const l=e.cargo[r];return`<li><span>${j[r].name}<small>Paid ${C(l.cost)} · avg. ${(l.cost/l.quantity).toFixed(1)} cr</small></span><strong>× ${l.quantity}</strong></li>`}).join("")}</ul>`:'<p class="sk-empty">Your hold is empty.</p>'}
    ${e.freight?`<p>Consigned freight aboard for ${p[e.freight.to].name}.</p>`:""}
    </details><details class="sk-fold sk-ledger-fold"><summary>Market intelligence</summary><p>${st(e)}</p>
    <div class="sk-actions">${t.button("Compare port quotes",()=>t.go("chart"),{secondary:!0})}</div></details></aside></div>`}function st(e){switch(e.port){case"sunstep":return"Provisions come straight off the terraces here. Glasshouse furnace crews buy food by the crate.";case"glasshouse":return"Copperfall is glazing its winter gardens. The yard pays a premium for solar glass.";case"copperfall":return"Sunstep imports machinery to keep its orchard lifts running. The yards sell gearsets fresh from the foundry.";case"meridian":return"Balloon crews pack provisions for long soundings. Sunstep’s orchard crates find eager buyers here."}}function rt(e,t){const n=o=>`<ul class="sk-offers">${o.map(i=>{const a=Ie(e,i);return`<li><div><h3>${a.name}</h3><p>${a.description}</p></div>
      ${t.button(C(a.cost),()=>t.act({type:"upgrade",upgrade:i}),{disabled:!a.available||e.coins<a.cost})}</li>`}).join("")}</ul>`;return Z(p[e.port].name,"Shipyard",L("Purse",C(e.coins))+L("Hull",`${e.ship.hull} / ${e.ship.maxHull}`))+`<div class="sk-layout"><div class="sk-stack"><article class="sk-card"><div class="sk-card-head"><h2>Refit the schooner</h2></div>${n(["hold","hull","guns","repair"])}</article>
    <article class="sk-card"><div class="sk-card-head"><h2>Hire crew</h2></div>${n(["crew","veteran"])}</article></div>
    <details class="sk-fold sk-ledger-fold"><summary>Ship’s register</summary>${Ee([["Hull integrity",`${e.ship.hull} / ${e.ship.maxHull}`],["Hold capacity",`${e.ship.hold} units`],["Gunnery rating",e.ship.guns],["Crew aboard",e.ship.crew],["Veterans",e.ship.veterans],["Boarding strength",Te(e)]])}<p class="sk-info">Ram another airship and your crew will board. Experienced hands carry more of the fight.</p></details></div>`}function Le(e){return e.mission==="offered"?"Speak with Harbormaster Vale at Sunstep Quay about the dark beacon.":e.mission==="accepted"?"Visit Keeper Iona at Glasshouse Reach to collect the replacement lens.":e.mission==="invoice"?`Raise ${C(A)} and pay Keeper Iona at Glasshouse Reach for the lens.`:"The Skyway Beacon is lit. Meridian Spire is open to your schooner."}function it(e,t){const n=e.ability?Q[e.ability]:null,o=e.log,i=n?`<h3>${n.name}</h3><p>${n.description}</p>`:e.level>=2?`<ul class="sk-offers">${de.map(a=>`<li><div><h3>${Q[a].name}</h3><p>${Q[a].description}</p></div>${t.button("Learn",()=>t.act({type:"chooseAbility",ability:a}))}</li>`).join("")}</ul>`:"<p>Relighting the Skyway Beacon earns your first choice of captain ability.</p>";return Z("Captain’s records","Captain’s log",L("Rank",`Level ${e.level}`)+L("Experience",`${e.xp} XP`))+`<div class="sk-layout"><article class="sk-card"><div class="sk-card-head"><h2>Voyage entries</h2></div>
    ${o.length?`<ol class="sk-journal">${o.map(a=>`<li><span class="sk-date">Day ${a.day}</span><span>${le(a.text)}</span></li>`).join("")}</ol>`:'<p class="sk-empty">Your first voyage awaits.</p>'}</article>
    <aside class="sk-stack"><article class="sk-card"><div class="sk-card-head"><h2>Reputation</h2><span class="sk-tag">${e.notoriety} renown</span></div><h3>${le(Ge(e))}</h3>
    <p class="sk-info">${e.tender==="helped"?"The tender skipper remembers your tow. At Copperfall, that friendship opens a freight contract.":e.tender==="passed"?"You left the stranded tender to hail another ship. Its skipper remembers the sail on the horizon.":"Word of your deeds travels with dock crews and freight skippers."}</p></article>
    <article class="sk-card"><div class="sk-card-head"><h2>Captain ability</h2></div>${i}</article>
    <article class="sk-card"><div class="sk-card-head"><h2>The Skyway Beacon</h2></div><p>${Le(e)}</p></article></aside></div>`}function at(e,t){const n=e.pricesSeen[t],o=e.port===t;return!n&&!o?'<p class="sk-empty">Call at this port to record its market prices.</p>':`<p>${o?"Current exchange floor":`Recorded on day ${n.day}`} · buy / sell per unit</p>
    <ul class="sk-prices">${O.map(i=>{const a=o?H(e,t,i):n.prices[i];return`<li><span>${j[i].name}</span><strong>${a.buy} / ${C(a.sell)}</strong></li>`}).join("")}</ul>`}function lt(e,t){const n=t.settings.destination,o=()=>{t.settings.focusPort=n,t.settings.destination=null,t.refresh()},i=V.map(s=>{const[r,l]=ce[s],c=s===e.port,d=!G(e,s);return`<button type="button" class="sk-chart-node ${c?"is-home":""} ${d?"is-locked":""}" style="left:${r}%;top:${l}%" data-port="${s}" aria-label="${p[s].name}${c?", current port":d?", locked":""}" aria-haspopup="dialog" aria-pressed="${s===n}" data-action="${t.register(()=>{s===n?o():(t.settings.destination=s,t.refresh())})}"><i class="sk-node-mark" aria-hidden="true"></i><span class="sk-node-label">${p[s].name}</span></button>`}).join("");let a="";if(n){const s=p[n],r=e.port===n,l=G(e,n),c=he(e.port,n);a=`<aside class="sk-map-popover" role="dialog" aria-labelledby="sk-selected-port" data-selected="${n}">
      <img class="sk-port-thumbnail" alt="" src="${N(e.mission==="lit"&&(n==="sunstep"||n==="glasshouse")?n+"-lit":n)}">
      <button type="button" class="sk-dismiss" aria-label="Close port details" data-action="${t.register(o)}">×</button>
      <div class="sk-map-copy"><div class="sk-kicker">${r?"Moored here":l?s.subtitle:"Outer skyway · locked"}</div>
      <h2 id="sk-selected-port">${s.name}</h2>
      <p>${r?"Local exchange":l?`${c}-day passage`:"Relight the beacon to reach this port"} · ${j[s.specialty].name}</p>
      <details class="sk-fold"><summary>Recorded prices</summary>${at(e,n)}</details>
      <div class="sk-actions">${r?t.button("Visit local market",()=>{t.settings.destination=null,t.go("market")},{secondary:!0}):t.button(l?"Set sail →":"Route locked",()=>{t.settings.destination=null,t.act({type:"sail",to:n})},{disabled:!l})}</div></div></aside>`}return`<div class="sk-mapstage"><div class="sk-map-scroll"><div class="sk-chart" aria-label="Chart of four skyports">
      <img src="${N("sky-chart")}" alt="" class="sk-chart-art"><canvas aria-hidden="true" data-map width="880" height="624"></canvas>${i}</div></div>
      <div class="sk-chart-plaque"><h1>Sky chart</h1><span>${p[e.port].name}</span></div>${a}</div>`}function Be(e,t){const n=Ae(e);let o="<p>No contracts posted today.</p>";if(e.freight){const i=e.freight.to;o=`<p>Deliver your consignment to <strong>${p[i].name}</strong>. The receiver pays ${C(e.freight.pay)} on arrival.</p>
      <div class="sk-actions">${t.button("Plot delivery route",()=>{t.settings.destination=i,t.go("chart")},{secondary:!0})}</div>`}else n&&(o=`<p>${n.special?"The tender skipper puts your name forward for a priority consignment.":"Carry a sealed consignment for the port office. The shipper supplies the cargo."}</p>
      ${Ee([["Destination",p[n.to].name],["On delivery",C(n.pay)]])}
      <div class="sk-actions">${t.button("Take freight contract",()=>t.act({type:"takeFreight"}),{secondary:!0})}</div>`);return`<aside class="sk-card"><div class="sk-card-head"><h2>Freight desk</h2></div>${o}</aside>`}function ct(e,t){const n=Math.max(0,A-e.coins);return`<article class="sk-invoice">
    <header><div><div class="sk-kicker">Glasshouse Lensworks</div><h2>Lens invoice</h2></div><span class="sk-invoice-seal">Awaiting payment</span></header>
    <p>For the Skyway Beacon · Bill to the captain of <i>The Wayfarer</i></p>
    <table><thead><tr><th scope="col">Item</th><th scope="col">Qty</th><th scope="col">Charge</th></tr></thead>
      <tbody><tr><td>Beacon lens, ground and polished</td><td>1</td><td>${C(A)}</td></tr>
      <tr><td>Fitting and alignment</td><td>1</td><td>Included</td></tr></tbody>
      <tfoot><tr><th scope="row" colspan="2">Total due</th><td>${C(A)}</td></tr></tfoot></table>
    <div class="sk-invoice-funds">${L("Cash on hand",C(e.coins))}${L(n?"Still to earn":"After payment",C(n||e.coins-A))}</div>
    <div class="sk-actions">${t.button(`Pay invoice · ${C(A)}`,()=>t.act({type:"payInvoice"}),{disabled:n>0})}
      ${t.button("Visit market",()=>t.go("market"),{secondary:!0})}</div></article>`}function dt(e,t){const n=()=>{t.settings.destination="meridian",t.go("chart")};return`<article class="sk-first-light"><div class="sk-scene">
    <img src="${N("glasshouse-lit")}" alt="The relit Skyway Beacon casting a gold beam over Glasshouse Reach at night">
    <header><div class="sk-kicker">The Skyway Beacon · Commission complete</div><h1>First light</h1></header>
    </div><div class="sk-layout"><section class="sk-card sk-light-copy"><blockquote class="sk-quote">Six weeks of dark. Then, from beyond the banks, a far-off pilot flashes a lamp in answer.</blockquote>
    <div class="sk-rewards">${L("Captain rank","Level II")}${L("Skyway opened","Meridian Spire")}</div>
    <div class="sk-actions">${e.ability?t.button("Open captain’s log",()=>t.go("log"),{secondary:!0}):t.button("Choose captain ability",()=>t.go("log"))}
    ${t.button("Chart Meridian Spire →",n,{secondary:!e.ability})}</div></section>${Be(e,t)}</div></article>`}function ht(e,t){const n=p[e.port];if(e.port==="glasshouse"&&e.mission==="lit")return dt(e,t);const i=e.port==="sunstep"&&e.mission==="offered",a=e.port==="glasshouse"&&e.mission==="invoice",s=a?"“Mind the edge, Captain. Three days at the wheel to get that curve. You’ve brought Vale’s letter? Good. I’ll put your name on the crate. Here’s the bill.”":ze(e),r=e.port==="copperfall"&&e.tender==="helped"?"Skipper Neri":n.keeper;let l="";if(a)l=ct(e,t);else{const d=i?t.button("Accept commission",()=>t.act({type:"acceptMission"})):e.mission==="lit"&&!e.ability?t.button("Choose captain ability",()=>t.go("log")):t.button("Open sky chart",()=>t.go("chart"),{secondary:!0});l=`<article class="sk-card"><div class="sk-card-head"><h2>The Skyway Beacon</h2>${e.mission==="lit"?'<span class="sk-tag">Completed</span>':""}</div><p>${Le(e)}</p><div class="sk-actions">${d}</div></article>`}const c=e.port==="meridian"?"talk-meridian":r==="Skipper Neri"?"talk-copperfall":null;return`<header class="sk-dialogue-heading"><div class="sk-kicker">${n.name} · Port authority</div><div class="sk-identity">
    ${c?`<img src="${N(c)}" alt="">`:""}<h1>${r}</h1></div></header>
    <div class="sk-office-dialogue"><blockquote class="sk-quote">${le(s)}</blockquote></div>
    ${l}${a&&e.coins<A?'<details class="sk-fold sk-ledger-fold"><summary>A word from the loading dock</summary><p>A glazier chalks <i>Copperfall</i> on a stack of panes. “Their winter gardens are framed and roofless. I can cut all week and the yard still wants more.”</p></details>':""}
    ${Be(e,t)}`}function ut(e,t){const n=e.voyage;if(!n)return Z(p[e.port].name,"Moored in port")+t.button("Return to harbor",()=>t.go("harbor"));let o="On passage",i="The last mooring line falls away.",a="Your solar sails draw taut. The chart table is lashed down and the lookout is at the rail.",s=t.button("Continue voyage →",()=>t.act({type:"continueVoyage"}));n.phase==="tender"?(o="A tender adrift",i="A signal lamp winks from below the lane.",a="A work tender hangs dead in a pocket of cloud. The skipper asks for a tow. Helping costs a day of trading.",s=t.button("Give them a tow · 1 day",()=>t.act({type:"tender",help:!0}))+t.button("Hold your course",()=>t.act({type:"tender",help:!1}),{secondary:!0})):n.phase==="raider"?(o="Sails on the bearing",i="The approaching ship turns its guns broadside.",a="A raider is closing on your schooner. Take the helm and fight, or shake pursuit in the cloud banks.",s=t.button("Take the helm",()=>t.act({type:"engage"}))+t.button("Evade the raider",()=>t.act({type:"evade"}),{secondary:!0})):n.phase==="battle"&&(o="Under fire",i="The gun crews stand ready.",a="Your schooner is engaged with a raider.",s="");const r=n.phase==="tender"?"tender":n.phase==="raider"||n.phase==="battle"?"raider-encounter":"passage";return`<div class="sk-voyage"><div class="sk-scene"><img src="${N(r)}" alt="">
    <header><div class="sk-kicker">En route</div><h1>${o}</h1></header></div>
    <article class="sk-card sk-voyage-brief"><div class="sk-voyage-story"><div class="sk-leg"><span>${p[n.from].name}</span><i class="sk-path" aria-hidden="true"></i><span>${p[n.to].name}</span></div>
    <blockquote class="sk-quote">${i}</blockquote><p>${a}</p></div><div class="sk-actions">${s}</div></article></div>`}function Pe(e,t,n,o,i){let a=Se.get(e.ownerDocument);(!a||a.port!==n.port)&&(a={port:n.port,destination:null,focusPort:null,side:"buy"},Se.set(e.ownerDocument,a)),a.lastView==="chart"&&t!=="chart"&&(a.destination=null,a.focusPort=null),a.lastView=t;const s=document.createElement("section");s.className="sk-interior",s.dataset.view=t;const r={sunstep:"authority",glasshouse:"office-iona",copperfall:"office-orr",meridian:"meridian"},l={market:"market",authority:n.port==="glasshouse"&&n.mission==="lit"?null:r[n.port],shipyard:"yard",chart:null,voyage:null,log:"sky-chart"}[t];l&&(s.classList.add("sk-illustrated"),s.style.setProperty("--sk-art",`url("${N(l)}")`));const c=[],d=m=>String(c.push(m)-1),h={act:o,go:i,settings:a,page:s,register:d,refresh:()=>Pe(e,t,n,o,i),button:(m,y,$={})=>`<button type="button" class="sk-button ${$.secondary?"sk-secondary":""}" data-action="${d(y)}" ${$.disabled?"disabled":""}>${m}</button>`},g=t==="voyage"?"":`<button class="sk-crumb" data-action="${d(()=>{a.destination=null,i("harbor")})}" aria-label="Return to harbor">← Harbor</button>`,f={market:ot,shipyard:rt,log:it,chart:lt,authority:ht,voyage:ut}[t](n,h),k=!!l;s.innerHTML=g+(k?`<div class="sk-room-overlay"><div class="sk-room-ledger">${f}</div></div>`:f),s.addEventListener("click",m=>{if(!(m.target instanceof Element))return;const y=m.target.closest("button[data-action]");y&&!y.disabled?c[Number(y.dataset.action)]?.():t==="chart"&&a.destination&&!m.target.closest(".sk-map-popover")&&s.querySelector(".sk-dismiss")?.click()}),s.addEventListener("input",m=>{if(!(m.target instanceof HTMLInputElement))return;const y=m.target.closest(".sk-order");if(!y)return;const $=y.querySelector(".sk-submit"),M=m.target.valueAsNumber,K=Number.isSafeInteger(M)&&M>0&&M<=Number(y.dataset.limit);$.disabled=!K,$.textContent=`${y.dataset.side==="buy"?"Buy":"Sell"} · ${C(K?Number(y.dataset.price)*M:0)}`}),e.replaceChildren(s);const w=s.querySelector("[data-map]");w&&(gt(w,n,a.destination),pt(s,a))}function pt(e,t){const n=e.querySelector(".sk-map-popover");if(!n){t.focusPort&&e.querySelector(`[data-port="${t.focusPort}"]`)?.focus({preventScroll:!0}),t.focusPort=null;return}const o=e.querySelector(`[data-port="${t.destination}"]`),i=n.querySelector(".sk-dismiss");function a(){const r=e.getBoundingClientRect(),l=o.getBoundingClientRect(),c=n.offsetWidth,d=n.offsetHeight,h=l.left-r.left+l.width/2,g=l.top-r.top+l.height/2,f=h<r.width/2?h+28:h-c-28;n.style.left=Math.max(8,Math.min(r.width-c-8,f))+"px";const k=r.width<560?g<r.height/2?g+30:g-d-30:g-d/2;n.style.top=Math.max(8,Math.min(r.height-d-8,k))+"px"}a(),e.querySelector(".sk-map-scroll").addEventListener("scroll",a,{passive:!0}),n.querySelector("details")?.addEventListener("toggle",a);const s=new ResizeObserver(()=>{e.isConnected?a():s.disconnect()});s.observe(e),e.addEventListener("keydown",r=>{r.key==="Escape"&&(r.preventDefault(),i.click())}),i.focus({preventScroll:!0})}function gt(e,t,n){const o=e.getContext("2d");if(!o)return;const{width:i,height:a}=e,s=r=>[i*ce[r][0]/100,a*ce[r][1]/100];for(let r=0;r<V.length;r++)for(let l=r+1;l<V.length;l++){const c=V[r],d=V[l],h=c===t.port&&d===n||c===n&&d===t.port,g=!G(t,c)||!G(t,d),[f,k]=s(c),[w,m]=s(d);o.setLineDash(h&&!g?[9,5]:g?[2,8]:[5,7]),o.lineWidth=h?2.8:1.1,o.strokeStyle=h&&!g?"#e0bd82":g?"#61847882":"#98a58b",o.beginPath(),o.moveTo(f,k),o.quadraticCurveTo((f+w)/2-8,(k+m)/2-18,w,m),o.stroke()}}const ft=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-anchor"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M12 6v16" />
  <path d="m19 13 2-1a9 9 0 0 1-18 0l2 1" />
  <path d="M9 11h6" />
  <circle cx="12" cy="4" r="2" />
</svg>
`,mt=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-arrow-right"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M5 12h14" />
  <path d="m12 5 7 7-7 7" />
</svg>
`,yt=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-arrow-up-right"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M7 7h10v10" />
  <path d="M7 17 17 7" />
</svg>
`,vt=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-book-open"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M12 7v14" />
  <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
</svg>
`,kt=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-calendar-days"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M8 2v4" />
  <path d="M16 2v4" />
  <rect width="18" height="18" x="3" y="4" rx="2" />
  <path d="M3 10h18" />
  <path d="M8 14h.01" />
  <path d="M12 14h.01" />
  <path d="M16 14h.01" />
  <path d="M8 18h.01" />
  <path d="M12 18h.01" />
  <path d="M16 18h.01" />
</svg>
`,wt=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-check"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M20 6 9 17l-5-5" />
</svg>
`,bt=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-chevron-right"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="m9 18 6-6-6-6" />
</svg>
`,$t=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-coins"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <circle cx="8" cy="8" r="6" />
  <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
  <path d="M7 6h1v4" />
  <path d="m16.71 13.88.7.71-2.82 2.82" />
</svg>
`,St=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-compass"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" />
  <circle cx="12" cy="12" r="10" />
</svg>
`,_t=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-expand"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="m15 15 6 6" />
  <path d="m15 9 6-6" />
  <path d="M21 16v5h-5" />
  <path d="M21 8V3h-5" />
  <path d="M3 16v5h5" />
  <path d="m3 21 6-6" />
  <path d="M3 8V3h5" />
  <path d="M9 9 3 3" />
</svg>
`,xt=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-flag"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528" />
</svg>
`,Ct=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-hammer"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9" />
  <path d="m18 15 4-4" />
  <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" />
</svg>
`,Mt=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-landmark"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M10 18v-7" />
  <path d="M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z" />
  <path d="M14 18v-7" />
  <path d="M18 18v-7" />
  <path d="M3 22h18" />
  <path d="M6 18v-7" />
</svg>
`,Tt=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-map-pin"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
  <circle cx="12" cy="10" r="3" />
</svg>
`,At=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-map"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
  <path d="M15 5.764v15" />
  <path d="M9 3.236v15" />
</svg>
`,It=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-message-circle"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
</svg>
`,qt=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-package"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
  <path d="M12 22V12" />
  <polyline points="3.29 7 12 12 20.71 7" />
  <path d="m7.5 4.27 9 5.15" />
</svg>
`,Et=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-sailboat"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M10 2v15" />
  <path d="M7 22a4 4 0 0 1-4-4 1 1 0 0 1 1-1h16a1 1 0 0 1 1 1 4 4 0 0 1-4 4z" />
  <path d="M9.159 2.46a1 1 0 0 1 1.521-.193l9.977 8.98A1 1 0 0 1 20 13H4a1 1 0 0 1-.824-1.567z" />
</svg>
`,Lt=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-scan-eye"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M3 7V5a2 2 0 0 1 2-2h2" />
  <path d="M17 3h2a2 2 0 0 1 2 2v2" />
  <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
  <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
  <circle cx="12" cy="12" r="1" />
  <path d="M18.944 12.33a1 1 0 0 0 0-.66 7.5 7.5 0 0 0-13.888 0 1 1 0 0 0 0 .66 7.5 7.5 0 0 0 13.888 0" />
</svg>
`,Bt=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-scroll-text"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M15 12h-5" />
  <path d="M15 8h-5" />
  <path d="M19 17V5a2 2 0 0 0-2-2H4" />
  <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" />
</svg>
`,Pt=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-settings-2"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M14 17H5" />
  <path d="M19 7h-9" />
  <circle cx="17" cy="17" r="3" />
  <circle cx="7" cy="7" r="3" />
</svg>
`,Ht=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-shield"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
</svg>
`,Rt=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-ship-wheel"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <circle cx="12" cy="12" r="8" />
  <path d="M12 2v7.5" />
  <path d="m19 5-5.23 5.23" />
  <path d="M22 12h-7.5" />
  <path d="m19 19-5.23-5.23" />
  <path d="M12 14.5V22" />
  <path d="M10.23 13.77 5 19" />
  <path d="M9.5 12H2" />
  <path d="M10.23 10.23 5 5" />
  <circle cx="12" cy="12" r="2.5" />
</svg>
`,Vt=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-shopping-basket"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="m15 11-1 9" />
  <path d="m19 11-4-7" />
  <path d="M2 11h20" />
  <path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4" />
  <path d="M4.5 15.5h15" />
  <path d="m5 11 4-7" />
  <path d="m9 11 1 9" />
</svg>
`,Ot=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-shrink"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="m15 15 6 6m-6-6v4.8m0-4.8h4.8" />
  <path d="M9 19.8V15m0 0H4.2M9 15l-6 6" />
  <path d="M15 4.2V9m0 0h4.8M15 9l6-6" />
  <path d="M9 4.2V9m0 0H4.2M9 9 3 3" />
</svg>
`,jt=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-sun"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <circle cx="12" cy="12" r="4" />
  <path d="M12 2v2" />
  <path d="M12 20v2" />
  <path d="m4.93 4.93 1.41 1.41" />
  <path d="m17.66 17.66 1.41 1.41" />
  <path d="M2 12h2" />
  <path d="M20 12h2" />
  <path d="m6.34 17.66-1.41 1.41" />
  <path d="m19.07 4.93-1.41 1.41" />
</svg>
`,Nt=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-sunset"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M12 10V2" />
  <path d="m4.93 10.93 1.41 1.41" />
  <path d="M2 18h2" />
  <path d="M20 18h2" />
  <path d="m19.07 10.93-1.41 1.41" />
  <path d="M22 22H2" />
  <path d="m16 6-4 4-4-4" />
  <path d="M16 18a4 4 0 0 0-8 0" />
</svg>
`,Dt=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-users"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
  <path d="M16 3.128a4 4 0 0 1 0 7.744" />
  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
  <circle cx="9" cy="7" r="4" />
</svg>
`,Ft=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-volume-2"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
  <path d="M16 9a5 5 0 0 1 0 6" />
  <path d="M19.364 18.364a9 9 0 0 0 0-12.728" />
</svg>
`,Wt=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-volume-x"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
  <line x1="22" x2="16" y1="9" y2="15" />
  <line x1="16" x2="22" y1="9" y2="15" />
</svg>
`,Gt=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-wind"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M12.8 19.6A2 2 0 1 0 14 16H2" />
  <path d="M17.5 8a2.5 2.5 0 1 1 2 4H2" />
  <path d="M9.8 4.4A2 2 0 1 1 11 8H2" />
</svg>
`,zt=`<!-- @license lucide-static v0.563.0 - ISC -->
<svg
  class="lucide lucide-x"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M18 6 6 18" />
  <path d="m6 6 12 12" />
</svg>
`,Kt=Object.assign({"../node_modules/lucide-static/icons/anchor.svg":ft,"../node_modules/lucide-static/icons/arrow-right.svg":mt,"../node_modules/lucide-static/icons/arrow-up-right.svg":yt,"../node_modules/lucide-static/icons/book-open.svg":vt,"../node_modules/lucide-static/icons/calendar-days.svg":kt,"../node_modules/lucide-static/icons/check.svg":wt,"../node_modules/lucide-static/icons/chevron-right.svg":bt,"../node_modules/lucide-static/icons/coins.svg":$t,"../node_modules/lucide-static/icons/compass.svg":St,"../node_modules/lucide-static/icons/expand.svg":_t,"../node_modules/lucide-static/icons/flag.svg":xt,"../node_modules/lucide-static/icons/hammer.svg":Ct,"../node_modules/lucide-static/icons/landmark.svg":Mt,"../node_modules/lucide-static/icons/map-pin.svg":Tt,"../node_modules/lucide-static/icons/map.svg":At,"../node_modules/lucide-static/icons/message-circle.svg":It,"../node_modules/lucide-static/icons/package.svg":qt,"../node_modules/lucide-static/icons/sailboat.svg":Et,"../node_modules/lucide-static/icons/scan-eye.svg":Lt,"../node_modules/lucide-static/icons/scroll-text.svg":Bt,"../node_modules/lucide-static/icons/settings-2.svg":Pt,"../node_modules/lucide-static/icons/shield.svg":Ht,"../node_modules/lucide-static/icons/ship-wheel.svg":Rt,"../node_modules/lucide-static/icons/shopping-basket.svg":Vt,"../node_modules/lucide-static/icons/shrink.svg":Ot,"../node_modules/lucide-static/icons/sun.svg":jt,"../node_modules/lucide-static/icons/sunset.svg":Nt,"../node_modules/lucide-static/icons/users.svg":Dt,"../node_modules/lucide-static/icons/volume-2.svg":Ft,"../node_modules/lucide-static/icons/volume-x.svg":Wt,"../node_modules/lucide-static/icons/wind.svg":Gt,"../node_modules/lucide-static/icons/x.svg":zt});function x(e){return Kt["../node_modules/lucide-static/icons/"+e+".svg"]?.replace("<svg",'<svg aria-hidden="true" focusable="false" class="ui-icon"')??""}function Ut(e){switch(e.port){case"sunstep":return{name:"Moss Pellar",role:"Orchard porter",greeting:e.mission==="lit"?"Saw your light come on last night. The night shift cheered so loud my mule dropped a whole basket of pears.":"Hold the rope a tick, Captain. These pears bruise if you look at them cross-eyed. There. What can I do for you?",topics:[{ask:"Where would you take a hold full of pears?",answer:`Glasshouse Reach. All those mouths at the furnaces and hardly a pear tree between them. Provisions buy here for ${H(e,"sunstep","provisions").buy} crowns a crate today.`,visit:{label:"Buy provisions at the market",view:"market"}},{ask:e.mission==="lit"?"Who’s sailing the outer route?":"Where can a new captain find work?",answer:e.mission==="lit"?"Weather boats out of Meridian. They go up for days, and every pair of hands wants dinner. Take them a few pears from me.":"Vale’s office. Mind the pear skins on her steps. She also has bonded mail for captains whose pockets have worn clean through.",visit:e.mission==="lit"?{label:"Find Meridian on the chart",view:"chart"}:{label:"Call on Harbormaster Vale",view:"authority"}}]};case"glasshouse":return{name:"Sella Venn",role:"Master glazier",greeting:e.mission==="lit"?"Look there. See that clean edge on the beam? Three days I spent grinding that edge.":"Watch your sleeves. A pane can look perfectly cold and still take the hem clean off your coat.",topics:[{ask:"Who buys all this glass?",answer:`Copperfall’s fitting out winter gardens. They’ll buy panes faster than I can anneal them. A crate of ${j.glass.name.toLowerCase()} goes for ${H(e,"glasshouse","glass").buy} crowns here today.`,visit:{label:"Look at the glass stalls",view:"market"}},{ask:e.mission==="lit"?"How far does that light carry?":"What’s keeping the beacon dark?",answer:e.mission==="lit"?"On a clear watch you can see it from Sunstep. Pilots can make the passage to Meridian Spire again, and I can finally get some sleep.":e.mission==="invoice"?`That lens has my thumbprint in the rim. Keeper Iona has it packed upstairs. She’s waiting on the ${A} crowns for the glass and fitting.`:"I finished the replacement. Iona minds the lamp and the bill. She’s in the port office, counting the hours till a captain comes through with Vale’s commission.",visit:e.mission==="lit"?{label:"Examine the outer passage",view:"chart"}:{label:"Speak with Keeper Iona",view:"authority"}}]};case"copperfall":{const t=e.tender==="helped",n=t&&!e.specialFreightTaken,o=R.contract;return{name:"Skipper Neri",role:"Tender skipper",greeting:t?"I’d know that mainsail anywhere. I was still waving at the cloud where you’d been when the towline finally came off. Sit a minute.":e.tender==="passed"?"I remember that sail. Looked a fair bit smaller from the deck of a dead tender. Anyway. You wanted something?":"Keep a hand on your hat. When that yard crane swings, it kicks up a crosswind fit to steal the pins out of your hair.",topics:[{ask:t?"How’s the tender holding up?":"Any work on these docks?",answer:n?`Dry as a biscuit, thanks to you. I saved you a freight run to ${p[o.to].name}. Pays ${o.pay} crowns. Tell the clerk Neri sent you.`:t?"Better every day. I put my name down beside yours in the freight ledger. Ask the clerk what’s headed out next.":"There’s ordinary bonded mail at the office. Take it to the port on the docket and the receiver pays you there.",visit:{label:"Check the freight desk",view:"authority"}},{ask:"What leaves Copperfall in those crates?",answer:"Machinery. Listen close and you can hear the gears knock together. Sunstep’s orchard lifts chew through the stuff. I’ve hauled enough to rebuild the whole hillside.",visit:{label:"Price a crate of machinery",view:"market"}}]}}case"meridian":return{name:"Pilot Sen",role:"Weather pilot",greeting:"I keep the old bearing chalked on this rail. See? That’s where the beacon came up. We’ve been launching sounding balloons ever since.",topics:[{ask:"What do your crews run short of?",answer:`Food. One tin of peaches gets six grown pilots arguing over a spoon. Today our market pays ${H(e,"meridian","provisions").sell} crowns per crate of provisions.`,visit:{label:"Visit the provisions buyers",view:"market"}},{ask:"How do I find my way back?",answer:"Lay a course for Glasshouse Reach. Two days on that bearing and you’ll see Iona’s lamp across the bow. From there, Sunstep’s only another day.",visit:{label:"Spread out the sky chart",view:"chart"}}]}}}function Yt(e,t,n,o){const i=Ut(t),a=document.activeElement instanceof HTMLElement?document.activeElement:null,s=document.createElement("section");s.className="dock-talk",s.setAttribute("role","dialog"),s.setAttribute("aria-label","Conversation with "+i.name);const r=document.createElement("img");r.src="./art/talk-"+t.port+".webp",r.alt="",r.className="talk-portrait";const l=document.createElement("div");l.className="talk-copy";const c=document.createElement("p");c.className="talk-role",c.textContent=i.role;const d=document.createElement("h2");d.textContent=i.name;const h=document.createElement("p");h.className="talk-speech",h.tabIndex=-1;const g=document.createElement("div");g.className="talk-replies";const f=document.createElement("button");f.type="button",f.className="talk-close",f.setAttribute("aria-label","End conversation"),f.title="End conversation (Escape)",f.textContent="×";function k(){s.remove(),o(),a?.isConnected&&a.focus({preventScroll:!0})}function w(y,$){const M=document.createElement("button");M.type="button",M.textContent=y,M.addEventListener("click",$),g.append(M)}function m(y){h.textContent=y?.answer??i.greeting,g.replaceChildren(),y&&w(y.visit.label,()=>{k(),n(y.visit.view)});for(const $ of i.topics)$!==y&&w($.ask,()=>m($));w("Take your leave",k),h.focus({preventScroll:!0})}f.addEventListener("click",k),s.addEventListener("keydown",y=>{y.key==="Escape"&&(y.preventDefault(),y.stopPropagation(),k())}),l.append(c,d,h,g),s.append(r,l,f),e.replaceChildren(s),m()}const Qt=`
  attribute vec2 position;
  varying vec2 uv;
  void main() {
    uv = position * .5 + .5;
    gl_Position = vec4(position, 0., 1.);
  }
`,Jt=`
  precision mediump float;
  varying vec2 uv;
  uniform float time;
  uniform vec3 tint;
  uniform vec2 glass;
  uniform float night;
  uniform float aspect;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(23.13, 51.71))) * 1374.57); }
  void main() {
    vec2 p = vec2(uv.x, 1. - uv.y);
    // Slow pools of light on glass and a few drifting seeds, visible chiefly against shade.
    vec2 pane = (p - glass) * vec2(aspect * 1.8, 1.2);
    float glow = exp(-dot(pane, pane) * 65.) * (.012 + .013 * sin(time * .55));
    vec2 drift = p * vec2(29. * aspect, 29.) + vec2(time * .16, time * .07);
    vec2 cell = floor(drift);
    float seed = hash(cell);
    vec2 center = vec2(.3 + .4 * seed, .48 + .18 * sin(time * .44 + seed * 20.));
    float distance = length(fract(drift) - center);
    float mote = (1. - smoothstep(.014, .05, distance)) * step(.92,seed) *
      smoothstep(.25,.64,p.y) * (.12 + .12 * sin(time + seed * 7.));
    float light = glow + mote + night * .016 * exp(-dot(pane,pane)*30.);
    gl_FragColor = vec4(tint, clamp(light, 0., .22));
  }
`;function Xt(e,t,n){if(matchMedia("(prefers-reduced-motion: reduce)").matches)return()=>{};const o=e.getContext("webgl",{alpha:!0,antialias:!1,premultipliedAlpha:!1,powerPreference:"low-power"});if(!o)return()=>{};function i(m,y){const $=o.createShader(m);return o.shaderSource($,y),o.compileShader($),$}const a=i(o.VERTEX_SHADER,Qt),s=i(o.FRAGMENT_SHADER,Jt),r=o.createProgram();if(o.attachShader(r,a),o.attachShader(r,s),o.linkProgram(r),!o.getProgramParameter(r,o.LINK_STATUS))return o.deleteProgram(r),o.deleteShader(a),o.deleteShader(s),o.getExtension("WEBGL_lose_context")?.loseContext(),()=>{};o.useProgram(r);const l=o.createBuffer();o.bindBuffer(o.ARRAY_BUFFER,l),o.bufferData(o.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),o.STATIC_DRAW);const c=o.getAttribLocation(r,"position");o.enableVertexAttribArray(c),o.vertexAttribPointer(c,2,o.FLOAT,!1,0,0),o.uniform2f(o.getUniformLocation(r,"glass"),t[0]/100,t[1]/100),o.uniform3f(o.getUniformLocation(r,"tint"),1,n?.81:.89,n?.56:.66),o.uniform1f(o.getUniformLocation(r,"night"),n?1:0);const d=o.getUniformLocation(r,"time"),h=o.getUniformLocation(r,"aspect");let g=0,f=-100;const k=new ResizeObserver(()=>{const m=Math.min(1100,Math.max(1,e.clientWidth));e.width=m,e.height=Math.max(1,Math.round(m*e.clientHeight/Math.max(1,e.clientWidth))),o.viewport(0,0,e.width,e.height),o.uniform1f(h,e.width/e.height)});k.observe(e);function w(m){!document.hidden&&m-f>=44&&(f=m,o.uniform1f(d,m%1e6/1e3),o.drawArrays(o.TRIANGLES,0,3)),g=requestAnimationFrame(w)}return g=requestAnimationFrame(w),()=>{cancelAnimationFrame(g),k.disconnect(),o.deleteBuffer(l),o.deleteProgram(r),o.deleteShader(a),o.deleteShader(s),o.getExtension("WEBGL_lose_context")?.loseContext()}}const He="skyrates.sound";let Y=null,q=null,P=!1;try{P=localStorage.getItem(He)==="on"}catch{}function _e(){return P}function ge(){return Y??=new AudioContext,Y.state==="suspended"&&Y.resume().catch(()=>{}),Y}function Re(){if(!P||q||typeof AudioContext>"u")return;const e=ge(),t=e.createBuffer(1,e.sampleRate*4,e.sampleRate),n=t.getChannelData(0);let o=0;for(let s=0;s<n.length;s++)o=(o+.04*(Math.random()*2-1))/1.04,n[s]=o*Math.sin(Math.PI*s/n.length)**2;q=e.createBufferSource(),q.buffer=t,q.loop=!0;const i=e.createBiquadFilter();i.type="lowpass",i.frequency.value=600;const a=e.createGain();a.gain.value=.17,q.connect(i).connect(a).connect(e.destination),q.start()}function z(e){if(!P||typeof AudioContext>"u")return;const t=ge();({select:[392],trade:[660,880],dock:[392,587],mission:[392,493.88,587.33,783.99]})[e].forEach((o,i)=>{const a=t.currentTime+i*.12,s=a+(e==="select"?.08:.7),r=t.createOscillator(),l=t.createGain();r.type="sine",r.frequency.value=o,l.gain.setValueAtTime(1e-4,a),l.gain.exponentialRampToValueAtTime(e==="select"?.018:.065,a+.012),l.gain.exponentialRampToValueAtTime(1e-4,s),r.connect(l).connect(t.destination),r.start(a),r.stop(s),r.onended=()=>{r.disconnect(),l.disconnect()}})}function Zt(){P=!P;try{localStorage.setItem(He,P?"on":"off")}catch{}P?(Re(),z("dock")):q&&(q.stop(),q.disconnect(),q=null)}function an(e){if(!P||typeof AudioContext>"u")return;const t=ge(),n=t.currentTime,o=e==="cannon"?.48:e==="hit"?.26:.38,i=t.createBuffer(1,Math.ceil(t.sampleRate*o),t.sampleRate),a=i.getChannelData(0);for(let d=0;d<a.length;d++)a[d]=Math.random()*2-1;const s=t.createBufferSource();s.buffer=i;const r=t.createBiquadFilter();r.type=e==="grapple"?"bandpass":"lowpass",r.frequency.setValueAtTime(e==="cannon"?1850:2400,n),r.frequency.exponentialRampToValueAtTime(e==="grapple"?420:140,n+o);const l=t.createGain();l.gain.setValueAtTime(1e-4,n),l.gain.exponentialRampToValueAtTime(.21,n+.006),l.gain.exponentialRampToValueAtTime(1e-4,n+o),s.connect(r).connect(l).connect(t.destination);const c=t.createOscillator();c.type=e==="grapple"?"triangle":"sine",c.frequency.setValueAtTime(e==="grapple"?280:115,n),c.frequency.exponentialRampToValueAtTime(e==="grapple"?48:33,n+o),c.connect(l),s.start(n),c.start(n),c.stop(n+o),c.onended=()=>{c.disconnect(),s.disconnect(),r.disconnect(),l.disconnect()}}const W={sunstep:{region:"The Inner Reaches",weather:"Clear skies",local:"Moss Pellar",role:"Orchard porter",glass:[38,34],zones:{market:[1,37,24,85,14,62],local:[26,57,36,95,30,64],authority:[25,16,53,64,42,47],ship:[54,25,78,64,65,49],shipyard:[79,20,99,74,90,52]}},glasshouse:{region:"The Inner Reaches",weather:"Violet haze",local:"Sella Venn",role:"Master glazier",glass:[21,26],zones:{market:[1,32,28,67,15,49],local:[19,59,32,98,24,65],authority:[35,7,59,65,48,48],ship:[59,19,79,62,70,45],shipyard:[80,20,99,76,90,49]}},copperfall:{region:"The Inner Reaches",weather:"Fair winds",local:"Skipper Neri",role:"Tender skipper",glass:[88,56],zones:{market:[1,30,23,86,14,57],local:[22,55,32,94,27,63],authority:[27,14,58,69,44,47],ship:[59,20,74,68,66,47],shipyard:[75,13,99,77,89,49]}},meridian:{region:"The Outer Reaches",weather:"High cirrus",local:"Pilot Sen",role:"Weather pilot",glass:[47,32],zones:{market:[1,30,25,81,13,55],local:[23,58,34,95,28,64],authority:[28,13,58,68,44,46],ship:[57,20,78,67,68,49],shipyard:[79,17,99,78,90,52]}}},en={market:"shopping-basket",local:"message-circle",authority:"scroll-text",ship:"sailboat",shipyard:"hammer"},tn=["market","authority","ship","shipyard","local"];function nn(e,t){switch(t){case"market":return["Port Market","Trade cargo","Visit Port Market"];case"local":return[W[e.port].local,W[e.port].role,"Talk to "+W[e.port].local];case"authority":return[p[e.port].keeper,e.port==="sunstep"&&e.mission==="offered"?"Commission available":"Port authority","Visit Port Authority · "+p[e.port].keeper];case"ship":return["The Wayfarer","Board your schooner","Board The Wayfarer"];case"shipyard":return["Shipyard","Refit & recruit","Visit Shipyard"]}}function on(e,t){const[n,o,i,a,s,r]=W[e.port].zones[t],[l,c,d]=nn(e,t),h=t==="authority"&&(e.port==="sunstep"&&e.mission==="offered"||e.port==="glasshouse"&&e.mission==="invoice");return`<button type="button" class="quay-spot ${t==="local"?"person":""} ${h?"commission-spot":""}" data-place="${t}"
      aria-label="${d}" style="--l:${n}%;--t:${o}%;--w:${i-n}%;--h:${a-o}%;--x:${(s-n)*100/(i-n)}%;--y:${(r-o)*100/(a-o)}%">
      <span class="hover-zone"></span><span class="place-pin">${x(en[t])}</span>
      <span class="place-label"><b>${l}</b><small>${c}</small></span>
    </button>`}function sn(e,t,n){const o=W[t.port],i=t.mission==="lit"&&["sunstep","glasshouse"].includes(t.port),a="art/quay-"+t.port+(i?"-lit":"")+".webp";e.innerHTML=`<section class="quay" aria-label="${p[t.port].name} harbor">
    <div class="quay-scroll" tabindex="-1"><div class="quay-track"><div class="quay-plate">
      <img class="quay-art" alt="The working docks at ${p[t.port].name}" src="${a}" fetchpriority="high">
      <canvas class="quay-air" aria-hidden="true"></canvas>
      ${tn.map(u=>on(t,u)).join("")}
    </div></div></div>
    <div class="quay-shade" aria-hidden="true"></div>
    <header class="quay-title"><span class="quay-region"><i></i>${o.region}</span><h1>${p[t.port].name}</h1>
      <p>${x(i?"sunset":"sun")}<span>Day ${String(t.day).padStart(2,"0")}</span><i></i>${i?"Night watch":o.weather}</p></header>
    <div class="pocket"><span class="coin-readout" title="Available crowns">${x("coins")} <b>${t.coins.toLocaleString("en-US")}</b><span>crowns</span></span><button class="scene-tool" type="button" data-tool="settings" aria-label="Game options" title="Game options">${x("settings-2")}</button></div>
    <div class="field-tools"><button class="chart-tool" type="button" data-go="chart" aria-label="Sky chart"><img src="compass.svg" alt=""><span>Sky chart</span></button>
      <button class="scene-tool journal-tool" type="button" data-go="log" aria-label="Captain’s log" title="Captain’s log">${x("book-open")}</button></div>
    <button class="discover" type="button" data-tool="labels" aria-pressed="false" title="Toggle place names (H)">${x("scan-eye")}<span>Show places</span><kbd>H</kbd></button>
    <div class="pan-hints"><button type="button" aria-label="Pan left" data-pan="-1">‹</button><button type="button" aria-label="Pan right" data-pan="1">›</button></div>
    <div class="quay-overlay" hidden></div></section>`;const s=e.querySelector(".quay"),r=s.querySelector(".quay-scroll"),l=s.querySelector(".quay-track"),c=s.querySelector(".quay-overlay"),d=s.querySelector('[data-tool="labels"]'),h=s.querySelector(".quay-plate");let g=null,f=.5;const k=new ResizeObserver(()=>{const u=l.offsetWidth-r.clientWidth;s.classList.toggle("pannable",u>70),r.scrollLeft=u*f});k.observe(r),r.addEventListener("scroll",()=>{const u=l.offsetWidth-r.clientWidth;u>0&&(f=r.scrollLeft/u)},{passive:!0});const w=Xt(s.querySelector("canvas"),o.glass,i);function m(){const u=s.classList.toggle("show-places");d.setAttribute("aria-pressed",String(u)),d.querySelector("span").textContent=u?"Hide places":"Show places"}function y(){c.replaceChildren(),c.hidden=!0,s.classList.remove("reading"),g?.focus({preventScroll:!0}),g=null}function $(u){g=u,c.hidden=!1,s.classList.add("reading")}function M(){c.innerHTML=`<section class="pocket-menu" role="dialog" aria-label="Game options"><div class="popover-top"><h2>Game options</h2><button data-close aria-label="Close options">${x("x")}</button></div>
      <button class="menu-line" data-sound>${x(_e()?"volume-2":"volume-x")} Sound <b>${_e()?"On":"Off"}</b></button>
      ${document.fullscreenEnabled?`<button class="menu-line" data-full>${x(document.fullscreenElement?"shrink":"expand")} ${document.fullscreenElement?"Leave fullscreen":"Enter fullscreen"}</button>`:""}
      <p class="device-save">${x("check")} ${e.dataset.saved==="false"?"Storage unavailable":"Progress saved on this device"}</p></section>`,c.querySelector("[data-close]").focus({preventScroll:!0})}function K(){const u=Math.round(t.ship.hull/t.ship.maxHull*100);c.innerHTML=`<section class="vessel-sheet" role="dialog" aria-labelledby="vessel-name"><div class="popover-top"><span class="ink-label">Ship’s papers</span><button type="button" data-close aria-label="Close ship manifest">${x("x")}</button></div>
      <img src="art/kestrel.webp" alt="Solar-sail schooner in profile"><h2 id="vessel-name">The Wayfarer</h2><p>Lift-keel schooner</p>
      <dl><div><dt>${x("shield")} Hull</dt><dd>${u}%</dd></div><div><dt>${x("package")} Hold</dt><dd>${ue(t)} / ${t.ship.hold}</dd></div><div><dt>${x("users")} Crew</dt><dd>${t.ship.crew} hands</dd></div></dl>
      <button type="button" class="gold-action" data-go="chart">${x("compass")} Plot a course ${x("arrow-right")}</button></section>`,c.querySelector("[data-close]").focus({preventScroll:!0})}function me(u){if(!(u.target instanceof Element))return;const b=u.target.closest("button");if(!b){u.target===c&&y();return}const{place:U,go:ve,tool:ke,pan:we}=b.dataset;if(ve){n(ve);return}if(U==="local"){$(b),z("select"),Yt(c,t,n,y);return}if(U==="ship"){$(b),z("select"),K();return}if(U){n(U);return}ke==="labels"&&m(),ke==="settings"&&($(b),M()),we&&r.scrollBy({left:Number(we)*r.clientWidth*.56,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"}),"close"in b.dataset&&y(),"sound"in b.dataset&&(Zt(),M(),c.querySelector("[data-sound]")?.focus()),"full"in b.dataset&&(document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()).then(y).catch(()=>M())}function ye(u){if(!(u.ctrlKey||u.metaKey||u.altKey)){if(!c.hidden){if(u.key==="Escape"){u.preventDefault(),y();return}if(u.key==="Tab"){const b=Array.from(c.querySelectorAll("button:not(:disabled)"));b.length&&u.shiftKey&&b[0]===document.activeElement?(u.preventDefault(),b.at(-1)?.focus()):b.length&&!u.shiftKey&&b.at(-1)===document.activeElement&&(u.preventDefault(),b[0].focus())}return}u.code==="KeyH"&&(u.preventDefault(),m()),u.code==="KeyM"&&(u.preventDefault(),n("chart")),u.code==="KeyJ"&&(u.preventDefault(),n("log"))}}return h.addEventListener("focusin",u=>{if(!(u.target instanceof HTMLButtonElement)||!s.classList.contains("pannable"))return;const b=u.target.querySelector(".place-pin")?.getBoundingClientRect();b&&(b.left<35||b.right>r.clientWidth-35)&&r.scrollBy({left:b.left+b.width/2-r.clientWidth/2})}),s.addEventListener("click",me),document.addEventListener("keydown",ye),()=>{k.disconnect(),w(),document.removeEventListener("keydown",ye),s.removeEventListener("click",me)}}const fe=document.querySelector("#app");fe.innerHTML='<a class="skip" href="#main">Skip to game</a><main id="main" tabindex="-1"></main><div id="toast" role="status" aria-live="polite"></div>';const I=fe.querySelector("#main"),ne=fe.querySelector("#toast");let oe,v=nt(),Ve=qe(v),B=v.voyage?v.voyage.phase==="battle"?"battle":"voyage":"harbor",se,re=0,xe;function Oe(e){window.clearTimeout(xe),ne.textContent=e,ne.classList.toggle("visible",!!e),e&&(xe=window.setTimeout(()=>ne.classList.remove("visible"),5500))}function Ce(e){v.voyage&&e!=="battle"&&e!=="voyage"||(z("select"),B=e,Oe(""),ee(),window.scrollTo({top:0,behavior:"instant"}),I.focus({preventScroll:!0}))}function ie(e){const t=v,n=Qe(v,e);if(n===t)return;v=n,Ve=qe(v);const o=!!t.voyage&&!v.voyage;v.voyage?B=v.voyage.phase==="battle"?"battle":"voyage":o&&(B="harbor"),z(e.type==="payInvoice"?"mission":o?"dock":["buy","sell","upgrade"].includes(e.type)?"trade":"select"),ee(),(o||e.type==="sail"||e.type==="engage"||e.type==="payInvoice")&&window.scrollTo({top:0,behavior:"instant"}),Oe(v.notice)}function ee(){const e=++re;if(se?.(),se=void 0,oe?.(),oe=void 0,I.dataset.saved=String(Ve),I.dataset.screen=B,document.title=(B==="harbor"?p[v.port].name:{market:"Port Market",chart:"Sky chart",log:"Captain’s log",battle:"Battle stations",shipyard:"Shipyard",authority:"Port Authority",voyage:"On passage"}[B])+" · Skyrates",B==="harbor")oe=sn(I,v,Ce);else if(B==="battle"&&v.voyage){const t=v.voyage;I.innerHTML='<section class="battle-loading" role="status">Taking the helm…</section>',De(async()=>{const{mountBattle:n}=await import("./battle-gGUFq2NQ.js");return{mountBattle:n}},__vite__mapDeps([0,1,2]),import.meta.url).then(({mountBattle:n})=>{if(e!==re||v.voyage?.id!==t.id)return;I.replaceChildren();const o={victory:"won",boarded:"boarded",defeat:"lost",escaped:"escaped"};se=n(I,{crew:v.ship.crew,skill:Te(v)/v.ship.crew,gunLevel:v.ship.guns,hullLevel:(v.ship.maxHull-100)/25,quickGunnery:v.ability==="gunner",startingHull:v.ship.hull,shipName:"The Wayfarer",onFinish:(i,a)=>ie({type:"resolveBattle",id:t.id,result:o[i],hull:a})})}).catch(()=>{e===re&&(I.innerHTML='<section class="battle-loading"><p>The encounter could not load.</p><button class="gold-action" data-retry>Retry encounter</button><button class="mission-action" data-withdraw>Withdraw to port</button></section>',I.querySelector("[data-retry]")?.addEventListener("click",ee),I.querySelector("[data-withdraw]")?.addEventListener("click",()=>ie({type:"resolveBattle",id:t.id,result:"escaped",hull:v.ship.hull})))})}else Pe(I,B,v,ie,Ce)}document.addEventListener("pointerdown",Re,{once:!0});ee();export{an as b};
