import { WebSocket, WebSocketServer } from "ws";
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

function parseMatchId(matchId) {
  const id = Number(matchId);
  return Number.isInteger(id) && id > 0 ? id : null;
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
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 1024 * 1024,
  });
  const matchSubscribers = new Map();

  function subscribe(matchId, socket) {
    if (!matchSubscribers.has(matchId)) {
      matchSubscribers.set(matchId, new Set());
    }

    matchSubscribers.get(matchId).add(socket);
  }

  function unsubscribe(matchId, socket) {
    const subscribers = matchSubscribers.get(matchId);
    if (!subscribers) return;

    subscribers.delete(socket);
    if (subscribers.size === 0) {
      matchSubscribers.delete(matchId);
    }
  }

  function cleanupSubscriptions(socket) {
    for (const matchId of socket.subscriptions) {
      unsubscribe(matchId, socket);
    }
  }

  function broadcastToMatch(matchId, payload) {
    const subscribers = matchSubscribers.get(matchId);
    if (!subscribers) return;

    for (const socket of subscribers) {
      sendJson(socket, payload);
    }
  }

  function handleMessage(socket, rawMessage) {
    let message;

    try {
      message = JSON.parse(rawMessage.toString());
    } catch {
      sendJson(socket, { type: "error", message: "Invalid JSON message" });
      return;
    }

    const matchId = parseMatchId(message.matchId);
    if (!matchId) {
      sendJson(socket, { type: "error", message: "Invalid matchId" });
      return;
    }

    if (message.type === "subscribe") {
      subscribe(matchId, socket);
      socket.subscriptions.add(matchId);
      sendJson(socket, { type: "subscribed", matchId });
      return;
    }

    if (message.type === "unsubscribe") {
      unsubscribe(matchId, socket);
      socket.subscriptions.delete(matchId);
      sendJson(socket, { type: "unsubscribed", matchId });
      return;
    }

    sendJson(socket, { type: "error", message: "Unknown message type" });
  }

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

  function broadcastCommentary(matchId, commentary) {
    broadcastToMatch(matchId, { type: "commentary", data: commentary });
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
        console.warn("WebSocket Arcjet decision error (allowing upgrade):", decision.reason.message);
      }
    } catch (error) {
      console.warn("WebSocket Arcjet error (allowing upgrade):", error);
    }

    wss.handleUpgrade(request, socket, head, (client) => {
      wss.emit("connection", client, request);
    });
  }

  server.on("upgrade", handleUpgrade);

  wss.on("connection", (socket) => {
    socket.isAlive = true;
    socket.subscriptions = new Set();

    socket.on("pong", () => {
      socket.isAlive = true;
    });

    socket.on("message", (rawMessage) => {
      handleMessage(socket, rawMessage);
    });

    socket.on("close", () => {
      cleanupSubscriptions(socket);
    });

    sendJson(socket, { type: "welcome", message: "Connected to WebSocket server" });
  });

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
    server.off("upgrade", handleUpgrade);
  });

  return { broadcastMatchCreate, broadcastCommentary };
}
    