export const TICK_RATE = 30; // 30Hz server simulation tick
export const TICK_INTERVAL_MS = 1000 / TICK_RATE;

export const MAP_WIDTH = 1600;
export const MAP_HEIGHT = 1200;

export const PLAYER_RADIUS = 20;
export const PLAYER_BASE_SPEED = 240; // Pixels per second
export const PLAYER_WALK_SPEED = 120; // Shift-walk (quiet)

export const ROUND_TIME_SECONDS = 90;
export const BUY_TIME_SECONDS = 10;
export const COUNTDOWN_SECONDS = 3;
export const ROUND_END_SECONDS = 4;

export const ZONE_SHRINK_START_SEC = 60; // Zone begins shrinking at 60s
export const ZONE_MAX_RADIUS = 1100;
export const ZONE_MIN_RADIUS = 140;
export const ZONE_DAMAGE_PER_SEC = 25; // Continuous damage outside zone

export const VISION_MAX_DISTANCE = 700; // Fog-of-war sight radius
export const HEARING_MAX_DISTANCE = 850; // Sound hearing falloff radius
