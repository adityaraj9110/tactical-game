import React, { useState } from "react";
import { Client, Room } from "colyseus.js";
import { useMatchStore } from "./store/matchStore";
import { GameCanvas } from "./game/GameCanvas";
import { HeaderHUD } from "./ui/HeaderHUD";
import { PlayerStatusHUD } from "./ui/PlayerStatusHUD";
import { KillFeed } from "./ui/KillFeed";
import { BuyMenu } from "./ui/BuyMenu";
import { LobbyScreen } from "./ui/LobbyScreen";
import { MatchResultModal } from "./ui/MatchResultModal";
import { SoundManager } from "./game/audio/SoundManager";

export const App: React.FC = () => {
  const { room, setRoom, isAudioMuted, toggleMute } = useMatchStore();
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const connectToGame = async (playerName: string, practice: boolean) => {
    try {
      setConnecting(true);
      setErrorMsg(null);
      SoundManager.init();

      // Read room code from URL params if available
      const urlParams = new URLSearchParams(window.location.search);
      const roomCode = urlParams.get("room");

      const serverUrl = window.location.hostname === "localhost"
        ? "ws://localhost:2567"
        : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;

      const client = new Client(serverUrl);

      let joinedRoom: Room<any>;
      if (roomCode) {
        // Join existing room by code
        joinedRoom = await client.joinOrCreate("arena", {
          name: playerName,
          roomCode,
          practice,
        });
      } else if (practice) {
        // Practice mode: create a dedicated fresh room
        joinedRoom = await client.create("arena", {
          name: playerName,
          practice: true,
        });
      } else {
        // Create or join general lobby
        joinedRoom = await client.joinOrCreate("arena", {
          name: playerName,
          practice: false,
        });
      }

      // Immediately sync state & subscribe to changes
      if (joinedRoom.state) {
        useMatchStore.getState().updateFromState(joinedRoom.state, joinedRoom.sessionId);
      }
      joinedRoom.onStateChange((state) => {
        useMatchStore.getState().updateFromState(state, joinedRoom.sessionId);
      });

      setRoom(joinedRoom);
      setConnecting(false);
    } catch (err: any) {
      console.error("Failed to connect to game server:", err);
      setErrorMsg("Unable to connect to game server at ws://localhost:2567. Make sure server is running.");
      setConnecting(false);
    }
  };

  const handleMuteClick = () => {
    toggleMute();
    SoundManager.setMuted(!isAudioMuted);
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Audio Mute & Info Header Controls */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          zIndex: 200,
          display: "flex",
          gap: "8px",
        }}
      >
        <button
          onClick={handleMuteClick}
          className="btn-tactical"
          style={{ padding: "8px 14px", fontSize: "12px" }}
        >
          {isAudioMuted ? "🔇 MUTED" : "🔊 SFX ON"}
        </button>
      </div>

      {/* Connection / Error Banner */}
      {errorMsg && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(239, 68, 68, 0.9)",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "6px",
            zIndex: 300,
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Screen Routing */}
      {!room ? (
        <LobbyScreen onStartGame={connectToGame} />
      ) : (
        <>
          {/* Phaser WebGL Arena Canvas */}
          <GameCanvas room={room} />

          {/* Tactical React HUD Elements */}
          <HeaderHUD />
          <PlayerStatusHUD />
          <KillFeed />
          <BuyMenu />
          <MatchResultModal />
        </>
      )}

      {/* Connecting Loading Modal */}
      {connecting && (
        <div
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            background: "rgba(7, 9, 14, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 400,
            fontSize: "18px",
            fontWeight: 700,
            color: "#38bdf8",
            letterSpacing: "2px",
          }}
        >
          CONNECTING TO TACTICAL SERVER...
        </div>
      )}
    </div>
  );
};

export default App;
