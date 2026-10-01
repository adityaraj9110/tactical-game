import React from "react";
import { useMatchStore } from "../store/matchStore";

export const MatchResultModal: React.FC = () => {
  const { phase, winner, scoreA, scoreB, room } = useMatchStore();

  if (phase !== "MATCH_END") return null;

  const handleRematch = () => {
    room?.send("rematch");
  };

  const isTeamAWinner = winner.includes("Blue") || scoreA > scoreB;

  return (
    <div
      style={{
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        background: "rgba(7, 9, 14, 0.88)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 150,
      }}
    >
      <div
        className="tactical-card"
        style={{
          width: "100%",
          maxWidth: "500px",
          padding: "40px",
          textAlign: "center",
          borderTop: `4px solid ${isTeamAWinner ? "#38bdf8" : "#f43f5e"}`,
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "3px", color: "#94a3b8" }}>
          MATCH CONCLUSION
        </div>

        <h1
          style={{
            fontSize: "42px",
            fontWeight: 800,
            color: isTeamAWinner ? "#38bdf8" : "#f43f5e",
            textShadow: `0 0 20px ${isTeamAWinner ? "rgba(56, 189, 248, 0.5)" : "rgba(244, 63, 94, 0.5)"}`,
            marginTop: "8px",
          }}
        >
          {winner.toUpperCase()} VICTORIOUS
        </h1>

        {/* Final Score */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "24px",
            margin: "24px 0",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: "#38bdf8", fontWeight: 700 }}>TEAM BLUE</div>
            <div style={{ fontSize: "40px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#38bdf8" }}>
              {scoreA}
            </div>
          </div>

          <div style={{ fontSize: "24px", color: "#64748b", fontWeight: 700 }}>—</div>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: "#f43f5e", fontWeight: 700 }}>TEAM RED</div>
            <div style={{ fontSize: "40px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#f43f5e" }}>
              {scoreB}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleRematch}
          className="btn-tactical btn-primary-blue"
          style={{ width: "100%", padding: "14px", fontSize: "16px" }}
        >
          🔄 REMATCH (PLAY AGAIN)
        </button>
      </div>
    </div>
  );
};
