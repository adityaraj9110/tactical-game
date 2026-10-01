export interface WeaponSpec {
    id: "pistol" | "smg" | "rifle" | "shotgun";
    name: string;
    category: "Sidearm" | "SMG" | "Rifle" | "Shotgun";
    fireRate: number;
    damage: number;
    pellets: number;
    spreadRad: number;
    bulletSpeed: number;
    range: number;
    magSize: number;
    reserveAmmo: number;
    reloadTimeMs: number;
    bulletColor: number;
    bulletLength: number;
    auto: boolean;
}
export declare const WEAPON_REGISTRY: Record<string, WeaponSpec>;
//# sourceMappingURL=weapons.d.ts.map