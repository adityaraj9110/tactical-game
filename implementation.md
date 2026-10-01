# Duo Arena — Version 1 Implementation Plan & Technical Specification

> **Project:** Duo Arena — 2v2 Tactical Top-Down Shooter (Version 1)  
> **Target Platform:** Web Browsers (Desktop Chrome/Edge/Firefox/Safari)  
> **Stack:** React 18 + Vite + TypeScript (UI/HUD), Phaser 3 (2D WebGL/Canvas game engine), Colyseus (Authoritative Node.js real-time server), Howler.js (Spatial Audio), Zustand (State sync).

---

## Table of Contents
1. [Executive Summary & V1 Scope](#1-executive-summary--v1-scope)
2. [Monorepo Architecture & Directory Layout](#2-monorepo-architecture--directory-layout)
3. [Shared Data Contracts & Colyseus Schemas](#3-shared-data-contracts--colyseus-schemas)
4. [Authoritative Server Implementation (Colyseus)](#4-authoritative-server-implementation-colyseus)
5. [Client Engine Implementation (React + Phaser 3)](#5-client-engine-implementation-react--phaser-3)
6. [Tactical Mechanics (Fog-of-War & Spatial Audio)](#6-tactical-mechanics-fog-of-war--spatial-audio)
7. [Weapon Registry & Combat Mathematics](#7-weapon-registry--combat-mathematics)
8. [AI Bot Engine for Solo & Practice Mode](#8-ai-bot-engine-for-solo--practice-mode)
9. [Map Layout Specification (Warehouse Arena)](#9-map-layout-specification-warehouse-arena)
10. [Milestone Checklist & Verification Guide](#10-milestone-checklist--verification-guide)

---

## 1. Executive Summary & V1 Scope

Duo Arena is a fast-paced **2v2 tactical top-down shooter**. Version 1 focuses strictly on core competitive depth:
- **Perspective:** 2D Top-Down (orthogonal view, smooth camera interpolation, 1600x1200 arena).
- **Match Format:** 2 teams (Team Blue vs Team Red, 2 players each). Best of 1, 3, 5, or 7 rounds.
- **Round Loop:** 
  1. 10s weapon pick / buy phase
  2. 3s tactical countdown
  3. Live round (single life per player per round, 90s timer)
  4. Sudden death shrinking safe-zone after 75s
  5. Round conclusion & scoreboard
- **Authoritative Server:** Client transmits only player inputs (WASD direction, aim angle, fire trigger). The server computes movement, checks raycasts, registers bullet hits, updates HP, and broadcasts 30Hz delta snapshots.
- **Tactical Pillars:**
  - **Dynamic 2D Line-of-Sight / Fog-of-War:** Shadow casting occludes unseen corridors and hides enemy sprites.
  - **Spatial Sound Simulation:** Gunfire and footsteps attenuate with distance and pan in stereo.
  - **Cover Mechanics:** Destructible crates (80 HP) absorb bullets and provide breakable protection.

---

## 2. Monorepo Architecture & Directory Layout

```
duo-arena/
├── package.json                 # Monorepo workspaces definition
├── tsconfig.base.json           # Common TS compiler configuration
│
├── shared/                      # Zero-dependency contracts & pure functions
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts             # Barrel export
│       ├── constants.ts         # TICK_RATE (30), MAP_W (1600), MAP_H (1200), PLAYER_SPEED (240)
│       ├── weapons.ts           # Weapon definitions (Pistol, SMG, Rifle, Shotgun)
│       ├── types.ts             # InputPayload, MatchPhase, Team, PingData
│       └── math/
│           ├── vector.ts        # 2D Vector math utilities
│           └── raycast.ts       # Segment-segment & circle-box intersections
│
├── server/                      # Node.js + Colyseus authoritative game server
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts             # Server entry point (Express + Colyseus)
│       ├── rooms/
│       │   └── ArenaRoom.ts     # Room lifecycle, matchmaking & simulation loop
│       ├── schema/
│       │   ├── MatchState.ts    # Colyseus synced state (scores, round, phase, timer)
│       │   ├── PlayerSchema.ts  # Synced player (x, y, angle, hp, weapon, ammo)
│       │   ├── BulletSchema.ts  # Synced projectiles (x, y, vx, vy, damage, team)
│       │   └── CrateSchema.ts   # Destructible cover entities
│       ├── systems/
│       │   ├── MovementSystem.ts# Player input validation & map bounding collision
│       │   ├── CombatSystem.ts  # Weapon firing, projectile updates, hit resolution
│       │   ├── ZoneSystem.ts    # Sudden death safe zone circle contraction
│       │   └── BotSystem.ts     # State-machine AI for solo/practice games
│       └── maps/
│           └── warehouse.ts     # Map geometry, obstacle polygons, spawn points
│
└── client/                      # React 18 + Vite + Phaser 3 + Tailwind CSS
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx              # View router (Menu -> Lobby -> Arena -> MatchResult)
        ├── store/
        │   ├── matchStore.ts    # Zustand store (binds Colyseus state to React HUD)
        │   └── settingsStore.ts # Audio volume, key bindings, saved player name
        ├── ui/
        │   ├── components/      # HealthBar, AmmoDisplay, RoundTimer, Minimap, Killfeed
        │   └── screens/         # MainMenu, LobbyScreen, BuyMenu, GameOverModal
        └── game/
            ├── GameCanvas.tsx   # React wrapper mounting the Phaser canvas
            ├── config.ts        # Phaser 3 GameConfig
            ├── scenes/
            │   ├── BootScene.ts # Sprite & audio asset preloader
            │   └── ArenaScene.ts# 60fps render loop, input capture, camera tracking
            ├── net/
            │   ├── NetworkManager.ts # Colyseus client connection wrapper
            │   └── Interpolator.ts   # 100ms snapshot buffer for remote entities
            ├── render/
            │   ├── FogOfWar.ts  # 2D Visibility Polygon raycasting & dynamic mask
            │   └── ParticleFX.ts# Muzzle flashes, bullet sparks, blood impact VFX
            └── audio/
                └── SoundManager.ts # Howler.js spatial audio engine
```

---

## 3. Shared Data Contracts & Colyseus Schemas

### 3.1 Types & Input Contract (`shared/src/types.ts`)

```typescript
export type Team = "A" | "B";

export type MatchPhase = 
  | "LOBBY"       // Waiting for 4 players or host force-start
  | "BUY"         // 10s weapon selection phase
  | "COUNTDOWN"   // 3s ready countdown
  | "LIVE"        // Active round combat
  | "ROUND_END"   // Round recap & score update (4s)
  | "MATCH_END";  // Match winner announced, rematch option

export interface InputPayload {
  seq: number;          // Monotonically increasing sequence number
  dx: number;           // Move X direction (-1, 0, 1)
  dy: number;           // Move Y direction (-1, 0, 1)
  aimAngle: number;     // Mouse aim angle in radians
  shooting: boolean;    // Primary fire trigger pressed
  reloading: boolean;   // Reload trigger pressed
  walking: boolean;     // Shift pressed: 50% speed, silent footsteps
}

export interface PingEvent {
  x: number;
  y: number;
  senderTeam: Team;
  senderName: string;
}
```

### 3.2 Colyseus State Schema (`server/src/schema/MatchState.ts`)

```typescript
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { Team, MatchPhase } from "@duo-arena/shared";

export class PlayerSchema extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "Operative";
  @type("string") team: Team = "A";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") vx: number = 0;
  @type("number") vy: number = 0;
  @type("number") angle: number = 0;
  @type("int16")  hp: number = 100;
  @type("int16")  maxHp: number = 100;
  @type("boolean") isAlive: boolean = true;
  @type("string") weaponId: string = "rifle";
  @type("int16")  ammo: number = 25;
  @type("int16")  reserveAmmo: number = 100;
  @type("boolean") isReloading: boolean = false;
  @type("uint32") lastProcessedInput: number = 0;
}

export class BulletSchema extends Schema {
  @type("string") id: string = "";
  @type("string") ownerId: string = "";
  @type("string") team: Team = "A";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") vx: number = 0;
  @type("number") vy: number = 0;
  @type("int16")  damage: number = 20;
  @type("number") spawnTime: number = 0;
}

export class CrateSchema extends Schema {
  @type("string") id: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") width: number = 48;
  @type("number") height: number = 48;
  @type("int16")  hp: number = 80;
  @type("boolean") destroyed: boolean = false;
}

export class MatchState extends Schema {
  @type("string") phase: MatchPhase = "LOBBY";
  @type("uint8")  bestOf: number = 5;
  @type("uint8")  round: number = 1;
  @type("uint8")  scoreA: number = 0;
  @type("uint8")  scoreB: number = 0;
  @type("number") timeLeft: number = 90;
  @type("string") winner: string = "";

  // Sudden Death Shrinking Circle
  @type("number") zoneCenterX: number = 800;
  @type("number") zoneCenterY: number = 600;
  @type("number") zoneRadius: number = 1200;

  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type([ BulletSchema ]) bullets = new ArraySchema<BulletSchema>();
  @type([ CrateSchema ]) crates = new ArraySchema<CrateSchema>();
}
```

---

## 4. Authoritative Server Implementation (Colyseus)

### 4.1 ArenaRoom Core Loop (`server/src/rooms/ArenaRoom.ts`)

```typescript
import { Room, Client } from "colyseus";
import { MatchState, PlayerSchema, BulletSchema, CrateSchema } from "../schema/MatchState";
import { InputPayload, Team } from "@duo-arena/shared";
import { MovementSystem } from "../systems/MovementSystem";
import { CombatSystem } from "../systems/CombatSystem";
import { ZoneSystem } from "../systems/ZoneSystem";
import { BotSystem } from "../systems/BotSystem";
import { WAREHOUSE_MAP } from "../maps/warehouse";

export class ArenaRoom extends Room<MatchState> {
  maxClients = 4;
  private inputQueues = new Map<string, InputPayload[]>();
  private movementSystem!: MovementSystem;
  private combatSystem!: CombatSystem;
  private zoneSystem!: ZoneSystem;
  private botSystem!: BotSystem;

  onCreate(options: { bestOf?: number; roomCode?: string }) {
    this.setState(new MatchState());
    this.state.bestOf = options.bestOf || 5;

    // Load static crates & obstacles from map definition
    WAREHOUSE_MAP.crates.forEach((c, idx) => {
      const crate = new CrateSchema();
      crate.id = `crate_${idx}`;
      crate.x = c.x;
      crate.y = c.y;
      crate.width = c.width;
      crate.height = c.height;
      crate.hp = 80;
      this.state.crates.push(crate);
    });

    this.movementSystem = new MovementSystem(WAREHOUSE_MAP);
    this.combatSystem = new CombatSystem(this.state, WAREHOUSE_MAP);
    this.zoneSystem = new ZoneSystem(this.state);
    this.botSystem = new BotSystem(this.state, WAREHOUSE_MAP);

    // 30 Hz Fixed Simulation Tick
    this.setSimulationInterval((dt) => this.tick(dt / 1000), 1000 / 30);

    // Message Handlers
    this.onMessage("input", (client, input: InputPayload) => {
      const queue = this.inputQueues.get(client.sessionId);
      if (queue) queue.push(input);
    });

    this.onMessage("select_weapon", (client, weaponId: string) => {
      const player = this.state.players.get(client.sessionId);
      if (player && this.state.phase === "BUY") {
        player.weaponId = weaponId;
      }
    });

    this.onMessage("ping", (client, data: { x: number; y: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player && player.isAlive) {
        // Broadcast ping to teammates only
        this.broadcast("teammate_ping", {
          x: data.x,
          y: data.y,
          senderName: player.name,
        }, { except: this.getOpponents(player.team) });
      }
    });
  }

  onJoin(client: Client, options: { name: string; team?: Team }) {
    const player = new PlayerSchema();
    player.id = client.sessionId;
    player.name = options.name?.slice(0, 16) || `Agent-${client.sessionId.slice(0, 4)}`;

    // Auto-balance teams (2 vs 2)
    let teamA = 0, teamB = 0;
    this.state.players.forEach((p) => (p.team === "A" ? teamA++ : teamB++));
    player.team = options.team || (teamA <= teamB ? "A" : "B");

    this.state.players.set(client.sessionId, player);
    this.inputQueues.set(client.sessionId, []);

    // If lobby reaches 4 or practice mode requested, start buy phase
    if (this.state.players.size >= 4 && this.state.phase === "LOBBY") {
      this.startBuyPhase();
    }
  }

  async onLeave(client: Client, consented: boolean) {
    if (!consented) {
      try {
        await this.allowReconnection(client, 30); // 30s reconnect window
        return;
      } catch {
        // Expired
      }
    }
    this.state.players.delete(client.sessionId);
    this.inputQueues.delete(client.sessionId);
  }

  private tick(dt: number) {
    switch (this.state.phase) {
      case "BUY":
        this.updateBuyPhase(dt);
        break;
      case "COUNTDOWN":
        this.updateCountdownPhase(dt);
        break;
      case "LIVE":
        this.updateLivePhase(dt);
        break;
      case "ROUND_END":
        this.updateRoundEndPhase(dt);
        break;
    }
  }

  private updateBuyPhase(dt: number) {
    this.state.timeLeft = Math.max(0, this.state.timeLeft - dt);
    if (this.state.timeLeft <= 0) {
      this.startCountdown();
    }
  }

  private updateCountdownPhase(dt: number) {
    this.state.timeLeft = Math.max(0, this.state.timeLeft - dt);
    if (this.state.timeLeft <= 0) {
      this.state.phase = "LIVE";
      this.state.timeLeft = 90;
    }
  }

  private updateRoundEndPhase(dt: number) {
    this.state.timeLeft = Math.max(0, this.state.timeLeft - dt);
  }

  private updateLivePhase(dt: number) {
    this.state.timeLeft = Math.max(0, this.state.timeLeft - dt);

    // 1. Process client inputs & update movements
    this.state.players.forEach((player, sessionId) => {
      if (!player.isAlive) return;
      const inputs = this.inputQueues.get(sessionId) || [];
      while (inputs.length > 0) {
        const input = inputs.shift()!;
        this.movementSystem.processInput(player, input, dt);
        this.combatSystem.processInput(player, input, dt);
        player.lastProcessedInput = input.seq;
      }
    });

    // 2. Update AI Bots
    this.botSystem.update(dt);

    // 3. Step Bullets & Detect Collisions
    this.combatSystem.updateBullets(dt);

    // 4. Sudden Death Safe Zone shrinking
    this.zoneSystem.update(dt);

    // 5. Check Round Elimination
    this.checkRoundOutcome();
  }

  private checkRoundOutcome() {
    let aliveA = 0, aliveB = 0;
    this.state.players.forEach((p) => {
      if (p.isAlive) {
        if (p.team === "A") aliveA++;
        else aliveB++;
      }
    });

    if (aliveA === 0 || aliveB === 0) {
      const roundWinner: Team = aliveA > 0 ? "A" : (aliveB > 0 ? "B" : (this.state.scoreA > this.state.scoreB ? "B" : "A"));
      this.endRound(roundWinner);
    }
  }

  private endRound(winner: Team) {
    if (winner === "A") this.state.scoreA++;
    else this.state.scoreB++;

    const winsNeeded = Math.floor(this.state.bestOf / 2) + 1;
    if (this.state.scoreA >= winsNeeded || this.state.scoreB >= winsNeeded) {
      this.state.phase = "MATCH_END";
      this.state.winner = this.state.scoreA >= winsNeeded ? "Team Blue" : "Team Red";
    } else {
      this.state.phase = "ROUND_END";
      this.state.round++;
      this.state.timeLeft = 4;
      this.clock.setTimeout(() => this.startBuyPhase(), 4000);
    }
  }

  private startBuyPhase() {
    this.state.phase = "BUY";
    this.state.timeLeft = 10;
    this.resetPlayersForNewRound();
  }

  private startCountdown() {
    this.state.phase = "COUNTDOWN";
    this.state.timeLeft = 3;
  }

  private resetPlayersForNewRound() {
    let aIdx = 0, bIdx = 0;
    this.state.players.forEach((p) => {
      p.isAlive = true;
      p.hp = 100;
      p.ammo = 25;
      const spawn = p.team === "A" 
        ? WAREHOUSE_MAP.spawnsTeamA[aIdx++ % WAREHOUSE_MAP.spawnsTeamA.length]
        : WAREHOUSE_MAP.spawnsTeamB[bIdx++ % WAREHOUSE_MAP.spawnsTeamB.length];
      p.x = spawn.x;
      p.y = spawn.y;
    });
    this.state.bullets.clear();
    this.zoneSystem.reset();
  }

  private getOpponents(team: Team): Client[] {
    const opps: Client[] = [];
    this.clients.forEach((c) => {
      const p = this.state.players.get(c.sessionId);
      if (p && p.team !== team) opps.push(c);
    });
    return opps;
  }
}
```

---

## 5. Client Engine Implementation (React + Phaser 3)

### 5.1 GameCanvas Component (`client/src/game/GameCanvas.tsx`)

Mounts Phaser safely inside React, handling canvas resizing, WebGL contexts, and clean destruction on component unmount.

```tsx
import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import { Room } from "colyseus.js";
import { MatchState } from "@duo-arena/shared";
import { BootScene } from "./scenes/BootScene";
import { ArenaScene } from "./scenes/ArenaScene";

interface GameCanvasProps {
  room: Room<MatchState>;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ room }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.WEBGL,
      parent: mountRef.current,
      width: 1280,
      height: 720,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: "arcade",
        arcade: { debug: false },
      },
      render: {
        pixelArt: false,
        antialias: true,
      },
      scene: [new BootScene(), new ArenaScene(room)],
    };

    gameInstance.current = new Phaser.Game(config);

    return () => {
      gameInstance.current?.destroy(true);
      gameInstance.current = null;
    };
  }, [room]);

  return (
    <div 
      ref={mountRef} 
      className="w-full h-full relative overflow-hidden bg-slate-950 select-none cursor-crosshair"
    />
  );
};
```

---

## 6. Tactical Mechanics (Fog-of-War & Spatial Audio)

### 6.1 Visibility Polygon Masking (`client/src/game/render/FogOfWar.ts`)

```typescript
import Phaser from "phaser";

interface Segment {
  p1: { x: number; y: number };
  p2: { x: number; y: number };
}

export class FogOfWar {
  private scene: Phaser.Scene;
  private maskGraphics: Phaser.GameObjects.Graphics;
  private fogOverlay: Phaser.GameObjects.Rectangle;
  private segments: Segment[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.maskGraphics = scene.make.graphics({});
    
    // Dark shroud over arena
    this.fogOverlay = scene.add.rectangle(800, 600, 1600, 1200, 0x05070a, 0.94);
    this.fogOverlay.setDepth(100);

    const mask = this.maskGraphics.createGeometryMask();
    mask.setInvertAlpha(true);
    this.fogOverlay.setMask(mask);
  }

  public update(viewerX: number, viewerY: number) {
    this.maskGraphics.clear();
    this.maskGraphics.fillStyle(0xffffff, 1);
    this.maskGraphics.beginPath();

    const points = this.calculateVisibilityPolygon(viewerX, viewerY);
    if (points.length < 3) return;

    this.maskGraphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.maskGraphics.lineTo(points[i].x, points[i].y);
    }
    this.maskGraphics.closePath();
    this.maskGraphics.fillPath();
  }

  public isVisible(x: number, y: number): boolean {
    return true; 
  }

  private calculateVisibilityPolygon(originX: number, originY: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const rayCount = 120;
    const maxRadius = 650;

    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      const targetX = originX + Math.cos(angle) * maxRadius;
      const targetY = originY + Math.sin(angle) * maxRadius;
      points.push({ x: targetX, y: targetY });
    }
    return points;
  }
}
```

### 6.2 Spatial Sound Engine (`client/src/game/audio/SoundManager.ts`)

```typescript
import { Howl, Howler } from "howler";

export class SoundManager {
  private static sfx: Record<string, Howl> = {};
  private static maxAudibleDistance = 900;

  public static init() {
    this.sfx.pistol = new Howl({ src: ["/assets/audio/sfx/pistol.ogg", "/assets/audio/sfx/pistol.mp3"] });
    this.sfx.smg = new Howl({ src: ["/assets/audio/sfx/smg.ogg", "/assets/audio/sfx/smg.mp3"] });
    this.sfx.rifle = new Howl({ src: ["/assets/audio/sfx/rifle.ogg", "/assets/audio/sfx/rifle.mp3"] });
    this.sfx.shotgun = new Howl({ src: ["/assets/audio/sfx/shotgun.ogg", "/assets/audio/sfx/shotgun.mp3"] });
    this.sfx.footstep = new Howl({ src: ["/assets/audio/sfx/step.ogg"], volume: 0.3 });
    this.sfx.hitmark = new Howl({ src: ["/assets/audio/sfx/hit.ogg"], volume: 0.7 });
    this.sfx.zoneWarning = new Howl({ src: ["/assets/audio/sfx/zone_alarm.ogg"], loop: true, volume: 0.25 });
  }

  public static playSpatial(
    name: string,
    sourceX: number,
    sourceY: number,
    listenerX: number,
    listenerY: number
  ) {
    const sound = this.sfx[name];
    if (!sound) return;

    const dx = sourceX - listenerX;
    const dy = sourceY - listenerY;
    const dist = Math.hypot(dx, dy);

    if (dist > this.maxAudibleDistance) return;

    const volume = Math.max(0, 1 - dist / this.maxAudibleDistance);
    const pan = Math.max(-1, Math.min(1, dx / (this.maxAudibleDistance * 0.75)));

    const id = sound.play();
    sound.volume(volume, id);
    sound.stereo(pan, id);
  }

  public static setMasterVolume(vol: number) {
    Howler.volume(Math.max(0, Math.min(1, vol)));
  }
}
```

---

## 7. Weapon Registry & Combat Mathematics

```typescript
// shared/src/weapons.ts
export interface WeaponSpec {
  id: "pistol" | "smg" | "rifle" | "shotgun";
  name: string;
  fireRate: number;      // Shots per second
  damage: number;        // Damage per pellet/bullet
  pellets: number;       // Number of projectiles per trigger pull
  spreadDeg: number;     // Cone of spread in degrees
  bulletSpeed: number;   // Pixels per second
  maxRange: number;      // Maximum travel distance
  magSize: number;       // Ammo clip capacity
  reloadMs: number;      // Milliseconds to reload
  cost: number;          // Buy phase budget cost
  auto: boolean;         // Hold-to-fire
}

export const WEAPON_REGISTRY: Record<string, WeaponSpec> = {
  pistol: {
    id: "pistol",
    name: "P250 Combat",
    fireRate: 4.5,
    damage: 18,
    pellets: 1,
    spreadDeg: 2.0,
    bulletSpeed: 1300,
    maxRange: 850,
    magSize: 12,
    reloadMs: 1200,
    cost: 0,
    auto: false,
  },
  smg: {
    id: "smg",
    name: "MP-5K Tactical",
    fireRate: 11.0,
    damage: 12,
    pellets: 1,
    spreadDeg: 6.5,
    bulletSpeed: 1150,
    maxRange: 650,
    magSize: 30,
    reloadMs: 1600,
    cost: 400,
    auto: true,
  },
  rifle: {
    id: "rifle",
    name: "M4 Phantom",
    fireRate: 7.0,
    damage: 22,
    pellets: 1,
    spreadDeg: 2.8,
    bulletSpeed: 1600,
    maxRange: 1200,
    magSize: 25,
    reloadMs: 2000,
    cost: 800,
    auto: true,
  },
  shotgun: {
    id: "shotgun",
    name: "Remington 870",
    fireRate: 1.2,
    damage: 9,
    pellets: 8,          // 8 x 9 = 72 max point-blank damage
    spreadDeg: 12.0,
    bulletSpeed: 950,
    maxRange: 450,
    magSize: 6,
    reloadMs: 2400,
    cost: 600,
    auto: false,
  },
};
```

---

## 8. AI Bot Engine for Solo & Practice Mode

To make the game immediately playable and testable by a single developer or player without waiting for 3 external users, the server provides a finite-state-machine (FSM) bot agent:

```typescript
// server/src/systems/BotSystem.ts
import { MatchState, PlayerSchema } from "../schema/MatchState";
import { WAREHOUSE_MAP } from "../maps/warehouse";

type BotState = "PATROL" | "SEEK_COVER" | "ATTACK";

export class BotAgent {
  public state: BotState = "PATROL";
  private currentWaypoint = 0;
  private reactionTimer = 0;

  constructor(
    public player: PlayerSchema,
    private patrolRoute: { x: number; y: number }[]
  ) {}

  public update(dt: number, state: MatchState) {
    if (!this.player.isAlive || state.phase !== "LIVE") return;

    const enemy = this.getClosestVisibleEnemy(state);

    if (enemy) {
      this.state = "ATTACK";
      this.aimAndFire(enemy, dt, state);
    } else {
      this.state = "PATROL";
      this.followPatrolRoute(dt);
    }
  }

  private followPatrolRoute(dt: number) {
    const target = this.patrolRoute[this.currentWaypoint];
    const dx = target.x - this.player.x;
    const dy = target.y - this.player.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 40) {
      this.currentWaypoint = (this.currentWaypoint + 1) % this.patrolRoute.length;
      return;
    }

    const angle = Math.atan2(dy, dx);
    this.player.angle = angle;
    this.player.x += Math.cos(angle) * 160 * dt;
    this.player.y += Math.sin(angle) * 160 * dt;
  }

  private aimAndFire(enemy: PlayerSchema, dt: number, state: MatchState) {
    const dx = enemy.x - this.player.x;
    const dy = enemy.y - this.player.y;
    this.player.angle = Math.atan2(dy, dx);

    this.reactionTimer += dt;
    if (this.reactionTimer > 0.35) {
      this.reactionTimer = 0;
    }
  }

  private getClosestVisibleEnemy(state: MatchState): PlayerSchema | null {
    let nearest: PlayerSchema | null = null;
    let minDist = 600;

    state.players.forEach((p) => {
      if (p.isAlive && p.team !== this.player.team) {
        const d = Math.hypot(p.x - this.player.x, p.y - this.player.y);
        if (d < minDist) {
          minDist = d;
          nearest = p;
        }
      }
    });

    return nearest;
  }
}
```

---

## 9. Map Layout Specification (Warehouse Arena)

- **Arena Dimensions:** 1600 × 1200 units.
- **Symmetry:** Bilateral 180° rotational symmetry so Team Blue (West) and Team Red (East) face balanced path lengths and cover angles.
- **Lanes:**
  1. **North Lane (Sniper/Long corridor):** Long sightline with two concrete pillars. Ideal for Rifles.
  2. **Central Hub (Cover & King of the Hill):** 6 destructible crates clustered around a forklift obstacle. High risk, controls visibility into both side lanes.
  3. **South Lane (Close Quarters Flank):** Narrow storage aisles and sliding metal doors. Deadly for Shotgun / SMG engagements.

```
+-------------------------------------------------------------------------+
| [Team A Spawn]                === NORTH LANE ===         [Team B Spawn] |
| (150, 600)                                                  (1450, 600) |
|                                                                         |
|         [Wall]            [Crate]       [Crate]            [Wall]       |
|                                                                         |
|                          === CENTRAL HUB ===                            |
|                          [Forklift Obstacle]                            |
|                                                                         |
|         [Wall]            [Crate]       [Crate]            [Wall]       |
|                                                                         |
|                               === SOUTH LANE ===                        |
|                               (Tight Corridors)                         |
+-------------------------------------------------------------------------+
```

---

## 10. Milestone Checklist & Verification Guide

### Quick Start Commands

```bash
# 1. Initialize root package
npm init -y

# 2. Setup Client
npm create vite@latest client -- --template react-ts
cd client && npm install phaser colyseus.js howler zustand lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 3. Setup Server
cd .. && mkdir server && cd server
npm init -y
npm install colyseus @colyseus/schema @colyseus/ws-transport express cors
npm install -D typescript tsx @types/node @types/express

# 4. Setup Shared Package
cd .. && mkdir shared && cd shared
npm init -y
npm install -D typescript
```

### Verification Criteria

- [ ] **State Synchronization:** Two browser tabs in the same lobby join opposite teams and display matching positions at 30Hz updates.
- [ ] **Authoritative Wall Collisions:** Player cannot clip through arena boundaries or crates regardless of client packet spoofing.
- [ ] **Fog of War Occlusion:** An enemy behind a wall or outside line-of-sight is completely culled from rendering and network packet broadcasts.
- [ ] **Combat & Damage Sync:** Shooting deals exact weapon damage; at 0 HP the player transitions to spectator mode and the round ends when one team is wiped out.
- [ ] **Best-of-N Match Lifecycle:** The match progresses through Buy (10s) -> Countdown (3s) -> Live (90s) -> Round Summary -> Match End victory card.
- [ ] **Solo Practice Mode:** Clicking "Play Solo vs Bots" populates the remaining 3 slots with autonomous AI agents.
