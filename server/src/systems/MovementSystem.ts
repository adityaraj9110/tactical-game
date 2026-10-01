import {
  InputPayload,
  MapData,
  PLAYER_RADIUS,
  PLAYER_BASE_SPEED,
  PLAYER_WALK_SPEED,
  resolveCircleBoxCollision,
} from "@duo-arena/shared";
import { PlayerSchema, CrateSchema } from "../schema/MatchState";

export class MovementSystem {
  constructor(private map: MapData) {}

  public processInput(
    player: PlayerSchema,
    input: InputPayload,
    dt: number,
    crates: CrateSchema[]
  ) {
    if (!player.isAlive) return;

    // 1. Update aim angle
    player.angle = input.aimAngle;

    // 2. Calculate requested direction
    let dx = input.dx;
    let dy = input.dy;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const invLen = 1 / Math.SQRT2;
      dx *= invLen;
      dy *= invLen;
    }

    // Determine speed (quiet walking vs normal sprint)
    const speed = input.walking ? PLAYER_WALK_SPEED : PLAYER_BASE_SPEED;
    player.vx = dx * speed;
    player.vy = dy * speed;

    // Target positions
    const pos = {
      x: player.x + player.vx * dt,
      y: player.y + player.vy * dt,
    };

    // 3. Resolve collisions with static walls
    for (const wall of this.map.walls) {
      resolveCircleBoxCollision(pos, PLAYER_RADIUS, wall);
    }

    // 4. Resolve collisions with active (undestroyed) crates
    for (const crate of crates) {
      if (!crate.destroyed) {
        resolveCircleBoxCollision(pos, PLAYER_RADIUS, crate);
      }
    }

    // 5. Apply final constrained position
    player.x = pos.x;
    player.y = pos.y;
  }
}
