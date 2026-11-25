import { Router } from "express";
import { FOOTBALL_LEAGUE_ID } from "../config/football.js";
import { getFixturesForDate } from "../services/footballFixtures.js";

const router = Router();

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

router.get("/fixtures/today", async (req, res) => {
  try {
    const fixtures = await getFixturesForDate({
      date: todayISO(),
      league: req.query.league ?? FOOTBALL_LEAGUE_ID,
      season: req.query.season,
      status: req.query.status,
    });
    return res.json(fixtures);
  } catch (error) {
    return res.status(error.statusCode ?? 502).json({ error: error.message });
  }
});

export default router;
