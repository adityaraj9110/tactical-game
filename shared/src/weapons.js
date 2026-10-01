export const WEAPON_REGISTRY = {
    pistol: {
        id: "pistol",
        name: "Tactical 9mm",
        category: "Sidearm",
        fireRate: 4.5,
        damage: 18,
        pellets: 1,
        spreadRad: 0.035, // ~2 degrees
        bulletSpeed: 1300,
        range: 800,
        magSize: 12,
        reserveAmmo: -1, // Infinite backup
        reloadTimeMs: 1100,
        bulletColor: 0xfacc15, // Yellow
        bulletLength: 10,
        auto: false,
    },
    smg: {
        id: "smg",
        name: "Vector-9",
        category: "SMG",
        fireRate: 11.5,
        damage: 12,
        pellets: 1,
        spreadRad: 0.11, // ~6.3 degrees
        bulletSpeed: 1150,
        range: 650,
        magSize: 30,
        reserveAmmo: 120,
        reloadTimeMs: 1500,
        bulletColor: 0x38bdf8, // Sky blue
        bulletLength: 8,
        auto: true,
    },
    rifle: {
        id: "rifle",
        name: "M4 Phantom",
        category: "Rifle",
        fireRate: 7.0,
        damage: 22,
        pellets: 1,
        spreadRad: 0.045, // ~2.6 degrees
        bulletSpeed: 1550,
        range: 1100,
        magSize: 25,
        reserveAmmo: 100,
        reloadTimeMs: 1900,
        bulletColor: 0xf97316, // Orange
        bulletLength: 14,
        auto: true,
    },
    shotgun: {
        id: "shotgun",
        name: "Breach 12G",
        category: "Shotgun",
        fireRate: 1.2,
        damage: 9, // 8 x 9 = 72 damage if all pellets hit
        pellets: 8,
        spreadRad: 0.22, // ~12.5 degrees
        bulletSpeed: 950,
        range: 450,
        magSize: 6,
        reserveAmmo: 30,
        reloadTimeMs: 2300,
        bulletColor: 0xef4444, // Red
        bulletLength: 6,
        auto: false,
    },
};
