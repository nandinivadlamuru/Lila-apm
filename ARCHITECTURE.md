# Architecture

## Product goal

Ship a browser tool so a Level Designer can **see where** combat, loot, storm deaths, and movement occur on each official minimap, with filters (map, day, match, player type, event type, time).

## Stack

| Layer | Choice | Why |
|--------|--------|-----|
| UI | React 18 + Vite + TypeScript | Fast dev, easy static deploy |
| Map | Leaflet + `react-leaflet` | Image overlay + markers + heatmap |
| Heatmap | `leaflet.heat` | Density view for crowded matches |
| Data | Static JSON in `public/data/` | No backend; works on Vercel/Netlify |

Parquet stays offline. `convert.py` decodes events, tags bots, computes screen pixels once; the SPA only fetches JSON.

## Data flow (parquet → pixels)

1. **Ingest:** `convert.py` walks `player_data/February_*`, reads each file with **PyArrow**, decodes `event` bytes to UTF-8 strings.
2. **Enrich:** Adds `is_bot` from `user_id`, `day` / `date` from folder name, `pixel_x` / `pixel_y` from map config + `(x, z)`, normalizes `ts` to `ts_ms`.
3. **Split:** Writes `*_events.json` (combat + loot only), `*_movement.json` (Position / BotPosition, sampled), and `summary.json` (match list for filters).
4. **Serve:** Vite copies `public/` into `dist/`; the SPA `fetch`es JSON and minimap images over HTTP.
5. **Render:** React passes filtered rows into Leaflet: `ImageOverlay` for the 1024² minimap, `CircleMarker` / `leaflet.heat` using the Leaflet Y-flip described below.

## Coordinate mapping

Gameplay rows store world `(x, y, z)`. For the **2D minimap**, **use `x` and `z` only** — `y` is height.

Per-map constants (from dataset README):

| Map | Scale | Origin X | Origin Z |
|-----|-------|----------|----------|
| AmbroseValley | 900 | -370 | -473 |
| GrandRift | 581 | -290 | -290 |
| Lockdown | 1000 | -500 | -500 |

Conversion to **normalized UV** (0–1):

- `u = (x - origin_x) / scale`
- `v = (z - origin_z) / scale`

Conversion to **minimap pixels** (1024×1024, origin top-left, Y down):

- `pixel_x = u * 1024`
- `pixel_y = (1 - v) * 1024`

`convert.py` writes `pixel_x` / `pixel_y` into JSON so the client does not repeat world math.

### Leaflet `CRS.Simple`

Leaflet’s simple CRS uses **Y increasing upward**. Image pixels use **Y downward**, so the UI maps a point with:

`leafletLat = 1024 - pixel_y`, `leafletLng = pixel_x`

The `ImageOverlay` bounds are `[[0, 0], [1024, 1024]]` in `[lat, lng]` order for this CRS.

## Bot vs human

- **Human:** `user_id` is a UUID string.
- **Bot:** `user_id` is numeric (string of digits).

`convert.py` adds boolean `is_bot`; filenames follow the same convention.

## Data volumes

Movement rows are **downsampled** (every 5th row) in `convert.py` to keep JSON smaller. Combat/loot rows are kept in full. The map caps dot rendering (~2800) when needed and encourages heatmap or tighter filters.

## Assumptions (where the README was silent or we chose a path)

| Topic | Assumption |
|--------|------------|
| Wall-clock vs match time | `ts` is treated as **orderable time within a match**; the UI shows labels derived from raw `ts_ms`. Cross-match wall time is not reconstructed. |
| “Playback” | **Automated scrub** (Play advances the timeline) plus manual scrub — not interpolated entity replay. |
| Movement volume | Movement rows are **downsampled every 5th row** in `convert.py` for JSON size and render cost. |
| Bot vs human | `is_bot` from **user id shape** (numeric vs UUID), per README / filenames. |
| Dot cap | Above **~2,800** visible dots, markers are **subsampled**; heatmap still uses the full filtered set. |

## Tradeoffs

| Option considered | Decision | Why |
|-------------------|----------|-----|
| Parquet in the browser | **Offline Python → JSON** | Smaller bundle, predictable parsing, static hosting. |
| Single giant JSON | **Per-map files** + `summary.json` | Faster map switching, smaller per-request payloads. |
| Full movement | **Sampled movement** + traffic heat | Keeps RAM/repo size reasonable while surfacing dense paths. |
| All markers as SVG dots | **Dot cap + heatmap** | Leaflet slows with tens of thousands of SVG circles. |
| Backend API | **None** | Zero env vars; deploy to Vercel/Netlify as static files. |
