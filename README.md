# LILA BLACK — player event explorer

Interactive minimap for Level Design: combat, loot, and sampled movement from Feb 10–14, 2026.

## Submission (Lila APM written test)

| Deliverable | Link |
|-------------|------|
| **GitHub repository** (source + `README`, `ARCHITECTURE.md`, `INSIGHTS.md`, `player_data/`, `public/data/`) | [github.com/nandinivadlamuru/Lila-apm](https://github.com/nandinivadlamuru/Lila-apm) |
| **Live app** (Netlify) | [nandinivadlamuru.netlify.app](https://nandinivadlamuru.netlify.app) |

**Tech stack:** React 18, Vite, TypeScript, Leaflet, `leaflet.heat`; data pipeline Python + pandas/pyarrow (`convert.py`).

**Environment variables:** none.

**Docs in repo:** `ARCHITECTURE.md` (stack, data flow, coordinate mapping, assumptions, tradeoffs), `INSIGHTS.md` (three evidence-backed insights).

> The assignment states that **only a GitHub repo link** is accepted for submission—not Google Drive or other doc links. Use the table above in your email; keep everything reviewers need **inside the repo**.

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

**From repo root** (recommended):

```bash
npm run install-web
npm run dev
```

**Or** from `web/`:

```bash
cd web
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Production build

```bash
npm run build
npm run preview
```

(Run from repo root; same as `cd web && npm run …`.)

Static assets (JSON + minimaps) are pulled from `../public/` via Vite’s `publicDir`.

## Deploy (Vercel)

1. Create a project from this Git repository.
2. Set **Root Directory** to `web`.
3. Framework preset: **Vite**; build command `npm run build`, output `dist`.
4. Ensure `public/` at the repo root (next to `web/`) contains `data/` and `minimaps/` — Vite copies them into `dist` on build. If you deploy only the `web` folder without the parent `public`, run `convert.py` and copy `public` up one level or adjust `vite.config.ts`.

## Deploy (Netlify)

The repo includes **`netlify.toml`** at the root. After you connect the Git repo:

1. In **Site configuration → Build & deploy → Build settings**, either **clear** custom build/publish overrides so Netlify uses `netlify.toml`, **or** set them manually:
   - **Build command:** `npm install --prefix web && npm run build --prefix web`
   - **Publish directory:** `web/dist` (must be `dist`, not the `web` source folder)
2. Trigger a new deploy. The generic “page not found” page almost always means **Publish directory** was set to `web` or `.` instead of **`web/dist`**, or the build failed (check the deploy log).

`public/_redirects` is copied into `web/dist` so client routes still get `index.html` when you add routing later.

## Layout

- `convert.py` — parquet → JSON
- `player_data/` — source parquet + minimaps (not required for hosting after conversion)
- `public/data/` — generated JSON
- `public/minimaps/` — map images for the UI
- `web/` — React + Vite + Leaflet app

See `ARCHITECTURE.md` for coordinate mapping and stack notes.
