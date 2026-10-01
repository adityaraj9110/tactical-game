import React, { useState } from "react";
import { useMatchStore } from "../store/matchStore";

interface LobbyScreenProps {
  onStartGame: (name: string, practice: boolean) => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({ onStartGame }) => {
  const { room, roomCode, playersList } = useMatchStore();
  const [playerName, setPlayerName] = useState(
    localStorage.getItem("duo_player_name") || `Operative-${Math.floor(100 + Math.random() * 900)}`
  );
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/?room=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePracticeStart = () => {
    localStorage.setItem("duo_player_name", playerName);
    if (room) {
      room.send("start_practice");
    } else {
      onStartGame(playerName, true);
    }
  };

  const handleRegularStart = () => {
    localStorage.setItem("duo_player_name", playerName);
    if (room) {
      room.send("force_start");
    } else {
      onStartGame(playerName, false);
    }
  };

  const teamAPlayers = playersList.filter((p) => p.team === "A");
  const teamBPlayers = playersList.filter((p) => p.team === "B");

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at center, #0f172a 0%, #07090e 100%)",
        padding: "20px",
      }}
    >
      <div
        className="tactical-card"
        style={{
          width: "100%",
          maxWidth: "760px",
          padding: "36px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Title & Subheading */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#38bdf8", letterSpacing: "2.5px" }}>
            2V2 TACTICAL TOP-DOWN ARENA
          </div>
          <h1
            style={{
              fontSize: "44px",
              fontWeight: 800,
              letterSpacing: "2px",
              textTransform: "uppercase",
              background: "linear-gradient(135deg, #f8fafc, #94a3b8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginTop: "4px",
            }}
          >
            DUO ARENA
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>
            Tactical gunplay, dynamic line-of-sight fog-of-war & spatial hearing.
          </p>
        </div>

        {/* Player Name Input */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", letterSpacing: "1px" }}>
            CALLSIGN (PLAYER NAME)
          </label>
          <input
            type="text"
            value={playerName}
            maxLength={14}
            onChange={(e) => setPlayerName(e.target.value)}
            style={{
              background: "rgba(15, 23, 42, 0.9)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "6px",
              padding: "12px 16px",
              color: "#f8fafc",
              fontSize: "16px",
              fontFamily: "var(--font-mono)",
              outline: "none",
            }}
          />
        </div>

        {/* 2v2 Roster Display */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* Team Blue Card */}
          <div
            className="tactical-card"
            style={{ padding: "16px", borderTop: "3px solid #38bdf8" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "13px", fontWeight: 800, color: "#38bdf8", letterSpacing: "1px" }}>
                TEAM BLUE (2 SLOTS)
              </span>
              <span style={{ fontSize: "11px", color: "#64748b" }}>{teamAPlayers.length}/2</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[0, 1].map((slotIdx) => {
                const player = teamAPlayers[slotIdx];
                return (
                  <div
                    key={slotIdx}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "4px",
                      background: player ? "rgba(14, 116, 144, 0.2)" : "rgba(255, 255, 255, 0.03)",
                      border: "1px dashed rgba(56, 189, 248, 0.3)",
                      fontSize: "13px",
                      color: player ? "#38bdf8" : "#475569",
                      fontWeight: 700,
                    }}
                  >
                    {player ? `${player.name} ${player.isBot ? "(BOT)" : ""}` : "[ EMPTY SLOT ]"}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Team Red Card */}
          <div
            className="tactical-card"
            style={{ padding: "16px", borderTop: "3px solid #f43f5e" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "13px", fontWeight: 800, color: "#f43f5e", letterSpacing: "1px" }}>
                TEAM RED (2 SLOTS)
              </span>
              <span style={{ fontSize: "11px", color: "#64748b" }}>{teamBPlayers.length}/2</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[0, 1].map((slotIdx) => {
                const player = teamBPlayers[slotIdx];
                return (
                  <div
                    key={slotIdx}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "4px",
                      background: player ? "rgba(225, 29, 72, 0.2)" : "rgba(255, 255, 255, 0.03)",
                      border: "1px dashed rgba(244, 63, 94, 0.3)",
                      fontSize: "13px",
                      color: player ? "#f43f5e" : "#475569",
                      fontWeight: 700,
                    }}
                  >
                    {player ? `${player.name} ${player.isBot ? "(BOT)" : ""}` : "[ EMPTY SLOT ]"}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Practice vs Bots (instant play) */}
          <button
            onClick={handlePracticeStart}
            className="btn-tactical btn-primary-blue"
            style={{ width: "100%", padding: "16px", fontSize: "16px" }}
          >
            ⚡ PLAY SOLO / PRACTICE (AUTO-FILL BOTS)
          </button>

          {/* Invite Link & Force Start Buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <button
              onClick={handleCopyLink}
              className="btn-tactical"
              style={{ padding: "12px", fontSize: "13px" }}
            >
              {copied ? "✓ LINK COPIED!" : `🔗 INVITE FRIEND (${roomCode || "LOBBY"})`}
            </button>

            <button
              onClick={handleRegularStart}
              className="btn-tactical"
              style={{ padding: "12px", fontSize: "13px", borderColor: "#10b981", color: "#10b981" }}
            >
              START LIVE MATCH
            </button>
          </div>
        </div>

        {/* Quick controls reminder */}
        <div
          style={{
            fontSize: "11px",
            color: "#64748b",
            textAlign: "center",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            paddingTop: "14px",
          }}
        >
          <strong>CONTROLS:</strong> WASD to Move • Mouse to Aim & Shoot • [R] Reload • [Shift] Walk Quietly • [Q] Ping Teammate
        </div>
      </div>
    </div>
  );
};
