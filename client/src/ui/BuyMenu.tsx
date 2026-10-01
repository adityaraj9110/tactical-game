import React, { useState, useEffect } from "react";
import { useMatchStore } from "../store/matchStore";
import { WEAPON_REGISTRY } from "@duo-arena/shared";

export const BuyMenu: React.FC = () => {
  const { phase, room, localPlayer, timeLeft } = useMatchStore();
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (phase === "BUY") {
      setClosed(false);
    }
  }, [phase]);

  // Only render during the 10-second BUY phase and if not manually dismissed
  if (phase !== "BUY" || closed) return null;

  const handleSelectWeapon = (weaponId: string) => {
    room?.send("select_weapon", weaponId);
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 110,
        width: "90%",
        maxWidth: "800px",
      }}
    >
      <div className="tactical-card" style={{ padding: "24px 32px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            paddingBottom: "12px",
            marginBottom: "20px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#f8fafc", letterSpacing: "1px" }}>
              SELECT OPERATIVE LOADOUT
            </h2>
            <p style={{ fontSize: "12px", color: "#94a3b8" }}>
              Choose primary armament for the upcoming round
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "12px", color: "#64748b" }}>ROUND STARTS IN</span>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                color: "#38bdf8",
              }}
            >
              00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
            </div>
          </div>
        </div>

        {/* Weapons Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
          {Object.values(WEAPON_REGISTRY).map((weapon) => {
            const isSelected = localPlayer?.weaponId === weapon.id;

            return (
              <div
                key={weapon.id}
                onClick={() => handleSelectWeapon(weapon.id)}
                className="tactical-card-interactive"
                style={{
                  padding: "16px",
                  cursor: "pointer",
                  border: isSelected
                    ? "2px solid #38bdf8"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  background: isSelected
                    ? "rgba(14, 116, 144, 0.25)"
                    : "rgba(15, 23, 42, 0.65)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#38bdf8", letterSpacing: "1px" }}>
                      {weapon.category.toUpperCase()}
                    </span>
                    <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#fff" }}>
                      {weapon.name}
                    </h3>
                  </div>
                  {isSelected && (
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "4px",
                        background: "#0284c7",
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "#fff",
                      }}
                    >
                      EQUIPPED
                    </span>
                  )}
                </div>

                {/* Stats Bar */}
                <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <StatRow label="DAMAGE" value={weapon.damage * weapon.pellets} max={80} />
                  <StatRow label="FIRE RATE" value={weapon.fireRate} max={12} />
                  <StatRow label="MAGAZINE" value={weapon.magSize} max={30} />
                  <StatRow label="RANGE" value={weapon.range} max={1200} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Ready / Close Button */}
        <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => setClosed(true)}
            className="btn-tactical btn-primary-blue"
            style={{ padding: "10px 24px", fontSize: "13px" }}
          >
            ✓ READY & CLOSE LOADOUT
          </button>
        </div>
      </div>
    </div>
  );
};

const StatRow: React.FC<{ label: string; value: number; max: number }> = ({ label, value, max }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
    <span style={{ color: "#94a3b8", width: "70px", fontWeight: 600 }}>{label}</span>
    <div className="bar-track" style={{ flex: 1, height: "6px", margin: "0 8px" }}>
      <div
        style={{
          width: `${Math.min(100, (value / max) * 100)}%`,
          height: "100%",
          background: "#38bdf8",
        }}
      />
    </div>
    <span style={{ color: "#e2e8f0", width: "24px", textAlign: "right", fontFamily: "var(--font-mono)" }}>
      {value}
    </span>
  </div>
);
