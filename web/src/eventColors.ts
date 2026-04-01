import type { EventKind } from "./types";

/** Stroke / fill for circle markers */
export const EVENT_COLORS: Record<EventKind, string> = {
  Kill: "#e11d48",
  Killed: "#1e293b",
  BotKill: "#ea580c",
  BotKilled: "#7c3aed",
  KilledByStorm: "#0d9488",
  Loot: "#ca8a04",
  Position: "#2563eb",
  BotPosition: "#64748b",
};

export const EVENT_LABELS: Record<EventKind, string> = {
  Kill: "Kill (PvP)",
  Killed: "Killed (PvP)",
  BotKill: "Bot kill",
  BotKilled: "Killed by bot",
  KilledByStorm: "Storm death",
  Loot: "Loot",
  Position: "Human movement",
  BotPosition: "Bot movement",
};
