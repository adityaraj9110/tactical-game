/**
 * Resolve collision between a circle (player) and an axis-aligned bounding box (obstacle).
 * Mutates circlePos to push it out of collision and returns whether collision occurred.
 */
export function resolveCircleBoxCollision(circlePos, radius, box) {
    const halfW = box.width / 2;
    const halfH = box.height / 2;
    // Closest point on box to circle center
    const closestX = Math.max(box.x - halfW, Math.min(circlePos.x, box.x + halfW));
    const closestY = Math.max(box.y - halfH, Math.min(circlePos.y, box.y + halfH));
    const dx = circlePos.x - closestX;
    const dy = circlePos.y - closestY;
    const distSq = dx * dx + dy * dy;
    if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        if (dist === 0) {
            // Circle center inside box; push horizontally by default
            circlePos.x += radius;
            return true;
        }
        const overlap = radius - dist;
        circlePos.x += (dx / dist) * overlap;
        circlePos.y += (dy / dist) * overlap;
        return true;
    }
    return false;
}
/**
 * Ray to line segment intersection.
 * Returns intersection point and distance t if hit, otherwise null.
 */
export function raySegmentIntersection(rayOrigin, rayDir, p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const det = rayDir.x * dy - rayDir.y * dx;
    if (Math.abs(det) < 1e-6)
        return null; // Parallel
    const qx = p1.x - rayOrigin.x;
    const qy = p1.y - rayOrigin.y;
    const t = (qx * dy - qy * dx) / det;
    const u = (qx * rayDir.y - qy * rayDir.x) / det;
    if (t >= 0 && u >= 0 && u <= 1) {
        return {
            point: {
                x: rayOrigin.x + rayDir.x * t,
                y: rayOrigin.y + rayDir.y * t,
            },
            dist: t,
        };
    }
    return null;
}
/**
 * Check if a moving segment (bullet from start to end) hits a circle (player).
 */
export function segmentIntersectsCircle(start, end, center, radius) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
        return Math.hypot(start.x - center.x, start.y - center.y) <= radius;
    }
    // Projection scalar t of center onto start->end
    const t = Math.max(0, Math.min(1, ((center.x - start.x) * dx + (center.y - start.y) * dy) / lenSq));
    const projX = start.x + t * dx;
    const projY = start.y + t * dy;
    const distSq = (center.x - projX) ** 2 + (center.y - projY) ** 2;
    return distSq <= radius * radius;
}
