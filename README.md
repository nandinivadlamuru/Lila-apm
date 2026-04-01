# LILA BLACK — player event explorer

Interactive minimap for Level Design: combat, loot, and sampled movement from Feb 10–14, 2026.

## Prerequisites

- Node.js 18+
- Python 3 with `pandas` and `pyarrow` (only to regenerate JSON from parquet)

**Environment variables:** none — the app is fully static after conversion.

## Regenerate data (`public/data`)

From the repo root (`lila-apm/`):

```bash
pip install pandas pyarrow
python3 convert.py
```

## Run the web app

```bash
cd web
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Production build

```bash
cd web
npm run build
npm run preview
```

Static assets (JSON + minimaps) are pulled from `../public/` via Vite’s `publicDir`.

## Deploy (Vercel)

1. Create a project from this Git repository.
2. Set **Root Directory** to `web`.
3. Framework preset: **Vite**; build command `npm run build`, output `dist`.
4. Ensure `public/` at the repo root (next to `web/`) contains `data/` and `minimaps/` — Vite copies them into `dist` on build. If you deploy only the `web` folder without the parent `public`, run `convert.py` and copy `public` up one level or adjust `vite.config.ts`.

## Layout

- `convert.py` — parquet → JSON
- `player_data/` — source parquet + minimaps (not required for hosting after conversion)
- `public/data/` — generated JSON
- `public/minimaps/` — map images for the UI
- `web/` — React + Vite + Leaflet app

See `ARCHITECTURE.md` for coordinate mapping and stack notes.
