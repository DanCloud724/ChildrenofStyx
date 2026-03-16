# Children of Styx

A 2D simulation game built with **Phaser 3** for the Arcade Gen AI Jam. Choose a Greek god faction, interact with rivals through diplomacy or violence, and shape an ancient city as factions compete for fame.

## Gameplay

- **Choose your champion** — Zeus, Poseidon, or Athena
- **Interact each round** — pick a rival faction and choose Violence or Praise
- **Stats drive outcomes** — four stats (Fame, Rivalry, Power, Violence) evolve based on your choices
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

## License

Use whatever license your jam requires.
