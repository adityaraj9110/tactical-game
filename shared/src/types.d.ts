export type Team = "A" | "B";
export type MatchPhase = "LOBBY" | "BUY" | "COUNTDOWN" | "LIVE" | "ROUND_END" | "MATCH_END";
export interface InputPayload {
    seq: number;
    dx: number;
    dy: number;
    aimAngle: number;
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
//# sourceMappingURL=types.d.ts.map