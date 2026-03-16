# Children of Styx

A 2D simulation game built with **Phaser 3** for the Arcade Gen AI Jam. Choose a Greek god faction, interact with rivals through diplomacy or violence, and shape an ancient city as factions compete for fame.

## Story

You have just overthrown your father, the God Chronos, and have taken over the mortal world. Under the guidance of the four children of the Goddess Styx, you must guide the mortals to build your ideal society. Who will you follow? How will you rule?

## Gameplay

- **Choose your champion** — Zeus, Poseidon, or Athena
- **Interact each round** — pick a rival faction and choose Violence or Praise
- **Stats drive outcomes** — each character has four stats named after the children of the river Styx:
  - **Nike (Fame)** — Reputation and life force; game over if the player's hits 0. Rises with wins and praise, falls with losses.
  - **Zelus (Rivalry)** — How tense/confrontational they are. Raises the chance of violence (NPC–NPC and "opponent chooses Violence"). Falls when someone wins; rises when someone loses.
  - **Kratos (Power)** — Combat strength; decides who wins violent fights (equal power = player wins). Only changes from winning fights or being praised by the same faction.
  - **Bia (Violence)** — Aggression; high Bia = less likely to accept praise and more likely to "choose Violence." Rises with wins, falls with praise and losses.
- **Shape the city** — the leading faction leaves its mark after each round:
  - **Zeus** places temples
  - **Poseidon** carves winding rivers across the map
  - **Athena** builds market shops
- **Win condition** — after 10 rounds, the faction with the most buildings wins

## Stack

- **Phaser 3** – 2D game framework (arcade physics, tilemaps, sprites)
- **Vite** – dev server and production build

## Setup

1. **Clone and install**

   ```bash
   git clone https://github.com/DanCloud724/ChildrenofStyx.git
   cd ChildrenofStyx
   npm install
   ```

2. **Run locally**

   ```bash
   npm run dev
   ```

   Open the URL shown in the terminal (default: http://localhost:8080).

3. **Build for production**

   ```bash
   npm run build
   ```

   Output is in `dist/`.

## Project layout

```
ChildrenofStyx/
├── index.html              # Entry HTML
├── src/
│   ├── main.js             # Phaser game config and bootstrap
│   ├── scenes/
│   │   ├── MenuScene.js    # Champion selection screen
│   │   └── GameScene.js    # Main gameplay, city, and decorations
│   └── entities/
│       └── Character.js    # Player/NPC stats, movement, and UI
├── assets/                 # Tilesets, god sprites
│   ├── gods/               # God/goddess sprite sheets
│   └── greeks_tileset/     # Terrain and building tilesets (32px)
├── public/assets/          # Copied for Vercel deployment
└── vite.config.js
```

## Asset Credits

- [Land of Pixels – Ancient Greeks Inspired Tileset](https://marceles.itch.io/land-of-pixels-ancient-greeks-inspired-tileset-top-down) by Marceles
- [Greek Temple & Statue Assets](https://captainskolot.itch.io/greek-temple-statue-assets-pixelart-pixel-art-sprite-chest-pack-for-rpg-fant) by CaptainSkolot

## License

Use whatever license your jam requires.
