import React from "react";
import { useMatchStore } from "../store/matchStore";
import { WEAPON_REGISTRY } from "@duo-arena/shared";

export const PlayerStatusHUD: React.FC = () => {
  const { localPlayer } = useMatchStore();

  if (!localPlayer) return null;

  const weapon = WEAPON_REGISTRY[localPlayer.weaponId as keyof typeof WEAPON_REGISTRY] || WEAPON_REGISTRY.rifle;
  const hpPercent = Math.max(0, Math.min(100, (localPlayer.hp / localPlayer.maxHp) * 100));

  return (
    <div
      style={{
        position: "absolute",
        bottom: "20px",
        left: "20px",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        pointerEvents: "none",
        minWidth: "260px",
      }}
    >
      {/* Health Bar Card */}
      <div className="tactical-card" style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "1px", color: "#94a3b8" }}>
            OPERATIVE INTEGRITY
          </span>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              color: hpPercent <= 25 ? "#ef4444" : "#10b981",
            }}
          >
            {localPlayer.hp} / {localPlayer.maxHp} HP
          </span>
        </div>

        {/* HP Bar */}
        <div className="bar-track" style={{ height: "10px" }}>
          <div
            className={`bar-fill-hp ${hpPercent <= 25 ? "low" : ""}`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      {/* Weapon & Ammo Card */}
      <div className="tactical-card" style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", letterSpacing: "1px" }}>
              {weapon.category.toUpperCase()}
            </div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", letterSpacing: "0.5px" }}>
              {weapon.name}
            </div>
          </div>

          {/* Ammo Readout */}
          <div style={{ textAlign: "right" }}>
            {localPlayer.isReloading ? (
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#f59e0b",
                  fontFamily: "var(--font-mono)",
                  animation: "pulse 0.8s infinite",
                }}
              >
                RELOADING...
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                <span
                  style={{
                    fontSize: "30px",
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    color: localPlayer.ammo <= 3 ? "#ef4444" : "#38bdf8",
                  }}
                >
                  {localPlayer.ammo}
                </span>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    fontFamily: "var(--font-mono)",
                    color: "#64748b",
                  }}
                >
                  / {localPlayer.reserveAmmo === -1 ? "∞" : localPlayer.reserveAmmo}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Reload Hint */}
        {localPlayer.ammo < weapon.magSize && !localPlayer.isReloading && (
          <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
            Press <strong style={{ color: "#94a3b8" }}>[R]</strong> to reload | <strong style={{ color: "#94a3b8" }}>[Q]</strong> to ping
          </div>
        )}
      </div>
    </div>
  );
};
