const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./battle-DTlgEbcJ.js","./phaser-DFK5Ua9d.js","./battle-LcnBQ-3-.css"])))=>i.map(i=>d[i]);
(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))o(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const a of s.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&o(a)}).observe(document,{childList:!0,subtree:!0});function t(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function o(r){if(r.ep)return;r.ep=!0;const s=t(r);fetch(r.href,s)}})();const yn="modulepreload",vn=function(e,n){return new URL(e,n).href},Ve={},ze=function(n,t,o){let r=Promise.resolve();if(t&&t.length>0){let d=function(c){return Promise.all(c.map(p=>Promise.resolve(p).then(f=>({status:"fulfilled",value:f}),f=>({status:"rejected",reason:f}))))};const a=document.getElementsByTagName("link"),i=document.querySelector("meta[property=csp-nonce]"),l=i?.nonce||i?.getAttribute("nonce");r=d(t.map(c=>{if(c=vn(c,o),c in Ve)return;Ve[c]=!0;const p=c.endsWith(".css"),f=p?'[rel="stylesheet"]':"";if(o)for(let y=a.length-1;y>=0;y--){const w=a[y];if(w.href===c&&(!p||w.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${c}"]${f}`))return;const v=document.createElement("link");if(v.rel=p?"stylesheet":yn,p||(v.as="script"),v.crossOrigin="",v.href=c,l&&v.setAttribute("nonce",l),document.head.appendChild(v),p)return new Promise((y,w)=>{v.addEventListener("load",y),v.addEventListener("error",()=>w(new Error(`Unable to preload CSS for ${c}`)))})}))}function s(a){const i=new Event("vite:preloadError",{cancelable:!0});if(i.payload=a,window.dispatchEvent(i),!i.defaultPrevented)throw a}return r.then(a=>{for(const i of a||[])i.status==="rejected"&&s(i.reason);return n().catch(s)})},g={sunstep:{name:"Sunstep Quay",subtitle:"Agricultural skyport",description:"Orchards climb the mooring towers. Crates of pears ride the same cables down to market that carry engine parts back up.",keeper:"Harbormaster Vale",requiredLevel:1,mailTo:"glasshouse",daysTo:{sunstep:0,glasshouse:1,copperfall:2,meridian:3},specialty:"provisions",prices:{provisions:5,glass:19,machinery:32,grafts:12,prisms:23,governors:38,soundings:32}},glasshouse:{name:"Glasshouse Reach",subtitle:"Beacon station",description:"Violet furnaces burn beneath acres of glass. Beyond the terraces, the Skyway Beacon stands dark above the cloud sea.",keeper:"Keeper Iona",requiredLevel:1,mailTo:"copperfall",daysTo:{sunstep:1,glasshouse:0,copperfall:1,meridian:2},specialty:"glass",prices:{provisions:14,glass:11,machinery:25,grafts:18,prisms:25,governors:29,soundings:52}},copperfall:{name:"Copperfall Yard",subtitle:"Industrial skyport",description:"Copper cranes swing half-built keels over the mist. The yard crews are fitting their new winter gardens with glazing.",keeper:"Yardmaster Orr",requiredLevel:1,mailTo:"sunstep",daysTo:{sunstep:2,glasshouse:1,copperfall:0,meridian:3},specialty:"machinery",prices:{provisions:11,glass:24,machinery:16,grafts:29,prisms:34,governors:19,soundings:34}},meridian:{name:"Meridian Spire",subtitle:"Outer skyways",description:"Beyond the beacon, chart balloons launch from a white spire. The weather crews pay handsomely for provisions.",keeper:"Pilot Sen",requiredLevel:2,mailTo:"glasshouse",daysTo:{sunstep:3,glasshouse:2,copperfall:3,meridian:0},specialty:"soundings",prices:{provisions:19,glass:15,machinery:29,grafts:26,prisms:52,governors:33,soundings:24}}},R={provisions:{name:"Provisions",description:"Orchard fruit and grain, packed for the skyways."},glass:{name:"Solar glass",description:"Cut panes that gather sunlight for gardens and sails."},grafts:{name:"Pear grafts",description:"Living orchard scions wrapped in damp moss for Copperfall’s shallow beds."},prisms:{name:"Prism blanks",description:"Flaw-tested pieces from the annealing tunnel, prized by balloon surveyors."},governors:{name:"Governor spindles",description:"Matched proof-bench spindles for the weight cages at Sunstep."},soundings:{name:"Sounding folios",description:"Sealed pressure readings that furnace crews use to time their draw."},machinery:{name:"Machinery",description:"Brass gearsets and governors for working keels."}},ue={broker:{name:"Silver Tongue",description:"Pay 10% less when buying cargo."},gunner:{name:"Quick Gunnery",description:"Your cannon crews reload faster."},leader:{name:"Boarding Captain",description:"Your crew fights 25% more effectively when boarding."}},C={premium:60,home:"sunstep",keeperPort:"glasshouse",opens:"meridian",startingCoins:78,invoiceCost:240,xp:100,notoriety:3},ve={safeOpeningVoyages:1,tenderFromVoyage:2,raiderInterval:3},D={towDays:1,notoriety:1,xp:10,contract:{from:"copperfall",to:"sunstep",pay:85,xp:12}},xe={basePay:14,payPerDay:4,xp:3},A=C.invoiceCost,B=["provisions","glass","machinery","grafts","prisms","governors","soundings"],O=["sunstep","glasshouse","copperfall","meridian"],Te=["broker","gunner","leader"],kn=["hold","hull","guns","crew","veteran","repair"],Ge=["spring","summer","autumn","winter"],wn=12;function U(e){return Ge[Math.floor((Math.max(1,e)-1)/wn)%4]}const Ye={sunstep:{region:"Warm orchard terraces",heading:35,wind:6,weather:{spring:["rain","rain","clear","haze"],summer:["clear","haze","clear","rain"],autumn:["clear","haze","rain","clear"],winter:["frost","rain","clear","haze"]}},glasshouse:{region:"High inversion shelf",heading:78,wind:10,weather:{spring:["haze","rain","frost","haze"],summer:["clear","haze","clear","rain"],autumn:["haze","frost","rain","clear"],winter:["frost","frost","squall","haze"]}},copperfall:{region:"Leeward industrial basin",heading:304,wind:7,weather:{spring:["clear","rain","haze","clear"],summer:["haze","clear","haze","clear"],autumn:["clear","haze","rain","clear"],winter:["frost","clear","haze","frost"]}},meridian:{region:"Exposed survey spire",heading:250,wind:17,weather:{spring:["squall","rain","clear","haze"],summer:["clear","squall","haze","clear"],autumn:["squall","rain","squall","clear"],winter:["frost","squall","haze","frost"]}}},Se={clear:["Clear skies",.12,0],haze:["High haze",.25,1],rain:["Rain bands",.55,4],frost:["Ice crystals",.43,2],squall:["Passing squalls",.9,8]},bn=["N","NE","E","SE","S","SW","W","NW"],$n={sunstep:0,glasshouse:1,copperfall:2,meridian:3};function xn(e,n){let t=Math.imul(e+41,73244475)^Math.imul(n+7,295559667);return t=Math.imul(t^t>>>16,73244475),(t^t>>>16)>>>0}function Ke(e,n,t,o){const r=Math.round(Math.hypot(t,o)),s=(Math.atan2(t,-o)*180/Math.PI+360)%360;return{kind:e,season:n,wind:{x:t/24,y:o/24},severity:Se[e][1],summary:Se[e][0],bearing:bn[Math.round(s/45)%8],knots:r}}function te(e,n){const t=Ye[e],o=U(n),r=xn(n,$n[e]),s=t.weather[o],a=s[r%s.length],i=(t.heading+(r>>>5)%67-33+Ge.indexOf(o)*13)*Math.PI/180,l=t.wind+Se[a][2]+(r>>>12)%5;return Ke(a,o,Math.sin(i)*l,-Math.cos(i)*l)}function Ue(e,n,t){if(e===n)return te(e,t);const o=t+g[e].daysTo[n],r=te(e,t),s=te(n,o),a=r.severity>s.severity?r:s;return Ke(a.kind,U(t+Math.floor((o-t)/2)),24*(r.wind.x*.4+s.wind.x*.6),24*(r.wind.y*.4+s.wind.y*.6))}function Qe(e){const n=e.voyage;return n?Ue(n.from,n.to,e.day-g[n.from].daysTo[n.to]):te(e.port,e.day)}const Sn={sunstep:{spring:[{good:"machinery",adjustment:4,reason:"Spring rain floods the lowest terraces. Growers need pump gear."}],summer:[{good:"glass",adjustment:3,reason:"Nurseries are expanding their shade roofs."}],autumn:[{good:"provisions",adjustment:-2,reason:"The pear harvest crowds the weighing floor."},{good:"governors",adjustment:6,reason:"Fruit cages run double shifts with their heaviest loads."}],winter:[{good:"provisions",adjustment:3,reason:"Stored fruit is running low."},{good:"glass",adjustment:5,reason:"Cold nights threaten the nursery roofs."}]},glasshouse:{spring:[{good:"soundings",adjustment:5,reason:"Rapid pressure changes threaten the furnace draw."}],summer:[{good:"glass",adjustment:-2,reason:"Long bright shifts send more solar panes to market."}],autumn:[{good:"machinery",adjustment:4,reason:"Annealers service their furnace drives before the freeze."}],winter:[{good:"provisions",adjustment:6,reason:"Overnight crews stay on the frost watch."},{good:"governors",adjustment:5,reason:"Furnace blowers need steady pressure through the inversion."}]},copperfall:{spring:[{good:"grafts",adjustment:3,reason:"The night-shift garden has fresh planting beds."}],summer:[{good:"provisions",adjustment:4,reason:"Heat dries the shallow beds in the leeward basin."}],autumn:[{good:"glass",adjustment:6,reason:"Gardeners glaze the winter beds before the first freeze."}],winter:[{good:"glass",adjustment:8,reason:"Cold snaps crack the glass that protects the winter crop."},{good:"grafts",adjustment:5,reason:"Replacement trees must take root under cover."}]},meridian:{spring:[{good:"prisms",adjustment:5,reason:"Survey crews fit optics for the first long flights."}],summer:[{good:"soundings",adjustment:-3,reason:"Clear survey windows put extra folios on the exchange."}],autumn:[{good:"soundings",adjustment:6,reason:"Squall season closes balloon windows and fresh readings are scarce."},{good:"prisms",adjustment:7,reason:"Survey crews replace optics damaged in the outer squalls."}],winter:[{good:"provisions",adjustment:8,reason:"Isolated balloon crews draw winter stores."}]}};function Je(e,n){return Sn[e][U(n)]}function Cn(e,n,t){return Je(e,t).find(o=>o.good===n)?.adjustment??0}const Ce=["briefing","dodge","fire","board","melee","debrief"];function _n(e){return Ce[Ce.indexOf(e)+1]}const zt=[{side:"port",station:0,key:1},{side:"starboard",station:0,key:3},{side:"port",station:1,key:2},{side:"starboard",station:1,key:4}];function Gt(e){return(e.side==="port"?1:3)+e.station}function Yt(e,n){const t={...n},o=Math.max(1,Math.hypot(t.x-e.x,t.y-e.y));return{origin:{...e},aim:t,length:o,direction:{x:(t.x-e.x)/o,y:(t.y-e.y)/o},traveled:0,cue:1.6}}function Kt(e){return{x:e.origin.x+e.direction.x*e.traveled,y:e.origin.y+e.direction.y*e.traveled}}function Ut(e,n){const t=n.x-e.origin.x,o=n.y-e.origin.y,r=t*e.direction.x+o*e.direction.y,s=Math.abs(t*e.direction.y-o*e.direction.x);return e.traveled>r+40&&s>=35}const Qt={briefing:{chapter:"Harbor Watch",title:"Take the helm",text:"The cream sails are yours. The red cutter is flying the watch pennant for a chalk-round exercise. Your cargo, coins and hull are safe. Move, fire once, then bring a boarding party alongside."},dodge:{chapter:"01 / 03 · Helm",title:"Leave the red firing lane",text:"The dashed line shows where the cutter has aimed. Press W to sail forward, or order a course to the green buoy. Your wake shows where you’ve been."},fire:{chapter:"02 / 03 · Gunnery",title:"Bring your port cannon to bear",text:"Round clear. Your cannon fires from the left rail. Turn with A / D or use the helm order below. When the fan turns gold, click the cutter or press 1. Watch the reload strip under the gun."},board:{chapter:"03 / 03 · Boarding",title:"Bring the hulls together",text:"Shot landed. Order a boarding run with B, or steer into the cutter yourself. The grapples catch when the hulls touch."},melee:{chapter:"03 / 03 · Boarding",title:"Your crew takes the deck",text:"Watch your deckhands cross the lines. They fight on their own. More hands and veteran fighters improve your odds, especially against a damaged enemy."},debrief:{chapter:"Watch exercise complete",title:"Cleared for the skyway",text:"The watch recalls its boarding party. In a real encounter you can also break away at the edge of the engagement. The shipyard can fit more guns for a broadside."}},Xe=3,ae=e=>Math.floor((e-1)/Xe),pe=e=>(ae(e)+1)*Xe+1,M={sunstep:{market:"Common Weighhouse",yard:"Liftwrights’ Shed",institution:"Grafting Arcade",district:"Orchard Commons",practice:"A porter reads the public balance while a grower fits a new scion. Every terrace has a vote, and every weight can be challenged.",tradeLead:"Glasshouse furnace crews buy provisions. Copperfall’s winter garden pays for living pear grafts. Only Sunstep sells the nursery lots.",stock:{provisions:42,machinery:2,grafts:3},upgrades:["hold","crew","repair"],specialty:"grafts",order:{good:"governors",quantity:1,premium:18,name:"Repair the lift cage",need:"The last freight cage shudders when a loaded cart goes on. The coop needs one matched spindle from Copperfall."}},glasshouse:{market:"Furnace Exchange",yard:"Glassworkers’ Berth",institution:"Annealing Tunnel",district:"Furnace Choir",practice:"Three bells hand a batch from gatherer to annealer to reader. The reader turns every blank against a flame before it leaves the tunnel.",tradeLead:"Copperfall is glazing its winter gardens. The rarer prism blanks sell to Meridian’s weather pilots once the outer route opens.",stock:{provisions:6,glass:36,prisms:2},upgrades:["crew","repair"],specialty:"prisms",order:{good:"soundings",quantity:1,premium:22,name:"Time the furnace draw",need:"Sudden pressure changes spoil a draw. The annealers want a recent sounding folio from Meridian."}},copperfall:{market:"Chain Market",yard:"Keel Proof Slip",institution:"Winter Garden",district:"Chain Assembly",practice:"Pear saplings grow where a salvaged keel once stood. Each night shift sends one gardener, and each occupied slip sends a delegate to the chain.",tradeLead:"Sunstep imports machinery and matched spindles for its orchard lifts. The yard’s heavy plating and cannon refits are exclusive to its proof slip.",stock:{provisions:9,machinery:30,governors:3},upgrades:["hull","guns","veteran","repair"],specialty:"governors",order:{good:"grafts",quantity:2,premium:28,name:"Plant the night shift garden",need:"Two shallow-rooted pear grafts from Sunstep will fill the beds under the new glass roof."}},meridian:{market:"Balloon Exchange",yard:"Pilots’ Loft",institution:"Sounding House",district:"Outer Survey",practice:"A pilot and a winch keeper sign each observation together. Bolts of signal silk snap above a slate crowded with the morning returns.",tradeLead:"The outer crews pay handsomely for provisions. Sealed sounding folios from this desk earn their best return at the Glasshouse furnaces.",stock:{provisions:4,glass:4,soundings:2},upgrades:["veteran","repair"],specialty:"soundings",order:{good:"prisms",quantity:1,premium:24,name:"Replace a balloon optic",need:"The sounding crews need one flaw-tested prism from Glasshouse for the returning balloon’s instrument."}}},Mn={provisions:"Common",glass:"Trade staple",machinery:"Trade staple",grafts:"Limited nursery lot",prisms:"Rare optical lot",governors:"Limited proof lot",soundings:"Rare survey issue"};function Tn(e,n,t){const o=M[e].stock[n];return o?Math.max(1,o-ae(t)%Math.min(3,o)):0}const Ze="skyrates.save.v1",ge=g[C.opens].requiredLevel;function qn(){const e={version:1,port:C.home,day:1,coins:C.startingCoins,cargo:{provisions:{quantity:0,cost:0},glass:{quantity:0,cost:0},machinery:{quantity:0,cost:0},grafts:{quantity:0,cost:0},prisms:{quantity:0,cost:0},governors:{quantity:0,cost:0},soundings:{quantity:0,cost:0}},ship:{hold:12,hull:100,maxHull:100,guns:0,cannons:1,crew:6,veterans:1},level:1,xp:0,notoriety:0,ability:null,mission:"offered",firstWatch:"new",certificate:"none",tender:"unseen",specialFreightTaken:!1,voyageCount:0,voyage:null,drill:null,exchange:Ae(1),pricesSeen:{},freight:null,log:[{day:1,text:"Took the helm at Sunstep Quay. Harbormaster Vale has a commission waiting."}],notice:"",pendingNotices:[]};return se(e),e}function qe(e,n){return g[e].daysTo[n]}function re(e,n){return O.includes(n)&&e.level>=g[n].requiredLevel}function Ie(e){return B.reduce((n,t)=>n+e.cargo[t].quantity,0)}function F(e,n,t){const o=(Math.floor((e.day-1)/3)+O.indexOf(n)+B.indexOf(t))%3,r=Math.max(3,g[n].prices[t]+o-1+Cn(n,t,e.day)),s=Math.floor(r*.9),a=Math.max(1,Math.min(r-2,s-1));return{buy:e.ability==="broker"?s:r,sell:a}}function Ae(e){return{cycle:ae(e),purchases:{},orders:[],services:[]}}function Q(e){return e.exchange.cycle===ae(e.day)?e.exchange:Ae(e.day)}function ye(e,n,t){const o=Q(e).purchases[n]?.[t]??0;return Math.max(0,Tn(n,t,e.day)-o)}function se(e,n=e.port){e.pricesSeen[n]={day:e.day,prices:Object.fromEntries(B.map(t=>[t,F(e,n,t)])),stock:Object.fromEntries(B.map(t=>[t,ye(e,n,t)]))}}function en(e){const n=M[e.port].order,t=n.quantity*F(e,e.port,n.good).sell+n.premium,o=Q(e).orders.includes(e.port);return{...n,pay:t,filled:o,ready:!o&&e.cargo[n.good].quantity>=n.quantity}}function nn(e){const n=Q(e).services.includes(e.port);return e.port==="glasshouse"?{name:"Reserve a cooling rack",description:"Bring two solar glass and eight crowns. The choir will anneal one optical prism blank for your hold.",used:n,ready:!n&&e.coins>=8&&e.cargo.glass.quantity>=2}:e.port==="meridian"?{name:"Buy the pilot dispatch",description:"Six crowns buys today’s courier sheet of prices and remaining lots at all four ports. Read it in your sky chart.",used:n,ready:!n&&e.coins>=6}:null}function tn(e){return(e.ship.crew+1.5*e.ship.veterans)*(e.ability==="leader"?1.25:1)}function In(e){return e.notoriety>=6?"Famed sky captain":e.notoriety>=3?"Known on the skyways":e.notoriety>=1?"Familiar face":"Unknown captain"}function An(e){switch(e.port){case"sunstep":return e.mission==="lit"?"“I saw it from the quay last night. First light on the outer route in six weeks.” Vale makes room for you at the chart table.":e.mission==="offered"?"“You carried those letters up my steps in all weathers. Now there are six bags under my desk. The beacon toll fund is frozen until an outer pilot witnesses the light. Will you carry the risk with us?”":e.notoriety>0?"Vale puts down her manifest. “The pilots have been talking about you. How fares the beacon?”":"“A light for every ship past the horizon,” Vale says. “You’ll find the keeper above the glassworks.”";case"glasshouse":return e.mission==="accepted"?"Iona dries her hands on her apron. “That looks like Vale’s seal. Shall we see what she’s sent me?”":e.mission==="invoice"?`Iona sets a brass-bound crate on the counter. “Lens is cut. Fitting is included. That’ll be ${A} crowns.” A dockworker mentions Copperfall is buying glass for its greenhouses.`:e.mission==="lit"?"“Come up and see it tonight,” Iona says. A ribbon of light sweeps the glazing sheds.":"The keeper polishes a lens beside the cold lamp. “Vale at Sunstep is still looking for a captain.”";case"copperfall":return e.tender==="helped"&&!e.specialFreightTaken?"“Neri says you towed her in. She left you a freight docket. I put it aside on my desk.”":e.tender==="helped"?"“Neri vouches for you. Pull up a chair, Captain.”":e.tender==="passed"?"Neri has lashed a spare towline to the tender. At the desk, the yardmaster points you to the ordinary freight board.":"“Our furnace crews can make a keel in a week,” Orr says. “But every pane in our new greenhouses has to be shipped in.”";case"meridian":return e.notoriety>=3?"“There’s the beacon captain!” Pilot Sen beckons you to the front berth. “We’ve a hungry weather crew up here.”":"Pilot Sen ties off your bowline. “Welcome to the outer skyways.”"}}function on(e){if(e.voyage||e.freight)return null;const n=D.contract;if(e.port===n.from&&e.tender==="helped"&&!e.specialFreightTaken)return{to:n.to,pay:n.pay,special:!0};const t=g[e.port].mailTo;return{to:t,pay:xe.basePay+xe.payPerDay*qe(e.port,t),special:!1}}function rn(e,n){const t=Ln(e,n);return{...t,available:t.available&&M[e.port].upgrades.includes(n)}}function Ln(e,n){const t=e.ship;switch(n){case"hold":return{name:"Hold extension",description:"Fit racks for 4 more crates.",cost:48+(t.hold-12)*5,available:t.hold<32};case"hull":return{name:"Hull plating",description:"Increase maximum and current hull by 25.",cost:65+(t.maxHull-100),available:t.maxHull<200};case"guns":return{name:t.cannons<4?"Fit another cannon":"Cannon refit",description:t.cannons<4?["","Add a starboard bow gun.","Fit a second port gun for a broadside.","Fit a second starboard gun for a broadside."][t.cannons]:"Improve power and reload speed on all four guns.",cost:70+40*t.guns,available:t.guns<3};case"crew":return{name:"Hire deckhands",description:"Sign on two novice deckhands.",cost:26,available:t.crew+2<=24};case"veteran":return{name:"Hire a veteran",description:"Sign on one fighter worth 2½ novice hands in a boarding action.",cost:44,available:t.crew<24};case"repair":return{name:"Repair hull",description:"Restore the hull to full strength.",cost:Math.ceil((t.maxHull-t.hull)/2),available:t.hull<t.maxHull}}}function x(e,n){e.notice=n,e.log.unshift({day:e.day,text:n})}function ie(e,n){e.xp=Math.min(e.level===1?90:199,e.xp+n)}function Z(e,n=""){const t=e.voyage;if(!t)return;const o=t.from;if(e.port=t.to,e.voyage=null,se(e),x(e,"Docked at "+g[e.port].name+" after leaving "+g[o].name+"."),e.freight?.to===e.port){const s=e.freight;e.coins+=s.pay,e.freight=null,ie(e,s.special?D.contract.xp:xe.xp),x(e,(s.special?"Delivered Neri’s freight":"Delivered the bonded freight")+" and earned "+s.pay+" crowns.")}e.port===C.keeperPort&&e.mission==="accepted"&&x(e,"Moored below the glassworks. Iona receives dispatches at the lamp office above the furnaces.");const r=D.contract;e.port===r.from&&e.tender==="helped"&&!e.specialFreightTaken&&x(e,`Skipper Neri remembers your tow. A freight run to ${g[r.to].name} is yours for ${r.pay} crowns.`),n&&(e.notice=n+" "+e.notice)}function _e(e,n){const t=Math.round(e.cost*n/e.quantity);return e.quantity-=n,e.cost-=t,t}function En(e,n){const{good:t,quantity:o}=n;if(!B.includes(t)||!Number.isSafeInteger(o)||o<=0)return!1;const r=e.cargo[t],s=F(e,e.port,t);if(n.type==="buy"){const a=o*s.buy;if(a>e.coins||o>e.ship.hold-Ie(e)||o>ye(e,e.port,t))return!1;e.exchange=Q(e);const i=e.exchange.purchases[e.port]??={};i[t]=(i[t]??0)+o,e.coins-=a,r.quantity+=o,r.cost+=a,x(e,"Bought "+o+" "+R[t].name.toLowerCase()+" for "+a+" crowns.")}else{if(o>r.quantity)return!1;const a=o*s.sell,i=_e(r,o);e.coins+=a;const l=a-i;l>0&&ie(e,Math.min(6,l));const d=l===0?"Broke even.":`${Math.abs(l)}-crown ${l>0?"profit":"loss"}.`;x(e,`Sold ${o} ${R[t].name.toLowerCase()} for ${a} crowns. ${d}`)}return se(e),!0}function Pn(e,n){const t=e.voyage;if(!t)return!1;switch(n.type){case"continueVoyage":return t.phase!=="underway"?!1:(t.id<=ve.safeOpeningVoyages?Z(e):e.tender==="unseen"&&t.id>=ve.tenderFromVoyage?(t.phase="tender",e.notice="A tender hangs under a torn solar sail. Its skipper signals for a tow."):t.id%ve.raiderInterval===0?(t.phase="raider",e.notice="A raider crosses your wake. You have room to give her the slip."):Z(e),!0);case"tender":return t.phase!=="tender"?!1:(n.help?(e.tender="helped",e.day+=D.towDays,e.notoriety+=D.notoriety,ie(e,D.xp),x(e,`Gave Skipper Neri’s tender a tow. She works out of ${g[D.contract.from].name}.`)):(e.tender="passed",x(e,"Passed the stranded tender and kept to the sailing schedule.")),Z(e,e.notice),!0);case"evade":return t.phase!=="raider"?!1:(x(e,"Evaded a raider among the cloud banks."),Z(e,e.notice),!0);case"engage":return t.phase!=="raider"?!1:(t.phase="battle",e.notice="Battle stations. The raider is closing.",!0);case"resolveBattle":{if(t.phase!=="battle"||n.id!==t.id||!Number.isFinite(n.hull)||!["lost","won","boarded","escaped"].includes(n.result))return!1;if(e.ship.hull=Math.min(e.ship.maxHull,Math.max(1,Math.round(n.hull))),n.result==="lost"){e.ship.hull=Math.max(e.ship.hull,Math.ceil(e.ship.maxHull*.35));const o=Math.floor(e.coins*.2);e.coins-=o,x(e,"The raider took "+o+" crowns in ransom and let you limp into port.")}else if(n.result==="escaped")x(e,"Broke contact with the raider and reached friendly skies.");else{const o=n.result==="boarded"?40:25;e.coins+=o,e.notoriety+=1,ie(e,12),x(e,(n.result==="boarded"?"The crew took the raider by boarding":"Drove off the raider")+" and claimed "+o+" crowns.")}return Z(e,e.notice),!0}default:return!1}}function Bn(e,n){switch(n.type){case"buy":case"sell":return En(e,n);case"fillCityOrder":{const t=en(e);if(!t.ready)return!1;const o=_e(e.cargo[t.good],t.quantity);return e.exchange=Q(e),e.exchange.orders.push(e.port),e.coins+=t.pay,ie(e,6),x(e,`Filled “${t.name}” for ${t.pay} crowns. Cargo cost ${o} crowns. The receipt bears the seal of the ${M[e.port].institution}.`),!0}case"useCityService":{if(!nn(e)?.ready)return!1;if(e.exchange=Q(e),e.exchange.services.push(e.port),e.port==="glasshouse"){const t=_e(e.cargo.glass,2);e.coins-=8,e.cargo.prisms.quantity++,e.cargo.prisms.cost+=t+8,x(e,"The choir packed one annealed prism blank in your hold. The glass and rack fee are entered in its cost.")}else{e.coins-=6;for(const t of O)se(e,t);x(e,"Your chart now holds today’s prices and available lots from every exchange.")}return!0}case"acceptMission":return e.port!==C.home||e.mission!=="offered"?!1:(e.mission="accepted",x(e,"Accepted Vale’s commission. Visit Keeper Iona at Glasshouse Reach to relight the Skyway Beacon."),!0);case"presentCommission":return e.port!==C.keeperPort||e.mission!=="accepted"?!1:(e.mission="invoice",x(e,`Iona opens Vale’s dispatch. The lens costs ${A} crowns. The Compact repays it with a ${C.premium}-crown premium at Meridian.`),!0);case"deliverCertificate":return e.port!==C.opens||e.certificate!=="aboard"?!1:(e.certificate="paid",e.coins+=A+C.premium,x(e,`Pilot Sen countersigned the light. Received ${A+C.premium} crowns from the beacon toll fund.`),!0);case"payInvoice":return e.port!==C.keeperPort||e.mission!=="invoice"||e.coins<A?!1:(e.coins-=A,e.mission="lit",e.certificate="aboard",e.level=ge,e.xp+=C.xp,e.notoriety+=C.notoriety,x(e,`Paid the lens invoice. The Skyway Beacon shines again. Reached level ${e.level}, gained a captain ability, and opened ${g[C.opens].name}. Bring Iona’s certificate to Pilot Sen for repayment.`),!0);case"practiceDrill":return e.drill="briefing",e.notice="",!0;case"sail":return n.to===e.port||!re(e,n.to)?!1:(e.voyageCount+=1,e.day+=qe(e.port,n.to),e.voyageCount===1&&e.port==="sunstep"&&(e.drill="briefing"),e.voyage={id:e.voyageCount,from:e.port,to:n.to,phase:"underway"},e.notice="Underway for "+g[n.to].name+".",!0);case"takeFreight":{const t=on(e);return t?(e.freight={...t,from:e.port},t.special&&(e.specialFreightTaken=!0),x(e,"Signed for "+(t.special?"Neri’s cargo":"bonded mail")+" to "+g[t.to].name+" for "+t.pay+" crowns. The dispatch travels in the ship’s mail locker."),!0):!1}case"upgrade":{if(!kn.includes(n.upgrade))return!1;const t=rn(e,n.upgrade);if(!t.available||e.coins<t.cost)return!1;e.coins-=t.cost;const o=e.ship;switch(n.upgrade){case"hold":o.hold+=4;break;case"hull":o.maxHull+=25,o.hull+=25;break;case"guns":o.guns+=1,o.cannons=Math.min(4,o.cannons+1);break;case"crew":o.crew+=2;break;case"veteran":o.crew+=1,o.veterans+=1;break;case"repair":o.hull=o.maxHull;break}return x(e,t.name+" at "+g[e.port].name+" for "+t.cost+" crowns."),!0}case"chooseAbility":return e.level<ge||e.ability||!Te.includes(n.ability)?!1:(e.ability=n.ability,se(e),x(e,"Learned "+ue[n.ability].name+"."),!0);default:return!1}}function Hn(e,n){return e.drill===null||_n(e.drill)!==n?e:{...e,drill:n}}function jn(e,n){const t=structuredClone(e);return e.drill?n.type!=="endDrill"||!n.skip&&e.drill!=="debrief"?e:(t.drill=null,t.notice="",!n.skip&&e.voyage&&(x(t,"Cleared the Harbor Watch exercise. The Wayfarer can continue her passage."),t.pendingNotices.push(t.notice)),t):(e.voyage?Pn(t,n):Bn(t,n))?(t.notice&&t.pendingNotices.push(t.notice),t):e}function _(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function S(e,n=0){return typeof e=="number"&&Number.isSafeInteger(e)&&e>=n}function z(e){return O.includes(e)}function Ne(e){return _(e)&&S(e.buy,1)&&S(e.sell,1)&&e.sell<e.buy}function De(e){if(!_(e)||!S(e.day,1)||!_(e.prices))return!1;const n=e.prices;return["provisions","glass","machinery"].every(t=>Ne(n[t]))&&Object.entries(n).every(([t,o])=>B.includes(t)&&Ne(o))&&(e.stock===void 0||sn(e.stock))}function sn(e){return _(e)&&Object.entries(e).every(([n,t])=>B.includes(n)&&S(t))}function On(e,n){if(!_(e)||!S(e.cycle)||e.cycle>ae(n)||!_(e.purchases))return!1;const t=o=>Array.isArray(o)&&o.every(z)&&new Set(o).size===o.length;return t(e.orders)&&t(e.services)&&Object.entries(e.purchases).every(([o,r])=>z(o)&&sn(r))}function Rn(e,n,t){return e===null||_(e)&&S(e.id,1)&&e.id===t&&e.from===n&&z(e.to)&&e.from!==e.to&&typeof e.phase=="string"&&["underway","tender","raider","battle"].includes(e.phase)}function Wn(e){return e===null||_(e)&&z(e.from)&&z(e.to)&&e.from!==e.to&&S(e.pay,1)&&typeof e.special=="boolean"}function Vn(e){return _(e)&&S(e.hold,1)&&S(e.hull,1)&&S(e.maxHull,e.hull)&&S(e.guns)&&S(e.cannons,1)&&e.cannons<=4&&S(e.crew,1)&&S(e.veterans)&&e.veterans<=e.crew}function Nn(e){if(!_(e)||e.version!==1||!z(e.port)||!(e.drill===null||Ce.includes(e.drill))||e.drill!==null&&e.voyage!==null&&!(_(e.voyage)&&e.voyage.id===1&&e.voyage.from==="sunstep"&&e.voyage.phase==="underway")||!S(e.day,1)||!S(e.coins)||!S(e.xp)||!S(e.notoriety)||!S(e.voyageCount)||e.level!==1&&e.level!==ge||!(e.ability===null||Te.includes(e.ability))||!["new","arrived","briefed"].includes(String(e.firstWatch))||typeof e.mission!="string"||!["offered","accepted","invoice","lit"].includes(e.mission)||!(e.mission==="lit"?e.certificate==="aboard"||e.certificate==="paid":e.certificate==="none")||typeof e.tender!="string"||!["unseen","helped","passed"].includes(e.tender)||typeof e.specialFreightTaken!="boolean"||typeof e.notice!="string"||!Array.isArray(e.pendingNotices)||!e.pendingNotices.every(o=>typeof o=="string")||!Array.isArray(e.log)||e.level===ge!=(e.mission==="lit")||e.level===1&&(e.ability!==null||e.level<g[e.port].requiredLevel||_(e.voyage)&&z(e.voyage.to)&&e.level<g[e.voyage.to].requiredLevel)||e.specialFreightTaken&&e.tender!=="helped"||!e.log.every(o=>_(o)&&S(o.day,1)&&typeof o.text=="string")||!Rn(e.voyage,e.port,e.voyageCount)||!Wn(e.freight)||!On(e.exchange,e.day)||!Vn(e.ship)||!_(e.cargo)||!_(e.pricesSeen))return!1;const n=e.cargo;let t=0;for(const o of B){const r=n[o];if(!_(r)||!S(r.quantity)||!S(r.cost)||r.quantity===0&&r.cost!==0)return!1;t+=r.quantity}return t<=e.ship.hold&&De(e.pricesSeen[e.port])&&Object.entries(e.pricesSeen).every(([o,r])=>z(o)&&De(r))}function J(e,n){try{return(n??globalThis.localStorage).setItem(Ze,JSON.stringify(e)),!0}catch{return!1}}function Dn(e){try{const n=(e??globalThis.localStorage).getItem(Ze);if(n){const t=JSON.parse(n);if(_(t)&&t.version===1){if(t.firstWatch===void 0&&(t.firstWatch="briefed"),t.pendingNotices===void 0&&(t.pendingNotices=[]),t.certificate===void 0&&(t.certificate=t.mission==="lit"?"aboard":"none"),t.drill===void 0&&(t.drill=null),t.exchange===void 0&&S(t.day,1)&&_(t.cargo)){t.exchange=Ae(t.day);for(const o of["grafts","prisms","governors","soundings"])t.cargo[o]===void 0&&(t.cargo[o]={quantity:0,cost:0})}_(t.ship)&&t.ship.cannons===void 0&&(t.ship.cannons=t.voyageCount===0&&t.ship.guns===0?1:4)}if(Nn(t))return t}}catch{}return qn()}function an(e){const n=M[e.port],t=[["What must I buy before sailing?","The galley and lift cells are supplied at the berth. Rations, drinking water and fuel cost you nothing. Provisions in the market are crates to sell. You can sail with an empty hold and an empty purse."],["How do I earn my first crowns?","Vale’s freight desk pays on delivery. A sealed dispatch takes no cargo space and needs no advance. For a first trade, buy a few crates of Sunstep provisions, carry them to Glasshouse, then sell through the Furnace Exchange. Copperfall buys Glasshouse solar glass for its winter garden."],["Where do I go next?","Open the sky chart and unfold Captain’s orders. Locate an order to mark its destination. Select a port to see the passage, recorded prices and Set sail. Present commissions to the named keeper in person."],["Why underwrite the lens?","Vale wants the mail lane open. You advance 240 crowns for Iona’s lens. First light earns your outer-route charter and a captain ability. Deliver the relighting certificate to Pilot Sen at Meridian to receive 300 crowns. The payment leaves you 60 crowns ahead."],["How do I fight and board?","Your first departure from Sunstep includes a Harbor Watch exercise with chalk rounds. Watch the incoming line, steer clear, turn your port gun toward the other ship and fire. Closing to hull contact starts a boarding action. Crew numbers, experienced hands and prior hull damage change the odds. Replay the drill at the yard."],["What changes as people hear of me?","Giving a stranded skipper a tow costs a day and earns a referral. Victories and public service bring renown. When the beacon lights, open your log to choose a trade, gunnery or leadership ability."],["Where can I repair and refit?","Every berth can repair your hull. Buy hold extensions at Sunstep or heavy plating and extra guns at Copperfall. Find experienced hands at Copperfall and Meridian. A freight run can pay for a repair even with an empty purse."]],o=document.createElement("dialog");o.className="watch-handbook",o.innerHTML=`<header><div><small>Ship’s papers · The Wayfarer</small><h2>Captain’s handbook</h2></div><button type="button" aria-label="Close handbook">×</button></header><p>Moored at ${g[e.port].name}. ${n.tradeLead}</p>${t.map(([r,s],a)=>`<details ${a===0?"open":""}><summary>${r}</summary><p>${s}</p></details>`).join("")}`,o.querySelector("button").onclick=()=>o.close(),o.addEventListener("close",()=>o.remove(),{once:!0}),document.body.append(o),o.showModal()}function Fn(e,n,t,o){const r=document.createElement("aside");r.className="first-watch-note",r.setAttribute("aria-label","First watch orders"),r.innerHTML='<button type="button" class="watch-dismiss" aria-label="Stow first watch orders">×</button><small>Vale’s note · first watch</small><p>The galley is stocked. Come up to the port office for your papers, Captain.</p><div><button type="button" data-meet>Visit Vale</button><button type="button" data-read>Read handbook</button></div>',r.querySelector("[data-meet]").onclick=()=>{o(),t()},r.querySelector("[data-read]").onclick=()=>an(n),r.querySelector(".watch-dismiss").onclick=()=>{o(),r.remove()},e.append(r)}const ln="skyrates.sound";let he=null,j=null,N=!1;try{N=localStorage.getItem(ln)==="on"}catch{}function fe(){return N}function Le(){return he??=new AudioContext,he.state==="suspended"&&he.resume().catch(()=>{}),he}function cn(){if(!N||j||typeof AudioContext>"u")return;const e=Le(),n=e.createBuffer(1,e.sampleRate*4,e.sampleRate),t=n.getChannelData(0);let o=0;for(let a=0;a<t.length;a++)o=(o+.04*(Math.random()*2-1))/1.04,t[a]=o*Math.sin(Math.PI*a/t.length)**2;j=e.createBufferSource(),j.buffer=n,j.loop=!0;const r=e.createBiquadFilter();r.type="lowpass",r.frequency.value=600;const s=e.createGain();s.gain.value=.17,j.connect(r).connect(s).connect(e.destination),j.start()}function X(e){if(!N||typeof AudioContext>"u")return;const n=Le();({select:[392],trade:[660,880],dock:[392,587],mission:[392,493.88,587.33,783.99]})[e].forEach((o,r)=>{const s=n.currentTime+r*.12,a=s+(e==="select"?.08:.7),i=n.createOscillator(),l=n.createGain();i.type="sine",i.frequency.value=o,l.gain.setValueAtTime(1e-4,s),l.gain.exponentialRampToValueAtTime(e==="select"?.018:.065,s+.012),l.gain.exponentialRampToValueAtTime(1e-4,a),i.connect(l).connect(n.destination),i.start(s),i.stop(a),i.onended=()=>{i.disconnect(),l.disconnect()}})}function dn(){N=!N;try{localStorage.setItem(ln,N?"on":"off")}catch{}N?(cn(),X("dock")):j&&(j.stop(),j.disconnect(),j=null)}function Jt(e){if(!N||typeof AudioContext>"u")return;const n=Le(),t=n.currentTime,o=e==="cannon"?.48:e==="hit"?.26:.38,r=n.createBuffer(1,Math.ceil(n.sampleRate*o),n.sampleRate),s=r.getChannelData(0);for(let c=0;c<s.length;c++)s[c]=Math.random()*2-1;const a=n.createBufferSource();a.buffer=r;const i=n.createBiquadFilter();i.type=e==="grapple"?"bandpass":"lowpass",i.frequency.setValueAtTime(e==="cannon"?1850:2400,t),i.frequency.exponentialRampToValueAtTime(e==="grapple"?420:140,t+o);const l=n.createGain();l.gain.setValueAtTime(1e-4,t),l.gain.exponentialRampToValueAtTime(.21,t+.006),l.gain.exponentialRampToValueAtTime(1e-4,t+o),a.connect(i).connect(l).connect(n.destination);const d=n.createOscillator();d.type=e==="grapple"?"triangle":"sine",d.frequency.setValueAtTime(e==="grapple"?280:115,t),d.frequency.exponentialRampToValueAtTime(e==="grapple"?48:33,t+o),d.connect(l),a.start(t),d.start(t),d.stop(t+o),d.onended=()=>{d.disconnect(),a.disconnect(),i.disconnect(),l.disconnect()}}const ee=[{plate:"last-watch",place:"Glasshouse Reach",title:"The last flash",voice:"Keeper Iona · lamp log",line:"Six weeks ago the beacon went black. Out in the cloud, a mail pilot flashed his lamp three times. Nobody on the quay could tell him which way was home.",sound:"select"},{plate:"dead-letters",place:"Sunstep Quay",title:"The letters kept coming",voice:"Your first watch",line:"You used to run these quays on foot. You know who sews the green mail sacks and whose boy waits for a letter at the high station. Six bags now. His is at the bottom.",sound:"dock"},{plate:"first-command",place:"Aboard the Wayfarer",title:"A ship of your own",voice:"Harbormaster Vale",line:"“I need someone who knows what’s in those bags. Take the Wayfarer. Bring Iona my seal and back her new lens. Get that light witnessed and Meridian pays you back, with sixty crowns besides.”",sound:"mission"}];function hn(e){const n=document.createElement("dialog");n.className="prologue",n.setAttribute("aria-label","The first watch · opening cinematic"),n.innerHTML='<div class="prologue-frames" aria-hidden="true"></div><div class="prologue-letterbox"></div><div class="prologue-tools"><button data-sound></button><button data-pause></button><button data-skip>Skip intro</button></div><div class="prologue-copy" aria-live="polite"><small></small><h1></h1><p></p><cite></cite></div><div class="prologue-foot"><div class="prologue-reel" aria-hidden="true"><i></i><i></i><i></i></div><button data-next></button></div>';const t=n.querySelector(".prologue-frames"),o=ee.map((b,H)=>{const V=document.createElement("img");return V.src="./art/"+b.plate+".webp",V.alt="",V.style.setProperty("--camera-x",H===1?"3%":"-2%"),t.append(V),V}),r=b=>n.querySelector("[data-"+b+"]"),s=matchMedia("(prefers-reduced-motion: reduce)");let a=0,i=s.matches,l=0,d=0,c,p=!1;const f=14e3;function v(){r("sound").textContent=fe()?"Sound on":"Sound off",r("sound").setAttribute("aria-pressed",String(fe())),r("pause").textContent=i?"Play":"Pause",n.classList.toggle("held",i)}function y(){p||(p=!0,cancelAnimationFrame(d),document.removeEventListener("visibilitychange",T),n.close(),n.remove(),e?.())}function w(){const b=ee[a];o.forEach((H,V)=>H.classList.toggle("showing",V===a)),n.querySelector("small").textContent=b.place,n.querySelector("h1").textContent=b.title,n.querySelector("p").textContent=b.line,n.querySelector("cite").textContent=b.voice,r("next").textContent=a===ee.length-1?"Take the helm →":"Next →",X(b.sound),l=0,m()}function m(){n.querySelectorAll(".prologue-reel i").forEach((b,H)=>b.style.setProperty("--progress",String(H<a?1:H===a?Math.min(1,l/f):0)))}function k(){a<ee.length-1?(a++,w()):y()}function T(){c=void 0}function q(b){c!==void 0&&!i&&!document.hidden&&(l+=Math.min(b-c,200),l>=f&&a<ee.length-1&&k(),m()),c=b,p||(d=requestAnimationFrame(q))}r("skip").onclick=y,r("next").onclick=k,r("pause").onclick=()=>{i=!i,v()},r("sound").onclick=()=>{dn(),v()},n.addEventListener("cancel",b=>{b.preventDefault(),y()}),document.addEventListener("visibilitychange",T),document.body.append(n),n.showModal(),v(),w(),r("next").focus({preventScroll:!0}),d=requestAnimationFrame(q)}function un(e){const n=e.kind==="rain"||e.kind==="squall",t=e.kind==="frost",o=n?Math.round(24+24*e.severity):t?20:0,r=Math.round(e.wind.x*(n?26:14)),s=-Math.atan2(r,104)*180/Math.PI,a=Array.from({length:o},(i,l)=>{const d=(17+l*71.441)%129-13,c=(n?1.25:5.2)*(.8+l%7*.075);return`<i style="left:${d.toFixed(2)}%;--period:${c.toFixed(2)}s;--delay:-${(c*(l*.61803%1)).toFixed(2)}s;opacity:${(.18+l%4*.08).toFixed(2)}"></i>`}).join("");return`<div class="weather-film" aria-hidden="true" data-sky="${e.kind}" data-season="${e.season}" style="--wind-x:${r}vw;--slant:${s.toFixed(1)}deg">${a}</div>`}function zn(e){const n=[];if(e.mission!=="lit"){const t=e.mission==="offered",o=Math.max(0,A-e.coins);n.push({title:"The Skyway Beacon",offered:t,destination:t?C.home:C.keeperPort,detail:t?"Vale has a commission at the Sunstep port office.":e.mission==="accepted"?"Meet Keeper Iona in the lamp office at Glasshouse Reach.":o?`Earn ${o} more crowns for the lens. Return to Iona with ${A}.`:"Your purse covers the lens. Pay Keeper Iona at Glasshouse Reach."})}return e.certificate==="aboard"&&n.push({title:"The lightkeeper’s certificate",destination:C.opens,detail:`Have Pilot Sen countersign at Meridian Spire for ${A+C.premium} crowns.`}),e.freight&&n.push({title:e.freight.special?"Neri’s consignment":"Bonded freight",destination:e.freight.to,detail:`Deliver to ${g[e.freight.to].name}. Collect ${e.freight.pay} crowns on arrival.`}),n}const Fe=new WeakMap,G=e=>`./art/${e}.webp`,I=e=>`${e.toLocaleString("en-US")} cr`,me=e=>e.replace(/[&<>"']/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[n]),Me={sunstep:[16,70],glasshouse:[41,15],copperfall:[79,75],meridian:[85,31]};function W(e,n){return`<dl class="sk-metric"><dt>${e}</dt><dd>${n}</dd></dl>`}function le(e,n,t=""){return`<header class="sk-heading"><div><div class="sk-kicker">${e}</div><h1>${n}</h1></div>
    ${t?`<div class="sk-metrics">${t}</div>`:""}</header>`}function Ee(e){return`<dl class="sk-statlist">${e.map(([n,t])=>`<div><dt>${n}</dt><dd>${t}</dd></div>`).join("")}</dl>`}function pn(e,n){return Je(e,n).map(t=>`<p><b>${R[t.good].name} · ${t.adjustment>0?"+":""}${t.adjustment} cr</b><br>${t.reason}</p>`).join("")}function Gn(e,n){const{side:t}=n.settings,o=Ie(e),r=M[e.port],a=B.filter(d=>t==="buy"?!!r.stock[d]:e.cargo[d].quantity>0).map(d=>{const c=R[d],p=F(e,e.port,d)[t],f=e.cargo[d],v=ye(e,e.port,d),y=t==="buy"?Math.min(v,e.ship.hold-o,Math.floor(e.coins/p)):f.quantity,w=`sk-order-${d}`,m=()=>n.page.querySelector(`#${w}`),k=n.register(()=>{m().value=String(y),m().dispatchEvent(new Event("input",{bubbles:!0}))}),T=n.register(()=>{const q=m().valueAsNumber;Number.isSafeInteger(q)&&q>0&&q<=y&&n.act({type:t,good:d,quantity:q})});return`<li><div class="sk-good-top"><div class="sk-sample" aria-hidden="true"><img src="${G(d)}" alt="" loading="lazy"></div>
      <div><h3>${c.name}</h3><p>${c.description}</p><small>${Mn[d]} · ${t==="buy"?v?v+" on the floor":"Sold out until day "+pe(e.day):f.quantity+" aboard"}</small></div><span class="sk-price">${I(p)} <small>/ unit</small></span></div>
      <div class="sk-order" data-side="${t}" data-price="${p}" data-limit="${y}">
      <label for="${w}">Qty</label><input class="sk-qty" id="${w}" aria-label="${c.name} quantity" type="number" step="1" min="1" max="${Math.max(y,1)}" value="${y?1:0}" ${y?"":"disabled"}>
      <button type="button" class="sk-text-button" data-action="${k}" ${y?"":"disabled"} aria-label="Select maximum ${c.name}">Max</button>
      <button type="button" class="sk-button sk-submit" aria-label="${t==="buy"?"Buy":"Sell"} ${c.name}" data-action="${T}" ${y?"":"disabled"}>${t==="buy"?"Buy":"Sell"} · ${I(y?p:0)}</button></div></li>`}).join(""),i=B.filter(d=>e.cargo[d].quantity>0),l=d=>n.register(()=>{n.settings.side=d,n.refresh()});return le(g[e.port].name,r.market,W("Purse",I(e.coins))+W("Hold",`${o} / ${e.ship.hold}`))+`<div class="sk-layout"><article class="sk-card"><div class="sk-card-head"><h2>Exchange floor</h2><div class="sk-switch" aria-label="Trade direction">
    <button type="button" data-action="${l("buy")}" aria-pressed="${t==="buy"}">Buy</button>
    <button type="button" data-action="${l("sell")}" aria-pressed="${t==="sell"}">Sell</button></div></div>
    <details class="sk-fold"><summary>Seasonal market · ${U(e.day)}</summary>${pn(e.port,e.day)}</details><ul class="sk-goods">${a||"<li>Your hold is empty.</li>"}</ul><p>Next exchange posting on day ${pe(e.day)}.</p></article>
    <aside class="sk-stack"><article class="sk-card"><h2>${r.institution}</h2><p>${r.order.need}</p>${n.button("Visit "+r.institution,()=>n.go("civic"),{secondary:!0})}</article><details class="sk-fold sk-ledger-fold"><summary>Cargo manifest · ${o} / ${e.ship.hold}</summary>
    ${i.length?`<ul class="sk-cargo">${i.map(d=>{const c=e.cargo[d];return`<li><span>${R[d].name}<small>Paid ${I(c.cost)} · avg. ${(c.cost/c.quantity).toFixed(1)} cr</small></span><strong>× ${c.quantity}</strong></li>`}).join("")}</ul>`:'<p class="sk-empty">Your hold is empty.</p>'}
    ${e.freight?`<p>Consigned freight aboard for ${g[e.freight.to].name}.</p>`:""}
    </details><details class="sk-fold sk-ledger-fold"><summary>Market intelligence</summary><p>${r.tradeLead}</p>
    <div class="sk-actions">${n.button("Compare port quotes",()=>n.go("chart"),{secondary:!0})}</div></details></aside></div>`}function Yn(e,n){const t=M[e.port],o=en(e),r=nn(e),s=e.cargo[o.good],a=O.find(l=>M[l].specialty===o.good),i=()=>{n.settings.destination=a,n.go("chart")};return le(g[e.port].name+" · "+t.district,t.institution)+`<p class="sk-quote">${t.practice}</p>
    <article class="sk-card"><div class="sk-kicker">Local commission · next posting day ${pe(e.day)}</div><h2>${o.name}</h2>
    <p>${o.need}</p>${Ee([["Requested",o.quantity+" × "+R[o.good].name],["In your hold",s.quantity],["On delivery",I(o.pay)]])}
    <div class="sk-actions">${n.button(o.filled?"Commission filled":"Deliver cargo · "+I(o.pay),()=>n.act({type:"fillCityOrder"}),{disabled:!o.ready})}
    ${!o.filled&&!o.ready?n.button("Locate "+g[a].name,i,{secondary:!0}):""}</div></article>
    ${r?`<article class="sk-card"><h2>${r.name}</h2><p>${r.description}</p>${n.button(r.used?"Booked through day "+(pe(e.day)-1):r.name,()=>n.act({type:"useCityService"}),{disabled:!r.ready})}</article>`:""}
    <div class="sk-actions">${n.button(t.market,()=>n.go("market"),{secondary:!0})}${n.button(t.yard,()=>n.go("shipyard"),{secondary:!0})}</div>`}function Kn(e,n){const t=o=>`<ul class="sk-offers">${o.filter(r=>M[e.port].upgrades.includes(r)).map(r=>{const s=rn(e,r);return`<li><div><h3>${s.name}</h3><p>${s.description}</p></div>
      ${n.button(I(s.cost),()=>n.act({type:"upgrade",upgrade:r}),{disabled:!s.available||e.coins<s.cost})}</li>`}).join("")}</ul>`;return le(g[e.port].name,M[e.port].yard,W("Purse",I(e.coins))+W("Hull",`${e.ship.hull} / ${e.ship.maxHull}`))+`<div class="sk-layout"><div class="sk-stack"><article class="sk-card"><div class="sk-card-head"><h2>Refit the schooner</h2></div>${t(["hold","hull","guns","repair"])}</article>
    <article class="sk-card"><div class="sk-card-head"><h2>Hire crew</h2></div>${t(["crew","veteran"])}</article></div>
    <details class="sk-fold sk-ledger-fold"><summary>Ship’s register</summary>${Ee([["Hull integrity",`${e.ship.hull} / ${e.ship.maxHull}`],["Hold capacity",`${e.ship.hold} units`],["Cannons fitted",e.ship.cannons],["Gunnery rating",e.ship.guns],["Crew aboard",e.ship.crew],["Veterans",e.ship.veterans],["Boarding strength",tn(e)]])}<p>Sunstep fits cargo racks. Copperfall forges armor and cannons. Both Copperfall and Meridian sign on veterans.</p><p class="sk-info">Ram another airship and your crew will board. Experienced hands carry more of the fight.</p></details><div class="sk-actions">${n.button("Practice helm and gunnery",()=>n.act({type:"practiceDrill"}),{secondary:!0})}</div></div>`}function gn(e){return e.mission==="offered"?"Advance the cost of a new lens and the crew can carry mail through the outer lane again. The Compact grants the first ship a charter, promotion with a captain ability, and repayment plus a 60-crown premium when Pilot Sen certifies the light.":e.mission==="accepted"?"Visit Keeper Iona at Glasshouse Reach to present Vale’s sealed commission.":e.mission==="invoice"?`Raise ${I(A)} and pay Keeper Iona at Glasshouse Reach for the lens.`:e.certificate==="aboard"?"Iona’s relighting certificate is in your mail locker. Bring it to Pilot Sen at Meridian Spire to reclaim your 240 crowns and earn the 60-crown premium.":"The Skyway Beacon is lit. Meridian Spire is open to your schooner."}function Un(e,n){const t=e.ability?ue[e.ability]:null,o=e.log,r=t?`<h3>${t.name}</h3><p>${t.description}</p>`:e.level>=2?`<ul class="sk-offers">${Te.map(s=>`<li><div><h3>${ue[s].name}</h3><p>${ue[s].description}</p></div>${n.button("Learn",()=>n.act({type:"chooseAbility",ability:s}))}</li>`).join("")}</ul>`:"<p>Relighting the Skyway Beacon earns your first choice of captain ability.</p>";return le("Captain’s records","Captain’s log",W("Rank",`Level ${e.level}`)+W("Experience",`${e.xp} XP`))+`<div class="sk-layout"><article class="sk-card"><div class="sk-card-head"><h2>Voyage entries</h2></div>
    ${o.length?`<ol class="sk-journal">${o.map(s=>`<li><span class="sk-date">Day ${s.day}</span><span>${me(s.text)}</span></li>`).join("")}</ol>`:'<p class="sk-empty">Your first voyage awaits.</p>'}</article>
    <aside class="sk-stack"><article class="sk-card"><div class="sk-card-head"><h2>Reputation</h2><span class="sk-tag">${e.notoriety} renown</span></div><h3>${me(In(e))}</h3>
    <p class="sk-info">${e.tender==="helped"?"The tender skipper remembers your tow. At Copperfall, that friendship opens a freight contract.":e.tender==="passed"?"You left the stranded tender to hail another ship. Its skipper remembers the sail on the horizon.":"Word of your deeds travels with dock crews and freight skippers."}</p></article>
    <article class="sk-card"><div class="sk-card-head"><h2>Captain ability</h2></div>${r}</article>
    <article class="sk-card"><div class="sk-card-head"><h2>The Skyway Beacon</h2></div><p>${gn(e)}</p></article><article class="sk-card"><h2>Your first watch</h2>${n.button("Open captain’s handbook",()=>an(e))} ${n.button("Replay opening cinematic",()=>hn(),{secondary:!0})}</article></aside></div>`}function Qn(e,n){const t=e.pricesSeen[n],o=e.port===n;return!t&&!o?'<p class="sk-empty">Call at this port to record its market prices.</p>':`<p>${o?"Current exchange floor":`Recorded on day ${t.day}`} · buy / sell per unit</p>
    <ul class="sk-prices">${B.map(r=>{const s=o?F(e,n,r):t.prices[r];if(!s)return"";const a=o?ye(e,n,r):t.stock?.[r],i=M[n].stock[r]?a===0?"sold out":s.buy+(a===void 0?"":" × "+a):"—";return`<li><span>${R[r].name}</span><strong>${i} / ${I(s.sell)}</strong></li>`}).join("")}</ul>`}function Jn(e,n){const t=n.settings.destination,o=()=>{n.settings.focusPort=t,n.settings.destination=null,n.refresh()},r=O.map(l=>{const[d,c]=Me[l],p=l===e.port,f=!re(e,l);return`<button type="button" class="sk-chart-node ${p?"is-home":""} ${f?"is-locked":""}" style="left:${d}%;top:${c}%" data-port="${l}" aria-label="${g[l].name}${p?", current port":f?", locked":""}" aria-haspopup="dialog" aria-pressed="${l===t}" data-action="${n.register(()=>{l===t?o():(n.settings.destination=l,n.refresh())})}"><i class="sk-node-mark" aria-hidden="true"></i><span class="sk-node-label">${g[l].name}</span></button>`}).join("");let s="";if(t){const l=g[t],d=e.port===t,c=re(e,t),p=qe(e.port,t),f=Ue(e.port,t,e.day);s=`<aside class="sk-map-popover" role="dialog" aria-labelledby="sk-selected-port" data-selected="${t}">
      <img class="sk-port-thumbnail" alt="" src="${G(e.mission==="lit"&&(t==="sunstep"||t==="glasshouse")?t+"-lit":t)}">
      <button type="button" class="sk-dismiss" aria-label="Close port details" data-action="${n.register(o)}">×</button>
      <div class="sk-map-copy"><div class="sk-kicker">${d?"Moored here":c?l.subtitle:"Outer skyway · locked"}</div>
      <h2 id="sk-selected-port">${l.name}</h2>
      <p>${d?"Local exchange":c?`${p}-day passage`:"Relight the beacon to reach this port"} · ${R[l.specialty].name}</p>
      <p class="sk-forecast">${f.summary} · wind toward ${f.bearing}, ${f.knots} kn</p>
      <details class="sk-fold"><summary>Climate and trade on arrival</summary><p>${Ye[t].region}. ${U(e.day+p)} · day ${e.day+p}.</p>${pn(t,e.day+p)}</details>
      <details class="sk-fold"><summary>Port trade &amp; services</summary><p>${M[t].tradeLead}</p><p>${M[t].institution} requests ${M[t].order.quantity} × ${R[M[t].order.good].name}.</p></details>
      <details class="sk-fold"><summary>Recorded prices</summary>${Qn(e,t)}</details>
      <div class="sk-actions">${d?n.button("Visit local market",()=>{n.settings.destination=null,n.go("market")},{secondary:!0}):n.button(c?"Set sail →":"Route locked",()=>{n.settings.destination=null,n.act({type:"sail",to:t})},{disabled:!c})}</div></div></aside>`}const a=zn(e),i=`<details class="sk-chart-orders"><summary>Captain’s orders · ${a.length}</summary><div>
    ${a.map(l=>`<article><small>${l.offered?"Available commission":"Active order"}</small><h2>${l.title}</h2><p>${me(l.detail)}</p>${n.button("Locate "+g[l.destination].name,()=>{n.settings.destination=l.destination,n.refresh()},{secondary:!0})}</article>`).join("")||"<p>Your docket is clear. Visit a freight desk for another contract.</p>"}
    </div></details>`;return`<div class="sk-mapstage"><div class="sk-map-scroll"><div class="sk-chart" aria-label="Chart of four skyports">
      <img src="${G("sky-chart")}" alt="" class="sk-chart-art"><canvas aria-hidden="true" data-map width="880" height="624"></canvas>${r}</div></div>
      <div class="sk-chart-plaque"><h1>Sky chart</h1><span>${g[e.port].name} · ${U(e.day)} · day ${e.day}</span></div>${i}${s}</div>`}function fn(e,n){const t=on(e);let o="<p>No contracts posted today.</p>";if(e.freight){const r=e.freight.to;o=`<p>Deliver your consignment to <strong>${g[r].name}</strong>. The receiver pays ${I(e.freight.pay)} on arrival.</p>
      <div class="sk-actions">${n.button("Plot delivery route",()=>{n.settings.destination=r,n.go("chart")},{secondary:!0})}</div>`}else t&&(o=`<p>${t.special?"The tender skipper puts your name forward for a priority consignment.":"Carry a sealed consignment for the port office. The shipper supplies the cargo."}</p>
      ${Ee([["Destination",g[t.to].name],["On delivery",I(t.pay)]])}
      <div class="sk-actions">${n.button("Take freight contract",()=>n.act({type:"takeFreight"}),{secondary:!0})}</div>`);return`<aside class="sk-card"><div class="sk-card-head"><h2>Freight desk</h2></div>${o}</aside>`}function Xn(e,n){const t=Math.max(0,A-e.coins);return`<article class="sk-invoice">
    <header><div><div class="sk-kicker">Glasshouse Lensworks</div><h2>Lens invoice</h2></div><span class="sk-invoice-seal">Awaiting payment</span></header>
    <p>For the Skyway Beacon · Bill to the captain of <i>The Wayfarer</i></p>
    <table><thead><tr><th scope="col">Item</th><th scope="col">Qty</th><th scope="col">Charge</th></tr></thead>
      <tbody><tr><td>Beacon lens, ground and polished</td><td>1</td><td>${I(A)}</td></tr>
      <tr><td>Fitting and alignment</td><td>1</td><td>Included</td></tr></tbody>
      <tfoot><tr><th scope="row" colspan="2">Total due</th><td>${I(A)}</td></tr></tfoot></table>
    <div class="sk-invoice-funds">${W("Cash on hand",I(e.coins))}${W(t?"Still to earn":"After payment",I(t||e.coins-A))}</div>
    <div class="sk-actions">${n.button(`Pay invoice · ${I(A)}`,()=>{n.settings.firstLight=!0,n.act({type:"payInvoice"})},{disabled:t>0})}
      ${n.button("Visit market",()=>n.go("market"),{secondary:!0})}</div></article>`}function Zn(e,n){const t=()=>{n.settings.destination="meridian",n.go("chart")};return`<article class="sk-first-light"><div class="sk-scene">
    <img src="${G("glasshouse-lit")}" alt="The relit Skyway Beacon casting a gold beam over Glasshouse Reach at night">
    <header><div class="sk-kicker">The Skyway Beacon · Commission complete</div><h1>First light</h1></header>
    </div><div class="sk-layout"><section class="sk-card sk-light-copy"><blockquote class="sk-quote">Six weeks of dark. Then, from beyond the banks, a far-off pilot flashes a lamp in answer.</blockquote><p>Iona folds the certificate around a splinter of the old lens. “Carry that to Sen. He holds your 300 crowns.”</p>
    <div class="sk-rewards">${W("Captain rank","Level II")}${W("Skyway opened","Meridian Spire")}</div>
    <div class="sk-actions">${e.ability?n.button("Open captain’s log",()=>n.go("log"),{secondary:!0}):n.button("Choose captain ability",()=>n.go("log"))}
    ${n.button("Chart Meridian Spire →",t,{secondary:!e.ability})}</div></section>${fn(e,n)}</div></article>`}function et(e,n){const t=g[e.port];if(n.settings.firstLight&&e.mission==="lit")return Zn(e,n);const r=e.port==="sunstep"&&e.mission==="offered",s=e.port==="glasshouse"&&e.mission==="invoice",a=s?"“Mind the edge, Captain. Three days at the wheel to get that curve. You’ve brought Vale’s letter? Good. I’ll put your name on the crate. Here’s the bill.”":An(e),i=t.keeper;let l="";if(s)l=Xn(e,n);else{const c=r?n.button("Accept commission",()=>n.act({type:"acceptMission"})):e.port==="glasshouse"&&e.mission==="accepted"?n.button("Hand Iona Vale’s commission",()=>n.act({type:"presentCommission"})):e.port==="meridian"&&e.certificate==="aboard"?n.button("Present certificate · collect 300 cr",()=>n.act({type:"deliverCertificate"})):e.mission==="lit"&&!e.ability?n.button("Choose captain ability",()=>n.go("log")):n.button("Open sky chart",()=>n.go("chart"),{secondary:!0});l=`<article class="sk-card"><div class="sk-card-head"><h2>The Skyway Beacon</h2>${e.mission==="lit"?'<span class="sk-tag">Completed</span>':""}</div><p>${gn(e)}</p><div class="sk-actions">${c}</div></article>`}const d=e.port==="meridian"?"talk-meridian":null;return`<header class="sk-dialogue-heading"><div class="sk-kicker">${t.name} · Port authority</div><div class="sk-identity">
    ${d?`<img src="${G(d)}" alt="">`:""}<h1>${i}</h1></div></header>
    <div class="sk-office-dialogue"><blockquote class="sk-quote">${me(a)}</blockquote></div>
    ${l}${s&&e.coins<A?'<details class="sk-fold sk-ledger-fold"><summary>A word from the loading dock</summary><p>A glazier chalks <i>Copperfall</i> on a stack of panes. “Their winter gardens are framed and roofless. I can cut all week and the yard still wants more.”</p></details>':""}
    ${fn(e,n)}`}function nt(e,n){const t=e.voyage;if(!t)return le(g[e.port].name,"Moored in port")+n.button("Return to harbor",()=>n.go("harbor"));const o=Qe(e);let r="On passage",s="The last mooring line falls away.",a="Your solar sails draw taut. The chart table is lashed down and the lookout is at the rail.",i=n.button("Continue voyage →",()=>n.act({type:"continueVoyage"}));t.phase==="tender"?(r="A tender adrift",s="A signal lamp winks from below the lane.",a="A work tender hangs dead in a pocket of cloud. The skipper asks for a tow. Helping costs a day of trading.",i=n.button("Give them a tow · 1 day",()=>n.act({type:"tender",help:!0}))+n.button("Hold your course",()=>n.act({type:"tender",help:!1}),{secondary:!0})):t.phase==="raider"?(r="Sails on the bearing",s="The approaching ship turns its guns broadside.",a="A raider is closing on your schooner. Take the helm and fight, or shake pursuit in the cloud banks.",i=n.button("Take the helm",()=>n.act({type:"engage"}))+n.button("Evade the raider",()=>n.act({type:"evade"}),{secondary:!0})):t.phase==="battle"&&(r="Under fire",s="The gun crews stand ready.",a="Your schooner is engaged with a raider.",i="");const l=t.phase==="tender"?"tender":t.phase==="raider"||t.phase==="battle"?"raider-encounter":"passage";return`<div class="sk-voyage"><div class="sk-scene"><img src="${G(l)}" alt="">${un(o)}
    <header><div class="sk-kicker">En route</div><h1>${r}</h1><p class="weather-bearing">${o.summary} · ${o.bearing} ${o.knots} kn</p></header></div>
    <article class="sk-card sk-voyage-brief"><div class="sk-voyage-story"><div class="sk-leg"><span>${g[t.from].name}</span><i class="sk-path" aria-hidden="true"></i><span>${g[t.to].name}</span></div>
    <blockquote class="sk-quote">${s}</blockquote><p>${a}</p></div><div class="sk-actions">${i}</div></article></div>`}function mn(e,n,t,o,r){let s=Fe.get(e.ownerDocument);(!s||s.port!==t.port)&&(s={port:t.port,destination:null,focusPort:null,side:"buy"},Fe.set(e.ownerDocument,s)),s.lastView==="chart"&&n!=="chart"&&(s.destination=null,s.focusPort=null),n!=="authority"&&(s.firstLight=!1),s.lastView=n;const a=document.createElement("section");a.className="sk-interior",a.dataset.view=n;const i={sunstep:"authority",glasshouse:"office-iona",copperfall:"office-orr",meridian:"meridian"},l={market:"civic-"+t.port,civic:"civic-"+t.port,authority:s.firstLight&&t.mission==="lit"?null:i[t.port],shipyard:"yard",chart:null,voyage:null,log:"sky-chart"}[n];l&&(a.classList.add("sk-illustrated"),a.style.setProperty("--sk-art",`url("${G(l)}")`));const d=[],c=m=>String(d.push(m)-1),p={act:o,go:r,settings:s,page:a,register:c,refresh:()=>mn(e,n,t,o,r),button:(m,k,T={})=>`<button type="button" class="sk-button ${T.secondary?"sk-secondary":""}" data-action="${c(k)}" ${T.disabled?"disabled":""}>${m}</button>`},f=n==="voyage"?"":`<button class="sk-crumb" data-action="${c(()=>{s.destination=null,r("harbor")})}" aria-label="Return to harbor">← Harbor</button>`,v={civic:Yn,market:Gn,shipyard:Kn,log:Un,chart:Jn,authority:et,voyage:nt}[n](t,p),y=!!l;a.innerHTML=f+(y?`<div class="sk-room-overlay"><div class="sk-room-ledger">${v}</div></div>`:v),a.addEventListener("click",m=>{if(!(m.target instanceof Element))return;const k=m.target.closest("button[data-action]");k&&!k.disabled?d[Number(k.dataset.action)]?.():n==="chart"&&s.destination&&!m.target.closest(".sk-map-popover, .sk-chart-orders")&&a.querySelector(".sk-dismiss")?.click()}),a.addEventListener("input",m=>{if(!(m.target instanceof HTMLInputElement))return;const k=m.target.closest(".sk-order");if(!k)return;const T=k.querySelector(".sk-submit"),q=m.target.valueAsNumber,b=Number.isSafeInteger(q)&&q>0&&q<=Number(k.dataset.limit);T.disabled=!b,T.textContent=`${k.dataset.side==="buy"?"Buy":"Sell"} · ${I(b?Number(k.dataset.price)*q:0)}`}),e.replaceChildren(a);const w=a.querySelector("[data-map]");w&&(ot(w,t,s.destination),tt(a,s))}function tt(e,n){const t=e.querySelector(".sk-map-popover");if(!t){n.focusPort&&e.querySelector(`[data-port="${n.focusPort}"]`)?.focus({preventScroll:!0}),n.focusPort=null;return}const o=e.querySelector(`[data-port="${n.destination}"]`),r=t.querySelector(".sk-dismiss");function s(){const i=e.getBoundingClientRect(),l=o.getBoundingClientRect(),d=t.offsetWidth,c=t.offsetHeight,p=l.left-i.left+l.width/2,f=l.top-i.top+l.height/2,v=p<i.width/2?p+28:p-d-28;t.style.left=Math.max(8,Math.min(i.width-d-8,v))+"px";const y=i.width<560?f<i.height/2?f+30:f-c-30:f-c/2;t.style.top=Math.max(8,Math.min(i.height-c-8,y))+"px"}s(),e.querySelector(".sk-map-scroll").addEventListener("scroll",s,{passive:!0}),t.querySelectorAll("details").forEach(i=>i.addEventListener("toggle",s));const a=new ResizeObserver(()=>{e.isConnected?s():a.disconnect()});a.observe(e),e.addEventListener("keydown",i=>{i.key==="Escape"&&(i.preventDefault(),r.click())}),r.focus({preventScroll:!0})}function ot(e,n,t){const o=e.getContext("2d");if(!o)return;const{width:r,height:s}=e,a=i=>[r*Me[i][0]/100,s*Me[i][1]/100];for(let i=0;i<O.length;i++)for(let l=i+1;l<O.length;l++){const d=O[i],c=O[l],p=d===n.port&&c===t||d===t&&c===n.port,f=!re(n,d)||!re(n,c),[v,y]=a(d),[w,m]=a(c);o.setLineDash(p&&!f?[9,5]:f?[2,8]:[5,7]),o.lineWidth=p?2.8:1.1,o.strokeStyle=p&&!f?"#e0bd82":f?"#61847882":"#98a58b",o.beginPath(),o.moveTo(v,y),o.quadraticCurveTo((v+w)/2-8,(y+m)/2-18,w,m),o.stroke()}}const rt=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,st=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,it=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,at=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,lt=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,ct=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,dt=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,ht=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,ut=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,pt=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,gt=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,ft=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,mt=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,yt=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,vt=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,kt=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,wt=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,bt=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,$t=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,xt=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,St=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,Ct=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,_t=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,Mt=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,Tt=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,qt=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,It=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,At=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,Lt=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,Et=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,Pt=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,Bt=`<!-- @license lucide-static v0.563.0 - ISC -->
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
`,Ht=Object.assign({"../node_modules/lucide-static/icons/anchor.svg":rt,"../node_modules/lucide-static/icons/arrow-right.svg":st,"../node_modules/lucide-static/icons/arrow-up-right.svg":it,"../node_modules/lucide-static/icons/book-open.svg":at,"../node_modules/lucide-static/icons/calendar-days.svg":lt,"../node_modules/lucide-static/icons/check.svg":ct,"../node_modules/lucide-static/icons/chevron-right.svg":dt,"../node_modules/lucide-static/icons/coins.svg":ht,"../node_modules/lucide-static/icons/compass.svg":ut,"../node_modules/lucide-static/icons/expand.svg":pt,"../node_modules/lucide-static/icons/flag.svg":gt,"../node_modules/lucide-static/icons/hammer.svg":ft,"../node_modules/lucide-static/icons/landmark.svg":mt,"../node_modules/lucide-static/icons/map-pin.svg":yt,"../node_modules/lucide-static/icons/map.svg":vt,"../node_modules/lucide-static/icons/message-circle.svg":kt,"../node_modules/lucide-static/icons/package.svg":wt,"../node_modules/lucide-static/icons/sailboat.svg":bt,"../node_modules/lucide-static/icons/scan-eye.svg":$t,"../node_modules/lucide-static/icons/scroll-text.svg":xt,"../node_modules/lucide-static/icons/settings-2.svg":St,"../node_modules/lucide-static/icons/shield.svg":Ct,"../node_modules/lucide-static/icons/ship-wheel.svg":_t,"../node_modules/lucide-static/icons/shopping-basket.svg":Mt,"../node_modules/lucide-static/icons/shrink.svg":Tt,"../node_modules/lucide-static/icons/sun.svg":qt,"../node_modules/lucide-static/icons/sunset.svg":It,"../node_modules/lucide-static/icons/users.svg":At,"../node_modules/lucide-static/icons/volume-2.svg":Lt,"../node_modules/lucide-static/icons/volume-x.svg":Et,"../node_modules/lucide-static/icons/wind.svg":Pt,"../node_modules/lucide-static/icons/x.svg":Bt});function L(e){return Ht["../node_modules/lucide-static/icons/"+e+".svg"]?.replace("<svg",'<svg aria-hidden="true" focusable="false" class="ui-icon"')??""}function jt(e){switch(e.port){case"sunstep":return{name:"Moss Pellar",role:"Orchard porter",greeting:e.mission==="lit"?"Saw your light come on last night. The night shift cheered so loud my mule dropped a whole basket of pears.":"Hold the rope a tick, Captain. These pears bruise if you look at them cross-eyed. There. What can I do for you?",topics:[{ask:"Where would you take a hold full of pears?",answer:`Glasshouse Reach. All those mouths at the furnaces and hardly a pear tree between them. Provisions buy here for ${F(e,"sunstep","provisions").buy} crowns a crate today.`,visit:{view:"market"}},{ask:e.mission==="lit"?"Who’s sailing the outer route?":"Where can a new captain find work?",answer:e.mission==="lit"?"Weather boats out of Meridian. They go up for days, and every pair of hands wants dinner. Take them a few pears from me.":"Vale’s office. Mind the pear skins on her steps. She also has bonded mail for captains whose pockets have worn clean through.",visit:e.mission==="lit"?{view:"chart"}:{view:"authority"}}]};case"glasshouse":return{name:"Sella Venn",role:"Master glazier",greeting:e.mission==="lit"?"Look there. See that clean edge on the beam? Three days I spent grinding that edge.":"Watch your sleeves. A pane can look perfectly cold and still take the hem clean off your coat.",topics:[{ask:"Who buys all this glass?",answer:`Copperfall’s fitting out winter gardens. They’ll buy panes faster than I can anneal them. A crate of ${R.glass.name.toLowerCase()} goes for ${F(e,"glasshouse","glass").buy} crowns here today.`,visit:{view:"market"}},{ask:e.mission==="lit"?"How far does that light carry?":"What’s keeping the beacon dark?",answer:e.mission==="lit"?"On a clear watch you can see it from Sunstep. Pilots can make the passage to Meridian Spire again, and I can finally get some sleep.":e.mission==="invoice"?`That lens has my thumbprint in the rim. Keeper Iona has it packed upstairs. She’s waiting on the ${A} crowns for the glass and fitting.`:"I finished the replacement. Iona minds the lamp and the bill. She’s in the port office, counting the hours till a captain comes through with Vale’s commission.",visit:e.mission==="lit"?{view:"chart"}:{view:"authority"}}]};case"copperfall":{const n=e.tender==="helped",t=n&&!e.specialFreightTaken,o=D.contract;return{name:"Skipper Neri",role:"Tender skipper",greeting:n?"I’d know that mainsail anywhere. I was still waving at the cloud where you’d been when the towline finally came off. Sit a minute.":e.tender==="passed"?"I remember that sail. Looked a fair bit smaller from the deck of a dead tender. Anyway. You wanted something?":"Keep a hand on your hat. When that yard crane swings, it kicks up a crosswind fit to steal the pins out of your hair.",topics:[{ask:n?"How’s the tender holding up?":"Any work on these docks?",answer:t?`Dry as a biscuit, thanks to you. I saved you a freight run to ${g[o.to].name}. Pays ${o.pay} crowns. Tell the clerk Neri sent you.`:n?"Better every day. I put my name down beside yours in the freight ledger. Ask the clerk what’s headed out next.":"There’s ordinary bonded mail at the office. Take it to the port on the docket and the receiver pays you there.",visit:{view:"authority"}},{ask:"What leaves Copperfall in those crates?",answer:"Machinery. Listen close and you can hear the gears knock together. Sunstep’s orchard lifts chew through the stuff. I’ve hauled enough to rebuild the whole hillside.",visit:{view:"market"}}]}}case"meridian":return{name:"Pilot Sen",role:"Weather pilot",greeting:"I keep the old bearing chalked on this rail. See? That’s where the beacon came up. We’ve been launching sounding balloons ever since.",topics:[{ask:"What do your crews run short of?",answer:`Food. One tin of peaches gets six grown pilots arguing over a spoon. Today our market pays ${F(e,"meridian","provisions").sell} crowns per crate of provisions.`,visit:{view:"market"}},{ask:"How do I find my way back?",answer:"Lay a course for Glasshouse Reach. Two days on that bearing and you’ll see Iona’s lamp across the bow. From there, Sunstep’s only another day.",visit:{view:"chart"}}]}}}function Ot(e,n,t){const o=jt(n),r=document.activeElement instanceof HTMLElement?document.activeElement:null,s=document.createElement("section");s.className="dock-talk",s.setAttribute("role","dialog"),s.setAttribute("aria-label","Conversation with "+o.name);const a=document.createElement("img");a.src="./art/talk-"+n.port+".webp",a.alt="",a.className="talk-portrait";const i=document.createElement("div");i.className="talk-copy";const l=document.createElement("p");l.className="talk-role",l.textContent=o.role;const d=document.createElement("h2");d.textContent=o.name;const c=document.createElement("p");c.className="talk-speech",c.tabIndex=-1;const p=document.createElement("div");p.className="talk-replies";const f=document.createElement("button");f.type="button",f.className="talk-close",f.setAttribute("aria-label","End conversation"),f.title="End conversation (Escape)",f.textContent="×";function v(){s.remove(),t(),r?.isConnected&&r.focus({preventScroll:!0})}function y(m,k){const T=document.createElement("button");T.type="button",T.textContent=m,T.addEventListener("click",k),p.append(T)}function w(m){c.textContent=m?.answer??o.greeting,p.replaceChildren(),m&&y("Where can I find that?",()=>{const k={authority:`Look for the port authority sign. ${g[n.port].keeper} receives captains inside.`,market:"Follow the buyers to the market stalls. The exchange clerk has today’s prices.",chart:"Your chart is aboard the Wayfarer. The compass at your belt opens it too.",shipyard:"Look for the workshop by the rigging. Ask the shipwright there.",log:"It’s written in your captain’s log. Look for the book at your belt."};c.textContent=k[m.visit.view],p.replaceChildren(),y("Ask something else",()=>w()),y("Take your leave",v),c.focus({preventScroll:!0})});for(const k of o.topics)k!==m&&y(k.ask,()=>w(k));y("Take your leave",v),c.focus({preventScroll:!0})}f.addEventListener("click",v),s.addEventListener("keydown",m=>{m.key==="Escape"&&(m.preventDefault(),m.stopPropagation(),v())}),i.append(l,d,c,p),s.append(a,i,f),e.replaceChildren(s),w()}const oe={sunstep:{region:"The Inner Reaches",weather:"Clear skies",local:"Moss Pellar",role:"Orchard porter",zones:{civic:[5,20,25,36,19,30],market:[1,37,24,85,14,62],local:[26,57,36,95,30,64],authority:[25,16,53,64,42,47],ship:[54,25,78,64,65,49],shipyard:[79,20,99,74,90,52]}},glasshouse:{region:"The Inner Reaches",weather:"Violet haze",local:"Sella Venn",role:"Master glazier",zones:{civic:[3,14,25,30,16,24],market:[1,32,28,67,15,49],local:[19,59,32,98,24,65],authority:[35,7,59,65,48,48],ship:[59,19,79,62,70,45],shipyard:[80,20,99,76,90,49]}},copperfall:{region:"The Inner Reaches",weather:"Fair winds",local:"Skipper Neri",role:"Tender skipper",zones:{civic:[3,15,26,30,17,23],market:[1,30,23,86,14,57],local:[22,55,32,94,27,63],authority:[27,14,58,69,44,47],ship:[59,20,74,68,66,47],shipyard:[75,13,99,77,89,49]}},meridian:{region:"The Outer Reaches",weather:"High cirrus",local:"Pilot Sen",role:"Weather pilot",zones:{civic:[39,9,55,23,46,18],market:[1,30,25,81,13,55],local:[23,58,34,95,28,64],authority:[28,13,58,68,44,46],ship:[57,20,78,67,68,49],shipyard:[79,17,99,78,90,52]}}},Rt={civic:"compass",market:"shopping-basket",local:"message-circle",authority:"scroll-text",ship:"sailboat",shipyard:"hammer"},Wt=["market","authority","ship","shipyard","local","civic"];function Vt(e,n){switch(n){case"market":{const t=M[e.port].market;return[t,"Trade cargo","Visit Port Market · "+t]}case"civic":{const t=M[e.port].institution;return[t,"Local institution","Visit "+t]}case"local":return[oe[e.port].local,oe[e.port].role,"Talk to "+oe[e.port].local];case"authority":return[g[e.port].keeper,e.port==="sunstep"&&e.mission==="offered"?"Commission available":"Port authority","Visit Port Authority · "+g[e.port].keeper];case"ship":return["The Wayfarer","Board your schooner","Board The Wayfarer"];case"shipyard":return[M[e.port].yard,"Refit & recruit","Visit Shipyard · "+M[e.port].yard]}}function Nt(e,n){const[t,o,r,s,a,i]=oe[e.port].zones[n],[l,d,c]=Vt(e,n),p=n==="authority"&&(e.port==="sunstep"&&e.mission==="offered"||e.port==="glasshouse"&&e.mission==="invoice");return`<button type="button" class="quay-spot ${n==="local"?"person":""} ${p?"commission-spot":""}" data-place="${n}"
      aria-label="${c}" style="--l:${t}%;--t:${o}%;--w:${r-t}%;--h:${s-o}%;--x:${(a-t)*100/(r-t)}%;--y:${(i-o)*100/(s-o)}%">
      <span class="hover-zone"></span><span class="place-pin">${L(Rt[n])}</span>
      <span class="place-label"><b>${l}</b><small>${d}</small></span>
    </button>`}function Dt(e,n,t){const o=oe[n.port],r=n.mission==="lit"&&["sunstep","glasshouse"].includes(n.port),s=te(n.port,n.day),a="art/quay-"+n.port+(r?"-lit":"")+".webp";e.innerHTML=`<section class="quay" aria-label="${g[n.port].name} harbor">
    <div class="walk-view"><canvas aria-label="Walkable 3D harbor. Walk with W A S D, drag to look, or tap the paving to walk."></canvas></div>
    <div class="quay-scroll" tabindex="-1"><div class="quay-track"><div class="quay-plate">
      <img class="quay-art" alt="The working docks at ${g[n.port].name}" src="${a}" fetchpriority="high">
      ${un(s)}
      ${Wt.map(u=>Nt(n,u)).join("")}
    </div></div></div>
    <div class="quay-shade" aria-hidden="true"></div>
    <header class="quay-title"><span class="quay-region"><i></i>${o.region}</span><h1>${g[n.port].name}</h1>
      <p>${L(r?"sunset":"sun")}<span>Day ${String(n.day).padStart(2,"0")}</span><i></i>${r?"Night watch · ":""}${s.season} · ${s.summary}</p></header>
    <div class="pocket"><span class="coin-readout" title="Available crowns">${L("coins")} <b>${n.coins.toLocaleString("en-US")}</b><span>crowns</span></span><button class="scene-tool" type="button" data-tool="settings" aria-label="Game options" title="Game options">${L("settings-2")}</button></div>
    <div class="field-tools"><button class="chart-tool" type="button" data-go="chart" aria-label="Sky chart"><img src="compass.svg" alt=""><span>Sky chart</span></button>
      <button class="scene-tool journal-tool" type="button" data-go="log" aria-label="Captain’s log" title="Captain’s log">${L("book-open")}</button></div>
    <button class="discover" type="button" data-tool="labels" aria-pressed="false" title="Toggle place names (H)">${L("scan-eye")}<span>Show places</span><kbd>H</kbd></button>
    <div class="walk-help"><span class="walk-instructions">WASD walk · Drag to look · Click paving to walk</span><button data-home type="button" aria-label="Return to the landing" title="Return to the landing (Home)">⌂</button></div>
    <div class="pan-hints"><button type="button" aria-label="Pan left" data-pan="-1">‹</button><button type="button" aria-label="Pan right" data-pan="1">›</button></div>
    <div class="quay-overlay" hidden></div></section>`;const i=e.querySelector(".quay"),l=i.querySelector(".quay-scroll"),d=i.querySelector(".quay-track"),c=i.querySelector(".quay-overlay"),p=i.querySelector('[data-tool="labels"]'),f=i.querySelector(".quay-plate");let v=null,y=.5;const w=new ResizeObserver(()=>{const u=d.offsetWidth-l.clientWidth;i.classList.toggle("pannable",u>70),l.scrollLeft=u*y});w.observe(l),l.addEventListener("scroll",()=>{const u=d.offsetWidth-l.clientWidth;u>0&&(y=l.scrollLeft/u)},{passive:!0});let m=null,k=!1;(n.firstWatch!=="new"||n.day!==1)&&ze(async()=>{const{mountWorld:u}=await import("./harbor-world-CWqPgB7Z.js");return{mountWorld:u}},[],import.meta.url).then(({mountWorld:u})=>{k||(m=u(i,n,$=>{i.querySelector('[data-place="'+$+'"]')?.click()}))}).catch(()=>{if(!k){const u=i.querySelector(".walk-instructions");i.classList.add("illustrated-mode"),u.textContent="Illustrated harbor · 3D rendering unavailable"}});function T(){const u=i.classList.toggle("show-places");p.setAttribute("aria-pressed",String(u)),p.querySelector("span").textContent=u?"Hide places":"Show places"}function q(){c.replaceChildren(),c.hidden=!0,i.classList.remove("reading"),v?.focus({preventScroll:!0}),v=null}function b(u){v=u,c.hidden=!1,i.classList.add("reading")}function H(){c.innerHTML=`<section class="pocket-menu" role="dialog" aria-label="Game options"><div class="popover-top"><h2>Game options</h2><button data-close aria-label="Close options">${L("x")}</button></div>
      <button class="menu-line" data-sound>${L(fe()?"volume-2":"volume-x")} Sound <b>${fe()?"On":"Off"}</b></button>
      ${document.fullscreenEnabled?`<button class="menu-line" data-full>${L(document.fullscreenElement?"shrink":"expand")} ${document.fullscreenElement?"Leave fullscreen":"Enter fullscreen"}</button>`:""}
      <p class="device-save">${L("check")} ${e.dataset.saved==="false"?"Storage unavailable":"Progress saved on this device"}</p></section>`,c.querySelector("[data-close]").focus({preventScroll:!0})}function V(){const u=Math.round(n.ship.hull/n.ship.maxHull*100);c.innerHTML=`<section class="vessel-sheet" role="dialog" aria-labelledby="vessel-name"><div class="popover-top"><span class="ink-label">Ship’s papers</span><button type="button" data-close aria-label="Close ship manifest">${L("x")}</button></div>
      <img src="art/kestrel.webp" alt="Solar-sail schooner in profile"><h2 id="vessel-name">The Wayfarer</h2><p>Lift-keel schooner</p>
      <dl><div><dt>${L("shield")} Hull</dt><dd>${u}%</dd></div><div><dt>${L("package")} Hold</dt><dd>${Ie(n)} / ${n.ship.hold}</dd></div><div><dt>${L("users")} Crew</dt><dd>${n.ship.crew} hands</dd></div></dl>
      <button type="button" class="gold-action" data-go="chart">${L("compass")} Plot a course ${L("arrow-right")}</button></section>`,c.querySelector("[data-close]").focus({preventScroll:!0})}function He(u){if(!(u.target instanceof Element))return;const $=u.target.closest("button");if(!$){u.target===c&&q();return}const{place:de,go:Oe,tool:Re,pan:We}=$.dataset;if(Oe){t(Oe);return}if(de==="local"){b($),X("select"),Ot(c,n,q);return}if(de==="ship"){b($),X("select"),V();return}if(de){t(de);return}Re==="labels"&&T(),Re==="settings"&&(b($),H()),We&&l.scrollBy({left:Number(We)*l.clientWidth*.56,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"}),"close"in $.dataset&&q(),"sound"in $.dataset&&(dn(),H(),c.querySelector("[data-sound]")?.focus()),"full"in $.dataset&&(document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()).then(q).catch(()=>H())}function je(u){if(!(u.ctrlKey||u.metaKey||u.altKey||document.querySelector("dialog[open]"))){if(!c.hidden){if(u.key==="Escape"){u.preventDefault(),q();return}if(u.key==="Tab"){const $=Array.from(c.querySelectorAll("button:not(:disabled)"));$.length&&u.shiftKey&&$[0]===document.activeElement?(u.preventDefault(),$.at(-1)?.focus()):$.length&&!u.shiftKey&&$.at(-1)===document.activeElement&&(u.preventDefault(),$[0].focus())}return}u.code==="KeyH"&&(u.preventDefault(),T()),u.code==="KeyM"&&(u.preventDefault(),t("chart")),u.code==="KeyJ"&&(u.preventDefault(),t("log"))}}return f.addEventListener("focusin",u=>{if(!(u.target instanceof HTMLButtonElement)||!u.target.matches(":focus-visible"))return;if(m){u.target.classList.contains("pin-outside")&&m.framePlace(u.target.dataset.place);return}if(!i.classList.contains("pannable"))return;const $=u.target.querySelector(".place-pin")?.getBoundingClientRect();$&&($.left<35||$.right>l.clientWidth-35)&&l.scrollBy({left:$.left+$.width/2-l.clientWidth/2})}),i.addEventListener("click",He),document.addEventListener("keydown",je),()=>{w.disconnect(),k=!0,m?.dispose(),document.removeEventListener("keydown",je),i.removeEventListener("click",He)}}const Pe=document.querySelector("#app");Pe.innerHTML='<a class="skip" href="#main">Skip to game</a><main id="main" tabindex="-1"></main><aside id="toast" hidden><span role="status" aria-live="polite" aria-atomic="true"></span><button type="button">Acknowledge</button></aside>';const E=Pe.querySelector("#main"),Y=Pe.querySelector("#toast");let ke,h=Dn(),K=J(h),P=h.drill?"battle":h.voyage?h.voyage.phase==="battle"?"battle":"voyage":"harbor",we,be=0;function Be(){const[e]=h.pendingNotices;Y.hidden=!e,Y.classList.toggle("visible",!!e),Y.querySelector("span").textContent=e||"";const n=h.pendingNotices.length-1;Y.querySelector("button").textContent=n>0?"Acknowledge · "+n+" more":"Acknowledge"}Y.querySelector("button").addEventListener("click",()=>{h={...h,pendingNotices:h.pendingNotices.slice(1)},K=J(h),Be(),Y.hidden&&E.focus({preventScroll:!0})});function $e(e){h.voyage&&e!=="battle"&&e!=="voyage"||(X("select"),P=e,ce(),window.scrollTo({top:0,behavior:"instant"}),E.focus({preventScroll:!0}))}function ne(e){const n=h,t=jn(h,e);if(t===n)return;h=t,K=J(h);const o=!!n.voyage&&!h.voyage;h.drill?P="battle":h.voyage?P=h.voyage.phase==="battle"?"battle":"voyage":o?P="harbor":e.type==="endDrill"&&(P="shipyard"),X(e.type==="payInvoice"?"mission":o?"dock":["buy","sell","upgrade"].includes(e.type)?"trade":"select"),ce(),(o||e.type==="sail"||e.type==="engage"||e.type==="payInvoice")&&window.scrollTo({top:0,behavior:"instant"}),Be()}function ce(){const e=++be;if(we?.(),we=void 0,ke?.(),ke=void 0,E.dataset.saved=String(K),E.dataset.screen=P,document.title=(P==="harbor"?g[h.port].name:{market:"Port Market",chart:"Sky chart",log:"Captain’s log",battle:"Battle stations",shipyard:"Shipyard",civic:"Local institution",authority:"Port Authority",voyage:"On passage"}[P])+" · Skyrates",P==="harbor")ke=Dt(E,h,$e),h.firstWatch==="arrived"&&h.port==="sunstep"&&h.mission==="offered"&&Fn(E,h,()=>$e("authority"),()=>{h={...h,firstWatch:"briefed"},K=J(h)});else if(P==="battle"&&(h.voyage||h.drill)){const n=h.voyage;E.innerHTML='<section class="battle-loading" role="status">Taking the helm…</section>',ze(async()=>{const{mountBattle:t}=await import("./battle-DTlgEbcJ.js");return{mountBattle:t}},__vite__mapDeps([0,1,2]),import.meta.url).then(({mountBattle:t})=>{if(e!==be||h.voyage?.id!==n?.id)return;E.replaceChildren();const o={victory:"won",boarded:"boarded",defeat:"lost",escaped:"escaped"};we=t(E,{crew:h.ship.crew,skill:tn(h)/h.ship.crew,gunLevel:h.ship.guns,cannons:h.ship.cannons,weather:Qe(h),drill:h.drill?{stage:h.drill,onCheckpoint:r=>{const s=Hn(h,r);s!==h&&(h=s,K=J(h))},onLeave:r=>ne({type:"endDrill",skip:r})}:void 0,hullLevel:(h.ship.maxHull-100)/25,quickGunnery:h.ability==="gunner",startingHull:h.ship.hull,shipName:"The Wayfarer",onFinish:(r,s)=>n&&ne({type:"resolveBattle",id:n.id,result:o[r],hull:s})})}).catch(()=>{e===be&&(E.innerHTML='<section class="battle-loading"><p>The encounter could not load.</p><button class="gold-action" data-retry>Retry encounter</button><button class="mission-action" data-withdraw>Withdraw to port</button></section>',E.querySelector("[data-retry]")?.addEventListener("click",ce),E.querySelector("[data-withdraw]")?.addEventListener("click",()=>h.drill?ne({type:"endDrill",skip:!0}):n&&ne({type:"resolveBattle",id:n.id,result:"escaped",hull:h.ship.hull})))})}else mn(E,P,h,ne,$e)}document.addEventListener("pointerdown",cn,{once:!0});ce();Be();h.firstWatch==="new"&&!h.voyage&&h.day===1&&hn(()=>{h={...h,firstWatch:"arrived"},K=J(h),ce(),E.focus({preventScroll:!0})});export{Qt as C,zt as G,Kt as a,Jt as b,Yt as c,te as d,Ut as e,Gt as g,un as p};
