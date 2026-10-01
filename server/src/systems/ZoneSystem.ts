import {
  ZONE_MAX_RADIUS,
  ZONE_MIN_RADIUS,
  ZONE_DAMAGE_PER_SEC,
  ROUND_TIME_SECONDS,
  ZONE_SHRINK_START_SEC,
} from "@duo-arena/shared";
import { MatchState } from "../schema/MatchState";

export class ZoneSystem {
  constructor(private state: MatchState) {
    this.reset();
  }

  public reset() {
    this.state.zoneCenterX = 800;
    this.state.zoneCenterY = 600;
    this.state.zoneRadius = ZONE_MAX_RADIUS;
  }

  public update(dt: number) {
    if (this.state.phase !== "LIVE") return;

    const elapsed = ROUND_TIME_SECONDS - this.state.timeLeft;

    // Shrink zone if past start threshold
    if (elapsed >= ZONE_SHRINK_START_SEC) {
      const shrinkProgress = Math.min(
        1,
        (elapsed - ZONE_SHRINK_START_SEC) / (ROUND_TIME_SECONDS - ZONE_SHRINK_START_SEC)
      );
      this.state.zoneRadius =
        ZONE_MAX_RADIUS - shrinkProgress * (ZONE_MAX_RADIUS - ZONE_MIN_RADIUS);
    }

    // Apply continuous ring damage to players outside radius
    const damage = Math.ceil(ZONE_DAMAGE_PER_SEC * dt);
    this.state.players.forEach((player) => {
      if (!player.isAlive) return;

      const dist = Math.hypot(
        player.x - this.state.zoneCenterX,
        player.y - this.state.zoneCenterY
      );

      if (dist > this.state.zoneRadius) {
        player.hp = Math.max(0, player.hp - damage);
        if (player.hp <= 0) {
          player.isAlive = false;
        }
      }
    });
  }
}
