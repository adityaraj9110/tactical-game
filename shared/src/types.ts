export type Team = "A" | "B";

export type MatchPhase =
  | "LOBBY"       // Waiting for players, lobby configuration
  | "BUY"         // 10s weapon pick & tactical planning
  | "COUNTDOWN"   // 3s start countdown
  | "LIVE"        // Active round combat
  | "ROUND_END"   // Round concluded, showing score (4s)
  | "MATCH_END";  // Match completed, winner declared

export interface InputPayload {
  seq: number;
  dx: number;        // -1, 0, 1
  dy: number;        // -1, 0, 1
  aimAngle: number;  // Radians
  shooting: boolean;
  reloading: boolean;
  walking: boolean;
  weaponSlot?: number;
}

export interface PingData {
  id: string;
  x: number;
  y: number;
  team: Team;
  senderName: string;
  createdAt: number;
}

export interface KillFeedEntry {
  id: string;
  killerName: string;
  killerTeam: Team;
  victimName: string;
  victimTeam: Team;
  weaponId: string;
  timestamp: number;
}

export interface Hitmarker {
  id: string;
  x: number;
  y: number;
  damage: number;
  timestamp: number;
}
