import Phaser from "phaser";
import {
  WAREHOUSE_MAP,
  MAP_WIDTH,
  MAP_HEIGHT,
  VISION_MAX_DISTANCE,
  raySegmentIntersection,
} from "@duo-arena/shared";
import type { Vec2 } from "@duo-arena/shared";

interface Segment {
  p1: Vec2;
  p2: Vec2;
}

export class FogOfWar {
  private maskGraphics: Phaser.GameObjects.Graphics;
  private fogShade: Phaser.GameObjects.Rectangle;
  private staticSegments: Segment[] = [];
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.maskGraphics = scene.make.graphics({});

    // Dark atmospheric fog overlay covering the entire map
    this.fogShade = scene.add.rectangle(
      MAP_WIDTH / 2,
      MAP_HEIGHT / 2,
      MAP_WIDTH + 400,
      MAP_HEIGHT + 400,
      0x05070a,
      0.92
    );
    this.fogShade.setDepth(50);
    this.fogShade.setScrollFactor(1); // Follows world coordinates

    const mask = this.maskGraphics.createGeometryMask();
    mask.setInvertAlpha(true);
    this.fogShade.setMask(mask);

    this.extractSegments();
  }

  private extractSegments() {
    this.staticSegments = [];

    // Extract line segments from static walls
    for (const wall of WAREHOUSE_MAP.walls) {
      const hw = wall.width / 2;
      const hh = wall.height / 2;
      const x1 = wall.x - hw;
      const x2 = wall.x + hw;
      const y1 = wall.y - hh;
      const y2 = wall.y + hh;

      this.staticSegments.push(
        { p1: { x: x1, y: y1 }, p2: { x: x2, y: y1 } },
        { p1: { x: x2, y: y1 }, p2: { x: x2, y: y2 } },
        { p1: { x: x2, y: y2 }, p2: { x: x1, y: y2 } },
        { p1: { x: x1, y: y2 }, p2: { x: x1, y: y1 } }
      );
    }
  }

  public update(originX: number, originY: number, activeCrates: { x: number; y: number; width: number; height: number; destroyed?: boolean }[]) {
    // Collect active dynamic segments (crates)
    const allSegments = [...this.staticSegments];

    for (const c of activeCrates) {
      if (c.destroyed) continue;
      const hw = c.width / 2;
      const hh = c.height / 2;
      const x1 = c.x - hw;
      const x2 = c.x + hw;
      const y1 = c.y - hh;
      const y2 = c.y + hh;

      allSegments.push(
        { p1: { x: x1, y: y1 }, p2: { x: x2, y: y1 } },
        { p1: { x: x2, y: y1 }, p2: { x: x2, y: y2 } },
        { p1: { x: x2, y: y2 }, p2: { x: x1, y: y2 } },
        { p1: { x: x1, y: y2 }, p2: { x: x1, y: y1 } }
      );
    }

    // Cast 120 radial rays
    const origin: Vec2 = { x: originX, y: originY };
    const numRays = 120;
    const points: Vec2[] = [];

    for (let i = 0; i < numRays; i++) {
      const angle = (i / numRays) * Math.PI * 2;
      const rayDir: Vec2 = {
        x: Math.cos(angle),
        y: Math.sin(angle),
      };

      let closestDist = VISION_MAX_DISTANCE;
      let hitPoint: Vec2 = {
        x: origin.x + rayDir.x * VISION_MAX_DISTANCE,
        y: origin.y + rayDir.y * VISION_MAX_DISTANCE,
      };

      for (const seg of allSegments) {
        const hit = raySegmentIntersection(origin, rayDir, seg.p1, seg.p2);
        if (hit && hit.dist < closestDist) {
          closestDist = hit.dist;
          hitPoint = hit.point;
        }
      }

      points.push(hitPoint);
    }

    // Render mask
    this.maskGraphics.clear();
    this.maskGraphics.fillStyle(0xffffff, 1);
    this.maskGraphics.beginPath();

    if (points.length > 2) {
      this.maskGraphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        this.maskGraphics.lineTo(points[i].x, points[i].y);
      }
      this.maskGraphics.closePath();
      this.maskGraphics.fillPath();
    }
  }

  public isVisible(targetX: number, targetY: number, viewerX: number, viewerY: number): boolean {
    const dist = Math.hypot(targetX - viewerX, targetY - viewerY);
    if (dist > VISION_MAX_DISTANCE) return false;

    // Simple raycast from viewer to target against static walls
    const rayDir: Vec2 = {
      x: (targetX - viewerX) / dist,
      y: (targetY - viewerY) / dist,
    };

    const origin = { x: viewerX, y: viewerY };
    for (const seg of this.staticSegments) {
      const hit = raySegmentIntersection(origin, rayDir, seg.p1, seg.p2);
      if (hit && hit.dist < dist - 15) {
        return false; // Occluded by wall
      }
    }

    return true;
  }
}
