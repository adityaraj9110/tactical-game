import Phaser from "phaser";

/**
 * Procedural top-down sprite generator.
 * Creates human-like figures with guns, tactical environment textures,
 * and laser bullet tracers — all drawn with canvas primitives.
 */
export class ProceduralTextures {
  public static generateAll(scene: Phaser.Scene) {
    this.createHumanPlayerTexture(scene, "player_a", 0x38bdf8, 0x0284c7, 0x0c4a6e); // Blue Team
    this.createHumanPlayerTexture(scene, "player_b", 0xf43f5e, 0xbe123c, 0x881337); // Red Team
    this.createCrateTexture(scene, "crate_wood");
    this.createWallTexture(scene, "wall_panel");
    this.createFloorTile(scene, "floor_tile");
    this.createBulletTexture(scene, "bullet_tracer");
    this.createParticleTextures(scene);
    this.createLaserTextures(scene);
  }

  /**
   * Draw a human-like top-down character (64x64) with:
   * - Torso (rectangular body seen from above)
   * - Head (circle)
   * - Two arms (one holding the gun)
   * - Gun barrel extending forward
   * - Shoulder/vest details
   * - Team-colored outfit
   */
  private static createHumanPlayerTexture(
    scene: Phaser.Scene,
    key: string,
    primaryColor: number,
    darkColor: number,
    shadowColor: number
  ) {
    if (scene.textures.exists(key)) return;

    const size = 80;
    const cx = 32;
    const cy = 40;
    const g = scene.make.graphics({ x: 0, y: 0 });

    // === DROP SHADOW ===
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(cx + 2, cy + 2, 42, 36);

    // === TACTICAL BOOTS / LEGS ===
    g.fillStyle(0x0f172a, 1);
    g.fillEllipse(cx - 8, cy + 13, 9, 14);
    g.fillEllipse(cx + 8, cy + 13, 9, 14);
    g.fillEllipse(cx - 8, cy - 13, 9, 14);
    g.fillEllipse(cx + 8, cy - 13, 9, 14);

    // === ASSAULT RIFLE / GUN (pointing forward to right +X) ===
    // Stock / receiver
    g.fillStyle(0x1e293b, 1);
    g.fillRect(cx + 4, cy - 4, 14, 8);
    // Main barrel & handguard
    g.fillStyle(0x0f172a, 1);
    g.fillRect(cx + 16, cy - 3, 24, 6);
    // Muzzle brake
    g.fillStyle(0x475569, 1);
    g.fillRect(cx + 40, cy - 2, 5, 4);
    // Magazine
    g.fillStyle(0x334155, 1);
    g.fillRect(cx + 12, cy + 3, 6, 8);

    // === ARMS & HANDS ===
    // Right arm (holding trigger)
    g.fillStyle(darkColor, 1);
    g.fillEllipse(cx + 12, cy + 9, 14, 9);
    // Right hand on grip
    g.fillStyle(0xf59e0b, 1); // Glove
    g.fillCircle(cx + 16, cy + 4, 3.5);

    // Left arm (supporting forward barrel)
    g.fillStyle(darkColor, 1);
    g.fillEllipse(cx + 18, cy - 9, 16, 9);
    // Left hand on barrel
    g.fillStyle(0xf59e0b, 1); // Glove
    g.fillCircle(cx + 26, cy - 3, 3.5);

    // === TACTICAL VEST & TORSO ===
    // Vest base
    g.fillStyle(darkColor, 1);
    g.fillRoundedRect(cx - 16, cy - 16, 32, 32, 8);
    // Armor plate (vibrant team color)
    g.fillStyle(primaryColor, 1);
    g.fillRoundedRect(cx - 12, cy - 12, 24, 24, 5);
    // Center armor ridge
    g.fillStyle(0x0f172a, 0.4);
    g.fillRect(cx - 2, cy - 11, 4, 22);

    // === SHOULDERS ===
    g.fillStyle(primaryColor, 0.9);
    g.fillCircle(cx - 4, cy - 15, 8);
    g.fillCircle(cx - 4, cy + 15, 8);

    // === COMBAT HELMET (Head) ===
    // Helmet base
    g.fillStyle(0x0f172a, 1);
    g.fillCircle(cx, cy, 14);
    g.fillStyle(0x1e293b, 1);
    g.fillCircle(cx, cy, 12);
    // Team identification band on helmet
    g.fillStyle(primaryColor, 1);
    g.fillRoundedRect(cx - 10, cy - 3, 20, 6, 3);

    // === TACTICAL VISOR / HUD GOGGLES ===
    const visorColor = primaryColor === 0x38bdf8 ? 0x38bdf8 : 0xf43f5e;
    g.fillStyle(visorColor, 1);
    g.fillRoundedRect(cx + 4, cy - 5, 8, 10, 3);
    // Visor reflection streak
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(cx + 7, cy - 3, 2, 6);

    // === LASER SIGHT EMITTER ON BARREL TIP ===
    g.fillStyle(0xef4444, 0.9);
    g.fillCircle(cx + 45, cy, 2);

    g.generateTexture(key, size, size);
    g.destroy();
  }

  private static createCrateTexture(scene: Phaser.Scene, key: string) {
    if (scene.textures.exists(key)) return;

    const size = 50;
    const g = scene.make.graphics({ x: 0, y: 0 });

    // Wooden base
    g.fillStyle(0x78350f, 1);
    g.fillRect(0, 0, size, size);

    // Wood grain lines
    g.lineStyle(1, 0x92400e, 0.5);
    for (let i = 8; i < size; i += 10) {
      g.lineBetween(0, i, size, i);
    }

    // Border trim
    g.lineStyle(3, 0xb45309, 1);
    g.strokeRect(1, 1, size - 2, size - 2);

    // Cross brace "X"
    g.lineStyle(3, 0x92400e, 1);
    g.lineBetween(4, 4, size - 4, size - 4);
    g.lineBetween(size - 4, 4, 4, size - 4);

    // Corner rivets
    g.fillStyle(0xd97706, 1);
    g.fillCircle(5, 5, 3);
    g.fillCircle(size - 5, 5, 3);
    g.fillCircle(5, size - 5, 3);
    g.fillCircle(size - 5, size - 5, 3);

    // Rivet centers
    g.fillStyle(0xfbbf24, 0.7);
    g.fillCircle(5, 5, 1.5);
    g.fillCircle(size - 5, 5, 1.5);
    g.fillCircle(5, size - 5, 1.5);
    g.fillCircle(size - 5, size - 5, 1.5);

    g.generateTexture(key, size, size);
    g.destroy();
  }

  private static createWallTexture(scene: Phaser.Scene, key: string) {
    if (scene.textures.exists(key)) return;

    const g = scene.make.graphics({ x: 0, y: 0 });

    // Concrete base
    g.fillStyle(0x1e293b, 1);
    g.fillRect(0, 0, 64, 64);

    // Subtle noise/grain
    for (let i = 0; i < 30; i++) {
      const rx = Math.random() * 64;
      const ry = Math.random() * 64;
      g.fillStyle(0x334155, 0.3);
      g.fillRect(rx, ry, 2, 2);
    }

    // Border lines
    g.lineStyle(2, 0x334155, 1);
    g.strokeRect(0, 0, 64, 64);

    // Cross-seam lines
    g.lineStyle(1, 0x0f172a, 0.6);
    g.lineBetween(0, 32, 64, 32);
    g.lineBetween(32, 0, 32, 64);

    g.generateTexture(key, 64, 64);
    g.destroy();
  }

  private static createFloorTile(scene: Phaser.Scene, key: string) {
    if (scene.textures.exists(key)) return;

    const g = scene.make.graphics({ x: 0, y: 0 });

    // Dark arena floor
    g.fillStyle(0x0b0f19, 1);
    g.fillRect(0, 0, 128, 128);

    // Grid lines
    g.lineStyle(1, 0x1e293b, 0.4);
    g.strokeRect(0, 0, 128, 128);

    // Sub-tile cross markers
    g.fillStyle(0x334155, 0.3);
    g.fillRect(63, 62, 2, 4);
    g.fillRect(62, 63, 4, 2);

    // Corner dots
    g.fillStyle(0x1e293b, 0.2);
    g.fillCircle(0, 0, 2);
    g.fillCircle(128, 0, 2);
    g.fillCircle(0, 128, 2);
    g.fillCircle(128, 128, 2);

    g.generateTexture(key, 128, 128);
    g.destroy();
  }

  private static createBulletTexture(scene: Phaser.Scene, key: string) {
    if (scene.textures.exists(key)) return;

    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xfde047, 1);
    g.fillRoundedRect(0, 1, 14, 4, 2);

    g.fillStyle(0xffffff, 0.9);
    g.fillRect(8, 2, 4, 2);

    g.generateTexture(key, 14, 6);
    g.destroy();
  }

  private static createLaserTextures(scene: Phaser.Scene) {
    // Laser core (bright white/yellow center of the beam)
    if (!scene.textures.exists("laser_core")) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 2, 20, 4, 2);
      g.fillStyle(0xfef08a, 0.8);
      g.fillRoundedRect(0, 1, 20, 6, 3);
      g.generateTexture("laser_core", 20, 8);
      g.destroy();
    }

    // Laser glow (softer outer glow)
    if (!scene.textures.exists("laser_glow")) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xfde047, 0.3);
      g.fillRoundedRect(0, 0, 24, 12, 6);
      g.fillStyle(0xfef08a, 0.5);
      g.fillRoundedRect(2, 2, 20, 8, 4);
      g.generateTexture("laser_glow", 24, 12);
      g.destroy();
    }

    // Laser impact burst
    if (!scene.textures.exists("laser_impact")) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      // Outer glow
      g.fillStyle(0xfde047, 0.4);
      g.fillCircle(12, 12, 12);
      // Inner bright
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(12, 12, 5);
      g.generateTexture("laser_impact", 24, 24);
      g.destroy();
    }
  }

  private static createParticleTextures(scene: Phaser.Scene) {
    // Blood particle
    if (!scene.textures.exists("particle_blood")) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xdc2626, 0.9);
      g.fillCircle(4, 4, 4);
      g.generateTexture("particle_blood", 8, 8);
      g.destroy();
    }

    // Spark particle
    if (!scene.textures.exists("particle_spark")) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xfef08a, 1);
      g.fillCircle(3, 3, 3);
      g.generateTexture("particle_spark", 6, 6);
      g.destroy();
    }

    // Ping icon
    if (!scene.textures.exists("tactical_ping")) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      g.lineStyle(3, 0x38bdf8, 1);
      g.strokeCircle(16, 16, 12);
      g.lineStyle(2, 0x38bdf8, 0.5);
      g.strokeCircle(16, 16, 8);
      g.fillStyle(0x38bdf8, 1);
      g.fillCircle(16, 16, 4);
      g.generateTexture("tactical_ping", 32, 32);
      g.destroy();
    }
  }
}
