/**
 * /football  — proxy routes for direct football API queries.
 *
 * GET /football/today          – today's fixtures for the configured league
 * GET /football/live           – currently live fixtures
 * GET /football/fixture/:id    – single fixture details
 * GET /football/fixture/:id/events – events for a fixture
 */

import { Router } from "express";
import {
  fetchFixturesByDate,
  fetchLiveFixtures,
  fetchFixtureById,
  fetchFixtureEvents,
} from "../services/footballApi.js";

const router = Router();

const LEAGUE = Number(process.env.FOOTBALL_SYNC_LEAGUE ?? 39);
const SEASON = Number(
  process.env.FOOTBALL_SYNC_SEASON ?? new Date().getFullYear()
);

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

router.get("/today", async (_req, res) => {
  try {
    const fixtures = await fetchFixturesByDate({
      date: todayISO(),
      league: LEAGUE,
      season: SEASON,
    });
    return res.json(fixtures ?? []);
  } catch (err) {
    console.error("[/football/today]", err);
    return res.status(502).json({ error: "Failed to fetch today's fixtures" });
  }
});

router.get("/live", async (_req, res) => {
  try {
    const fixtures = await fetchLiveFixtures(LEAGUE);
    return res.json(fixtures ?? []);
  } catch (err) {
    console.error("[/football/live]", err);
    return res.status(502).json({ error: "Failed to fetch live fixtures" });
  }
});

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

router.get("/fixture/:id/events", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid fixture id" });
  }

  try {
    const events = await fetchFixtureEvents(id);
    return res.json(events ?? []);
  } catch (err) {
    console.error(`[/football/fixture/${id}/events]`, err);
    return res.status(502).json({ error: "Failed to fetch fixture events" });
  }
});

export default router;
