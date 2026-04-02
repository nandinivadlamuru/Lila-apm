import { useMemo } from "react";
import { CircleMarker, ImageOverlay, MapContainer, Pane, Tooltip } from "react-leaflet";
import L from "leaflet";
import { EVENT_COLORS } from "./eventColors";
import { HeatLayer } from "./HeatLayer";
import { pixelToLatLng } from "./worldToLeaflet";
import type { GameEvent } from "./types";

const BOUNDS: L.LatLngBoundsExpression = [
  [0, 0],
  [1024, 1024],
];

const MAX_DOT_MARKERS = 2800;

export function GameMap({
  imageUrl,
  events,
  showHeat,
  showDots,
  heatMode,
}: {
  imageUrl: string;
  events: GameEvent[];
  showHeat: boolean;
  showDots: boolean;
  heatMode: "all" | "deaths" | "kills" | "loot" | "movement";
}) {
  const heatPoints = useMemo(() => {
    const pick = (ev: GameEvent): boolean => {
      if (heatMode === "all") return true;
      if (heatMode === "deaths")
        return ev.event === "Killed" || ev.event === "KilledByStorm" || ev.event === "BotKilled";
      if (heatMode === "kills") return ev.event === "Kill" || ev.event === "BotKill";
      if (heatMode === "loot") return ev.event === "Loot";
      return ev.event === "Position" || ev.event === "BotPosition";
    };
    return events
      .filter(pick)
      .map((e) => {
        const [lat, lng] = pixelToLatLng(e.pixel_x, e.pixel_y);
        return [lat, lng, 0.35] as [number, number, number];
      });
  }, [events, heatMode]);

  const dotEvents = useMemo(() => {
    if (!showDots) return [];
    if (events.length <= MAX_DOT_MARKERS) return events;
    const step = Math.ceil(events.length / MAX_DOT_MARKERS);
    return events.filter((_, i) => i % step === 0);
  }, [events, showDots]);

  const oversampled = showDots && events.length > MAX_DOT_MARKERS;

  return (
    <div className="map-shell">
      {oversampled && (
        <div className="map-banner">
          Showing {dotEvents.length} of {events.length} points (sampled for performance). Narrow
          filters or use heatmap.
        </div>
      )}
      <MapContainer
        crs={L.CRS.Simple}
        minZoom={-2}
        maxZoom={3}
        zoom={0}
        center={[512, 512]}
        maxBounds={BOUNDS}
        maxBoundsViscosity={1}
        className="game-map"
        scrollWheelZoom
      >
        <ImageOverlay url={imageUrl} bounds={BOUNDS} />
        {showHeat && heatPoints.length > 0 && <HeatLayer points={heatPoints} />}
        {showDots && (
          <Pane name="dots" style={{ zIndex: 450 }}>
            {dotEvents.map((e, i) => {
              const [lat, lng] = pixelToLatLng(e.pixel_x, e.pixel_y);
              const color = EVENT_COLORS[e.event] ?? "#64748b";
              const r = e.is_bot ? 5 : 4;
              const human = !e.is_bot;
              return (
                <CircleMarker
                  key={`${e.match_id}-${e.user_id}-${e.ts_ms}-${e.event}-${i}`}
                  center={[lat, lng]}
                  radius={r}
                  pathOptions={{
                    color: human ? "#e2e8f0" : "#f59e0b",
                    weight: human ? 1.5 : 2,
                    dashArray: human ? undefined : "3 3",
                    fillColor: color,
                    fillOpacity: human ? 0.82 : 0.88,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                    <div className="tip">
                      <strong>{e.event}</strong>
                      <div>{e.date}</div>
                      <div className="tip-sub">{e.match_id.slice(0, 36)}…</div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </Pane>
        )}
      </MapContainer>
    </div>
  );
}
