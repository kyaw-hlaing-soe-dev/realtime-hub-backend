/**
 * Football Sync Service
 *
 * Polls the public football API on a configurable interval, upserts
 * matches + commentary into the database, and broadcasts live updates
 * over WebSocket.
 *
 * Usage (called once from index.js):
 *   const sync = createFootballSyncService({ broadcastMatchCreate, broadcastCommentary });
 *   sync.start();
 *   // on shutdown:
 *   sync.stop();
 *
 * Env vars:
 *   FOOTBALL_SYNC_LEAGUE   – league id to track (default: 39 = PL)
 *   FOOTBALL_SYNC_SEASON   – season year (default: current year)
 *   FOOTBALL_SYNC_INTERVAL – poll interval in ms (default: 30000)
 */

import { eq, and } from "drizzle-orm";
import { db } from "../db/db.js";
import { matches, commentary } from "../db/schema.js";
import {
  fetchLiveFixtures,
  fetchFixturesByDate,
  fetchFixtureEvents,
  mapFixtureToMatch,
  mapEventToCommentary,
} from "./footballApi.js";

const LEAGUE = Number(process.env.FOOTBALL_SYNC_LEAGUE ?? 39);
const SEASON = Number(
  process.env.FOOTBALL_SYNC_SEASON ?? new Date().getFullYear()
);
const POLL_INTERVAL = Number(process.env.FOOTBALL_SYNC_INTERVAL ?? 30_000);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/**
 * Upsert a single fixture into the matches table.
 * Returns the inserted/updated row.
 */
async function upsertMatch(fixtureData) {
  const values = mapFixtureToMatch(fixtureData);

  // Try insert; on conflict (externalId) update live fields.
  const [row] = await db
    .insert(matches)
    .values(values)
    .onConflictDoUpdate({
      target: matches.externalId,
      set: {
        status: values.status,
        homeScore: values.homeScore,
        awayScore: values.awayScore,
        metadata: values.metadata,
      },
    })
    .returning();

  return row;
}

/**
 * Sync events (goals, cards, subs) for a live match.
 * Inserts only NEW events (by sequence) so we never duplicate.
 * Returns array of newly inserted commentary rows.
 */
async function syncEvents(matchId, fixtureId) {
  const events = await fetchFixtureEvents(fixtureId);
  if (!events?.length) return [];

  // Find the highest sequence already stored for this match
  const existing = await db
    .select({ sequence: commentary.sequence })
    .from(commentary)
    .where(eq(commentary.matchId, matchId))
    .orderBy(commentary.sequence);

  const maxSeq = existing.length ? existing[existing.length - 1].sequence : -1;

  // Events from the API are ordered by time; assign monotonic sequences
  const newEntries = [];
  for (let i = 0; i < events.length; i++) {
    if (i > maxSeq) {
      newEntries.push(mapEventToCommentary(matchId, events[i], i));
    }
  }

  if (!newEntries.length) return [];

  const inserted = await db
    .insert(commentary)
    .values(newEntries)
    .returning();

  return inserted;
}

// ─── Main service factory ─────────────────────────────────────────────────────

/**
 * @param {Object} opts
 * @param {Function} opts.broadcastMatchCreate – (match) => void
 * @param {Function} opts.broadcastCommentary  – (matchId, entry) => void
 */
export function createFootballSyncService({
  broadcastMatchCreate,
  broadcastCommentary,
}) {
  let timer = null;
  let isRunning = false;

  async function syncLiveMatches() {
    try {
      const fixtures = await fetchLiveFixtures(LEAGUE);

      if (!fixtures?.length) {
        console.log("[sync] No live fixtures at this moment.");
        return;
      }

      console.log(`[sync] ${fixtures.length} live fixture(s) found.`);

      for (const fixture of fixtures) {
        try {
          const isNew = !(await db
            .select({ id: matches.id })
            .from(matches)
            .where(eq(matches.externalId, String(fixture.fixture.id)))
            .then((r) => r[0]));

          const row = await upsertMatch(fixture);

          if (isNew) {
            console.log(`[sync] New match created: ${row.homeTeam} vs ${row.awayTeam}`);
            broadcastMatchCreate(row);
          }

          // Sync events and broadcast each new one
          const newCommentaries = await syncEvents(row.id, fixture.fixture.id);
          for (const entry of newCommentaries) {
            console.log(`[sync] New event (match ${row.id}): ${entry.message}`);
            broadcastCommentary(row.id, entry);
          }
        } catch (err) {
          console.error(`[sync] Error processing fixture ${fixture.fixture.id}:`, err);
        }
      }
    } catch (err) {
      console.error("[sync] Live sync failed:", err);
    }
  }

  async function syncTodaysSchedule() {
    try {
      const fixtures = await fetchFixturesByDate({
        date: todayISO(),
        league: LEAGUE,
        season: SEASON,
        status: "NS", // only "not started" — seed upcoming matches
      });

      if (!fixtures?.length) return;

      console.log(`[sync] Seeding ${fixtures.length} scheduled fixture(s) for today.`);

      for (const fixture of fixtures) {
        try {
          const existing = await db
            .select({ id: matches.id })
            .from(matches)
            .where(eq(matches.externalId, String(fixture.fixture.id)));

          if (existing.length) continue; // already in DB

          const row = await upsertMatch(fixture);
          console.log(`[sync] Scheduled match seeded: ${row.homeTeam} vs ${row.awayTeam}`);
          broadcastMatchCreate(row);
        } catch (err) {
          console.error(`[sync] Error seeding fixture ${fixture.fixture.id}:`, err);
        }
      }
    } catch (err) {
      console.error("[sync] Schedule seed failed:", err);
    }
  }

  async function tick() {
    if (!isRunning) return;
    await syncLiveMatches();
  }

  return {
    /**
     * Start the sync service.
     * Does an immediate schedule-seed then begins polling live matches.
     */
    async start() {
      if (isRunning) return;
      isRunning = true;

      console.log(
        `[sync] Starting football sync | league=${LEAGUE} season=${SEASON} interval=${POLL_INTERVAL}ms`
      );

      // Seed today's schedule immediately (once)
      await syncTodaysSchedule();

      // Then poll live matches on the interval
      timer = setInterval(tick, POLL_INTERVAL);
      timer.unref?.(); // don't block process exit
    },

    /** Stop polling. */
    stop() {
      isRunning = false;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      console.log("[sync] Football sync stopped.");
    },

    /** Manually trigger a single sync cycle (useful for testing). */
    syncNow: tick,
  };
}
