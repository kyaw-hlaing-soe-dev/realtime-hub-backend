import WebSocket from "ws";
import { wsArcjet } from "../arcjet.js";

function sendJson(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) return;

  try {
    socket.send(JSON.stringify(payload));
  } catch (error) {
    console.error("WebSocket send error:", error);
    socket.terminate();
  }
}

function broadcast(wss, payload) {
  for (const client of wss.clients) {
    sendJson(client, payload);
  }
}

export function attachWebSocketServer(server) {
  const wss = new WebSocket.Server({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });
  const heartbeatInterval = setInterval(() => {
    for (const socket of wss.clients) {
      if (socket.isAlive === false) {
        socket.terminate();
        continue;
      }

      socket.isAlive = false;
      socket.ping();
    }
  }, 30_000);

  heartbeatInterval.unref();

  function broadcastMatchCreate(match) {
    broadcast(wss, { type: "matchCreated", data: match });
  }

  wss.on("connection", async (socket, request) => {
    socket.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    if (!wsArcjet) {
      console.error("WebSocket security is not configured");
      socket.close(1011, "WebSocket security unavailable");
      return;
    }

    try {
      const decision = await wsArcjet.protect(request);

      if (decision.isDenied()) {
        const message = decision.reason.isRateLimit()
          ? "Too many connections"
          : "Connection not allowed";

        console.warn("WebSocket connection denied:", message);
        socket.close(1008, message);
        return;
      }

      if (decision.isErrored()) {
        console.error("WebSocket Arcjet decision error:", decision.reason.message);
        socket.close(1011, "WebSocket security unavailable");
        return;
      }
    } catch (error) {
      console.error("WebSocket Arcjet error:", error);
      socket.close(1011, "WebSocket security unavailable");
      return;
    }

    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    sendJson(socket, { type: "welcome", message: "Connected to WebSocket server" });
  });

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  return { broadcastMatchCreate };
}
    