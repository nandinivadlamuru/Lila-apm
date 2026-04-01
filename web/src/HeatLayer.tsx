import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

type HeatPoint = [number, number, number];

export function HeatLayer({
  points,
  radius = 18,
  blur = 14,
}: {
  points: HeatPoint[];
  radius?: number;
  blur?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    const heat = (
      L as unknown as {
        heatLayer: (
          p: HeatPoint[],
          o: { radius: number; blur: number; maxZoom: number; max?: number }
        ) => L.Layer;
      }
    ).heatLayer(points, { radius, blur, maxZoom: 12, max: 1 });
    map.addLayer(heat);
    return () => {
      map.removeLayer(heat);
    };
  }, [map, points, radius, blur]);

  return null;
}
