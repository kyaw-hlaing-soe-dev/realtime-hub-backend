/**
 * /football — Proxy routes for api-football.com v3
 *
 * Account
 *   GET /football/status
 *
 * Reference data
 *   GET /football/timezones
 *   GET /football/countries
 *   GET /football/seasons
 *
 * Leagues
 *   GET /football/leagues
 *
 * Teams
 *   GET /football/teams
 *   GET /football/teams/:id/statistics
 *   GET /football/teams/:id/seasons
 *   GET /football/teams/countries
 *
 * Venues
 *   GET /football/venues
 *
 * Standings
 *   GET /football/standings
 *
 * Fixtures
 *   GET /football/fixtures/live
 *   GET /football/fixtures/today
 *   GET /football/fixtures
 *   GET /football/fixtures/rounds
 *   GET /football/fixtures/:id
 *   GET /football/fixtures/:id/events
 *   GET /football/fixtures/:id/lineups
 *   GET /football/fixtures/:id/statistics
 *   GET /football/fixtures/:id/players
 *   GET /football/fixtures/h2h
 *
 * Players & People
 *   GET /football/players
 *   GET /football/players/top/scorers
 *   GET /football/players/top/assists
 *   GET /football/players/top/yellowcards
 *   GET /football/players/top/redcards
 *   GET /football/coaches
 *
 * Odds
 *   GET /football/odds/live
 *   GET /football/odds
 *
 * Misc
 *   GET /football/predictions/:fixtureId
 *   GET /football/injuries
 */

import { Router } from "express";
import {
  fetchStatus,
  fetchTimezones,
  fetchCountries,
  fetchSeasons,
  fetchLeagues,
  fetchTeams,
  fetchTeamStatistics,
  fetchTeamSeasons,
  fetchTeamCountries,
  fetchVenues,
  fetchStandings,
  fetchFixtures,
  fetchFixturesByDate,
  fetchLiveFixtures,
  fetchFixtureById,
  fetchRounds,
  fetchFixtureEvents,
  fetchFixtureLineups,
  fetchFixtureStatistics,
  fetchFixturePlayers,
  fetchHeadToHead,
  fetchInjuries,
  fetchPredictions,
  fetchCoaches,
  fetchPlayers,
  fetchTopScorers,
  fetchTopAssists,
  fetchTopYellowCards,
  fetchTopRedCards,
  fetchLiveOdds,
  fetchOdds,
} from "../services/footballApi.js";

const router = Router();

const LEAGUE = Number(process.env.FOOTBALL_SYNC_LEAGUE ?? 39);
const SEASON = Number(process.env.FOOTBALL_SYNC_SEASON ?? new Date().getFullYear());

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function intParam(val) {
  const n = Number(val);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function handleError(res, label, err) {
  console.error(`[/football/${label}]`, err.message);
  return res.status(502).json({ error: `Failed to fetch ${label}`, detail: err.message });
}

// ── Account ──────────────────────────────────────────────────────────────────

/** GET /football/status — quota & subscription info (doesn't count vs quota) */
router.get("/status", async (_req, res) => {
  try {
    return res.json(await fetchStatus());
  } catch (err) { return handleError(res, "status", err); }
});

// ── Reference data ───────────────────────────────────────────────────────────

/** GET /football/timezones */
router.get("/timezones", async (_req, res) => {
  try {
    return res.json(await fetchTimezones());
  } catch (err) { return handleError(res, "timezones", err); }
});

/** GET /football/countries?name=&code=&search= */
router.get("/countries", async (req, res) => {
  try {
    return res.json(await fetchCountries(req.query));
  } catch (err) { return handleError(res, "countries", err); }
});

/** GET /football/seasons */
router.get("/seasons", async (_req, res) => {
  try {
    return res.json(await fetchSeasons());
  } catch (err) { return handleError(res, "seasons", err); }
});

// ── Leagues ──────────────────────────────────────────────────────────────────

/**
 * GET /football/leagues
 * ?id= &name= &country= &code= &season= &team= &type= &current= &search= &last=
 */
router.get("/leagues", async (req, res) => {
  try {
    const params = { ...req.query };
    if (params.current !== undefined) params.current = params.current === "true";
    return res.json(await fetchLeagues(params));
  } catch (err) { return handleError(res, "leagues", err); }
});

// ── Teams ────────────────────────────────────────────────────────────────────

/**
 * GET /football/teams
 * ?id= &name= &league= &season= &country= &code= &venue= &search=
 */
router.get("/teams", async (req, res) => {
  try {
    return res.json(await fetchTeams(req.query));
  } catch (err) { return handleError(res, "teams", err); }
});

/** GET /football/teams/countries */
router.get("/teams/countries", async (_req, res) => {
  try {
    return res.json(await fetchTeamCountries());
  } catch (err) { return handleError(res, "teams/countries", err); }
});

/** GET /football/teams/:id/statistics?league=&season=&date= */
router.get("/teams/:id/statistics", async (req, res) => {
  const id = intParam(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid team id" });
  const { league = LEAGUE, season = SEASON, date } = req.query;
  try {
    const data = await fetchTeamStatistics(Number(league), Number(season), id, date);
    return res.json(data);
  } catch (err) { return handleError(res, "team statistics", err); }
});

/** GET /football/teams/:id/seasons */
router.get("/teams/:id/seasons", async (req, res) => {
  const id = intParam(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid team id" });
  try {
    return res.json(await fetchTeamSeasons(id));
  } catch (err) { return handleError(res, "team seasons", err); }
});

// ── Venues ───────────────────────────────────────────────────────────────────

/** GET /football/venues?id= &name= &city= &country= &search= */
router.get("/venues", async (req, res) => {
  try {
    return res.json(await fetchVenues(req.query));
  } catch (err) { return handleError(res, "venues", err); }
});

// ── Standings ────────────────────────────────────────────────────────────────

/** GET /football/standings?season=&league=&team= */
router.get("/standings", async (req, res) => {
  const { season = SEASON, league = LEAGUE, team } = req.query;
  try {
    return res.json(await fetchStandings(Number(season), Number(league), team ? Number(team) : undefined));
  } catch (err) { return handleError(res, "standings", err); }
});

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** GET /football/fixtures/live?leagues=39-61 */
router.get("/fixtures/live", async (req, res) => {
  try {
    const leagues = req.query.leagues
      ? req.query.leagues.split("-").map(Number)
      : LEAGUE;
    return res.json(await fetchLiveFixtures(leagues));
  } catch (err) { return handleError(res, "live fixtures", err); }
});

/** GET /football/fixtures/today?league=&season=&status= */
router.get("/fixtures/today", async (req, res) => {
  const { league = LEAGUE, season = SEASON, status, timezone } = req.query;
  try {
    return res.json(await fetchFixturesByDate({
      date: todayISO(),
      league: Number(league),
      season: Number(season),
      status,
      timezone,
    }));
  } catch (err) { return handleError(res, "today's fixtures", err); }
});

/** GET /football/fixtures/rounds?league=&season=&current=&dates=&timezone= */
router.get("/fixtures/rounds", async (req, res) => {
  const { league = LEAGUE, season = SEASON, current, dates, timezone } = req.query;
  try {
    return res.json(await fetchRounds(Number(league), Number(season), {
      current: current === "true" ? true : undefined,
      dates:   dates   === "true" ? true : undefined,
      timezone,
    }));
  } catch (err) { return handleError(res, "rounds", err); }
});

/** GET /football/fixtures/h2h?team1=&team2=&last=&league=&season= */
router.get("/fixtures/h2h", async (req, res) => {
  const { team1, team2, ...rest } = req.query;
  if (!team1 || !team2) return res.status(400).json({ error: "team1 and team2 are required" });
  try {
    return res.json(await fetchHeadToHead(Number(team1), Number(team2), rest));
  } catch (err) { return handleError(res, "head-to-head", err); }
});

/**
 * GET /football/fixtures
 * Pass any api-football fixtures params: ?league=&season=&date=&next=&last=&status=&team=&from=&to=
 */
router.get("/fixtures", async (req, res) => {
  try {
    return res.json(await fetchFixtures(req.query));
  } catch (err) { return handleError(res, "fixtures", err); }
});

/** GET /football/fixtures/:id */
router.get("/fixtures/:id", async (req, res) => {
  const id = intParam(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid fixture id" });
  try {
    const fixture = await fetchFixtureById(id);
    if (!fixture) return res.status(404).json({ error: "Fixture not found" });
    return res.json(fixture);
  } catch (err) { return handleError(res, "fixture", err); }
});

/** GET /football/fixtures/:id/events?team=&player=&type= */
router.get("/fixtures/:id/events", async (req, res) => {
  const id = intParam(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid fixture id" });
  try {
    return res.json(await fetchFixtureEvents(id, req.query));
  } catch (err) { return handleError(res, "fixture events", err); }
});

/** GET /football/fixtures/:id/lineups?team=&player=&type= */
router.get("/fixtures/:id/lineups", async (req, res) => {
  const id = intParam(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid fixture id" });
  try {
    return res.json(await fetchFixtureLineups(id, req.query));
  } catch (err) { return handleError(res, "fixture lineups", err); }
});

/** GET /football/fixtures/:id/statistics?team=&type=&half= */
router.get("/fixtures/:id/statistics", async (req, res) => {
  const id = intParam(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid fixture id" });
  const { team, type, half } = req.query;
  try {
    return res.json(await fetchFixtureStatistics(id, {
      team: team ? Number(team) : undefined,
      type,
      half: half === "true" ? true : undefined,
    }));
  } catch (err) { return handleError(res, "fixture statistics", err); }
});

/** GET /football/fixtures/:id/players?team= */
router.get("/fixtures/:id/players", async (req, res) => {
  const id = intParam(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid fixture id" });
  try {
    return res.json(await fetchFixturePlayers(id, req.query.team ? Number(req.query.team) : undefined));
  } catch (err) { return handleError(res, "fixture players", err); }
});

// ── Players & People ─────────────────────────────────────────────────────────

/**
 * GET /football/players?id=&team=&league=&season=&search=&page=
 */
router.get("/players", async (req, res) => {
  try {
    return res.json(await fetchPlayers(req.query));
  } catch (err) { return handleError(res, "players", err); }
});

/** GET /football/players/top/scorers?league=&season= */
router.get("/players/top/scorers", async (req, res) => {
  const { league = LEAGUE, season = SEASON } = req.query;
  try {
    return res.json(await fetchTopScorers(Number(league), Number(season)));
  } catch (err) { return handleError(res, "top scorers", err); }
});

/** GET /football/players/top/assists?league=&season= */
router.get("/players/top/assists", async (req, res) => {
  const { league = LEAGUE, season = SEASON } = req.query;
  try {
    return res.json(await fetchTopAssists(Number(league), Number(season)));
  } catch (err) { return handleError(res, "top assists", err); }
});

/** GET /football/players/top/yellowcards?league=&season= */
router.get("/players/top/yellowcards", async (req, res) => {
  const { league = LEAGUE, season = SEASON } = req.query;
  try {
    return res.json(await fetchTopYellowCards(Number(league), Number(season)));
  } catch (err) { return handleError(res, "top yellow cards", err); }
});

/** GET /football/players/top/redcards?league=&season= */
router.get("/players/top/redcards", async (req, res) => {
  const { league = LEAGUE, season = SEASON } = req.query;
  try {
    return res.json(await fetchTopRedCards(Number(league), Number(season)));
  } catch (err) { return handleError(res, "top red cards", err); }
});

/** GET /football/coaches?id=&team=&search= */
router.get("/coaches", async (req, res) => {
  try {
    return res.json(await fetchCoaches(req.query));
  } catch (err) { return handleError(res, "coaches", err); }
});

// ── Odds ─────────────────────────────────────────────────────────────────────

/** GET /football/odds/live?fixture=&league=&bet= */
router.get("/odds/live", async (req, res) => {
  try {
    return res.json(await fetchLiveOdds(req.query));
  } catch (err) { return handleError(res, "live odds", err); }
});

/** GET /football/odds?fixture=&league=&season=&date=&bookmaker=&bet= */
router.get("/odds", async (req, res) => {
  try {
    return res.json(await fetchOdds(req.query));
  } catch (err) { return handleError(res, "odds", err); }
});

// ── Predictions ───────────────────────────────────────────────────────────────

/** GET /football/predictions/:fixtureId */
router.get("/predictions/:fixtureId", async (req, res) => {
  const id = intParam(req.params.fixtureId);
  if (!id) return res.status(400).json({ error: "Invalid fixture id" });
  try {
    const data = await fetchPredictions(id);
    return res.json(data[0] ?? null);
  } catch (err) { return handleError(res, "predictions", err); }
});

// ── Injuries ──────────────────────────────────────────────────────────────────

/** GET /football/injuries?fixture=&league=&season=&team=&player=&date= */
router.get("/injuries", async (req, res) => {
  try {
    return res.json(await fetchInjuries(req.query));
  } catch (err) { return handleError(res, "injuries", err); }
});

export default router;
