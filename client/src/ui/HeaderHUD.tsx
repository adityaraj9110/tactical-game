import React from "react";
import { useMatchStore } from "../store/matchStore";

export const HeaderHUD: React.FC = () => {
  const { scoreA, scoreB, round, bestOf, phase, timeLeft } = useMatchStore();

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const getPhaseText = () => {
    switch (phase) {
      case "BUY":
        return "TACTICAL BUY PHASE";
      case "COUNTDOWN":
        return "PREPARE TO ENGAGE";
      case "LIVE":
        return timeLeft <= 30 ? "⚠️ SUDDEN DEATH SHRINK" : "ROUND IN PROGRESS";
      case "ROUND_END":
        return "ROUND CONCLUDED";
      case "MATCH_END":
        return "MATCH COMPLETE";
      default:
        return "LOBBY";
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        zIndex: 100,
        pointerEvents: "none",
      }}
    >
      {/* Scores & Clock Card */}
      <div
        className="tactical-card"
        style={{
          display: "flex",
          alignItems: "center",
          padding: "8px 24px",
          gap: "28px",
          borderTop: "2px solid #38bdf8",
        }}
      >
        {/* Team Blue */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#38bdf8", letterSpacing: "1px" }}>
            TEAM BLUE
          </span>
          <span
            style={{
              fontSize: "28px",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              color: "#38bdf8",
              textShadow: "0 0 12px rgba(56, 189, 248, 0.6)",
            }}
          >
            {scoreA}
          </span>
        </div>

        {/* Round Clock & Round Index */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "90px" }}>
          <span
            style={{
              fontSize: "24px",
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: timeLeft <= 15 ? "#ef4444" : "#f1f5f9",
              animation: timeLeft <= 15 ? "pulse 1s infinite" : "none",
            }}
          >
            {formatTime(timeLeft)}
          </span>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.5px" }}>
            ROUND {round} / {bestOf}
          </span>
        </div>

        {/* Team Red */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              fontSize: "28px",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              color: "#f43f5e",
              textShadow: "0 0 12px rgba(244, 63, 94, 0.6)",
            }}
          >
            {scoreB}
          </span>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#f43f5e", letterSpacing: "1px" }}>
            TEAM RED
          </span>
        </div>
      </div>

      {/* Phase Badge */}
      <div
        style={{
          marginTop: "6px",
          padding: "3px 12px",
          borderRadius: "4px",
          background: phase === "LIVE" && timeLeft <= 30 ? "rgba(239, 68, 68, 0.3)" : "rgba(15, 23, 42, 0.7)",
          border: `1px solid ${phase === "LIVE" && timeLeft <= 30 ? "#ef4444" : "rgba(255, 255, 255, 0.1)"}`,
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "1.5px",
          color: phase === "LIVE" && timeLeft <= 30 ? "#fca5a5" : "#94a3b8",
        }}
      >
        {getPhaseText()}
      </div>
    </div>
  );
};
