import "dotenv/config";
import express from "express";
import http from "http";
import matchesRouter from "./routes/matches.js";
import commentaryRouter from "./routes/commentary.js";
import footballRouter from "./routes/football.js";
import { attachWebSocketServer } from "./ws/server.js";
import { securityMiddleware } from "./arcjet.js";
import { createFootballSyncService } from "./services/footballSync.js";

if (!process.env.VERCEL) {
  const { default: apminsight } = await import("apminsight");
  apminsight.config();
}

const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || "0.0.0.0";

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(securityMiddleware);

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/matches", matchesRouter);
app.use("/matches/:id/commentary", commentaryRouter);
app.use("/football", footballRouter);   // ← new: direct API proxy routes

let broadcastMatchCreate = () => {};
let broadcastCommentary = () => {};

if (!process.env.VERCEL) {
  ({ broadcastMatchCreate, broadcastCommentary } =
    attachWebSocketServer(server));
}

app.locals.broadcastMatchCreate = broadcastMatchCreate;
app.locals.broadcastCommentary = broadcastCommentary;

// ─── Football API sync ──────────────────────────────────────────────────────
// Only run the poller when FOOTBALL_API_KEY is set and not on Vercel
// (Vercel is serverless — use a separate cron worker there).
if (!process.env.VERCEL && process.env.FOOTBALL_API_KEY) {
  const sync = createFootballSyncService({
    broadcastMatchCreate,
    broadcastCommentary,
  });

  sync.start();

  // Graceful shutdown
  process.on("SIGTERM", () => sync.stop());
  process.on("SIGINT", () => sync.stop());
} else if (!process.env.FOOTBALL_API_KEY) {
  console.warn(
    "[boot] FOOTBALL_API_KEY not set — football sync disabled. " +
      "Add it to .env to enable automatic match syncing."
  );
}

if (!process.env.VERCEL) {
  server.listen(PORT, HOST, () => {
    const baseUrl =
      HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
    console.log(`Server is running on port ${baseUrl}`);
    console.log(`WebSocket server is running on ${baseUrl.replace("http", "ws")}/ws`);
  });
}

export default app;
