# Insights from the visualization tool

Evidence below uses the **combat + loot JSON** exported from all five days (`*_events.json`, 16,045 rows total). Re-check counts after re-running `convert.py` if the source parquet changes.

---

## 1. PvP is almost invisible in this slice — bots dominate the combat signal

**What caught my eye:** On the map, “human vs human” kill markers are extremely rare compared with bot-related combat.

**Back it up:** In the combined event export, human journey rows include only **3** `Kill` and **3** `Killed` events, versus **2,232** `BotKill` and **403** `BotKilled` (human rows). Storm deaths total **39** across all maps. So most “fighting” telemetry designers see in this window is **human ↔ bot**, not **human ↔ human**.

**Actionable:** Treat bot tuning (density, difficulty, placement) as the primary lever for moment-to-moment combat feel in this dataset window; PvP hotspots may need different data (longer window, higher-pop playlists) to evaluate.

**Metrics:** PvP engagement rate, bot:human elimination ratio, time-to-first-contact, retention after first bot encounter.

**Why Level Design should care:** If layouts are balanced around PvP choke points but players mainly die to bots or the storm, spawn routes, sightlines, and cover should be revalidated for **bot pressure** and **rotation timing**, not only duels.

---

## 2. Storm deaths are rare but evenly split across the largest and smallest map

**What caught my eye:** Storm (`KilledByStorm`) is a small slice of deaths, but it is not concentrated on one map.

**Back it up:** `KilledByStorm` counts — **AmbroseValley: 17**, **Lockdown: 17**, **GrandRift: 5** (39 total). Ambrose and Lockdown tie despite very different level sizes/playbooks in the product brief.

**Actionable:** Audit storm timing vs. average extract path length **per map** (not globally). If Lockdown’s storm deaths are “too many” for its area, tighten safe windows or signage; if GrandRift is “too low,” verify whether players extract earlier or data volume is lower.

**Metrics:** Storm death % of all deaths (per map), median time alive after first storm tick, extract success rate.

**Why Level Design should care:** Storm is a one-way pressure mechanic; mismatches by map read as “unfair” or “boring” depending on whether players feel rushed or never threatened.

---

## 3. Loot events swamp everything else — movement must be turned on deliberately

**What caught my eye:** The default layer reads as “loot everywhere” if movement is off; the map looks busy even when combat is sparse.

**Back it up:** Human journey rows include **12,770** `Loot` rows in the combat/loot export versus the tiny PvP counts above. Movement is stored in separate, downsampled files (`*_movement.json`) and is **off by default** in the UI so designers can focus on combat first.

**Actionable:** When reviewing a map, use **heatmap → movement** after filtering to a **single match** to see pathing without point clutter; use loot heat to find **dead zones** (low pickup density) vs. **farms** (over-stacked areas).

**Metrics:** Loot events per km² (tile), path coverage % of walkable minimap area, correlation between loot density and storm deaths.

**Why Level Design should care:** Unused space is wasted art and confusing navigation; over-dense loot areas flatten risk/reward and make other objectives feel optional.

---

*These insights are meant to be validated interactively in the tool (filter map / match / heat modes) before you cite them verbatim in a live review.*
