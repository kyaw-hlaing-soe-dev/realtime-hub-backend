# Realtime Hub Frontend Design System

## Product direction

Build a focused football match hub: fixtures are easy to scan, scores are the
strongest information on each row, and socket connectivity is visible without
pretending the fixture source is live. Use a calm dark interface with a lime
accent, compact match rows, and clear scheduled and finished states.

## Foundations

### Color tokens

| Token | Value | Use |
| --- | --- | --- |
| `color.canvas` | `#0B100E` | App background |
| `color.surface` | `#121A16` | Cards, navigation, menus |
| `color.surfaceRaised` | `#19231E` | Hovered rows, selected tabs |
| `color.border` | `#2A3730` | Dividers and control outlines |
| `color.text` | `#F2F6F3` | Main text and scores |
| `color.textMuted` | `#A0ADA5` | Metadata and secondary labels |
| `color.accent` | `#B9F36A` | Primary action, selected state |
| `color.scheduled` | `#9DB8FF` | Scheduled status |
| `color.finished` | `#A0ADA5` | Finished status |
| `color.error` | `#FF8178` | Errors and destructive actions |
| `color.success` | `#72D6A0` | Successful connection and save feedback |

Use status text and an icon or shape as well as color. Do not mark OpenFootball
fixtures as live: that dataset supplies fixtures and final results, with daily
updates. Reserve a live indicator for a future real-time score source.

### Typography

- Use **Inter** or the platform sans-serif for interface text.
- Use tabular numerals for scores, times, and statistics (`font-variant-numeric:
  tabular-nums`).
- Page title: 28/34 px, semibold. Section title: 16/22 px, semibold.
- Match team names: 14/20 px, medium. Metadata: 12/16 px, regular.
- Keep body copy at 14–16 px and avoid low contrast for secondary text.

### Spacing, shape, and motion

- Use a 4 px base spacing scale: `4, 8, 12, 16, 24, 32, 48`.
- Main content max width: 1200 px; desktop page padding: 32 px; mobile: 16 px.
- Cards and controls use 10 px corner radius; pills use fully rounded ends.
- Use 150–200 ms transitions for hover, selection, and disclosure. Respect
  `prefers-reduced-motion`.

## App shell

- **Top bar:** Realtime Hub wordmark, current connection state, and profile or
  settings action.
- **Primary navigation:** Overview, Fixtures, Matches. Keep navigation labels
  short and persistent on desktop; use a compact menu on mobile.
- **Content area:** A clear page title, one line of context, then the main list.
- Keep the connection indicator in the top bar. Do not use a full-screen loader
  while reconnecting; existing content should remain visible.

## Core components

### Match row

Use one reusable row for fixture and saved-match lists:

1. Competition and kickoff time in muted metadata.
2. Home and away team names, with optional crests when available.
3. A centered score or kickoff time using tabular numerals.
4. A text status badge: Scheduled, Finished, or Live only when backed by a
   real-time source.

On narrow screens, stack competition metadata above the two-team score line.
Make the full row a link only when a match detail view exists.

### Status badge

- **Scheduled:** muted blue dot and “Scheduled”.
- **Finished:** neutral dot and “FT” or “Finished”.
- **Live:** red dot with a subtle pulse only for verified live data.
- **Unknown or stale:** neutral badge; never infer “Live” from kickoff time.

### Fixture list

- Group rows by date and competition.
- Provide day navigation and a league selector when multiple competitions are
  enabled.
- Keep the selected day visible and announce changes to assistive technology.
- For an empty day, show “No fixtures scheduled today” with a link or control to
  choose another date. An empty array is a normal response.

### Connection indicator

Use a small icon plus label: **Connected**, **Connecting**, **Reconnecting**, or
**Offline**. Connection state describes the WebSocket transport, not whether
match data is fresh. Display the dataset's `updatedAt` separately as “Data
updated …”.

### Commentary feed

Render commentary as a chronological timeline with minute, event type, team,
actor, and message. Use a compact event icon and text label; color alone must
not identify goals, cards, or substitutions. Show an explicit empty state when
there are no entries.

## Pages and layouts

### Overview

- Header with “Match hub” and the socket state.
- Today’s Premier League fixtures as the primary panel.
- Recent saved matches as a secondary panel.
- A short empty state when there are no fixtures today.

### Fixtures

- Date selector, competition label, and “Data updated” timestamp.
- A list of match rows, grouped by matchday where available.
- Empty, loading, and source-error states in the list region.

### Match detail

- Teams and score/time at the top, followed by status and kickoff metadata.
- Commentary timeline below the score when entries exist.
- Subscribe to the match's commentary channel while the detail view is open;
  unsubscribe when leaving the view.

## Interaction states

- **Loading:** skeleton rows that match the final row height; keep the page shell
  stable.
- **Empty:** explain that no fixtures are scheduled for the selected date.
- **Source error:** preserve the page and show a concise retry action.
- **Socket reconnecting:** retain the last snapshot, mark it as potentially
  stale, and retry with backoff.
- **Socket reconnected:** resubscribe to fixtures and commentary channels, then
  replace the snapshot when a new one arrives.
- **No live updates:** do not show a live pulse. Show the last dataset refresh
  time instead.

## Backend integration

### HTTP

- `GET /football/fixtures/today` returns the current day's fixture list. An
  empty list means no fixtures were found for that day.
- `GET /matches?limit=20` returns saved matches.
- `GET /matches/:id/commentary?limit=100` returns saved commentary.

### WebSocket

Connect to `/ws`. After `open`, subscribe to the configured league:

```js
socket.send(JSON.stringify({ type: "subscribeFixtures", league: 39 }));
```

Handle these messages:

| Type | Frontend behavior |
| --- | --- |
| `welcome` | Mark transport connected |
| `subscribedFixtures` | Subscription accepted |
| `fixturesSnapshot` | Replace the fixture collection |
| `fixturesUpdated` | Replace the collection and update freshness time |
| `error` | Show a non-blocking connection or subscription error |

To stop receiving fixtures, send
`{"type":"unsubscribeFixtures","league":39}`. The configured fixture
league defaults to Premier League (`39`). WebSocket updates are delivered as
soon as the backend publishes a snapshot, but the upstream dataset is refreshed
daily and does not contain live score changes or match events.

Match creation is broadcast as `matchCreated`. To receive commentary for a
saved match, send `{"type":"subscribe","matchId":123}` and handle
`commentary` messages. Send `{"type":"unsubscribe","matchId":123}` when the
match view closes.

## Accessibility

- Meet WCAG AA contrast for text and controls.
- Use visible keyboard focus rings and semantic buttons, links, headings, and
  lists.
- Give icon-only controls accessible names.
- Announce connection changes and new fixture snapshots politely; do not
  announce every unchanged row.
- Ensure status, score, and team names remain understandable without color or
  team crests.
