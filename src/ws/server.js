import WebSocket from "ws";

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

  wss.on("connection", (socket) => {
    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    sendJson(socket, { type: "welcome", message: "Connected to WebSocket server" });

    socket.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  return { broadcastMatchCreate };
}
    