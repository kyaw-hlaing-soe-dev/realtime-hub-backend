/**
 * /football — proxy routes for direct api-football.com queries.
 *
 * GET /football/status               – account quota / subscription info
 * GET /football/leagues              – search leagues (?name=&country=&season=)
 * GET /football/today                – today's fixtures for the configured league
 * GET /football/live                 – currently live fixtures
 * GET /football/fixture/:id          – single fixture with full details
 * GET /football/fixture/:id/events   – goals, cards, subs for a fixture
 * GET /football/fixture/:id/stats    – team statistics for a fixture
 */

import { Router } from "express";
import {
  fetchAccountStatus,
  fetchLeagues,
  fetchFixturesByDate,
  fetchLiveFixtures,
  fetchFixtureById,
  fetchFixtureEvents,
  fetchFixtureStatistics,
} from "../services/footballApi.js";

const router = Router();

const LEAGUE = Number(process.env.FOOTBALL_SYNC_LEAGUE ?? 39);
const SEASON = Number(
  process.env.FOOTBALL_SYNC_SEASON ?? new Date().getFullYear()
);

function todayISO() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// ── Account status ──────────────────────────────────────────────────────────
router.get("/status", async (_req, res) => {
  try {
    const status = await fetchAccountStatus();
    return res.json(status);
  } catch (err) {
    console.error("[/football/status]", err);
    return res.status(502).json({ error: "Failed to fetch account status" });
  }
});

// ── Leagues search ──────────────────────────────────────────────────────────
router.get("/leagues", async (req, res) => {
  const { name, country, season, current } = req.query;
  try {
    const leagues = await fetchLeagues({ name, country, season, current: current === "true" });
    return res.json(leagues);
  } catch (err) {
    console.error("[/football/leagues]", err);
    return res.status(502).json({ error: "Failed to fetch leagues" });
  }
});

// ── Today's fixtures ────────────────────────────────────────────────────────
router.get("/today", async (_req, res) => {
  try {
    const fixtures = await fetchFixturesByDate({
      date: todayISO(),
      league: LEAGUE,
      season: SEASON,
    });
    return res.json(fixtures);
  } catch (err) {
    console.error("[/football/today]", err);
    return res.status(502).json({ error: "Failed to fetch today's fixtures" });
  }
});

// ── Live fixtures ───────────────────────────────────────────────────────────
router.get("/live", async (_req, res) => {
  try {
    const fixtures = await fetchLiveFixtures(LEAGUE);
    return res.json(fixtures);
  } catch (err) {
    console.error("[/football/live]", err);
    return res.status(502).json({ error: "Failed to fetch live fixtures" });
  }
});

// ── Single fixture ──────────────────────────────────────────────────────────
router.get("/fixture/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid fixture id" });
  }
  try {
    const fixture = await fetchFixtureById(id);
    if (!fixture) return res.status(404).json({ error: "Fixture not found" });
    return res.json(fixture);
  } catch (err) {
    console.error(`[/football/fixture/${id}]`, err);
    return res.status(502).json({ error: "Failed to fetch fixture" });
  }
});

// ── Fixture events (goals / cards / subs / VAR) ─────────────────────────────
router.get("/fixture/:id/events", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid fixture id" });
  }
  try {
    const events = await fetchFixtureEvents(id);
    return res.json(events);
  } catch (err) {
    console.error(`[/football/fixture/${id}/events]`, err);
    return res.status(502).json({ error: "Failed to fetch fixture events" });
  }
});

// ── Fixture statistics ──────────────────────────────────────────────────────
router.get("/fixture/:id/stats", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid fixture id" });
  }
  try {
    const stats = await fetchFixtureStatistics(id);
    return res.json(stats);
  } catch (err) {
    console.error(`[/football/fixture/${id}/stats]`, err);
    return res.status(502).json({ error: "Failed to fetch fixture statistics" });
  }
});

export default router;
