import express from "express";
import http from "http";
import matchesRouter from "./routes/matches.js";
import commentaryRouter from "./routes/commentary.js";
import { attachWebSocketServer } from "./ws/server.js";
import { securityMiddleware } from "./arcjet.js";

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

let broadcastMatchCreate = () => {};
let broadcastCommentary = () => {};

if (!process.env.VERCEL) {
  ({ broadcastMatchCreate, broadcastCommentary } =
    attachWebSocketServer(server));
}

app.locals.broadcastMatchCreate = broadcastMatchCreate;
app.locals.broadcastCommentary = broadcastCommentary;

if (!process.env.VERCEL) {
  server.listen(PORT, HOST, () => {
    const baseUrl =
      HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
    console.log(`Server is running on port ${baseUrl}`);
    console.log(`WebSocket server is running on ${baseUrl.replace("http", "ws")}/ws`);
  });
}

export default app;
