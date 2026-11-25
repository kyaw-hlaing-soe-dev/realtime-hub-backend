/**
 * Football API Service — wraps api-football.com (RapidAPI) calls.
 *
 * Required env vars:
 *   FOOTBALL_API_KEY   – your api-football / RapidAPI key
 *   FOOTBALL_API_HOST  – defaults to "api-football-v1.p.rapidapi.com"
 *   FOOTBALL_API_BASE  – defaults to "https://api-football-v1.p.rapidapi.com/v3"
 */

const BASE_URL =
  process.env.FOOTBALL_API_BASE ?? "https://api-football-v1.p.rapidapi.com/v3";
const HOST =
  process.env.FOOTBALL_API_HOST ?? "api-football-v1.p.rapidapi.com";
const API_KEY = process.env.FOOTBALL_API_KEY;

if (!API_KEY) {
  throw new Error("FOOTBALL_API_KEY environment variable is missing.");
}

const DEFAULT_HEADERS = {
  "x-rapidapi-key": API_KEY,
  "x-rapidapi-host": HOST,
};

/**
 * Generic GET helper with error surfacing.
 * @param {string} path   – e.g. "/fixtures"
 * @param {Record<string,string|number>} params – query params
 */
async function get(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), { headers: DEFAULT_HEADERS });

  if (!res.ok) {
    throw new Error(
      `Football API error: ${res.status} ${res.statusText} — ${url}`
    );
  }

  const json = await res.json();

  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`Football API error: ${JSON.stringify(json.errors)}`);
  }

  return json.response;
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

/**
 * Fetch fixtures (matches) for a given date and optional league / season.
 * @param {Object} opts
 * @param {string} opts.date       – "YYYY-MM-DD"
 * @param {number} [opts.league]   – league id (e.g. 39 = Premier League)
 * @param {number} [opts.season]   – season year (e.g. 2024)
 * @param {string} [opts.status]   – "NS" | "1H" | "HT" | "2H" | "FT" | "LIVE"
 * @param {number} [opts.timezone] – IANA timezone string
 */
export async function fetchFixturesByDate({ date, league, season, status, timezone }) {
  return get("/fixtures", { date, league, season, status, timezone });
}

/**
 * Fetch a single fixture with full details (events, lineups, stats).
 * @param {number} fixtureId
 */
export async function fetchFixtureById(fixtureId) {
  const data = await get("/fixtures", { id: fixtureId });
  return data[0] ?? null;
}

/**
 * Fetch live fixtures (all currently in-play).
 * @param {number} [league] – optional league filter
 */
export async function fetchLiveFixtures(league) {
  return get("/fixtures", { live: "all", ...(league ? { league } : {}) });
}

// ─── Events (goal / card / substitution) ─────────────────────────────────────

/**
 * Fetch events for a fixture (goals, cards, subs).
 * @param {number} fixtureId
 */
export async function fetchFixtureEvents(fixtureId) {
  return get("/fixtures/events", { fixture: fixtureId });
}

// ─── Statistics ───────────────────────────────────────────────────────────────

/**
 * Fetch team-level statistics for a fixture.
 * @param {number} fixtureId
 */
export async function fetchFixtureStatistics(fixtureId) {
  return get("/fixtures/statistics", { fixture: fixtureId });
}

// ─── Mapper: API fixture → DB row ─────────────────────────────────────────────

/**
 * Map an api-football fixture object to our DB `matches` shape.
 * @param {Object} fixture – raw api-football fixture response item
 * @returns {Object}
 */
export function mapFixtureToMatch(fixture) {
  const { fixture: f, teams, goals, league } = fixture;

  // api-football gives timestamps in Unix seconds
  const startTime = new Date(f.date);
  // Approximate end: kickoff + 105 minutes (90 min + 15 min avg stoppage)
  const endTime = new Date(startTime.getTime() + 105 * 60 * 1000);

  const statusMap = {
    NS: "scheduled",
    "1H": "live",
    HT: "live",
    "2H": "live",
    ET: "live",
    P: "live",
    FT: "finished",
    AET: "finished",
    PEN: "finished",
    BT: "live",
    SUSP: "scheduled",
    INT: "live",
    CANC: "finished",
    ABD: "finished",
    AWD: "finished",
    WO: "finished",
    LIVE: "live",
  };

  return {
    externalId: String(f.id),
    sport: "football",
    homeTeam: teams.home.name,
    awayTeam: teams.away.name,
    status: statusMap[f.status.short] ?? "scheduled",
    startTime,
    endTime,
    homeScore: goals.home ?? 0,
    awayScore: goals.away ?? 0,
    metadata: {
      leagueId: league.id,
      leagueName: league.name,
      leagueCountry: league.country,
      round: league.round,
      venueId: f.venue?.id,
      venueName: f.venue?.name,
      referee: f.referee,
      apiStatus: f.status.short,
      elapsed: f.status.elapsed,
    },
  };
}

/**
 * Map a fixture event to our DB `commentary` shape.
 * @param {number} matchId     – our internal match id
 * @param {Object} event       – raw api-football event item
 * @param {number} sequence    – monotonic sequence number
 */
export function mapEventToCommentary(matchId, event, sequence) {
  const typeMap = {
    Goal: "goal",
    Card: "card",
    subst: "substitution",
    Var: "var",
  };

  return {
    matchId,
    minute: event.time?.elapsed ?? null,
    sequence,
    period: event.time?.elapsed <= 45 ? "1H" : "2H",
    eventType: typeMap[event.type] ?? event.type?.toLowerCase() ?? "event",
    actor: event.player?.name ?? null,
    team: event.team?.name ?? null,
    message: buildEventMessage(event),
    metadata: {
      assistPlayer: event.assist?.name ?? null,
      detail: event.detail,
      comments: event.comments,
      teamId: event.team?.id,
      playerId: event.player?.id,
    },
    tags: [event.type?.toLowerCase(), event.detail?.toLowerCase()].filter(Boolean),
  };
}

function buildEventMessage(event) {
  const { type, detail, player, assist, team, time } = event;
  const min = time?.elapsed ? `${time.elapsed}'` : "";
  const name = player?.name ?? "Unknown";

  switch (type) {
    case "Goal":
      return assist?.name
        ? `⚽ ${min} GOAL! ${name} scores for ${team?.name} (assist: ${assist.name})`
        : `⚽ ${min} GOAL! ${name} scores for ${team?.name}`;
    case "Card":
      return detail === "Yellow Card"
        ? `🟨 ${min} Yellow card for ${name} (${team?.name})`
        : `🟥 ${min} Red card for ${name} (${team?.name})`;
    case "subst":
      return `🔄 ${min} Substitution — ${team?.name}: ${name} replaces ${assist?.name ?? "?"}`;
    case "Var":
      return `📺 ${min} VAR: ${detail} — ${name}`;
    default:
      return `${min} ${type}: ${detail ?? ""} — ${name}`;
  }
}
