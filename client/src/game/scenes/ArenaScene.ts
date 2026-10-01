import Phaser from "phaser";
import { Room } from "colyseus.js";
import {
  WAREHOUSE_MAP,
  MAP_WIDTH,
  MAP_HEIGHT,
  PLAYER_BASE_SPEED,
  PLAYER_WALK_SPEED,
  PLAYER_RADIUS,
  resolveCircleBoxCollision,
} from "@duo-arena/shared";
import type { InputPayload } from "@duo-arena/shared";
import { FogOfWar } from "../render/FogOfWar";
import { SoundManager } from "../audio/SoundManager";
import { useMatchStore } from "../../store/matchStore";

interface PlayerVisual {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  nameText: Phaser.GameObjects.Text;
  healthBarBg: Phaser.GameObjects.Rectangle;
  healthBarFill: Phaser.GameObjects.Rectangle;
}

interface LaserVisual {
  glowLine: Phaser.GameObjects.Line;
  coreLine: Phaser.GameObjects.Line;
}

export class ArenaScene extends Phaser.Scene {
  private room!: Room<any>;
  private players = new Map<string, PlayerVisual>();
  private localPlayerContainer: Phaser.GameObjects.Container | null = null;
  private crates = new Map<string, Phaser.GameObjects.Sprite>();
  private laserGraphics!: Phaser.GameObjects.Graphics;
  private fogOfWar: FogOfWar | null = null;
  private zoneGraphics!: Phaser.GameObjects.Graphics;
  private inputSeq = 0;
  private crosshair!: Phaser.GameObjects.Container;
  private fogInitialized = false;

  // Local movement prediction state
  private predictedX = 0;
  private predictedY = 0;

  private keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    R: Phaser.Input.Keyboard.Key;
    SHIFT: Phaser.Input.Keyboard.Key;
    Q: Phaser.Input.Keyboard.Key;
  };

  constructor() {
    super("ArenaScene");
  }

  init(data: { room: Room<any> }) {
    this.room = data.room || (this.registry.get("room") as Room<any>);
    console.log("[ArenaScene] init() called, room from data:", !!data?.room, "from registry:", !!this.registry.get("room"));
  }

  create() {
    // Try multiple sources for the room connection
    if (!this.room) {
      this.room = this.registry.get("room");
    }
    if (!this.room) {
      this.room = (window as any).__DUO_ARENA_ROOM__;
    }

    if (!this.room) {
      console.error("[ArenaScene] ❌ No room connection available from any source!");
      // Show error text on the canvas
      this.add.text(640, 360, "ERROR: No server connection.\nRefresh the page and try again.", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#ef4444",
        align: "center",
      }).setOrigin(0.5);
      return;
    }

    console.log("[ArenaScene] Creating scene, room connected:", this.room.sessionId);

    // Set world physics bounds
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // 1. Render Map Floor
    this.add.tileSprite(MAP_WIDTH / 2, MAP_HEIGHT / 2, MAP_WIDTH, MAP_HEIGHT, "floor_tile");

    // 2. Render Static Walls
    for (const wall of WAREHOUSE_MAP.walls) {
      const tile = this.add.tileSprite(wall.x, wall.y, wall.width, wall.height, "wall_panel");
      tile.setDepth(10);
    }

    // 3. Render Destructible Crates
    for (const c of WAREHOUSE_MAP.crates) {
      const sprite = this.add.sprite(c.x, c.y, "crate_wood");
      sprite.setDisplaySize(c.width, c.height);
      sprite.setDepth(15);
      this.crates.set(c.id, sprite);
    }

    // 4. Sudden Death Zone Graphics & Laser Graphics
    this.zoneGraphics = this.add.graphics();
    this.zoneGraphics.setDepth(45);

    this.laserGraphics = this.add.graphics();
    this.laserGraphics.setDepth(60);

    // 5. Tactical Crosshair (upgraded from simple circle)
    this.createCrosshair();

    // 6. Setup Keybindings
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,R,SHIFT,Q") as any;

    // Handle Ping Key
    this.input.keyboard!.on("keydown-Q", () => {
      const worldPoint = this.cameras.main.getWorldPoint(
        this.input.activePointer.x,
        this.input.activePointer.y
      );
      this.room?.send("ping", { x: Math.round(worldPoint.x), y: Math.round(worldPoint.y) });
    });

    // 7. Setup Server Listeners
    this.setupServerListeners();

    // 8. 30Hz Fixed Input Dispatch
    this.time.addEvent({
      delay: 1000 / 30,
      loop: true,
      callback: () => this.sampleAndSendInputs(),
    });

    // 9. Setup camera bounds
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.cameras.main.setZoom(1.0);

    // 10. Start camera centered on map until local player is found
    this.cameras.main.centerOn(MAP_WIDTH / 2, MAP_HEIGHT / 2);

    // 11. Continuously poll for new players (handles race conditions with state sync)
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => this.syncPlayersFromState(),
    });
  }

  private createCrosshair() {
    const container = this.add.container(0, 0);
    container.setDepth(150);

    // Outer ring
    const outerRing = this.add.circle(0, 0, 10, 0x000000, 0);
    outerRing.setStrokeStyle(2, 0x38bdf8, 0.6);
    container.add(outerRing);

    // Inner dot
    const innerDot = this.add.circle(0, 0, 2, 0x38bdf8, 0.9);
    container.add(innerDot);

    // Crosshair lines
    const lineLen = 6;
    const gap = 4;
    const lines = [
      this.add.line(0, 0, -gap - lineLen, 0, -gap, 0, 0x38bdf8, 0.8), // Left
      this.add.line(0, 0, gap, 0, gap + lineLen, 0, 0x38bdf8, 0.8),   // Right
      this.add.line(0, 0, 0, -gap - lineLen, 0, -gap, 0x38bdf8, 0.8), // Up
      this.add.line(0, 0, 0, gap, 0, gap + lineLen, 0x38bdf8, 0.8),   // Down
    ];
    lines.forEach((l) => {
      l.setLineWidth(1.5);
      container.add(l);
    });

    this.crosshair = container;
  }

  /**
   * Robustly sync player visuals from the room state.
   */
  private syncPlayersFromState() {
    if (!this.room?.state?.players) return;

    const sessionId = this.room.sessionId;

    this.room.state.players.forEach((player: any, id: string) => {
      if (!this.players.has(id)) {
        this.createPlayerVisual(player, id);
      }
    });

    // Remove visuals for players no longer in state
    const toRemove: string[] = [];
    this.players.forEach((visual, id) => {
      if (!this.room.state.players.has(id)) {
        visual.container.destroy();
        toRemove.push(id);
        if (id === sessionId) {
          this.localPlayerContainer = null;
        }
      }
    });
    toRemove.forEach((id) => this.players.delete(id));

    // Sync store
    useMatchStore.getState().updateFromState(this.room.state, sessionId);
  }

  private setupServerListeners() {
    if (!this.room) return;

    // Colyseus State Changes
    this.room.onStateChange((state) => {
      useMatchStore.getState().updateFromState(state, this.room.sessionId);

      // Synchronize Crates
      state.crates?.forEach((c: any) => {
        const sprite = this.crates.get(c.id);
        if (sprite) {
          if (c.destroyed && sprite.visible) {
            sprite.setVisible(false);
            this.spawnWoodSplinters(c.x, c.y);
          } else if (!c.destroyed && !sprite.visible) {
            sprite.setVisible(true);
          }
        }
      });
    });

    // Gun Fired Broadcast Event — with laser muzzle flash
    this.room.onMessage("gun_fired", (data: any) => {
      const local = this.room.state?.players?.get(this.room.sessionId);
      const lx = local ? local.x : this.predictedX;
      const ly = local ? local.y : this.predictedY;

      SoundManager.playSpatialGun(data.weaponId, data.x, data.y, lx, ly);

      if (data.playerId === this.room.sessionId) {
        this.cameras.main.shake(60, 0.003);
      }

      this.spawnLaserMuzzleFlash(data.x, data.y);
    });

    // Player Hit Event
    this.room.onMessage("player_hit", (data: any) => {
      this.spawnBloodSplatter(data.x, data.y);
      this.spawnLaserImpact(data.x, data.y);
      if (data.shooterId === this.room.sessionId) {
        SoundManager.playHitmarker(false);
      }
    });

    // Player Killed Event
    this.room.onMessage("player_killed", (data: any) => {
      useMatchStore.getState().addKillFeed({
        id: `kill_${Date.now()}_${Math.random()}`,
        killerName: data.killerName,
        killerTeam: data.killerTeam,
        victimName: data.victimName,
        victimTeam: data.victimTeam,
        weaponId: data.weaponId,
        timestamp: Date.now(),
      });

      if (data.killerId === this.room.sessionId) {
        SoundManager.playHitmarker(true);
      }
    });

    // Teammate Tactical Ping Event
    this.room.onMessage("teammate_ping", (data: any) => {
      this.spawnTacticalPing(data.x, data.y, data.senderName);
      useMatchStore.getState().addPing({
        id: `ping_${Date.now()}`,
        x: data.x,
        y: data.y,
        team: data.team,
        senderName: data.senderName,
        createdAt: Date.now(),
      });
    });

    // Bullet Impact Event
    this.room.onMessage("bullet_impact", (data: any) => {
      this.spawnLaserImpact(data.x, data.y);
      this.spawnSparks(data.x, data.y);
    });

    // Reload Events
    this.room.onMessage("reload_start", (data: any) => {
      if (data.playerId === this.room.sessionId) {
        SoundManager.playReload();
      }
    });

    this.room.onMessage("reload_complete", (_: any) => {});
    this.room.onMessage("empty_click", (_: any) => {});
    this.room.onMessage("round_over", (_: any) => {});
    this.room.onMessage("match_over", (_: any) => {});
  }

  private createPlayerVisual(player: any, sessionId: string) {
    const isLocal = sessionId === this.room.sessionId;
    const tex = player.team === "A" ? "player_a" : "player_b";

    const container = this.add.container(player.x, player.y);
    container.setDepth(55); // Depth 55 ensures player is always drawn above fog overlay (depth 50)

    // Human-like tactical operative sprite (80x80 texture)
    const sprite = this.add.sprite(0, 0, tex);
    sprite.setOrigin(0.4, 0.5); // Center on operative body (gun extends forward)
    sprite.setDisplaySize(58, 58);

    // Player name tag
    const nameText = this.add.text(0, -36, player.name || "Agent", {
      fontFamily: "Rajdhani, sans-serif",
      fontSize: "12px",
      fontStyle: "bold",
      color: isLocal ? "#ffffff" : "#cbd5e1",
      stroke: "#000000",
      strokeThickness: 3,
    });
    nameText.setOrigin(0.5);

    // Health bar background
    const healthBarBg = this.add.rectangle(0, -26, 42, 6, 0x0f172a, 0.9);
    healthBarBg.setStrokeStyle(1, 0x334155, 0.6);
    // Health bar fill
    const barColor = player.team === "A" ? 0x38bdf8 : 0xf43f5e;
    const healthBarFill = this.add.rectangle(0, -26, 40, 4, barColor, 1);

    // Team indicator glow (subtle colored circle around player)
    const teamGlow = this.add.circle(0, 0, 30, barColor, 0.12);
    teamGlow.setStrokeStyle(1.5, barColor, isLocal ? 0.6 : 0.25);

    container.add([teamGlow, sprite, healthBarBg, healthBarFill, nameText]);
    this.players.set(sessionId, { container, sprite, nameText, healthBarBg, healthBarFill });

    if (isLocal) {
      this.localPlayerContainer = container;
      this.predictedX = player.x;
      this.predictedY = player.y;
      this.cameras.main.startFollow(container, true, 0.15, 0.15);

      // Initialize Fog of War now that we have the local player position
      if (!this.fogInitialized) {
        this.fogOfWar = new FogOfWar(this);
        this.fogInitialized = true;
      }

      console.log(`[ArenaScene] ✅ Local player "${player.name}" spawned at (${player.x}, ${player.y})`);
    } else {
      console.log(`[ArenaScene] Remote player "${player.name}" (${player.team}) at (${player.x}, ${player.y})`);
    }
  }

  update() {
    const local = this.room?.state?.players?.get(this.room.sessionId);

    // 1. Crosshair Follows Mouse in World Coordinates
    const pointer = this.input.activePointer;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.crosshair.setPosition(worldPoint.x, worldPoint.y);

    // 2. Local Player Prediction & Camera
    if (local && local.isAlive && this.localPlayerContainer) {
      // Aim toward world mouse
      const aimAngle = Phaser.Math.Angle.Between(
        this.predictedX,
        this.predictedY,
        worldPoint.x,
        worldPoint.y
      );

      // Smooth reconciliation toward server position
      this.predictedX = Phaser.Math.Linear(this.predictedX, local.x, 0.25);
      this.predictedY = Phaser.Math.Linear(this.predictedY, local.y, 0.25);

      this.localPlayerContainer.setPosition(this.predictedX, this.predictedY);
      this.localPlayerContainer.setRotation(aimAngle);

      // Update Fog of War around local player
      if (this.fogOfWar) {
        const activeCrates: any[] = [];
        this.room.state?.crates?.forEach((c: any) => activeCrates.push(c));
        this.fogOfWar.update(this.predictedX, this.predictedY, activeCrates);
      }
    } else if (local && !local.isAlive && this.localPlayerContainer) {
      // Dead: still update fog around last known position
      if (this.fogOfWar) {
        const activeCrates: any[] = [];
        this.room.state?.crates?.forEach((c: any) => activeCrates.push(c));
        this.fogOfWar.update(this.predictedX, this.predictedY, activeCrates);
      }
    }

    // 3. Interpolate Remote Players & Cull by Visibility
    this.room?.state?.players?.forEach((player: any, id: string) => {
      const visual = this.players.get(id);
      if (!visual) return;

      // Update HP bar
      const hpPct = Math.max(0, player.hp / player.maxHp);
      visual.healthBarFill.setScale(hpPct, 1);

      if (id === this.room.sessionId) {
        visual.container.setDepth(55);
        visual.container.setVisible(player.isAlive);
        return;
      }

      // Smooth interpolation for remote players
      visual.container.x = Phaser.Math.Linear(visual.container.x, player.x, 0.25);
      visual.container.y = Phaser.Math.Linear(visual.container.y, player.y, 0.25);
      visual.container.rotation = Phaser.Math.Angle.RotateTo(visual.container.rotation, player.angle, 0.3);

      // Line of Sight Culling: Hide enemy if behind wall/fog; teammates always visible
      let isVisible = player.isAlive;
      if (local && player.team !== local.team && this.fogOfWar) {
        isVisible = player.isAlive && this.fogOfWar.isVisible(player.x, player.y, this.predictedX, this.predictedY);
      }
      visual.container.setDepth(isVisible ? 55 : 10);
      visual.container.setVisible(isVisible);
    });

    // 4. Render Laser Bullets
    this.renderLaserBullets();

    // 5. Render Sudden Death Zone Ring
    this.renderSuddenDeathZone();
  }

  private sampleAndSendInputs() {
    if (!this.room) return;
    if (this.room.state?.phase === "MATCH_END") return;

    const local = this.room.state?.players?.get(this.room.sessionId);
    if (!local || !local.isAlive) return;

    const pointer = this.input.activePointer;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const aimAngle = Phaser.Math.Angle.Between(
      this.predictedX,
      this.predictedY,
      worldPoint.x,
      worldPoint.y
    );

    let dx = 0;
    let dy = 0;
    if (this.keys.W.isDown) dy -= 1;
    if (this.keys.S.isDown) dy += 1;
    if (this.keys.A.isDown) dx -= 1;
    if (this.keys.D.isDown) dx += 1;

    // Apply immediate local client prediction for movement
    if (dx !== 0 || dy !== 0) {
      let nx = dx;
      let ny = dy;
      if (nx !== 0 && ny !== 0) {
        nx *= Math.SQRT1_2;
        ny *= Math.SQRT1_2;
      }
      const speed = this.keys.SHIFT.isDown ? PLAYER_WALK_SPEED : PLAYER_BASE_SPEED;
      const dt = 1 / 30;
      const targetPos = {
        x: this.predictedX + nx * speed * dt,
        y: this.predictedY + ny * speed * dt,
      };

      // Client-side predictive collision against walls
      for (const wall of WAREHOUSE_MAP.walls) {
        resolveCircleBoxCollision(targetPos, PLAYER_RADIUS, wall);
      }

      this.predictedX = targetPos.x;
      this.predictedY = targetPos.y;
    }

    const payload: InputPayload = {
      seq: ++this.inputSeq,
      dx,
      dy,
      aimAngle,
      shooting: pointer.isDown,
      reloading: this.keys.R.isDown,
      walking: this.keys.SHIFT.isDown,
    };

    this.room.send("input", payload);
  }

  /**
   * Render bullets as glowing laser beams using dedicated graphics pipeline
   */
  private renderLaserBullets() {
    this.laserGraphics.clear();
    const bullets = this.room?.state?.bullets;
    if (!bullets) return;

    bullets.forEach((bullet: any) => {
      const trailLen = 36;
      const speed = Math.hypot(bullet.vx, bullet.vy);
      const dirX = speed > 0 ? bullet.vx / speed : 0;
      const dirY = speed > 0 ? bullet.vy / speed : 0;
      const tailX = bullet.x - dirX * trailLen;
      const tailY = bullet.y - dirY * trailLen;

      // Outer laser beam glow
      this.laserGraphics.lineStyle(6, 0xfde047, 0.45);
      this.laserGraphics.lineBetween(tailX, tailY, bullet.x, bullet.y);

      // Core bright laser beam
      this.laserGraphics.lineStyle(2.5, 0xffffff, 0.98);
      this.laserGraphics.lineBetween(tailX, tailY, bullet.x, bullet.y);

      // Glowing tip
      this.laserGraphics.fillStyle(0xffffff, 1);
      this.laserGraphics.fillCircle(bullet.x, bullet.y, 3);
    });
  }

  private renderSuddenDeathZone() {
    this.zoneGraphics.clear();
    const state = this.room?.state;
    if (!state || !state.zoneRadius) return;

    const zx = state.zoneCenterX || 800;
    const zy = state.zoneCenterY || 600;
    const radius = state.zoneRadius;

    // Glowing electric border
    this.zoneGraphics.lineStyle(3, 0xef4444, 0.85);
    this.zoneGraphics.strokeCircle(zx, zy, radius);

    // Hazard tint outside zone
    this.zoneGraphics.lineStyle(1.5, 0xf87171, 0.4);
    this.zoneGraphics.strokeCircle(zx, zy, radius + 4);
  }

  // ═══════════════════════════════════════
  //  VISUAL EFFECTS
  // ═══════════════════════════════════════

  private spawnLaserMuzzleFlash(x: number, y: number) {
    // Bright core flash
    const flash = this.add.circle(x, y, 16, 0xfef08a, 0.95);
    flash.setDepth(70);
    // Outer glow
    const glow = this.add.circle(x, y, 30, 0xfde047, 0.35);
    glow.setDepth(69);

    this.tweens.add({
      targets: [flash, glow],
      alpha: 0,
      scale: 1.8,
      duration: 90,
      onComplete: () => {
        flash.destroy();
        glow.destroy();
      },
    });

    // Fallback cleanup
    this.time.delayedCall(200, () => {
      if (flash.active) flash.destroy();
      if (glow.active) glow.destroy();
    });
  }

  private spawnLaserImpact(x: number, y: number) {
    const impact = this.add.circle(x, y, 8, 0xffffff, 0.9);
    impact.setDepth(72);
    const impactGlow = this.add.circle(x, y, 18, 0xfde047, 0.4);
    impactGlow.setDepth(71);

    this.tweens.add({
      targets: [impact, impactGlow],
      alpha: 0,
      scale: 2,
      duration: 140,
      onComplete: () => {
        impact.destroy();
        impactGlow.destroy();
      },
    });

    // Fallback cleanup
    this.time.delayedCall(300, () => {
      if (impact.active) impact.destroy();
      if (impactGlow.active) impactGlow.destroy();
    });
  }

  private spawnSparks(x: number, y: number) {
    for (let i = 0; i < 5; i++) {
      const spark = this.add.circle(x, y, 2, 0xfef08a, 1);
      spark.setDepth(35);
      const angle = Math.random() * Math.PI * 2;
      const dist = 12 + Math.random() * 24;
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 200,
        onComplete: () => spark.destroy(),
      });
    }
  }

  private spawnBloodSplatter(x: number, y: number) {
    for (let i = 0; i < 5; i++) {
      const drop = this.add.circle(x, y, 3, 0xdc2626, 0.85);
      drop.setDepth(35);
      const angle = Math.random() * Math.PI * 2;
      const dist = 12 + Math.random() * 25;
      this.tweens.add({
        targets: drop,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 350,
        onComplete: () => drop.destroy(),
      });
    }
  }

  private spawnWoodSplinters(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      const splinter = this.add.rectangle(x, y, 6, 2, 0xb45309, 1);
      splinter.setDepth(35);
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 35;
      this.tweens.add({
        targets: splinter,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        angle: Math.random() * 360,
        alpha: 0,
        duration: 400,
        onComplete: () => splinter.destroy(),
      });
    }
  }

  private spawnTacticalPing(x: number, y: number, senderName: string) {
    const ping = this.add.sprite(x, y, "tactical_ping");
    ping.setDepth(120);
    ping.setScale(0.8);

    const label = this.add.text(x, y - 24, `PING: ${senderName}`, {
      fontFamily: "Rajdhani, sans-serif",
      fontSize: "12px",
      color: "#38bdf8",
      stroke: "#000000",
      strokeThickness: 3,
    });
    label.setOrigin(0.5);
    label.setDepth(120);

    this.tweens.add({
      targets: [ping, label],
      scale: 1.3,
      alpha: 0,
      duration: 3000,
      ease: "Cubic.easeOut",
      onComplete: () => {
        ping.destroy();
        label.destroy();
      },
    });
  }
}
