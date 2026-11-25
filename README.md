# Skyrates

[Play Skyrates](https://dyelax.github.io/skyrates/) · [Battle test](https://dyelax.github.io/skyrates/battle-test.html)

![Exploring the docks at Sunstep Quay in Skyrates](docs/harbor.webp)

Take the helm of the Wayfarer, a wooden schooner that rides a glowing lift keel beneath translucent solar sails. Your first commission is to restore the Skyway Beacon. The glassworkers have a replacement lens ready, and someone still has to pay them.

## At the quay

Point at a person or a building in the harbor painting. Click the market to trade, talk to the porter for a lead, or visit Harbormaster Vale for your commission. **H** reveals place names. On a narrow screen, swipe along the quay or use its pan arrows. Inside a shop, select the person to speak, the counter for business, or the door to go back outside. Select the moored Wayfarer to inspect your hold, hull, and crew.

Open the sky chart with **M** or the compass. Select an island for passage time, recorded prices, and sailing orders. The captain’s log opens with **J**. Decisions, cargo, and completed encounters save automatically in this browser. Sound and fullscreen are available from the small options control at the quay.

## In a fight

On your first departure from Sunstep, the Harbor Watch runs a chalk-round exercise. Dodge a marked shot, fire your single port cannon, then make rail contact, push off, and return for the Watch’s surrender. The exercise saves at each lesson. You can skip it or practice again at a shipyard.

| Order | Control |
| --- | --- |
| Turn | A / D or left / right arrows. Click open sky to steer toward it. |
| Change throttle | W / S or up / down arrows |
| Fire a single cannon | 1–4, click its station, or click the raider to fire an available gun |
| Port or starboard broadside | Q / E |
| Close in, or push off if the hulls touch | B |
| Set the wind sight | V or click the wind gauge |
| Break away | R |
| Pause | P |

The arrow on the wind gauge points downwind. Watch your heading as the wind carries the hull sideways. Rounds curve downwind in flight. Set the wind sight to allow for drift on long shots. The Harbor Watch runs its exercise in sheltered air.

Each cannon refit adds a gun until all four stations are filled. A side with two fitted guns gains a broadside order. Each cannon reloads separately. Turning brings a fresh battery to bear. An impact costs hull on both ships. A bow striking a rail squarely inflicts more damage on the rail. Close gently to keep a prize afloat. Crews exchange strength for as long as the hulls touch. Steer clear or push off to disengage. Both crew bars retain their remaining strength. Crew size, veterans and leadership increase the strength you bring to the fight. An enemy with zero crew strength and a surviving hull strikes colors.

Open the destination’s **Raider lookout** before sailing. It appraises your purse and commercial crates at their home-port list prices. It shows the possible toll, the usual demand and the most likely enemy. A richer manifest attracts more dangerous ships on average. Your first passage and the Harbor Watch exercise are free.

When hailed, you see the actual ship, its armament, both crew strengths and the exact toll. Pay from your purse or tender the listed crates. Whole crates earn change if their appraisal exceeds the demand, and you cover any shortfall in crowns. Refuse the demand to take the helm. You can fight or escape at the edge. Defeat costs the posted settlement. Papers and bonded mail stay aboard.

The levy and ship weights are authored in `src/raiders.ts`. Each whole rate within a row is equally likely.

| Share of hails | Demand as a share of the manifest | Chance the raider brings a ship one class heavier |
| ---: | ---: | ---: |
| 65% | 5–12% | 0% |
| 25% | 13–22% | 10% |
| 8% | 23–35% | 30% |
| 2% | 36–50% | 65% |

Below 140 crowns, starting scout/cutter/corsair odds are 75/23/2%. At 140 crowns they become 44/47/9%, and at 320 crowns they become 32/45/23%. Promotion stops at corsair. A scout carries one gun, a cutter two, and a corsair four. Payment rounds to the nearest whole crown between 5% rounded up and half the manifest rounded down. A manifest worth zero or one crown passes free.

Each captain has a saved random seed. Casting off locks the rate, demand and ship for a pirate voyage. Reloading or choosing another destination for the same voyage number keeps the draw. Changes to the manifest can change the cost and shift ship odds. Earlier saves already facing a raider keep their quoted enemy and price, subject to the half-manifest cap.

## Local edition

For conversations with your ChatGPT plan, start the personal edition on the computer where you will sign in. The hosted game also offers an on-device WebGPU model. A local Ollama installation can supply another voice.

```sh
git clone https://github.com/dyelax/skyrates.git
cd skyrates
npm ci
npm run play:local
```

Open [the local edition](http://127.0.0.1:4817/?voices=1), choose **Sign in with ChatGPT**, approve Skyrates in the official sign-in window, and pick one of your available models. The public game’s voice settings can carry your captain across. You can also choose an installed Ollama model. The browser model downloads to the device when you select it.

ChatGPT sign-in uses a loopback callback and PKCE. Only a registration identifier persists in your local user folder. Tokens stay in the running local process. **Disconnect ChatGPT** revokes the grant and **Manage usage** opens your plan controls. [OpenAI local integration guide](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)

## Playtest chat

Click the small speech bubble at the right edge of the game, or press **F2**. Enter a mechanics question or bug report and choose **Open in Codex** to review the draft with the current screen, route, weather, cargo and objectives. The web option lets you copy the same report into Codex Web. The game remembers your unfinished text for this tab.

To use an existing private Codex playtest conversation, open the game once with `#playtest=THREAD_UUID` appended to its URL. That browser remembers the thread and removes the fragment from the address bar. **Unlink playtest thread** restores the new-chat behavior. Configure the private tracker inside the owner’s thread. The [playtest triage skill](.agents/skills/skyrates-playtest/SKILL.md) guides mechanics answers, reproduction and duplicate checks.

## Run locally

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

`npm test` runs the economy, save, progression, and combat regression tests. `npm run build` type-checks the game and builds the static site into `dist/`. `npm run preview` serves that build locally.

The TypeScript game simulation is independent of the interface. Port definitions and chapter tuning live in [the game data](src/data.ts). Phaser renders painted airships over a still cloud painting. The ports and workshops use still ImageGen illustrations with selectable people, buildings and counters. The same harbor image and clickable locations work when WebGL is unavailable. [Artwork and production prompts](docs/artwork.md) · [Bundled third-party notices](public/licenses)

The public game is served from the root of the `gh-pages` branch. Publish the contents of a tested `dist/` build to that branch with a `.nojekyll` file. The `main` branch contains the source and editable game data.

[Design research and first-voyage playtests](docs/design/merchant-and-pirate-games.md)

[The first voyage: training, trade, pirate tolls and captain progression](docs/design/first-voyage-decisions.md)
