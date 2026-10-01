import { Room, Client } from "colyseus";
import {
  WAREHOUSE_MAP,
  TICK_RATE,
  InputPayload,
  BUY_TIME_SECONDS,
  COUNTDOWN_SECONDS,
  ROUND_TIME_SECONDS,
  ROUND_END_SECONDS,
  WEAPON_REGISTRY,
} from "@duo-arena/shared";
import { MatchState, PlayerSchema, CrateSchema } from "../schema/MatchState";
import { MovementSystem } from "../systems/MovementSystem";
import { CombatSystem } from "../systems/CombatSystem";
import { ZoneSystem } from "../systems/ZoneSystem";
import { BotSystem } from "../systems/BotSystem";

export class ArenaRoom extends Room<MatchState> {
  maxClients = 4;
  private inputQueues = new Map<string, InputPayload[]>();
  private movementSystem!: MovementSystem;
  private combatSystem!: CombatSystem;
  private zoneSystem!: ZoneSystem;
  private botSystem!: BotSystem;
  private isPracticeMode = false;

  onCreate(options: { bestOf?: number; roomCode?: string }) {
    console.log("[ArenaRoom] onCreate called with options:", JSON.stringify(options));
    const state = new MatchState();
    state.bestOf = options.bestOf || 5;
    state.roomCode = options.roomCode || Math.random().toString(36).substring(2, 7).toUpperCase();
    this.setState(state);
    console.log("[ArenaRoom] state set. phase:", state.phase, "roomCode:", state.roomCode);

    // Populate crates from map definition
    WAREHOUSE_MAP.crates.forEach((c) => {
      const crate = new CrateSchema();
      crate.id = c.id;
      crate.x = c.x;
      crate.y = c.y;
      crate.width = c.width;
      crate.height = c.height;
      crate.hp = c.hp || 80;
      crate.destroyed = false;
      this.state.crates.push(crate);
    });

    // Event broadcaster for SFX and visual FX
    const broadcastEvent = (name: string, data: any) => {
      this.broadcast(name, data);
    };

    this.movementSystem = new MovementSystem(WAREHOUSE_MAP);
    this.combatSystem = new CombatSystem(this.state, WAREHOUSE_MAP, broadcastEvent);
    this.zoneSystem = new ZoneSystem(this.state);
    this.botSystem = new BotSystem(
      this.state,
      WAREHOUSE_MAP,
      this.movementSystem,
      this.combatSystem
    );

    // 30 Hz Fixed Simulation Loop
    this.setSimulationInterval((dt) => this.tick(dt / 1000), 1000 / TICK_RATE);

    // Register Message Handlers
    this.onMessage("input", (client, input: InputPayload) => {
      const queue = this.inputQueues.get(client.sessionId);
      if (queue) queue.push(input);
    });

    this.onMessage("select_weapon", (client, weaponId: string) => {
      const player = this.state.players.get(client.sessionId);
      if (player && (this.state.phase === "LOBBY" || this.state.phase === "BUY")) {
        if (WEAPON_REGISTRY[weaponId as keyof typeof WEAPON_REGISTRY]) {
          player.weaponId = weaponId;
          const weapon = WEAPON_REGISTRY[weaponId as keyof typeof WEAPON_REGISTRY];
          player.ammo = weapon.magSize;
          player.reserveAmmo = weapon.reserveAmmo;
        }
      }
    });

    this.onMessage("ping", (client, data: { x: number; y: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player && player.isAlive) {
        this.broadcast("teammate_ping", {
          x: data.x,
          y: data.y,
          team: player.team,
          senderName: player.name,
        });
      }
    });

    this.onMessage("start_practice", (client) => {
      this.fillWithBots();
      this.startBuyPhase();
    });

    this.onMessage("force_start", (client) => {
      this.fillWithBots();
      this.startBuyPhase();
    });

    this.onMessage("rematch", (client) => {
      this.state.scoreA = 0;
      this.state.scoreB = 0;
      this.state.round = 1;
      this.state.winner = "";
      this.startBuyPhase();
    });
  }

  onJoin(client: Client, options: { name?: string; team?: string; practice?: boolean }) {
    console.log("[ArenaRoom] onJoin called. client:", client.sessionId, "options:", JSON.stringify(options));
    const player = new PlayerSchema();
    player.id = client.sessionId;
    player.name = options.name?.slice(0, 14) || `Agent-${client.sessionId.slice(0, 4)}`;

    // Balance teams (Team A vs Team B)
    let teamACount = 0;
    let teamBCount = 0;
    this.state.players.forEach((p) => {
      if (p.team === "A") teamACount++;
      else teamBCount++;
    });

    player.team = options.team ? options.team : (teamACount <= teamBCount ? "A" : "B");
    player.weaponId = "rifle";
    player.ammo = 25;
    player.reserveAmmo = 100;
    player.isBot = false;

    this.state.players.set(client.sessionId, player);
    this.inputQueues.set(client.sessionId, []);

    this.positionPlayerAtSpawn(player);
    console.log("[ArenaRoom] Player added:", player.id, "at", player.x, player.y, "team:", player.team);

    if (options.practice) {
      this.isPracticeMode = true;
      console.log("[ArenaRoom] Practice mode requested, filling bots and starting buy phase");
      this.fillWithBots();
      this.startBuyPhase();
      console.log("[ArenaRoom] Total players now:", this.state.players.size, "phase:", this.state.phase);
    } else if (this.state.players.size >= 4 && this.state.phase === "LOBBY") {
      this.startBuyPhase();
    }
  }

  async onLeave(client: Client, consented: boolean) {
    if (!consented) {
      try {
        await this.allowReconnection(client, 30);
        return;
      } catch {}
    }
    this.state.players.delete(client.sessionId);
    this.inputQueues.delete(client.sessionId);
  }

  private fillWithBots() {
    let teamACount = 0;
    let teamBCount = 0;
    this.state.players.forEach((p) => {
      if (p.team === "A") teamACount++;
      else teamBCount++;
    });

    const botWeapons = ["rifle", "smg", "shotgun", "pistol"];
    let botIdCounter = 1;

    while (teamACount < 2) {
      const bot = new PlayerSchema();
      bot.id = `bot_a_${botIdCounter}`;
      bot.name = `Echo-${botIdCounter}`;
      bot.team = "A";
      bot.isBot = true;
      bot.weaponId = botWeapons[botIdCounter % botWeapons.length];
      const w = WEAPON_REGISTRY[bot.weaponId as keyof typeof WEAPON_REGISTRY];
      bot.ammo = w.magSize;
      bot.reserveAmmo = w.reserveAmmo;
      this.state.players.set(bot.id, bot);
      this.positionPlayerAtSpawn(bot);
      teamACount++;
      botIdCounter++;
    }

    while (teamBCount < 2) {
      const bot = new PlayerSchema();
      bot.id = `bot_b_${botIdCounter}`;
      bot.name = `Viper-${botIdCounter}`;
      bot.team = "B";
      bot.isBot = true;
      bot.weaponId = botWeapons[botIdCounter % botWeapons.length];
      const w = WEAPON_REGISTRY[bot.weaponId as keyof typeof WEAPON_REGISTRY];
      bot.ammo = w.magSize;
      bot.reserveAmmo = w.reserveAmmo;
      this.state.players.set(bot.id, bot);
      this.positionPlayerAtSpawn(bot);
      teamBCount++;
      botIdCounter++;
    }
  }

  private positionPlayerAtSpawn(player: PlayerSchema) {
    let indexInTeam = 0;
    this.state.players.forEach((p) => {
      if (p.team === player.team && p.id !== player.id) indexInTeam++;
    });

    const spawnList = player.team === "A" ? WAREHOUSE_MAP.spawnsTeamA : WAREHOUSE_MAP.spawnsTeamB;
    const spawn = spawnList[indexInTeam % spawnList.length];
    player.x = spawn.x;
    player.y = spawn.y;
    player.angle = player.team === "A" ? 0 : Math.PI; // Face inwards
  }

  private tick(dt: number) {
    // 1. Process human inputs in any playable phase (movement + aiming always active)
    if (this.state.phase === "BUY" || this.state.phase === "COUNTDOWN" || this.state.phase === "LIVE") {
      const now = Date.now();
      this.state.players.forEach((player, sessionId) => {
        if (player.isBot || !player.isAlive) return;

        const queue = this.inputQueues.get(sessionId) || [];
        while (queue.length > 0) {
          const input = queue.shift()!;
          this.movementSystem.processInput(player, input, dt, this.state.crates as any);
          if (this.state.phase === "LIVE") {
            this.combatSystem.processInput(player, input, now);
          }
          player.lastProcessedInput = input.seq;
        }
      });
    }

    switch (this.state.phase) {
      case "BUY":
        this.state.timeLeft = Math.max(0, this.state.timeLeft - dt);
        if (this.state.timeLeft <= 0) {
          this.startCountdown();
        }
        break;

      case "COUNTDOWN":
        this.state.timeLeft = Math.max(0, this.state.timeLeft - dt);
        if (this.state.timeLeft <= 0) {
          this.startLiveRound();
        }
        break;

      case "LIVE":
        this.state.timeLeft = Math.max(0, this.state.timeLeft - dt);

        // 2. Process bot behaviors
        this.botSystem.update(dt);

        // 3. Process combat physics & reload timers
        this.combatSystem.update(dt);

        // 4. Update sudden death shrinking ring
        this.zoneSystem.update(dt);

        // 5. Check round elimination
        this.checkRoundOutcome();
        break;

      case "ROUND_END":
        this.state.timeLeft = Math.max(0, this.state.timeLeft - dt);
        if (this.state.timeLeft <= 0) {
          this.startBuyPhase();
        }
        break;
    }
  }

  private checkRoundOutcome() {
    let aliveA = 0;
    let aliveB = 0;

    this.state.players.forEach((p) => {
      if (p.isAlive) {
        if (p.team === "A") aliveA++;
        else aliveB++;
      }
    });

    if (aliveA === 0 || aliveB === 0 || this.state.timeLeft <= 0) {
      let winner = "A";
      if (aliveA > 0 && aliveB === 0) winner = "A";
      else if (aliveB > 0 && aliveA === 0) winner = "B";
      else if (aliveA > aliveB) winner = "A";
      else if (aliveB > aliveA) winner = "B";
      else winner = this.state.scoreA <= this.state.scoreB ? "A" : "B";

      this.endRound(winner);
    }
  }

  private endRound(winnerTeam: string) {
    if (winnerTeam === "A") this.state.scoreA++;
    else this.state.scoreB++;

    const winsNeeded = Math.floor(this.state.bestOf / 2) + 1;

    if (this.state.scoreA >= winsNeeded || this.state.scoreB >= winsNeeded) {
      this.state.phase = "MATCH_END";
      this.state.winner = this.state.scoreA >= winsNeeded ? "Team Blue (A)" : "Team Red (B)";
      this.broadcast("match_over", { winner: this.state.winner });
    } else {
      this.state.phase = "ROUND_END";
      this.state.round++;
      this.state.timeLeft = ROUND_END_SECONDS;
      this.broadcast("round_over", { winnerTeam, round: this.state.round });
    }
  }

  private startBuyPhase() {
    this.state.phase = "BUY";
    this.state.timeLeft = this.isPracticeMode ? 3 : BUY_TIME_SECONDS;
    this.resetField();
  }

  private startCountdown() {
    this.state.phase = "COUNTDOWN";
    this.state.timeLeft = this.isPracticeMode ? 2 : COUNTDOWN_SECONDS;
  }

  private startLiveRound() {
    this.state.phase = "LIVE";
    this.state.timeLeft = ROUND_TIME_SECONDS;
  }

  private resetField() {
    // Reset players
    this.state.players.forEach((p) => {
      p.isAlive = true;
      p.hp = 100;
      p.isReloading = false;
      p.reloadRemainingMs = 0;
      const w = WEAPON_REGISTRY[p.weaponId as keyof typeof WEAPON_REGISTRY] || WEAPON_REGISTRY.rifle;
      p.ammo = w.magSize;
      p.reserveAmmo = w.reserveAmmo;
      this.positionPlayerAtSpawn(p);
    });

    // Clear bullets
    this.state.bullets.clear();

    // Reset crates
    this.state.crates.forEach((c) => {
      c.hp = 80;
      c.destroyed = false;
    });

    // Reset sudden death zone
    this.zoneSystem.reset();
  }
}
