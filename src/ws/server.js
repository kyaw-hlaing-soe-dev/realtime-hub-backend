import WebSocket from 'ws';

function sendJson(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) return;
        sendJson(client, payload);
    }
}

export function attachWebSocketServer(server) {
    const wss = new WebSocket.Server({ server , path: '/ws' ,MaxPayload: 1024 * 1024});

    wss.on('connection', (socket) => {
        sendJson(socket, { type: 'welcome', message: 'Connected to WebSocket server' });

        socket.on('error', (error) => {
            console.error('WebSocket error:', error);
        });

        function broadcastMatchCreate(match) {
            broadcast(wss, { type: 'matchCreated', data : match });
        }

        return {
            broadcastMatchCreate,
        };
    });
}
    