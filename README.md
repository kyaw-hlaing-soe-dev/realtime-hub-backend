# Realtime Hub Backend

A small Node.js project for learning WebSockets and building real-time
applications. The project uses the [`ws`](https://github.com/websockets/ws)
library to run a WebSocket server and will grow into a real-time communication
backend.

## What this project covers

- Starting a WebSocket server with Node.js
- Accepting client connections
- Sending and receiving real-time messages
- Broadcasting events to connected clients
- Managing connection and disconnection events
- Building the foundation for a real-time application

## Current status

The WebSocket server currently listens on port `8080` and accepts connections.
Message handling and broadcasting will be implemented as part of the learning
process.

## Requirements

- Node.js 18 or newer
- npm

## Getting started

Install the dependencies:

```bash
npm install
```

Start the server:

```bash
node server.js
```

The server will be available at:

```text
ws://localhost:8080
```

## Connecting from a browser

Open the browser developer console and run:

```js
const socket = new WebSocket("ws://localhost:8080");

socket.onopen = () => {
  console.log("Connected to the real-time server");
};

socket.onmessage = (event) => {
  console.log("Message from server:", event.data);
};

socket.onclose = () => {
  console.log("Disconnected from the real-time server");
};
```

## Project structure

```text
.
├── server.js       # WebSocket server
├── package.json     # Project metadata and dependencies
├── package-lock.json
└── README.md       # Project documentation
```

## Learning roadmap

1. Handle incoming client messages.
2. Broadcast messages to all connected clients.
3. Add usernames or client identities.
4. Create rooms or channels.
5. Add basic validation and error handling.
6. Connect the backend to a real-time frontend.

## License

This project is for learning and experimentation.
