const configuredLeague = Number(process.env.FOOTBALL_SYNC_LEAGUE ?? 39);

if (!Number.isInteger(configuredLeague) || configuredLeague <= 0) {
  throw new Error("FOOTBALL_SYNC_LEAGUE must be a positive integer");
}

export const FOOTBALL_LEAGUE_ID = configuredLeague;
export const FOOTBALL_REFRESH_UTC_HOUR = 5;
export const FOOTBALL_REFRESH_UTC_MINUTE = 5;
export const FOOTBALL_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
