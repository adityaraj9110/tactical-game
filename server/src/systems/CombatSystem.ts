import {
  InputPayload,
  MapData,
  WEAPON_REGISTRY,
  segmentIntersectsCircle,
  PLAYER_RADIUS,
  raySegmentIntersection,
} from "@duo-arena/shared";
import { MatchState, PlayerSchema, BulletSchema } from "../schema/MatchState";

interface WeaponCooldown {
  nextFireTime: number;
}

export class CombatSystem {
  private cooldowns = new Map<string, WeaponCooldown>();
  private bulletCounter = 0;

  constructor(
    private state: MatchState,
    private map: MapData,
    private onEvent: (name: string, data: any) => void
  ) {}

  public processInput(player: PlayerSchema, input: InputPayload, now: number) {
    if (!player.isAlive || this.state.phase !== "LIVE") return;

    const weapon = WEAPON_REGISTRY[player.weaponId as keyof typeof WEAPON_REGISTRY] || WEAPON_REGISTRY.rifle;

    // Handle reload input
    if (input.reloading && !player.isReloading && player.ammo < weapon.magSize && player.reserveAmmo !== 0) {
      player.isReloading = true;
      player.reloadRemainingMs = weapon.reloadTimeMs;
      this.onEvent("reload_start", { playerId: player.id });
    }

    // Handle firing
    if (input.shooting && !player.isReloading) {
      const cd = this.cooldowns.get(player.id) || { nextFireTime: 0 };

      if (now >= cd.nextFireTime) {
        if (player.ammo > 0) {
          player.ammo--;
          cd.nextFireTime = now + 1000 / weapon.fireRate;
          this.cooldowns.set(player.id, cd);

          // Spawn projectiles (single or shotgun pellets)
          for (let i = 0; i < weapon.pellets; i++) {
            // Apply randomized spread
            const spreadOffset = (Math.random() - 0.5) * 2 * weapon.spreadRad;
            const finalAngle = player.angle + spreadOffset;

            const bullet = new BulletSchema();
            bullet.id = `b_${++this.bulletCounter}_${Date.now()}`;
            bullet.ownerId = player.id;
            bullet.team = player.team;
            bullet.weaponId = weapon.id;
            bullet.damage = weapon.damage;
            bullet.range = weapon.range;

            // Offset bullet spawn slightly in front of player barrel
            bullet.startX = player.x + Math.cos(player.angle) * (PLAYER_RADIUS + 8);
            bullet.startY = player.y + Math.sin(player.angle) * (PLAYER_RADIUS + 8);
            bullet.x = bullet.startX;
            bullet.y = bullet.startY;

            bullet.vx = Math.cos(finalAngle) * weapon.bulletSpeed;
            bullet.vy = Math.sin(finalAngle) * weapon.bulletSpeed;

            this.state.bullets.push(bullet);
          }

          this.onEvent("gun_fired", {
            playerId: player.id,
            team: player.team,
            weaponId: weapon.id,
            x: player.x,
            y: player.y,
          });

          // Auto reload if magazine emptied
          if (player.ammo <= 0 && player.reserveAmmo !== 0) {
            player.isReloading = true;
            player.reloadRemainingMs = weapon.reloadTimeMs;
            this.onEvent("reload_start", { playerId: player.id });
          }
        } else {
          // Out of ammo click
          cd.nextFireTime = now + 350;
          this.cooldowns.set(player.id, cd);
          this.onEvent("empty_click", { playerId: player.id, x: player.x, y: player.y });
        }
      }
    }
  }

  public update(dt: number) {
    const dtMs = dt * 1000;

    // 1. Process player reload timers
    this.state.players.forEach((player) => {
      if (player.isReloading) {
        player.reloadRemainingMs -= dtMs;
        if (player.reloadRemainingMs <= 0) {
          player.isReloading = false;
          player.reloadRemainingMs = 0;

          const weapon = WEAPON_REGISTRY[player.weaponId as keyof typeof WEAPON_REGISTRY] || WEAPON_REGISTRY.rifle;
          const needed = weapon.magSize - player.ammo;

          if (player.reserveAmmo === -1) {
            // Infinite reserve (pistol)
            player.ammo = weapon.magSize;
          } else {
            const transfer = Math.min(needed, player.reserveAmmo);
            player.ammo += transfer;
            player.reserveAmmo -= transfer;
          }
          this.onEvent("reload_complete", { playerId: player.id });
        }
      }
    });

    // 2. Step bullets & detect impacts
    for (let i = this.state.bullets.length - 1; i >= 0; i--) {
      const bullet = this.state.bullets[i];
      if (!bullet) continue;
      const prevPos = { x: bullet.x, y: bullet.y };
      const nextPos = {
        x: bullet.x + bullet.vx * dt,
        y: bullet.y + bullet.vy * dt,
      };

      // Check max travel range
      const traveled = Math.hypot(nextPos.x - bullet.startX, nextPos.y - bullet.startY);
      if (traveled >= bullet.range) {
        this.state.bullets.splice(i, 1);
        continue;
      }

      let bulletConsumed = false;

      // Check hits against destructible crates
      for (const crate of this.state.crates) {
        if (crate.destroyed) continue;

        const halfW = crate.width / 2;
        const halfH = crate.height / 2;
        // Simple AABB ray check
        if (
          nextPos.x >= crate.x - halfW &&
          nextPos.x <= crate.x + halfW &&
          nextPos.y >= crate.y - halfH &&
          nextPos.y <= crate.y + halfH
        ) {
          crate.hp -= bullet.damage;
          if (crate.hp <= 0) {
            crate.destroyed = true;
            this.onEvent("crate_destroyed", { crateId: crate.id, x: crate.x, y: crate.y });
          }
          this.onEvent("bullet_impact", { x: nextPos.x, y: nextPos.y, material: "wood" });
          this.state.bullets.splice(i, 1);
          bulletConsumed = true;
          break;
        }
      }

      if (bulletConsumed) continue;

      // Check hits against static walls
      for (const wall of this.map.walls) {
        const halfW = wall.width / 2;
        const halfH = wall.height / 2;
        if (
          nextPos.x >= wall.x - halfW &&
          nextPos.x <= wall.x + halfW &&
          nextPos.y >= wall.y - halfH &&
          nextPos.y <= wall.y + halfH
        ) {
          this.onEvent("bullet_impact", { x: nextPos.x, y: nextPos.y, material: "concrete" });
          this.state.bullets.splice(i, 1);
          bulletConsumed = true;
          break;
        }
      }

      if (bulletConsumed) continue;

      // Check hits against players
      let hitPlayer: PlayerSchema | null = null;
      this.state.players.forEach((target) => {
        if (!target.isAlive || target.id === bullet.ownerId || target.team === bullet.team) return;

        if (segmentIntersectsCircle(prevPos, nextPos, { x: target.x, y: target.y }, PLAYER_RADIUS)) {
          hitPlayer = target;
        }
      });

      if (hitPlayer) {
        const victim = hitPlayer as PlayerSchema;
        victim.hp = Math.max(0, victim.hp - bullet.damage);

        this.onEvent("player_hit", {
          shooterId: bullet.ownerId,
          victimId: victim.id,
          damage: bullet.damage,
          x: victim.x,
          y: victim.y,
        });

        if (victim.hp <= 0) {
          victim.isAlive = false;
          const killer = this.state.players.get(bullet.ownerId);
          this.onEvent("player_killed", {
            killerId: bullet.ownerId,
            killerName: killer ? killer.name : "Operative",
            killerTeam: bullet.team,
            victimId: victim.id,
            victimName: victim.name,
            victimTeam: victim.team,
            weaponId: bullet.weaponId,
          });
        }

        this.state.bullets.splice(i, 1);
        continue;
      }

      // No collision, advance bullet
      bullet.x = nextPos.x;
      bullet.y = nextPos.y;
    }
  }
}
