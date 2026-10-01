import Phaser from "phaser";
import { ProceduralTextures } from "../render/ProceduralTextures";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    // Generate all procedural geometric textures
    ProceduralTextures.generateAll(this);

    // Start ArenaScene immediately with room
    const room = this.registry.get("room") || (window as any).__DUO_ARENA_ROOM__;
    this.scene.start("ArenaScene", { room });
  }
}
