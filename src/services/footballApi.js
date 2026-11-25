/**
 * api-football.com — Complete v3 API client
 *
 * Docs:  https://www.api-football.com/documentation-v3
 * Base:  https://v3.football.api-sports.io
 * Auth:  x-apisports-key  (get your free key at dashboard.api-football.com)
 *
 * ⚠️  IMPORTANT — header restriction:
 *   The API only allows the x-apisports-key header.
 *   Node's built-in fetch does NOT auto-inject extra headers, so we're safe.
 *   If you ever switch to axios/got, strip all default headers first.
 *
 * Required env var:
 *   FOOTBALL_API_KEY   – your api-football key
 *
 * Optional:
 *   FOOTBALL_API_BASE  – override base URL (default: https://v3.football.api-sports.io)
 */

const BASE_URL =
  process.env.FOOTBALL_API_BASE ?? "https://v3.football.api-sports.io";

/**
 * Returns the strict header object required by api-football.
 * Key is read lazily — server boots fine without it, only fails on first API call.
 */
function getHeaders() {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) {
    throw new Error(
      "FOOTBALL_API_KEY is not set. " +
        "Get a free key at https://dashboard.api-football.com and add it to .env"
    );
  }
  // Only this ONE header is allowed — do not add anything else.
  return { "x-apisports-key": key };
}

// ─── Core fetch helper ────────────────────────────────────────────────────────

/**
 * Perform a GET request against the api-football v3 API.
 * @param {string} path   – e.g. "/fixtures"
 * @param {Record<string, string|number|boolean>} params – query string params
 * @returns {Promise<any[]>} the `response` array from the API
 */
async function get(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });

  if (!res.ok) {
    throw new Error(
      `api-football ${res.status} ${res.statusText} — ${url.pathname}${url.search}`
    );
  }

  const json = await res.json();

  // API returns errors as an object even on HTTP 200
  if (json.errors) {
    const errorValues = Array.isArray(json.errors)
      ? json.errors
      : Object.values(json.errors);
    if (errorValues.length > 0) {
      throw new Error(`api-football error: ${errorValues.join(", ")}`);
    }
  }

  return json.response ?? [];
}

// ─── Status ───────────────────────────────────────────────────────────────────

/**
 * Check account quota and subscription details.
 * ✅ This call does NOT count against your daily quota.
 *
 * @returns {{ account, subscription, requests }}
 */
export async function fetchStatus() {
  const res = await fetch(`${BASE_URL}/status`, {
    method: "GET",
    headers: getHeaders(),
  });
  const json = await res.json();
  return json.response ?? null;
}

// ─── Timezone ─────────────────────────────────────────────────────────────────

/**
 * Get all available timezone strings (for use with fixtures timezone param).
 * Recommended: 1 call when needed.
 * @returns {string[]}
 */
export async function fetchTimezones() {
  return get("/timezone");
}

// ─── Countries ────────────────────────────────────────────────────────────────

/**
 * Get available countries for the leagues endpoint.
 * Recommended: 1 call per day.
 *
 * @param {Object} [params]
 * @param {string} [params.name]   – country name e.g. "England"
 * @param {string} [params.code]   – alpha code e.g. "GB-ENG", "FR"
 * @param {string} [params.search] – partial name (min 3 chars)
 */
export async function fetchCountries({ name, code, search } = {}) {
  return get("/countries", { name, code, search });
}

// ─── Leagues ─────────────────────────────────────────────────────────────────

/**
 * Get leagues and cups.
 * Recommended: 1 call per hour.
 *
 * @param {Object} [params]
 * @param {number}  [params.id]      – league id
 * @param {string}  [params.name]    – league name
 * @param {string}  [params.country] – country name
 * @param {string}  [params.code]    – country code e.g. "GB"
 * @param {number}  [params.season]  – season year e.g. 2024
 * @param {number}  [params.team]    – team id
 * @param {string}  [params.type]    – "league" | "cup"
 * @param {boolean} [params.current] – true = active seasons only
 * @param {string}  [params.search]  – name or country (min 3 chars)
 * @param {number}  [params.last]    – last X leagues added (max 2 digits)
 */
export async function fetchLeagues(params = {}) {
  return get("/leagues", {
    ...params,
    current: params.current !== undefined ? String(params.current) : undefined,
  });
}

/**
 * Get all available seasons (4-digit year keys).
 * Recommended: 1 call per day.
 * @returns {number[]}
 */
export async function fetchSeasons() {
  return get("/leagues/seasons");
}

// ─── Teams ────────────────────────────────────────────────────────────────────

/**
 * Get teams information. Requires at least one parameter.
 * Recommended: 1 call per day.
 *
 * @param {Object} params
 * @param {number}  [params.id]      – team id
 * @param {string}  [params.name]    – team name
 * @param {number}  [params.league]  – league id
 * @param {number}  [params.season]  – season year
 * @param {string}  [params.country] – country name
 * @param {string}  [params.code]    – 3-char team code e.g. "MCI"
 * @param {number}  [params.venue]   – venue id
 * @param {string}  [params.search]  – name or country (min 3 chars)
 */
export async function fetchTeams(params) {
  return get("/teams", params);
}

/**
 * Get team statistics for a league and season.
 * Recommended: 1 call per day (or per match day).
 *
 * @param {number} league
 * @param {number} season
 * @param {number} team
 * @param {string} [date]  – "YYYY-MM-DD" limit date
 */
export async function fetchTeamStatistics(league, season, team, date) {
  return get("/teams/statistics", { league, season, team, date });
}

/**
 * Get seasons available for a team.
 * @param {number} team
 */
export async function fetchTeamSeasons(team) {
  return get("/teams/seasons", { team });
}

/**
 * Get countries available for the teams endpoint.
 */
export async function fetchTeamCountries() {
  return get("/teams/countries");
}

// ─── Venues ───────────────────────────────────────────────────────────────────

/**
 * Get venues. Requires at least one parameter.
 * Recommended: 1 call per day.
 *
 * @param {Object} params
 * @param {number}  [params.id]      – venue id
 * @param {string}  [params.name]    – venue name
 * @param {string}  [params.city]    – city name
 * @param {string}  [params.country] – country name
 * @param {string}  [params.search]  – name, city, or country (min 3 chars)
 */
export async function fetchVenues(params) {
  return get("/venues", params);
}

// ─── Standings ────────────────────────────────────────────────────────────────

/**
 * Get league standings / table.
 * Recommended: 1 call per hour (live), 1 call per day (otherwise).
 *
 * @param {number} season           – required
 * @param {number} [league]
 * @param {number} [team]
 */
export async function fetchStandings(season, league, team) {
  return get("/standings", { season, league, team });
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * Fixture status codes:
 * Scheduled : TBD NS
 * In Play   : 1H HT 2H ET BT P SUSP INT LIVE
 * Finished  : FT AET PEN
 * Other     : PST CANC ABD AWD WO
 *
 * Update frequency: every 15 seconds.
 * Recommended: 1 call per minute (live), 1 call per day (otherwise).
 */

/**
 * Get fixtures by any combination of filters.
 *
 * @param {Object} params
 * @param {number}   [params.id]       – single fixture id (returns events, lineups, stats)
 * @param {string}   [params.ids]      – "id-id-id" multiple ids (max 20)
 * @param {string}   [params.live]     – "all" | "39-61" (league ids, hyphen-separated)
 * @param {string}   [params.date]     – "YYYY-MM-DD"
 * @param {number}   [params.league]   – league id
 * @param {number}   [params.season]   – season year
 * @param {number}   [params.team]     – team id
 * @param {number}   [params.last]     – last X fixtures (max 2 digits)
 * @param {number}   [params.next]     – next X fixtures (max 2 digits)
 * @param {string}   [params.from]     – "YYYY-MM-DD"
 * @param {string}   [params.to]       – "YYYY-MM-DD"
 * @param {string}   [params.round]    – round name e.g. "Regular Season - 1"
 * @param {string}   [params.status]   – "NS" | "NS-PST-FT" (hyphen-separated)
 * @param {number}   [params.venue]    – venue id
 * @param {string}   [params.timezone] – IANA timezone string
 */
export async function fetchFixtures(params) {
  return get("/fixtures", params);
}

/**
 * Get fixtures for a specific date and league.
 * @param {Object} opts
 * @param {string}  opts.date     – "YYYY-MM-DD"
 * @param {number}  [opts.league]
 * @param {number}  [opts.season]
 * @param {string}  [opts.status] – filter by status e.g. "NS"
 * @param {string}  [opts.timezone]
 */
export async function fetchFixturesByDate({ date, league, season, status, timezone }) {
  return get("/fixtures", { date, league, season, status, timezone });
}

/**
 * Get a single fixture by id (includes events, lineups, stats, players).
 * @param {number} id
 */
export async function fetchFixtureById(id) {
  const data = await get("/fixtures", { id });
  return data[0] ?? null;
}

/**
 * Get all currently live fixtures.
 * @param {number|number[]} [leagues] – single id, array of ids, or omit for all
 */
export async function fetchLiveFixtures(leagues) {
  const live = leagues
    ? Array.isArray(leagues)
      ? leagues.join("-")
      : String(leagues)
    : "all";
  return get("/fixtures", { live });
}

/**
 * Fetch next X upcoming fixtures for a league/team.
 * @param {number} next        – number of fixtures (max 99)
 * @param {Object} [filters]
 * @param {number} [filters.league]
 * @param {number} [filters.team]
 * @param {string} [filters.timezone]
 */
export async function fetchNextFixtures(next, filters = {}) {
  return get("/fixtures", { next, ...filters });
}

/**
 * Get fixtures from / to date range.
 * @param {string} from       – "YYYY-MM-DD"
 * @param {string} to         – "YYYY-MM-DD"
 * @param {Object} [filters]
 * @param {number} [filters.league]
 * @param {number} [filters.season]
 * @param {number} [filters.team]
 * @param {string} [filters.timezone]
 */
export async function fetchFixturesByRange(from, to, filters = {}) {
  return get("/fixtures", { from, to, ...filters });
}

// ─── Fixture rounds ───────────────────────────────────────────────────────────

/**
 * Get rounds for a league/season.
 * Recommended: 1 call per day.
 *
 * @param {number}  league
 * @param {number}  season
 * @param {boolean} [current] – return only current round
 * @param {boolean} [dates]   – include dates of each round
 * @param {string}  [timezone]
 */
export async function fetchRounds(league, season, { current, dates, timezone } = {}) {
  return get("/fixtures/rounds", { league, season, current, dates, timezone });
}

// ─── Head to Head ─────────────────────────────────────────────────────────────

/**
 * Get head-to-head history between two teams.
 * Update frequency: every 15 seconds.
 * Recommended: 1 call per minute (live), 1 call per day (otherwise).
 *
 * @param {number}  team1
 * @param {number}  team2
 * @param {Object}  [filters]
 * @param {number}  [filters.last]
 * @param {number}  [filters.next]
 * @param {string}  [filters.date]     – "YYYY-MM-DD"
 * @param {number}  [filters.league]
 * @param {number}  [filters.season]
 * @param {string}  [filters.from]
 * @param {string}  [filters.to]
 * @param {string}  [filters.status]
 * @param {number}  [filters.venue]
 * @param {string}  [filters.timezone]
 */
export async function fetchHeadToHead(team1, team2, filters = {}) {
  return get("/fixtures/headtohead", { h2h: `${team1}-${team2}`, ...filters });
}

// ─── Fixture statistics ───────────────────────────────────────────────────────

/**
 * Get team-level statistics for a fixture (possession, shots, passes…).
 * Update frequency: every minute.
 *
 * @param {number} fixture
 * @param {number} [team]    – filter to one team
 * @param {string} [type]    – e.g. "Total Shots"
 * @param {boolean}[half]    – include halftime stats (data from 2024 season)
 */
export async function fetchFixtureStatistics(fixture, { team, type, half } = {}) {
  return get("/fixtures/statistics", { fixture, team, type, half });
}

// ─── Fixture events ───────────────────────────────────────────────────────────

/**
 * Get all in-match events for a fixture (goals, cards, subs, VAR).
 * Update frequency: every 15 seconds.
 *
 * Event types:  Goal | Card | subst | Var
 * Goal details: Normal Goal | Own Goal | Penalty | Missed Penalty
 * Card details: Yellow Card | Red Card | Yellow-Red
 * VAR details:  Goal cancelled | Penalty confirmed
 *
 * @param {number} fixture
 * @param {Object} [filters]
 * @param {number} [filters.team]   – filter by team id
 * @param {number} [filters.player] – filter by player id
 * @param {string} [filters.type]   – "Goal" | "Card" | "subst" | "Var"
 */
export async function fetchFixtureEvents(fixture, filters = {}) {
  return get("/fixtures/events", { fixture, ...filters });
}

// ─── Fixture lineups ──────────────────────────────────────────────────────────

/**
 * Get lineups for a fixture (available 20-40 min before kick-off).
 * Update frequency: every 15 minutes.
 *
 * @param {number} fixture
 * @param {number} [team]
 * @param {number} [player]
 * @param {string} [type]   – "startXI" | "substitutes"
 */
export async function fetchFixtureLineups(fixture, { team, player, type } = {}) {
  return get("/fixtures/lineups", { fixture, team, player, type });
}

// ─── Fixture player statistics ────────────────────────────────────────────────

/**
 * Get player statistics for a fixture.
 * Update frequency: every minute.
 *
 * @param {number} fixture
 * @param {number} [team]
 */
export async function fetchFixturePlayers(fixture, team) {
  return get("/fixtures/players", { fixture, team });
}

// ─── Injuries ─────────────────────────────────────────────────────────────────

/**
 * Get injured / suspended players for a fixture or league.
 * Update frequency: every 4 hours.
 * Recommended: 1 call per day.
 *
 * @param {Object} params
 * @param {number}  [params.league]
 * @param {number}  [params.season]   – required with league/team/player
 * @param {number}  [params.fixture]
 * @param {number}  [params.team]
 * @param {number}  [params.player]
 * @param {string}  [params.date]     – "YYYY-MM-DD"
 * @param {string}  [params.ids]      – "id-id-id" (max 20)
 * @param {string}  [params.timezone]
 */
export async function fetchInjuries(params) {
  return get("/injuries", params);
}

// ─── Predictions ─────────────────────────────────────────────────────────────

/**
 * Get match predictions for a fixture.
 * Includes win probability, under/over, advice, and comparative team stats.
 * Update frequency: every hour.
 *
 * @param {number} fixture
 */
export async function fetchPredictions(fixture) {
  return get("/predictions", { fixture });
}

// ─── Coaches ─────────────────────────────────────────────────────────────────

/**
 * Get coach information and career history.
 * Recommended: 1 call per day.
 *
 * @param {Object} params
 * @param {number}  [params.id]     – coach id
 * @param {number}  [params.team]   – team id
 * @param {string}  [params.search] – coach name (min 3 chars)
 */
export async function fetchCoaches(params) {
  return get("/coachs", params);
}

// ─── Players ─────────────────────────────────────────────────────────────────

/**
 * Get all available seasons for player statistics.
 * Recommended: 1 call per day.
 * @param {number} [player] – get seasons for a specific player
 */
export async function fetchPlayerSeasons(player) {
  return get("/players/seasons", { player });
}

/**
 * Get all available player profiles (250 per page).
 * Recommended: 1 call per week.
 *
 * @param {Object} [params]
 * @param {number}  [params.player] – player id
 * @param {string}  [params.search] – last name (min 4 chars)
 * @param {number}  [params.page]   – pagination (default 1)
 */
export async function fetchPlayerProfiles(params = {}) {
  return get("/players/profiles", params);
}

/**
 * Get player statistics for a league/team/season.
 * 20 results per page.
 * Recommended: 1 call per day.
 *
 * @param {Object} params
 * @param {number}  [params.id]      – player id
 * @param {number}  [params.team]    – team id
 * @param {number}  [params.league]  – league id
 * @param {number}  [params.season]  – season year (required with id/league/team)
 * @param {string}  [params.search]  – player name (min 4 chars; requires league or team)
 * @param {number}  [params.page]    – pagination
 */
export async function fetchPlayers(params) {
  return get("/players", params);
}

/**
 * Get squad (current players) of a team, or teams for a player.
 * Recommended: 1 call per week.
 *
 * @param {Object} params – { team } or { player }
 */
export async function fetchSquads(params) {
  return get("/players/squads", params);
}

/**
 * Get teams and seasons a player appeared in during their career.
 * @param {number} player
 */
export async function fetchPlayerTeams(player) {
  return get("/players/teams", { player });
}

/**
 * Get top 20 scorers for a league/season.
 * @param {number} league
 * @param {number} season
 */
export async function fetchTopScorers(league, season) {
  return get("/players/topscorers", { league, season });
}

/**
 * Get top 20 assist providers for a league/season.
 * @param {number} league
 * @param {number} season
 */
export async function fetchTopAssists(league, season) {
  return get("/players/topassists", { league, season });
}

/**
 * Get top 20 players by yellow cards for a league/season.
 * @param {number} league
 * @param {number} season
 */
export async function fetchTopYellowCards(league, season) {
  return get("/players/topyellowcards", { league, season });
}

/**
 * Get top 20 players by red cards for a league/season.
 * @param {number} league
 * @param {number} season
 */
export async function fetchTopRedCards(league, season) {
  return get("/players/topredcards", { league, season });
}

// ─── Transfers ────────────────────────────────────────────────────────────────

/**
 * Get transfer history for a player or team.
 * Recommended: 1 call per day.
 *
 * @param {Object} params – { player } or { team }
 */
export async function fetchTransfers(params) {
  return get("/transfers", params);
}

// ─── Trophies ─────────────────────────────────────────────────────────────────

/**
 * Get trophies for players or coaches.
 * Recommended: 1 call per day.
 *
 * @param {Object} params
 * @param {number}  [params.player]  – single player id
 * @param {string}  [params.players] – "id-id-id" (max 20)
 * @param {number}  [params.coach]   – single coach id
 * @param {string}  [params.coachs]  – "id-id-id" (max 20)
 */
export async function fetchTrophies(params) {
  return get("/trophies", params);
}

// ─── Sidelined ────────────────────────────────────────────────────────────────

/**
 * Get sidelined history for players or coaches.
 * Recommended: 1 call per day.
 *
 * @param {Object} params
 * @param {number}  [params.player]  – single player id
 * @param {string}  [params.players] – "id-id-id" (max 20)
 * @param {number}  [params.coach]   – single coach id
 * @param {string}  [params.coachs]  – "id-id-id" (max 20)
 */
export async function fetchSidelined(params) {
  return get("/sidelined", params);
}

// ─── Odds (In-Play) ───────────────────────────────────────────────────────────

/**
 * Get in-play odds for live fixtures.
 * Fixtures appear 5-15 min before kick-off and are removed ~5-20 min after FT.
 * Update frequency: every 5 seconds.
 *
 * @param {Object} [params]
 * @param {number}  [params.fixture]
 * @param {number}  [params.league]
 * @param {number}  [params.bet]     – bet id from /odds/live/bets
 */
export async function fetchLiveOdds(params = {}) {
  return get("/odds/live", params);
}

/**
 * Get available bet types for in-play odds.
 * Update frequency: every 60 seconds.
 *
 * @param {Object} [params]
 * @param {string}  [params.id]     – bet id
 * @param {string}  [params.search] – bet name (min 3 chars)
 */
export async function fetchLiveBets(params = {}) {
  return get("/odds/live/bets", params);
}

// ─── Odds (Pre-Match) ─────────────────────────────────────────────────────────

/**
 * Get pre-match odds (available 1-14 days before fixture, 7-day history).
 * 10 results per page. Update frequency: every 3 hours.
 *
 * @param {Object} params
 * @param {number}  [params.fixture]
 * @param {number}  [params.league]
 * @param {number}  [params.season]
 * @param {string}  [params.date]       – "YYYY-MM-DD"
 * @param {string}  [params.timezone]
 * @param {number}  [params.page]
 * @param {number}  [params.bookmaker]  – bookmaker id
 * @param {number}  [params.bet]        – bet id from /odds/bets
 */
export async function fetchOdds(params) {
  return get("/odds", params);
}

/**
 * Get fixture ids available in the odds endpoint.
 * 100 results per page. Recommended: 1 call per day.
 * @param {number} [page]
 */
export async function fetchOddsMapping(page) {
  return get("/odds/mapping", { page });
}

/**
 * Get available bookmakers.
 * @param {Object} [params]
 * @param {number}  [params.id]
 * @param {string}  [params.search] – min 3 chars
 */
export async function fetchBookmakers(params = {}) {
  return get("/odds/bookmakers", params);
}

/**
 * Get available pre-match bet types.
 * @param {Object} [params]
 * @param {string}  [params.id]
 * @param {string}  [params.search] – min 3 chars
 */
export async function fetchBets(params = {}) {
  return get("/odds/bets", params);
}

// ─── Data Mappers ─────────────────────────────────────────────────────────────

/** Map api-football status short codes → our DB enum values */
const STATUS_MAP = {
  TBD:  "scheduled",
  NS:   "scheduled",
  "1H": "live",
  HT:   "live",
  "2H": "live",
  ET:   "live",
  BT:   "live",
  P:    "live",
  SUSP: "live",
  INT:  "live",
  LIVE: "live",
  FT:   "finished",
  AET:  "finished",
  PEN:  "finished",
  PST:  "scheduled",
  CANC: "finished",
  ABD:  "finished",
  AWD:  "finished",
  WO:   "finished",
};

/**
 * Map a raw api-football fixture object → our DB `matches` row shape.
 * @param {Object} fixture – one item from fixtures `response` array
 */
export function mapFixtureToMatch(fixture) {
  const { fixture: f, teams, goals, league, score } = fixture;

  const startTime = new Date(f.date);
  // Approximate end: kickoff + 105 min (90 min + ~15 min stoppage)
  const endTime = new Date(startTime.getTime() + 105 * 60 * 1000);

  return {
    externalId: String(f.id),
    sport: "football",
    homeTeam: teams.home.name,
    awayTeam: teams.away.name,
    status: STATUS_MAP[f.status.short] ?? "scheduled",
    startTime,
    endTime,
    homeScore: goals?.home ?? 0,
    awayScore: goals?.away ?? 0,
    metadata: {
      leagueId:        league.id,
      leagueName:      league.name,
      leagueCountry:   league.country,
      leagueLogo:      league.logo,
      leagueSeason:    league.season,
      round:           league.round,
      venueId:         f.venue?.id    ?? null,
      venueName:       f.venue?.name  ?? null,
      venueCity:       f.venue?.city  ?? null,
      referee:         f.referee      ?? null,
      homeTeamId:      teams.home.id,
      homeLogo:        teams.home.logo,
      awayTeamId:      teams.away.id,
      awayLogo:        teams.away.logo,
      apiStatus:       f.status.short,
      apiStatusLong:   f.status.long,
      elapsed:         f.status.elapsed ?? null,
      // Score breakdown
      halftimeHome:    score?.halftime?.home  ?? null,
      halftimeAway:    score?.halftime?.away  ?? null,
      fulltimeHome:    score?.fulltime?.home  ?? null,
      fulltimeAway:    score?.fulltime?.away  ?? null,
      extratimeHome:   score?.extratime?.home ?? null,
      extratimeAway:   score?.extratime?.away ?? null,
      penaltyHome:     score?.penalty?.home   ?? null,
      penaltyAway:     score?.penalty?.away   ?? null,
    },
  };
}

/**
 * Map a raw api-football event → our DB `commentary` row shape.
 * @param {number} matchId   – our internal DB match id
 * @param {Object} event     – one item from fixtures/events `response` array
 * @param {number} sequence  – monotonic index (0-based, position in event list)
 */
export function mapEventToCommentary(matchId, event, sequence) {
  const EVENT_TYPE_MAP = {
    Goal:  "goal",
    Card:  "card",
    subst: "substitution",
    Var:   "var",
  };

  const elapsed = event.time?.elapsed ?? null;
  const extra   = event.time?.extra   ?? null;

  let period = null;
  if (elapsed !== null) {
    if (elapsed <= 45)  period = "1H";
    else if (elapsed <= 90) period = "2H";
    else period = "ET";
  }

  return {
    matchId,
    minute:    elapsed,
    sequence,
    period,
    eventType: EVENT_TYPE_MAP[event.type] ?? event.type?.toLowerCase() ?? "event",
    actor:     event.player?.name ?? null,
    team:      event.team?.name   ?? null,
    message:   buildEventMessage(event),
    metadata: {
      playerId:         event.player?.id    ?? null,
      assistPlayerId:   event.assist?.id    ?? null,
      assistPlayerName: event.assist?.name  ?? null,
      teamId:           event.team?.id      ?? null,
      detail:           event.detail        ?? null,
      comments:         event.comments      ?? null,
      extraTime:        extra,
    },
    tags: [
      event.type?.toLowerCase(),
      event.detail?.toLowerCase().replace(/\s+/g, "_"),
    ].filter(Boolean),
  };
}

// ─── Message builder ──────────────────────────────────────────────────────────

function buildEventMessage(event) {
  const { type, detail, player, assist, team, time } = event;

  const elapsed = time?.elapsed ?? null;
  const extra   = time?.extra   ?? null;
  const minStr  = elapsed !== null
    ? extra ? `${elapsed}+${extra}'` : `${elapsed}'`
    : "";

  const playerName = player?.name ?? "Unknown";
  const teamName   = team?.name   ?? "";

  switch (type) {
    case "Goal": {
      if (detail === "Own Goal") {
        return `⚽ ${minStr} OWN GOAL by ${playerName} (${teamName})`;
      }
      if (detail === "Penalty") {
        return `⚽ ${minStr} PENALTY GOAL! ${playerName} scores for ${teamName}`;
      }
      if (detail === "Missed Penalty") {
        return `❌ ${minStr} Penalty MISSED by ${playerName} (${teamName})`;
      }
      const assistStr = assist?.name ? ` (assist: ${assist.name})` : "";
      return `⚽ ${minStr} GOAL! ${playerName} scores for ${teamName}${assistStr}`;
    }

    case "Card": {
      const icon =
        detail === "Yellow Card"  ? "🟨" :
        detail === "Red Card"     ? "🟥" :
        detail === "Yellow-Red"   ? "🟥" : "🟨";
      const label =
        detail === "Yellow-Red" ? "Second yellow / Red card" : detail;
      return `${icon} ${minStr} ${label} — ${playerName} (${teamName})`;
    }

    case "subst": {
      const on  = assist?.name ?? "?";
      const off = playerName;
      return `🔄 ${minStr} Substitution — ${teamName}: ${on} ▶ replaces ◀ ${off}`;
    }

    case "Var": {
      return `📺 ${minStr} VAR: ${detail ?? "review"} — ${playerName} (${teamName})`;
    }

    default:
      return `${minStr} ${type}: ${detail ?? ""} — ${playerName} (${teamName})`.trim();
  }
}

// ─── Media URL helpers ────────────────────────────────────────────────────────
// Calls to these URLs do NOT count towards your daily quota.

export const media = {
  /** League/cup logo PNG */
  leagueLogo:  (leagueId)  => `https://media.api-sports.io/football/leagues/${leagueId}.png`,
  /** Team logo PNG */
  teamLogo:    (teamId)    => `https://media.api-sports.io/football/teams/${teamId}.png`,
  /** Player photo PNG */
  playerPhoto: (playerId)  => `https://media.api-sports.io/football/players/${playerId}.png`,
  /** Coach photo PNG */
  coachPhoto:  (coachId)   => `https://media.api-sports.io/football/coachs/${coachId}.png`,
  /** Venue image PNG */
  venueImage:  (venueId)   => `https://media.api-sports.io/football/venues/${venueId}.png`,
  /** Country flag SVG */
  countryFlag: (countryCode) => `https://media.api-sports.io/flags/${countryCode}.svg`,
};
