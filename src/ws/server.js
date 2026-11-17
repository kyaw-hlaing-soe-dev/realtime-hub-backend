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

function rejectUpgrade(socket, statusCode, statusText, message, retryAfter) {
  const body = JSON.stringify({ error: message });
  const headers = [
    `HTTP/1.1 ${statusCode} ${statusText}`,
    "Connection: close",
    "Content-Type: application/json",
    `Content-Length: ${Buffer.byteLength(body)}`,
  ];

  if (retryAfter) {
    headers.push(`Retry-After: ${retryAfter}`);
  }

  socket.write(`${headers.join("\r\n")}\r\n\r\n${body}`);
  socket.destroy();
}

export function attachWebSocketServer(server) {
  const wss = new WebSocket.Server({
    noServer: true,
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

  async function handleUpgrade(request, socket, head) {
    const requestUrl = new URL(request.url, "http://localhost");

    if (requestUrl.pathname !== "/ws") {
      socket.destroy();
      return;
    }

    socket.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    if (!wsArcjet) {
      console.error("WebSocket security is not configured");
      rejectUpgrade(socket, 503, "Service Unavailable", "WebSocket security unavailable");
      return;
    }

    try {
      const decision = await wsArcjet.protect(request);

      if (decision.isDenied()) {
        const isRateLimited = decision.reason.isRateLimit();
        const statusCode = isRateLimited ? 429 : 403;
        const statusText = isRateLimited ? "Too Many Requests" : "Forbidden";
        const message = isRateLimited
          ? "Too many connections"
          : "Connection not allowed";

        console.warn("WebSocket connection denied:", message);
        rejectUpgrade(socket, statusCode, statusText, message, isRateLimited ? 2 : undefined);
        return;
      }

      if (decision.isErrored()) {
        console.error("WebSocket Arcjet decision error:", decision.reason.message);
        rejectUpgrade(socket, 503, "Service Unavailable", "WebSocket security unavailable");
        return;
      }

      wss.handleUpgrade(request, socket, head, (client) => {
        wss.emit("connection", client, request);
      });
    } catch (error) {
      console.error("WebSocket Arcjet error:", error);
      rejectUpgrade(socket, 503, "Service Unavailable", "WebSocket security unavailable");
      return;
    }
  }

  server.on("upgrade", handleUpgrade);

  wss.on("connection", (socket) => {
    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    sendJson(socket, { type: "welcome", message: "Connected to WebSocket server" });
  });

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
    server.off("upgrade", handleUpgrade);
  });

  return { broadcastMatchCreate };
}
    