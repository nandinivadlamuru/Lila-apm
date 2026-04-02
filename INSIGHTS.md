# Insights from the visualization tool

Evidence below uses the **combat + loot JSON** exported from all five days (`*_events.json`, 16,045 rows total). Re-check counts after re-running `convert.py` if the source parquet changes.

---

## Insight 1 — PvP is almost invisible in this slice; bots dominate the combat signal

### What caught your eye in the data

On the map, “human vs human” kill markers are extremely rare compared with bot-related combat.

### Back it up — pattern / stat

In the combined event export, human journey rows include only **3** `Kill` and **3** `Killed` events, versus **2,232** `BotKill` and **403** `BotKilled` (human rows). Storm deaths total **39** across all maps. Most “fighting” telemetry in this window is **human ↔ bot**, not **human ↔ human**.

### Actionable — metrics & items

- **Do:** Prioritize bot tuning (density, difficulty, placement) for moment-to-moment combat in this dataset window; validate PvP on longer windows or higher-pop playlists if needed.
- **Metrics:** PvP engagement rate, bot:human elimination ratio, time-to-first-contact, retention after first bot encounter.

### Why a Level Designer should care

If layouts are tuned for PvP choke points but players mainly die to bots or the storm, spawn routes, sightlines, and cover should be revalidated for **bot pressure** and **rotation timing**, not only duels.

---

## Insight 2 — Storm deaths are rare but split across largest and smallest map

### What caught your eye in the data

Storm (`KilledByStorm`) is a small slice of deaths, and it is not concentrated on one map.

### Back it up — pattern / stat

`KilledByStorm` counts: **AmbroseValley: 17**, **Lockdown: 17**, **GrandRift: 5** (39 total). Ambrose and Lockdown tie despite different level sizes/playbooks.

### Actionable — metrics & items

- **Do:** Audit storm timing vs. average extract path length **per map** (not globally). Adjust safe windows or clarity on Lockdown if storm deaths feel high for area; investigate GrandRift if storm threat feels absent (extraction timing vs. sample size).
- **Metrics:** Storm death % of all deaths (per map), median time alive after first storm tick, extract success rate.

### Why a Level Designer should care

Storm is one-way pressure; per-map mismatch reads as unfair (too rushed) or flat (never threatened).

---

## Insight 3 — Loot dominates the signal; movement is a deliberate layer

### What caught your eye in the data

With movement off, the map still looks busy—mostly loot—while combat markers are sparse.

### Back it up — pattern / stat

Human journey rows include **12,770** `Loot` rows in the combat/loot export versus the tiny PvP counts above. Movement lives in separate, downsampled `*_movement.json` files and is **off by default** so designers can focus on combat first.

### Actionable — metrics & items

- **Do:** Use **heatmap → movement** after filtering to a **single match** for pathing; use **loot heat** for dead zones vs. over-stacked farms.
- **Metrics:** Loot events per map tile, path coverage % of walkable minimap, correlation between loot density and storm deaths.

### Why a Level Designer should care

Unused space wastes art and confuses navigation; over-dense loot flattens risk/reward and sidelines other objectives.

---

*Validate these in the live tool (map / match / heat modes) before citing them in your walkthrough.*
