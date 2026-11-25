export function seasonStartForDate(date) {
  const parsed = new Date(`${date}T00:00:00Z`);
  const year = parsed.getUTCFullYear();
  return parsed.getUTCMonth() < 6 ? year - 1 : year;
}

export function seasonFolder(seasonStart) {
  const nextYear = String((seasonStart + 1) % 100).padStart(2, "0");
  return `${seasonStart}-${nextYear}`;
}

function fixtureId(season, leagueId, match) {
  return `openfootball:${season}:${leagueId}:${match.date}:${match.team1}:${match.team2}`;
}

export function toFixture(match, league, leagueId, season) {
  const kickoff = `${match.date}T${match.time ?? "12:00"}:00Z`;
  const finalScore = match.score && !Array.isArray(match.score) ? match.score.ft : null;
  const homeGoals = Array.isArray(finalScore) ? finalScore[0] : null;
  const awayGoals = Array.isArray(finalScore) ? finalScore[1] : null;
  const status = finalScore
    ? { short: "FT", long: "Match Finished", elapsed: 90 }
    : { short: "NS", long: "Not Started", elapsed: null };

  return {
    fixture: {
      id: fixtureId(season, leagueId, match),
      date: kickoff,
      timestamp: Math.floor(new Date(kickoff).getTime() / 1000),
      status,
      venue: null,
      referee: null,
    },
    league: {
      id: leagueId,
      name: league.name,
      country: league.country,
      season,
      round: match.round ?? null,
    },
    teams: {
      home: { id: null, name: match.team1, logo: null },
      away: { id: null, name: match.team2, logo: null },
    },
    goals: { home: homeGoals, away: awayGoals },
    score: {
      halftime: { home: match.score?.ht?.[0] ?? null, away: match.score?.ht?.[1] ?? null },
      fulltime: { home: homeGoals, away: awayGoals },
    },
  };
}
