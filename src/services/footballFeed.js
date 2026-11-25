import {
  FOOTBALL_LEAGUE_ID,
  FOOTBALL_REFRESH_INTERVAL_MS,
  FOOTBALL_REFRESH_UTC_HOUR,
  FOOTBALL_REFRESH_UTC_MINUTE,
} from "../config/football.js";
import { getFixturesForDate } from "./footballFixtures.js";

function millisecondsUntilRefresh(now) {
  const nextRefresh = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    FOOTBALL_REFRESH_UTC_HOUR,
    FOOTBALL_REFRESH_UTC_MINUTE,
  ));
  if (nextRefresh <= now) nextRefresh.setUTCDate(nextRefresh.getUTCDate() + 1);
  return nextRefresh.getTime() - now.getTime();
}

export function createFootballFeed({
  publishFixtures,
  getFixtures = getFixturesForDate,
  leagueId = FOOTBALL_LEAGUE_ID,
  now = () => new Date(),
  logger = console,
}) {
  let timer;
  let running = false;

  async function refresh() {
    const date = now().toISOString().slice(0, 10);
    try {
      const fixtures = await getFixtures({ date, league: leagueId });
      publishFixtures({
        league: leagueId,
        date,
        fixtures,
        updatedAt: now().toISOString(),
      });
      logger.info(`[football] Published ${fixtures.length} fixture(s) for ${date}.`);
    } catch (error) {
      logger.error("[football] Dataset refresh failed:", error.message);
    }
  }

  function scheduleNextRefresh() {
    timer = setTimeout(async () => {
      if (!running) return;
      await refresh();
      if (running) scheduleNextRefresh();
    }, millisecondsUntilRefresh(now()));
    timer.unref?.();
  }

  return {
    async start() {
      if (running) return;
      running = true;
      await refresh();
      if (running) scheduleNextRefresh();
    },
    stop() {
      running = false;
      if (timer) clearTimeout(timer);
      timer = undefined;
    },
    refresh,
  };
}
