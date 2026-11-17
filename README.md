# Realtime Hub Backend

A hands-on WebSocket learning project built with Node.js. The project uses a
sports match API as a practical example for learning how to connect clients,
send events, broadcast updates, and build real-time backend features.

## Features

- Express HTTP API
- PostgreSQL access through Drizzle ORM
- Zod request validation
- Match status calculation: `scheduled`, `live`, and `finished`
- WebSocket welcome and match-created events

## Learning goals

This project is intentionally being developed step by step to practice:

- Creating and managing WebSocket connections
- Sending structured JSON messages
- Broadcasting events to multiple clients
- Connecting HTTP API actions to WebSocket notifications
- Handling connection errors and disconnected clients
- Building real-time features around a simple domain model

## Requirements

- Node.js 18 or newer
- npm
- PostgreSQL

## Setup

Install dependencies:

```bash
npm install
```

Create a `.env` file with the database connection string:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/realtime_hub
DATABASE_URL_UNPOOLED=postgresql://user:password@localhost:5432/realtime_hub
PORT=8000
HOST=0.0.0.0
```

`DATABASE_URL` is used by the application. `DATABASE_URL_UNPOOLED` is used by
Drizzle Kit for migrations.

Generate and run database migrations:

```bash
npm run db:generate
npm run db:migrate
```

Start the server:

```bash
npm start
```

The default endpoints are:

```text
HTTP:      http://localhost:8000
WebSocket: ws://localhost:8000/ws
```

Use `npm run dev` to start the server with Node.js watch mode.

## Matches API

### List matches

```http
GET /matches
```

An optional `limit` query parameter can be used. It must be a positive integer
between 1 and 100. The default is 20.

```bash
curl "http://localhost:8000/matches?limit=10"
```

### Create a match

```http
POST /matches
Content-Type: application/json
```

Request body:

```json
{
  "sport": "football",
  "homeTeam": "Manchester United",
  "awayTeam": "Liverpool",
  "startTime": "2026-11-18T14:00:00.000Z",
  "endTime": "2026-11-18T16:00:00.000Z"
}
```

`homeScore` and `awayScore` are optional and default to `0`. `endTime` must be
later than `startTime`, and both values must be valid date strings.

```bash
curl -X POST http://localhost:8000/matches \
  -H "Content-Type: application/json" \
  -d '{
    "sport": "football",
    "homeTeam": "Manchester United",
    "awayTeam": "Liverpool",
    "startTime": "2026-11-18T14:00:00.000Z",
    "endTime": "2026-11-18T16:00:00.000Z"
  }'
```

Invalid request data returns `400`. Database failures return `500`.

## WebSocket API

Connect to:

```js
const socket = new WebSocket("ws://localhost:8000/ws");

socket.onmessage = (event) => {
  console.log(JSON.parse(event.data));
};
```

Each client receives a welcome message:

```json
{
  "type": "welcome",
  "message": "Connected to WebSocket server"
}
```

After a match is created successfully, connected clients receive:

```json
{
  "type": "matchCreated",
  "data": {
    "id": 1,
    "sport": "football",
    "homeTeam": "Manchester United",
    "awayTeam": "Liverpool",
    "status": "scheduled",
    "homeScore": 0,
    "awayScore": 0
  }
}
```

## Testing

Run the validation tests:

```bash
npm test
```

## Learning roadmap

Planned exercises include:

1. Add client message handling.
2. Broadcast score and match-status updates.
3. Add client identity and presence.
4. Create rooms or match-specific channels.
5. Add reconnection and heartbeat handling.
6. Connect a real-time frontend client.

## Project structure

```text
src/
├── db/              # Drizzle database client and schema
├── routes/          # Express routes
├── utils/           # Match status utilities
├── validation/      # Zod schemas
├── ws/              # WebSocket server
└── index.js         # HTTP and WebSocket application entry point
test/                # Node.js tests
drizzle/             # Database migrations
```
