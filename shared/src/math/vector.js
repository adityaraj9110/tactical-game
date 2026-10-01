export function distance(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
}
export function distanceSq(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return dx * dx + dy * dy;
}
export function normalize(v) {
    const len = Math.hypot(v.x, v.y);
    if (len === 0)
        return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
}
export function angleBetween(a, b) {
    return Math.atan2(b.y - a.y, b.x - a.x);
}
export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}
