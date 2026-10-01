import React from "react";
import { useMatchStore } from "../store/matchStore";
import { WEAPON_REGISTRY } from "@duo-arena/shared";

export const KillFeed: React.FC = () => {
  const { killFeed } = useMatchStore();

  return (
    <div
      style={{
        position: "absolute",
        top: "20px",
        right: "20px",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        pointerEvents: "none",
        maxWidth: "340px",
      }}
    >
      {killFeed.map((entry) => {
        const weapon = WEAPON_REGISTRY[entry.weaponId as keyof typeof WEAPON_REGISTRY];
        const weaponName = weapon ? weapon.name : entry.weaponId;

        return (
          <div
            key={entry.id}
            className="tactical-card kill-badge"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 700,
              background: "rgba(15, 23, 42, 0.85)",
            }}
          >
            {/* Killer */}
            <span style={{ color: entry.killerTeam === "A" ? "#38bdf8" : "#f43f5e" }}>
              {entry.killerName}
            </span>

            {/* Weapon badge */}
            <span
              style={{
                fontSize: "10px",
                padding: "2px 6px",
                borderRadius: "3px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#e2e8f0",
              }}
            >
              [{weaponName}]
            </span>

            {/* Victim */}
            <span style={{ color: entry.victimTeam === "A" ? "#38bdf8" : "#f43f5e" }}>
              {entry.victimName}
            </span>
          </div>
        );
      })}
    </div>
  );
};
