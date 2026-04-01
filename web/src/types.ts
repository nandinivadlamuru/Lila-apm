export type MapId = "AmbroseValley" | "GrandRift" | "Lockdown";

export type EventKind =
  | "Kill"
  | "Killed"
  | "BotKill"
  | "BotKilled"
  | "KilledByStorm"
  | "Loot"
  | "Position"
  | "BotPosition";

export interface GameEvent {
  user_id: string;
  match_id: string;
  map_id: MapId;
  event: EventKind;
  is_bot: boolean;
  pixel_x: number;
  pixel_y: number;
  ts_ms: number;
  date: string;
  x?: number;
  z?: number;
}

export interface MatchSummary {
  match_id: string;
  date: string;
  day: string;
  num_humans: number;
  num_bots: number;
  total_events: number;
  ts_start: number;
  ts_end: number;
}

export interface MapSummary {
  matches: MatchSummary[];
  total_events: number;
  dates: string[];
}

export type SummaryIndex = Record<MapId, MapSummary>;
