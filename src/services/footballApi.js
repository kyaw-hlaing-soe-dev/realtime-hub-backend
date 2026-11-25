/**
 * Football API Service — wraps api-football.com (direct / API-Sports subscription).
 *
 * Docs:  https://www.api-football.com/documentation-v3
 * Base:  https://v3.football.api-sports.io
 * Auth:  x-apisports-key header (get your key from dashboard.api-football.com)
 *
 * Required env vars:
 *   FOOTBALL_API_KEY   – your api-football key (from dashboard.api-football.com)
 *
 * Optional overrides (rarely needed):
 *   FOOTBALL_API_BASE  – defaults to "https://v3.football.api-sports.io"
 */

const BASE_URL =
  process.env.FOOTBALL_API_BASE ?? "https://v3.football.api-sports.io";

// api-football.com direct subscription uses x-apisports-key.
// IMPORTANT: Do NOT send extra headers — the API will reject the request.
// Key is read lazily on each request so the server can boot without it set.
function getHeaders() {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) {
    throw new Error(
      "FOOTBALL_API_KEY is not set. Add it to your .env file — " +
        "get a free key at https://dashboard.api-football.com"
    );
  }
  return { "x-apisports-key": key };
}

// ─── Core fetch helper ────────────────────────────────────────────────────────

/**
 * Perform a GET request against the api-football v3 API.
 * @param {string} path   – e.g. "/fixtures"
 * @param {Record<string, string|number>} params – query string params
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
      `api-football error ${res.status} ${res.statusText} — ${url}`
    );
  }

  const json = await res.json();

  // The API returns errors as an object with keys even on 200 responses
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

// ─── Account / Status ─────────────────────────────────────────────────────────

/**
 * Check API quota / account status.
 * Useful for health-check endpoint.
 * @returns {{ account, subscription, requests }}
 */
export async function fetchAccountStatus() {
  const res = await fetch(`${BASE_URL}/status`, {
    method: "GET",
    headers: getHeaders(),
  });
  const json = await res.json();
  return json.response ?? null;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * Fetch fixtures (matches) filtered by date and optional league / season.
 *
 * @param {Object} opts
 * @param {string}  opts.date     – "YYYY-MM-DD"
 * @param {number}  [opts.league] – league id (e.g. 39 = Premier League)
 * @param {number}  [opts.season] – season year (e.g. 2024)
 * @param {string}  [opts.status] – "NS" | "1H" | "HT" | "2H" | "FT" | "LIVE"
 *
 * Common status codes:
 *   NS   = Not Started      1H  = First Half      HT = Half Time
 *   2H   = Second Half      ET  = Extra Time      P  = Penalty in Progress
 *   FT   = Full Time        AET = After Extra Time PEN = After Penalties
 *   SUSP = Suspended        CANC = Cancelled      ABD = Abandoned
 */
export async function fetchFixturesByDate({ date, league, season, status }) {
  return get("/fixtures", { date, league, season, status });
}

/**
 * Fetch a single fixture by its id (includes lineup, stats, events).
 * @param {number} fixtureId
 * @returns {Object|null}
 */
export async function fetchFixtureById(fixtureId) {
  const data = await get("/fixtures", { id: fixtureId });
  return data[0] ?? null;
}

/**
 * Fetch ALL currently live fixtures, optionally filtered by league.
 *
 * Uses the special `live=all` parameter.
 * To filter by league: live=39-140  (comma-separated league ids)
 *
 * @param {number|number[]} [leagues] – single league id or array of ids
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
 * Fetch fixtures for a league + season (useful for seeding a full schedule).
 * @param {number} league
 * @param {number} season
 * @param {string} [status] – optional status filter
 */
export async function fetchFixturesByLeague(league, season, status) {
  return get("/fixtures", { league, season, status });
}

// ─── Events (goal / card / substitution / VAR) ────────────────────────────────

/**
 * Fetch all in-match events for a fixture.
 *
 * @param {number}  fixtureId
 * @param {Object}  [filters]
 * @param {number}  [filters.team]   – filter by team id
 * @param {number}  [filters.player] – filter by player id
 * @param {string}  [filters.type]   – "Goal" | "Card" | "subst" | "Var"
 * @returns {Object[]}
 */
export async function fetchFixtureEvents(fixtureId, filters = {}) {
  return get("/fixtures/events", {
    fixture: fixtureId,
    ...filters,
  });
}

// ─── Statistics ───────────────────────────────────────────────────────────────

/**
 * Fetch team-level statistics for a fixture (possession, shots, passes …).
 * @param {number} fixtureId
 * @param {number} [teamId] – optional: only fetch stats for one team
 */
export async function fetchFixtureStatistics(fixtureId, teamId) {
  return get("/fixtures/statistics", {
    fixture: fixtureId,
    ...(teamId ? { team: teamId } : {}),
  });
}

// ─── Leagues ─────────────────────────────────────────────────────────────────

/**
 * Search leagues by name or country.
 * @param {Object} [opts]
 * @param {string} [opts.name]    – e.g. "Premier League"
 * @param {string} [opts.country] – e.g. "England"
 * @param {number} [opts.season]  – e.g. 2024
 * @param {boolean}[opts.current] – true = only leagues with an ongoing season
 */
export async function fetchLeagues({ name, country, season, current } = {}) {
  return get("/leagues", { name, country, season, current: current ? "true" : undefined });
}

// ─── Data mappers ─────────────────────────────────────────────────────────────

/** Map api-football status short codes → our DB enum values */
const STATUS_MAP = {
  NS:   "scheduled",
  "1H": "live",
  HT:   "live",
  "2H": "live",
  ET:   "live",
  BT:   "live",
  P:    "live",
  INT:  "live",
  LIVE: "live",
  FT:   "finished",
  AET:  "finished",
  PEN:  "finished",
  SUSP: "scheduled",
  CANC: "finished",
  ABD:  "finished",
  AWD:  "finished",
  WO:   "finished",
};

/**
 * Map a raw api-football fixture object → our DB `matches` row shape.
 *
 * @param {Object} fixture – one item from the fixtures `response` array
 * @returns {Object}       – matches the matches table columns
 */
export function mapFixtureToMatch(fixture) {
  const { fixture: f, teams, goals, league, score } = fixture;

  const startTime = new Date(f.date);
  // Approximate end: kickoff + 105 min (90 min play + ~15 min added time)
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
      leagueId: league.id,
      leagueName: league.name,
      leagueCountry: league.country,
      leagueLogo: league.logo,
      leagueSeason: league.season,
      round: league.round,
      venueId: f.venue?.id ?? null,
      venueName: f.venue?.name ?? null,
      venueCity: f.venue?.city ?? null,
      referee: f.referee ?? null,
      homeLogo: teams.home.logo,
      awayLogo: teams.away.logo,
      homeTeamId: teams.home.id,
      awayTeamId: teams.away.id,
      apiStatus: f.status.short,
      apiStatusLong: f.status.long,
      elapsed: f.status.elapsed ?? null,
      // Halftime / fulltime scores if available
      halftimeHome: score?.halftime?.home ?? null,
      halftimeAway: score?.halftime?.away ?? null,
      fulltimeHome: score?.fulltime?.home ?? null,
      fulltimeAway: score?.fulltime?.away ?? null,
    },
  };
}

/**
 * Map a raw api-football event → our DB `commentary` row shape.
 *
 * @param {number} matchId   – our internal DB match id
 * @param {Object} event     – one item from the fixtures/events `response` array
 * @param {number} sequence  – monotonic index (0-based, position in event list)
 * @returns {Object}         – matches the commentary table columns
 */
export function mapEventToCommentary(matchId, event, sequence) {
  const EVENT_TYPE_MAP = {
    Goal:  "goal",
    Card:  "card",
    subst: "substitution",
    Var:   "var",
  };

  const elapsed = event.time?.elapsed ?? null;
  const extra = event.time?.extra ?? null;

  // Determine period from elapsed time
  let period = null;
  if (elapsed !== null) {
    if (elapsed <= 45 || (elapsed === 45 && extra)) period = "1H";
    else if (elapsed <= 90 || (elapsed === 90 && extra)) period = "2H";
    else period = "ET";
  }

  return {
    matchId,
    minute: elapsed,
    sequence,
    period,
    eventType: EVENT_TYPE_MAP[event.type] ?? event.type?.toLowerCase() ?? "event",
    actor: event.player?.name ?? null,
    team: event.team?.name ?? null,
    message: buildEventMessage(event),
    metadata: {
      playerId: event.player?.id ?? null,
      assistPlayerId: event.assist?.id ?? null,
      assistPlayerName: event.assist?.name ?? null,
      teamId: event.team?.id ?? null,
      detail: event.detail ?? null,
      comments: event.comments ?? null,
      extra: extra,
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
  const extra = time?.extra;
  const minStr = elapsed !== null
    ? extra
      ? `${elapsed}+${extra}'`
      : `${elapsed}'`
    : "";

  const playerName = player?.name ?? "Unknown";
  const teamName = team?.name ?? "";

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
      if (detail === "Yellow Card") {
        return `🟨 ${minStr} Yellow card — ${playerName} (${teamName})`;
      }
      if (detail === "Red Card") {
        return `🟥 ${minStr} Red card — ${playerName} (${teamName})`;
      }
      if (detail === "Yellow-Red") {
        return `🟥 ${minStr} Second yellow / red card — ${playerName} (${teamName})`;
      }
      return `🟨 ${minStr} Card (${detail}) — ${playerName} (${teamName})`;
    }

    case "subst": {
      const off = playerName;
      const on = assist?.name ?? "?";
      return `🔄 ${minStr} Substitution — ${teamName}: ${on} replaces ${off}`;
    }

    case "Var": {
      return `📺 ${minStr} VAR: ${detail ?? "review"} — ${playerName} (${teamName})`;
    }

    default:
      return `${minStr} ${type}: ${detail ?? ""} — ${playerName} (${teamName})`.trim();
  }
}
