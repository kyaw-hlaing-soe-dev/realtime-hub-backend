import { seasonStartForDate, toFixture } from "../domain/football/fixture.js";
import { AppError } from "../errors/AppError.js";
import { getLeagueSeason } from "../infrastructure/openfootball/openfootballRepository.js";

export async function getFixturesForDate({ date, league = 39, season, status } = {}) {
  const parsedDate = new Date(`${date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    throw new AppError("date must use YYYY-MM-DD format", 400);
  }

  const leagueId = Number(league);
  const seasonStart =
    season === undefined || season === ""
      ? seasonStartForDate(date)
      : Number(season);
  if (!Number.isInteger(seasonStart) || seasonStart < 1900 || seasonStart > 9998) {
    throw new AppError("season must be a valid starting year", 400);
  }

  const dataset = await getLeagueSeason(leagueId, seasonStart);
  return dataset.matches
    .filter((match) => match.date === date)
    .map((match) => toFixture(match, dataset.league, leagueId, seasonStart))
    .filter((fixture) => !status || fixture.fixture.status.short === status);
}
