import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { ArenaRoom } from "./rooms/ArenaRoom";

const port = Number(process.env.PORT || 2567);
const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    game: "Duo Arena v1",
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

const server = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server,
  }),
});

// Register ArenaRoom as "arena"
gameServer.define("arena", ArenaRoom);

server.listen(port, () => {
  console.log(`[Duo Arena Server] 🚀 Authoritative Colyseus Server running on ws://localhost:${port}`);
  console.log(`[Duo Arena Server] 🎮 Room 'arena' registered (30Hz tick rate)`);
});
