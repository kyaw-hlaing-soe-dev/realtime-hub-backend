import { getOpenFootballLeague } from "../../domain/football/leagues.js";
import { seasonFolder } from "../../domain/football/fixture.js";
import { AppError } from "../../errors/AppError.js";

const DATASET_BASE_URL =
  "https://raw.githubusercontent.com/openfootball/football.json/master";
const REQUEST_TIMEOUT_MS = 10_000;

export async function getLeagueSeason(leagueId, seasonStart) {
  const league = getOpenFootballLeague(leagueId);
  if (!league) {
    throw new AppError(`League ${leagueId} is not available in the dataset`, 400);
  }

  const folder = seasonFolder(seasonStart);
  const path = `${folder}/${league.file}`;
  const response = await fetch(`${DATASET_BASE_URL}/${path}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 404) {
    throw new AppError(`Dataset not found: ${path}`, 404);
  }
  if (!response.ok) {
    throw new AppError(`Dataset request failed (${response.status})`);
  }

  const dataset = await response.json();
  if (!Array.isArray(dataset.matches)) {
    throw new AppError(`Invalid dataset format: ${path}`);
  }

  return { league, matches: dataset.matches };
}
