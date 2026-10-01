import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { Team, MatchPhase } from "@duo-arena/shared";

export class PlayerSchema extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "Operative";
  @type("string") team: string = "A"; // "A" or "B"
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") vx: number = 0;
  @type("number") vy: number = 0;
  @type("number") angle: number = 0;
  @type("int16")  hp: number = 100;
  @type("int16")  maxHp: number = 100;
  @type("boolean") isAlive: boolean = true;
  @type("boolean") isBot: boolean = false;
  @type("string") weaponId: string = "rifle";
  @type("int16")  ammo: number = 25;
  @type("int16")  reserveAmmo: number = 100;
  @type("boolean") isReloading: boolean = false;
  @type("number") reloadRemainingMs: number = 0;
  @type("uint32") lastProcessedInput: number = 0;
}

export class BulletSchema extends Schema {
  @type("string") id: string = "";
  @type("string") ownerId: string = "";
  @type("string") team: string = "A";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") vx: number = 0;
  @type("number") vy: number = 0;
  @type("number") startX: number = 0;
  @type("number") startY: number = 0;
  @type("number") range: number = 800;
  @type("int16")  damage: number = 20;
  @type("string") weaponId: string = "rifle";
}

export class CrateSchema extends Schema {
  @type("string") id: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") width: number = 48;
  @type("number") height: number = 48;
  @type("int16")  hp: number = 80;
  @type("boolean") destroyed: boolean = false;
}

export class MatchState extends Schema {
  @type("string") phase: string = "LOBBY"; // MatchPhase
  @type("uint8")  bestOf: number = 5;
  @type("uint8")  round: number = 1;
  @type("uint8")  scoreA: number = 0;
  @type("uint8")  scoreB: number = 0;
  @type("number") timeLeft: number = 90;
  @type("string") winner: string = "";
  @type("string") roomCode: string = "";

  // Sudden Death Shrinking Circle
  @type("number") zoneCenterX: number = 800;
  @type("number") zoneCenterY: number = 600;
  @type("number") zoneRadius: number = 1100;

  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type([ BulletSchema ]) bullets = new ArraySchema<BulletSchema>();
  @type([ CrateSchema ]) crates = new ArraySchema<CrateSchema>();
}
