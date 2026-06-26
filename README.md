# Flock — Meadow Survival Prototype

A tiny top-down procedural pixel-art flock survival game designed for GitHub Pages.

## Play loop

- Tap/click the meadow to guide the flock.
- Sheep graze during the day and slowly fill their hunger meter.
- Exploring reveals landmarks and increases map completion.
- At dusk the flock should return to the home field.
- At night, wolves hunt. Sheep outside the closed home field are at higher risk.
- Well-fed adult flocks can produce lambs overnight.
- Lambs grow into adults after a few days.

## Controls

- Tap/click/drag: set flock target.
- Call Home: send flock back to the home field.
- Gate: manually open/close during the day.
- Pause: pause simulation.

## GitHub Pages

Upload these files to a repo:

- `index.html`
- `styles.css`
- `game.js`
- `README.md`

Then enable Pages from `Settings → Pages → Deploy from branch → main → /root`.

## Design direction

This first pass uses procedural pixel drawing rather than sprite sheets. Sheep, wolves, features, grass, gate, and particles are drawn from rectangles and simple canvas primitives.

Good next passes:

1. Add sound: bells, wind, bleats, wolf howls.
2. Add named sheep inspection on tap.
3. Add actual food varieties with discovery log.
4. Add seasons and winter scarcity.
5. Add smarter flock roles: leader, mother, timid, greedy, explorer.
6. Add save/load using localStorage.
7. Add a title screen and death/end state.
