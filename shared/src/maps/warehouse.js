export const WAREHOUSE_MAP = {
    id: "warehouse",
    name: "Sector 4: Warehouse",
    width: 1600,
    height: 1200,
    spawnsTeamA: [
        { x: 180, y: 530 },
        { x: 180, y: 670 },
    ],
    spawnsTeamB: [
        { x: 1420, y: 530 },
        { x: 1420, y: 670 },
    ],
    // Static indestructible walls
    walls: [
        // Outer boundaries
        { id: "wall_top", x: 800, y: 15, width: 1600, height: 30 },
        { id: "wall_bottom", x: 800, y: 1185, width: 1600, height: 30 },
        { id: "wall_left", x: 15, y: 600, width: 30, height: 1200 },
        { id: "wall_right", x: 1585, y: 600, width: 30, height: 1200 },
        // North Lane Pillars (long-range sightline cover)
        { id: "north_pillar_w", x: 500, y: 260, width: 60, height: 160 },
        { id: "north_pillar_e", x: 1100, y: 260, width: 60, height: 160 },
        // Spawn Area Defenses (baffle walls to prevent instant spawn peeking)
        { id: "spawn_baffle_a", x: 300, y: 600, width: 40, height: 260 },
        { id: "spawn_baffle_b", x: 1300, y: 600, width: 40, height: 260 },
        // Central Mid Divider Blocks
        { id: "mid_barrier_n", x: 800, y: 440, width: 180, height: 40 },
        { id: "mid_barrier_s", x: 800, y: 760, width: 180, height: 40 },
        // South Lane Corridors (tight, shotgun/CQB friendly)
        { id: "south_partition_w", x: 520, y: 940, width: 180, height: 40 },
        { id: "south_partition_e", x: 1080, y: 940, width: 180, height: 40 },
        { id: "south_pillar_mid", x: 800, y: 980, width: 60, height: 120 },
    ],
    // Destructible cover crates (80 HP)
    crates: [
        // Mid control cluster
        { id: "crate_mid_1", x: 730, y: 600, width: 50, height: 50, isCrate: true, hp: 80 },
        { id: "crate_mid_2", x: 870, y: 600, width: 50, height: 50, isCrate: true, hp: 80 },
        { id: "crate_mid_3", x: 800, y: 530, width: 50, height: 50, isCrate: true, hp: 80 },
        { id: "crate_mid_4", x: 800, y: 670, width: 50, height: 50, isCrate: true, hp: 80 },
        // North lane flank crates
        { id: "crate_north_1", x: 650, y: 260, width: 48, height: 48, isCrate: true, hp: 80 },
        { id: "crate_north_2", x: 950, y: 260, width: 48, height: 48, isCrate: true, hp: 80 },
        // South lane corner crates
        { id: "crate_south_1", x: 400, y: 940, width: 48, height: 48, isCrate: true, hp: 80 },
        { id: "crate_south_2", x: 1200, y: 940, width: 48, height: 48, isCrate: true, hp: 80 },
    ],
};
