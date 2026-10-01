import type { Vec2 } from "./vector";
export interface LineSegment {
    p1: Vec2;
    p2: Vec2;
}
export interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}
/**
 * Resolve collision between a circle (player) and an axis-aligned bounding box (obstacle).
 * Mutates circlePos to push it out of collision and returns whether collision occurred.
 */
export declare function resolveCircleBoxCollision(circlePos: Vec2, radius: number, box: Box): boolean;
/**
 * Ray to line segment intersection.
 * Returns intersection point and distance t if hit, otherwise null.
 */
export declare function raySegmentIntersection(rayOrigin: Vec2, rayDir: Vec2, p1: Vec2, p2: Vec2): {
    point: Vec2;
    dist: number;
} | null;
/**
 * Check if a moving segment (bullet from start to end) hits a circle (player).
 */
export declare function segmentIntersectsCircle(start: Vec2, end: Vec2, center: Vec2, radius: number): boolean;
//# sourceMappingURL=geometry.d.ts.map