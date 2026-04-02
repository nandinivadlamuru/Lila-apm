import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameMap } from "./GameMap";
import { EVENT_LABELS } from "./eventColors";
import { MAP_DATA_FILES, MAP_LABEL, MAP_ORDER } from "./mapAssets";
import type { EventKind, GameEvent, MapId, MatchSummary, SummaryIndex } from "./types";
import "./App.css";

const ALL_DATES = "__all__";
const ALL_MATCHES = "__all__";

const EVENT_COMBAT: EventKind[] = [
  "Kill",
  "Killed",
  "BotKill",
  "BotKilled",
  "KilledByStorm",
  "Loot",
];
const EVENT_MOVE: EventKind[] = ["Position", "BotPosition"];

function defaultEventToggles(): Record<EventKind, boolean> {
  return {
    Kill: true,
    Killed: true,
    BotKill: true,
    BotKilled: true,
    KilledByStorm: true,
    Loot: true,
    Position: false,
    BotPosition: false,
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json() as Promise<T>;
}

/** Elapsed m:ss from range start (ts in JSON is absolute epoch ms). */
function formatElapsedFromOrigin(absoluteMs: number, originMs: number): string {
  const sec = Math.max(0, Math.floor((absoluteMs - originMs) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function App() {
  const [summary, setSummary] = useState<SummaryIndex | null>(null);
  const [mapId, setMapId] = useState<MapId>("AmbroseValley");
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [movement, setMovement] = useState<GameEvent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState<string>(ALL_DATES);
  const [matchId, setMatchId] = useState<string>(ALL_MATCHES);
  const [eventToggles, setEventToggles] = useState(defaultEventToggles);
  const [showHumans, setShowHumans] = useState(true);
  const [showBots, setShowBots] = useState(true);
  const [showHeat, setShowHeat] = useState(true);
  const [showDots, setShowDots] = useState(true);
  const [heatMode, setHeatMode] = useState<"all" | "deaths" | "kills" | "loot" | "movement">(
    "all"
  );
  const [timelineMax, setTimelineMax] = useState(100);
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [focusUserId, setFocusUserId] = useState<string>(ALL_MATCHES);

  const loadMapData = useCallback(async (id: MapId) => {
    setLoading(true);
    setLoadError(null);
    try {
      const files = MAP_DATA_FILES[id];
      const [ev, mv] = await Promise.all([
        fetchJson<GameEvent[]>(files.events),
        fetchJson<GameEvent[]>(files.movement),
      ]);
      setEvents(ev);
      setMovement(mv);
      setDate(ALL_DATES);
      setMatchId(ALL_MATCHES);
      setTimelineMax(100);
      setTimelinePlaying(false);
      setFocusUserId(ALL_MATCHES);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load data");
      setEvents([]);
      setMovement([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJson<SummaryIndex>("/data/summary.json")
      .then(setSummary)
      .catch((e) => setLoadError(e instanceof Error ? e.message : "summary load failed"));
  }, []);

  useEffect(() => {
    loadMapData(mapId);
  }, [mapId, loadMapData]);

  const datesForMap = summary?.[mapId]?.dates ?? [];

  const matchesForFilters: MatchSummary[] = useMemo(() => {
    const all = summary?.[mapId]?.matches ?? [];
    if (date === ALL_DATES) return all;
    return all.filter((m) => m.date === date);
  }, [summary, mapId, date]);

  // Base set for timeline range:
  // - If a match is selected: use all rows for that match (events + movement), so the timeline spans the match.
  // - Else: fall back to the currently enabled layers (combinedRaw).
  const timelineBase = useMemo(() => {
    const all = [...events, ...movement];
    let rows = all;
    if (date !== ALL_DATES) rows = rows.filter((e) => e.date === date);
    if (matchId !== ALL_MATCHES) rows = rows.filter((e) => e.match_id === matchId);
    return rows;
  }, [events, movement, date, matchId]);

  const combinedRaw = useMemo(() => {
    const evParts: GameEvent[] = [];
    const moveOn = EVENT_MOVE.some((k) => eventToggles[k]);
    const combatOn = EVENT_COMBAT.some((k) => eventToggles[k]);
    if (combatOn) {
      evParts.push(
        ...events.filter((e) => eventToggles[e.event] && EVENT_COMBAT.includes(e.event))
      );
    }
    if (moveOn) {
      evParts.push(
        ...movement.filter((e) => eventToggles[e.event] && EVENT_MOVE.includes(e.event))
      );
    }
    // Day filter must apply here (not only to the match dropdown), otherwise the map still
    // shows all days when Match = "All matches".
    if (date !== ALL_DATES) {
      return evParts.filter((e) => e.date === date);
    }
    return evParts;
  }, [events, movement, eventToggles, date]);

  const timeRange = useMemo(() => {
    if (!timelineBase.length) return { min: 0, max: 1 };
    let min = timelineBase[0].ts_ms;
    let max = timelineBase[0].ts_ms;
    for (const e of timelineBase) {
      if (e.ts_ms < min) min = e.ts_ms;
      if (e.ts_ms > max) max = e.ts_ms;
    }
    if (max <= min) max = min + 1;
    return { min, max };
  }, [timelineBase]);

  const timeCutoff = useMemo(() => {
    const { min, max } = timeRange;
    const t = min + ((max - min) * timelineMax) / 100;
    return t;
  }, [timeRange, timelineMax]);

  const filtered = useMemo(() => {
    let rows = combinedRaw;
    if (matchId !== ALL_MATCHES) rows = rows.filter((e) => e.match_id === matchId);
    rows = rows.filter((e) => e.ts_ms <= timeCutoff);
    if (!showHumans) rows = rows.filter((e) => e.is_bot);
    if (!showBots) rows = rows.filter((e) => !e.is_bot);
    return rows;
  }, [combinedRaw, matchId, timeCutoff, showHumans, showBots]);

  const focusCandidates = useMemo(() => {
    if (matchId === ALL_MATCHES) return [];
    // We need movement rows to locate a user/bot “at time T”.
    // If a user has no movement samples, they won't appear here.
    let rows = movement.filter((m) => m.match_id === matchId);
    if (date !== ALL_DATES) rows = rows.filter((m) => m.date === date);
    if (!showHumans) rows = rows.filter((m) => m.is_bot);
    if (!showBots) rows = rows.filter((m) => !m.is_bot);
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    ids.sort();
    return ids;
  }, [movement, matchId, date, showHumans, showBots]);

  const focusPosition = useMemo(() => {
    if (matchId === ALL_MATCHES) return null;
    if (focusUserId === ALL_MATCHES) return null;
    let rows = movement.filter((m) => m.match_id === matchId && m.user_id === focusUserId);
    if (date !== ALL_DATES) rows = rows.filter((m) => m.date === date);
    rows = rows.filter((m) => m.ts_ms <= timeCutoff);
    if (!rows.length) return null;
    // Find latest <= cutoff
    let best = rows[0];
    for (const r of rows) if (r.ts_ms >= best.ts_ms) best = r;
    return best;
  }, [movement, matchId, focusUserId, date, timeCutoff]);

  const stats = useMemo(() => {
    const counts: Partial<Record<EventKind, number>> = {};
    for (const e of filtered) {
      counts[e.event] = (counts[e.event] ?? 0) + 1;
    }
    return counts;
  }, [filtered]);

  const toggleEvent = (k: EventKind) => {
    setEventToggles((t) => ({ ...t, [k]: !t[k] }));
  };

  useEffect(() => {
    if (!timelinePlaying) {
      if (playTimer.current) {
        clearInterval(playTimer.current);
        playTimer.current = null;
      }
      return;
    }
    playTimer.current = setInterval(() => {
      setTimelineMax((v) => Math.min(100, v + 2));
    }, 220);
    return () => {
      if (playTimer.current) clearInterval(playTimer.current);
      playTimer.current = null;
    };
  }, [timelinePlaying]);

  useEffect(() => {
    if (timelinePlaying && timelineMax >= 100) setTimelinePlaying(false);
  }, [timelinePlaying, timelineMax]);

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>LILA BLACK — designer view</h1>
          <p className="sub">
            Match telemetry on minimaps (combat, loot, movement). Data: Feb 10–14, 2026.
          </p>
        </div>
      </header>

      {loadError && <div className="error-banner">{loadError}</div>}

      <div className="layout">
        <aside className="sidebar">
          <section>
            <h2>Map</h2>
            <select
              className="select"
              value={mapId}
              onChange={(e) => setMapId(e.target.value as MapId)}
              disabled={loading}
            >
              {MAP_ORDER.map((id) => (
                <option key={id} value={id}>
                  {MAP_LABEL[id]}
                </option>
              ))}
            </select>
          </section>

          <section>
            <h2>Day</h2>
            <p className="hint">Limits the map, stats, and timeline — not only the match list.</p>
            <select
              className="select"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setMatchId(ALL_MATCHES);
              }}
              disabled={loading || !datesForMap.length}
            >
              <option value={ALL_DATES}>All days</option>
              {datesForMap.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </section>

          <section>
            <h2>Match</h2>
            <select
              className="select match-select"
              value={matchId}
              onChange={(e) => setMatchId(e.target.value)}
              disabled={loading}
            >
              <option value={ALL_MATCHES}>All matches ({matchesForFilters.length})</option>
              {matchesForFilters.map((m) => (
                <option key={m.match_id} value={m.match_id}>
                  {m.date} · {m.num_humans}H/{m.num_bots}B · {m.match_id.slice(0, 8)}…
                </option>
              ))}
            </select>
          </section>

          <section>
            <h2>Focus (replay)</h2>
            <p className="hint">
              To answer “where is this bot/player at time T”, pick a single match, then choose a
              user/bot. We’ll show their latest sampled position at the current timeline time.
            </p>
            <select
              className="select match-select"
              value={focusUserId}
              onChange={(e) => setFocusUserId(e.target.value)}
              disabled={loading || matchId === ALL_MATCHES || !focusCandidates.length}
            >
              <option value={ALL_MATCHES}>
                {matchId === ALL_MATCHES ? "Select a match first" : "None"}
              </option>
              {focusCandidates.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </section>

          <section>
            <h2>Players</h2>
            <label className="check">
              <input
                type="checkbox"
                checked={showHumans}
                onChange={() => setShowHumans((v) => !v)}
              />
              Humans
            </label>
            <label className="check">
              <input type="checkbox" checked={showBots} onChange={() => setShowBots((v) => !v)} />
              Bots
            </label>
          </section>

          <section>
            <h2>Events</h2>
            <div className="event-grid">
              {([...EVENT_COMBAT, ...EVENT_MOVE] as EventKind[]).map((k) => (
                <label key={k} className="check">
                  <input
                    type="checkbox"
                    checked={eventToggles[k]}
                    onChange={() => toggleEvent(k)}
                  />
                  <span className="evt-name">{EVENT_LABELS[k]}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2>Layers</h2>
            <label className="check">
              <input type="checkbox" checked={showHeat} onChange={() => setShowHeat((v) => !v)} />
              Heatmap
            </label>
            <label className="check">
              <input type="checkbox" checked={showDots} onChange={() => setShowDots((v) => !v)} />
              Dots
            </label>
            <label className="field">
              Heat focus
              <select
                className="select"
                value={heatMode}
                onChange={(e) => setHeatMode(e.target.value as typeof heatMode)}
              >
                <option value="all">All visible events</option>
                <option value="deaths">Deaths & storm</option>
                <option value="kills">Kills</option>
                <option value="loot">Loot</option>
                <option value="movement">Movement</option>
              </select>
            </label>
          </section>

          <section>
            <h2>Timeline</h2>
            <p className="hint">
              Elapsed time within the <strong>current filters</strong> (first → last event). Pick{" "}
              <strong>one match</strong> for a true replay — with “All matches”, timestamps from
              different matches are mixed. <strong>Play</strong> scrubs forward; <strong>Start</strong>{" "}
              jumps to the beginning.
            </p>
            <div className="timeline-row">
              <span className="mono">
                {timelineBase.length ? "0:00" : "—"}
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={timelineMax}
                disabled={loading || !timelineBase.length}
                onChange={(e) => {
                  setTimelineMax(Number(e.target.value));
                  setTimelinePlaying(false);
                }}
                className="range"
              />
              <span className="mono">
                {timelineBase.length
                  ? `${formatElapsedFromOrigin(timeCutoff, timeRange.min)} / ${formatElapsedFromOrigin(timeRange.max, timeRange.min)}`
                  : "—"}
              </span>
            </div>
            <div className="timeline-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={loading || !timelineBase.length}
                onClick={() => {
                  if (timelinePlaying) {
                    setTimelinePlaying(false);
                    return;
                  }
                  if (timelineMax >= 100) setTimelineMax(0);
                  setTimelinePlaying(true);
                }}
              >
                {timelinePlaying ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                className="btn"
                disabled={!timelineBase.length}
                onClick={() => {
                  setTimelinePlaying(false);
                  setTimelineMax(0);
                }}
              >
                Start
              </button>
              <button
                type="button"
                className="btn"
                disabled={!timelineBase.length}
                onClick={() => {
                  setTimelinePlaying(false);
                  setTimelineMax(100);
                }}
              >
                End
              </button>
            </div>
          </section>

          <section>
            <h2>Legend</h2>
            <p className="legend-line">
              <span className="swatch swatch-human" /> Solid light outline = human journey row
            </p>
            <p className="legend-line">
              <span className="swatch swatch-bot" /> Dashed amber outline = bot journey row
            </p>
            <p className="hint legend-colors">Fill color = event type (see Events).</p>
          </section>
        </aside>

        <main className="main">
          <div className="stats-bar">
            <span>
              <strong>{filtered.length}</strong> points
            </span>
            {EVENT_COMBAT.map((k) =>
              (stats[k] ?? 0) > 0 ? (
                <span key={k}>
                  {EVENT_LABELS[k]}: <strong>{stats[k]}</strong>
                </span>
              ) : null
            )}
            {(stats.Position ?? 0) + (stats.BotPosition ?? 0) > 0 && (
              <span>
                Movement samples:{" "}
                <strong>{(stats.Position ?? 0) + (stats.BotPosition ?? 0)}</strong>
              </span>
            )}
            <span className="muted">
              {MAP_LABEL[mapId]}
              {date !== ALL_DATES ? ` · ${date}` : ""}
            </span>
          </div>

          {loading ? (
            <div className="loading">Loading map data…</div>
          ) : (
            <GameMap
              imageUrl={MAP_DATA_FILES[mapId].image}
              events={filtered}
              showHeat={showHeat}
              showDots={showDots}
              heatMode={heatMode}
              focusPosition={focusPosition}
            />
          )}
        </main>
      </div>
    </div>
  );
}
