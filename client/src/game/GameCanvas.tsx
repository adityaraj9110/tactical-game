import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import { Room } from "colyseus.js";
import { BootScene } from "./scenes/BootScene";
import { ArenaScene } from "./scenes/ArenaScene";

interface GameCanvasProps {
  room: Room<any>;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ room }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!mountRef.current || !room) {
      console.warn("[GameCanvas] Missing mount element or room");
      return;
    }

    // Destroy previous game instance if any
    if (gameRef.current) {
      console.log("[GameCanvas] Destroying previous Phaser instance");
      gameRef.current.destroy(true);
      gameRef.current = null;
    }

    // Clear the mount element
    mountRef.current.innerHTML = "";

    console.log("[GameCanvas] Creating Phaser game with room:", room.sessionId);

    // Store room globally so scenes can always access it
    (window as any).__DUO_ARENA_ROOM__ = room;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: mountRef.current,
      width: 1280,
      height: 720,
      backgroundColor: "#07090e",
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      render: {
        antialias: true,
        pixelArt: false,
      },
      scene: [BootScene, ArenaScene],
      callbacks: {
        postBoot: (game) => {
          console.log("[GameCanvas] Phaser postBoot, setting registry room");
          game.registry.set("room", room);
        },
      },
    };

    const game = new Phaser.Game(config);
    game.registry.set("room", room);
    gameRef.current = game;

    return () => {
      console.log("[GameCanvas] Cleanup: destroying Phaser game");
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      (window as any).__DUO_ARENA_ROOM__ = null;
    };
  }, [room]);

  return (
    <div
      ref={mountRef}
      className="game-viewport-container"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    />
  );
};
