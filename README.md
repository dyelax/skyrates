# Skyrates

[Play Skyrates](https://dyelax.github.io/skyrates/)

![Exploring the docks at Sunstep Quay in Skyrates](docs/harbor.webp)

Take the helm of the Wayfarer, a wooden schooner that rides a glowing lift keel beneath translucent solar sails. Your first commission is to restore the Skyway Beacon. The glassworkers have a replacement lens ready, and someone still has to pay them.

## At the quay

Walk the floating docks with **WASD** or the arrow keys. Drag to look around, or turn with **Q / E**. Tap the paving to walk there. **Home** returns you to the landing. Point at a building or a person to see who is there. Visit the market to trade, talk to the porter for a lead, or find Harbormaster Vale in the green doorway. Press **H** to reveal place names. Board the schooner to inspect the hold, hull, and crew.

Open the sky chart with **M** or the compass. Select an island for passage time, recorded prices, and sailing orders. The captain’s log opens with **J**. Decisions, cargo, and completed encounters save automatically in this browser. Sound and fullscreen are available from the small options control at the quay.

## In a fight

On your first departure from Sunstep, the Harbor Watch runs a chalk-round exercise. Dodge a marked shot, fire your single port cannon, then grapple the watch cutter and watch your crew cross the rail. The exercise saves at each lesson. You can skip it or practice again at a shipyard.

| Order | Control |
| --- | --- |
| Turn | A / D or left / right arrows. Click open sky to steer toward it. |
| Change throttle | W / S or up / down arrows |
| Fire a single cannon | 1–4, click its station, or click the raider to fire an available gun |
| Port or starboard broadside | Q / E |
| Set an intercept for boarding | B |
| Set the wind sight | V or click the wind gauge |
| Break away | R |
| Pause | P |

The arrow on the wind gauge points downwind. Watch your heading as the wind carries the hull sideways. Rounds curve downwind in flight. Set the wind sight to allow for drift on long shots. The Harbor Watch runs its exercise in sheltered air.

Each cannon refit adds a gun until all four stations are filled. A side with two fitted guns gains a broadside order. Each cannon reloads separately. Turning brings a fresh battery to bear. Contact brings the crews together, and crew size, experience, and hull condition influence the outcome. Captains can also slip past a raider before engaging.

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

## Run locally

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

`npm test` runs the economy, save, progression, and combat regression tests. `npm run build` type-checks the game and builds the static site into `dist/`. `npm run preview` serves that build locally.

The TypeScript game simulation is independent of the interface. Port definitions and chapter tuning live in [the game data](src/data.ts). Phaser handles the real-time encounters, and Three.js renders the walkable ports, shadowed voxel architecture and articulated dock crews. Devices without WebGL 2 can explore the original illustrated quays. [Artwork and production prompts](docs/artwork.md) · [Bundled third-party notices](public/licenses)

The public game is served from the root of the `gh-pages` branch. Publish the contents of a tested `dist/` build to that branch with a `.nojekyll` file. The `main` branch contains the source and editable game data.

[Design research and first-voyage playtests](docs/design/merchant-and-pirate-games.md)
