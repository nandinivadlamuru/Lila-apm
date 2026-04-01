import type { MapId } from "./types";

export const MAP_ORDER: MapId[] = ["AmbroseValley", "GrandRift", "Lockdown"];

export const MAP_LABEL: Record<MapId, string> = {
  AmbroseValley: "Ambrose Valley",
  GrandRift: "Grand Rift",
  Lockdown: "Lockdown",
};

export const MAP_DATA_FILES: Record<
  MapId,
  { events: string; movement: string; image: string }
> = {
  AmbroseValley: {
    events: "/data/ambrosevalley_events.json",
    movement: "/data/ambrosevalley_movement.json",
    image: "/minimaps/AmbroseValley_Minimap.png",
  },
  GrandRift: {
    events: "/data/grandrift_events.json",
    movement: "/data/grandrift_movement.json",
    image: "/minimaps/GrandRift_Minimap.png",
  },
  Lockdown: {
    events: "/data/lockdown_events.json",
    movement: "/data/lockdown_movement.json",
    image: "/minimaps/Lockdown_Minimap.jpg",
  },
};
