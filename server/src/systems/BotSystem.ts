import { MapData, InputPayload, PLAYER_BASE_SPEED } from "@duo-arena/shared";
import { MatchState, PlayerSchema } from "../schema/MatchState";
import { MovementSystem } from "./MovementSystem";
import { CombatSystem } from "./CombatSystem";

interface BotWaypoints {
  A: { x: number; y: number }[];
  B: { x: number; y: number }[];
}

export class BotSystem {
  private botWaypoints: BotWaypoints;
  private botIndexMap = new Map<string, number>();
  private reactionTimers = new Map<string, number>();
  private burstTimers = new Map<string, number>();
  private inputSequences = new Map<string, number>();

  constructor(
    private state: MatchState,
    private map: MapData,
    private movementSystem: MovementSystem,
    private combatSystem: CombatSystem
  ) {
    this.botWaypoints = {
      A: [
        { x: 500, y: 350 },
        { x: 800, y: 400 },
        { x: 1100, y: 350 },
        { x: 800, y: 600 },
        { x: 520, y: 850 },
        { x: 800, y: 900 },
      ],
      B: [
        { x: 1100, y: 350 },
        { x: 800, y: 400 },
        { x: 500, y: 350 },
        { x: 800, y: 600 },
        { x: 1080, y: 850 },
        { x: 800, y: 900 },
      ],
    };
  }

  public update(dt: number) {
    if (this.state.phase !== "LIVE") return;

    const now = Date.now();

    this.state.players.forEach((player) => {
      if (!player.isBot || !player.isAlive) return;

      const seq = (this.inputSequences.get(player.id) || 0) + 1;
      this.inputSequences.set(player.id, seq);

      // Find nearest enemy
      const enemy = this.findNearestEnemy(player);
      let dx = 0;
      let dy = 0;
      let aimAngle = player.angle;
      let shooting = false;

      if (enemy) {
        // Aim toward enemy
        const toEnemyX = enemy.x - player.x;
        const toEnemyY = enemy.y - player.y;
        const targetAngle = Math.atan2(toEnemyY, toEnemyX);
        const dist = Math.hypot(toEnemyX, toEnemyY);

        // Smooth aim turn
        aimAngle = targetAngle;

        // Controlled burst firing
        const reaction = this.reactionTimers.get(player.id) || 0;
        if (reaction > 0.25) {
          // In combat range
          if (dist < 750) {
            shooting = true;
          }
          // Tactical advance/strafe
          if (dist > 350) {
            dx = Math.sign(toEnemyX);
            dy = Math.sign(toEnemyY);
          } else if (dist < 150) {
            // Back up
            dx = -Math.sign(toEnemyX);
            dy = -Math.sign(toEnemyY);
          }
        } else {
          this.reactionTimers.set(player.id, reaction + dt);
        }
      } else {
        this.reactionTimers.set(player.id, 0);

        // Patrol waypoints
        const route = player.team === "A" ? this.botWaypoints.A : this.botWaypoints.B;
        let wpIdx = this.botIndexMap.get(player.id) || 0;
        const targetWp = route[wpIdx];

        const toWpX = targetWp.x - player.x;
        const toWpY = targetWp.y - player.y;
        const dist = Math.hypot(toWpX, toWpY);

        if (dist < 40) {
          wpIdx = (wpIdx + 1) % route.length;
          this.botIndexMap.set(player.id, wpIdx);
        } else {
          dx = toWpX / dist;
          dy = toWpY / dist;
          aimAngle = Math.atan2(dy, dx);
        }
      }

      const input: InputPayload = {
        seq,
        dx,
        dy,
        aimAngle,
        shooting,
        reloading: player.ammo <= 3 && !player.isReloading,
        walking: false,
      };

      this.movementSystem.processInput(player, input, dt, this.state.crates as any);
      this.combatSystem.processInput(player, input, now);
    });
  }

  private findNearestEnemy(bot: PlayerSchema): PlayerSchema | null {
    let nearest: PlayerSchema | null = null;
    let minDist = 700; // Visual perception threshold

    this.state.players.forEach((p) => {
      if (p.isAlive && p.team !== bot.team) {
        const d = Math.hypot(p.x - bot.x, p.y - bot.y);
        if (d < minDist) {
          minDist = d;
          nearest = p;
        }
      }
    });

    return nearest;
  }
}
