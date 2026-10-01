import { create } from "zustand";
import { Room } from "colyseus.js";
import type { MatchPhase, Team, KillFeedEntry, PingData } from "@duo-arena/shared";

interface LocalPlayerState {
  id: string;
  name: string;
  team: Team;
  hp: number;
  maxHp: number;
  ammo: number;
  reserveAmmo: number;
  weaponId: string;
  isReloading: boolean;
  isAlive: boolean;
}

interface MatchStore {
  room: Room<any> | null;
  phase: MatchPhase;
  round: number;
  bestOf: number;
  scoreA: number;
  scoreB: number;
  timeLeft: number;
  winner: string;
  roomCode: string;
  localPlayer: LocalPlayerState | null;
  playersList: any[];
  killFeed: KillFeedEntry[];
  recentPings: PingData[];
  isAudioMuted: boolean;
  showSettings: boolean;

  setRoom: (room: Room<any> | null) => void;
  updateFromState: (state: any, sessionId: string) => void;
  addKillFeed: (entry: KillFeedEntry) => void;
  addPing: (ping: PingData) => void;
  toggleMute: () => void;
  setShowSettings: (show: boolean) => void;
  reset: () => void;
}

export const useMatchStore = create<MatchStore>((set, get) => ({
  room: null,
  phase: "LOBBY",
  round: 1,
  bestOf: 5,
  scoreA: 0,
  scoreB: 0,
  timeLeft: 90,
  winner: "",
  roomCode: "",
  localPlayer: null,
  playersList: [],
  killFeed: [],
  recentPings: [],
  isAudioMuted: false,
  showSettings: false,

  setRoom: (room) => set({ room }),

  updateFromState: (state: any, sessionId: string) => {
    const playersList: any[] = [];
    let localPlayer: LocalPlayerState | null = null;

    if (state.players) {
      state.players.forEach((p: any, id: string) => {
        const item = {
          id: p.id || id,
          name: p.name,
          team: p.team,
          hp: p.hp,
          maxHp: p.maxHp,
          ammo: p.ammo,
          reserveAmmo: p.reserveAmmo,
          weaponId: p.weaponId,
          isReloading: p.isReloading,
          isAlive: p.isAlive,
          isBot: p.isBot,
        };
        playersList.push(item);

        if (id === sessionId || p.id === sessionId) {
          localPlayer = item;
        }
      });
    }

    set({
      phase: state.phase as MatchPhase,
      round: state.round || 1,
      bestOf: state.bestOf || 5,
      scoreA: state.scoreA || 0,
      scoreB: state.scoreB || 0,
      timeLeft: Math.round(state.timeLeft || 0),
      winner: state.winner || "",
      roomCode: state.roomCode || "",
      playersList,
      localPlayer: localPlayer || get().localPlayer,
    });
  },

  addKillFeed: (entry) =>
    set((state) => ({
      killFeed: [entry, ...state.killFeed].slice(0, 5),
    })),

  addPing: (ping) =>
    set((state) => ({
      recentPings: [ping, ...state.recentPings].slice(0, 4),
    })),

  toggleMute: () => set((state) => ({ isAudioMuted: !state.isAudioMuted })),
  setShowSettings: (show) => set({ showSettings: show }),

  reset: () =>
    set({
      room: null,
      phase: "LOBBY",
      round: 1,
      scoreA: 0,
      scoreB: 0,
      timeLeft: 90,
      winner: "",
      killFeed: [],
      recentPings: [],
    }),
}));
