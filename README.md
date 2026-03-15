# Arcade Gen AI Jam

3D browser game built with **Tripo AI** (3D models) and **Seedance** (video/cinematics), for the Arcade Gen AI Jam.

## Stack

- **Vite** – dev server and build
- **Three.js** – 3D rendering in the browser
- **Tripo AI** – text/image to 3D model generation
- **Seedance** – AI video for cutscenes or cinematics

## Setup

1. **Clone and install**

   ```bash
   cd ArcadeGenAIJam
   yarn install
   # or: npm install
   ```

2. **API keys**

   - Copy `.env.example` to `.env`
   - Add your Tripo and Seedance API keys in `.env`
   - Do not commit `.env` (it’s in `.gitignore`)

3. **Run locally**

   ```bash
   yarn dev
   # or: npm run dev
   ```

   Open the URL shown in the terminal (e.g. http://localhost:5173).

4. **Build for production**

   ```bash
   yarn build
   # or: npm run build
   ```

   Output is in `dist/`. You can host that folder on GitHub Pages, Netlify, or any static host.

## GitHub

- **Repo:** [github.com/dancloud626/ArcadeGenAIJam](https://github.com/dancloud626/ArcadeGenAIJam)
- Push your branch and open a PR, or push to `main` if you’re working solo.
- For the jam, make sure the repo is public and the game is playable (e.g. via GitHub Pages or a hosted build).

## Project layout

```
ArcadeGenAIJam/
├── index.html          # Entry HTML
├── src/
│   ├── main.js         # Three.js scene and game bootstrap
│   └── (add Tripo/Seedance integration here)
├── public/             # Static assets (e.g. generated .glb)
├── .env.example        # Template for API keys
└── README.md
```

## License

Use whatever license your jam requires.
