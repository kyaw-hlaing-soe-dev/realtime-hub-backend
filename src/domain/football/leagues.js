export const OPENFOOTBALL_LEAGUES = new Map([
  [39, { file: "en.1.json", name: "Premier League", country: "England" }],
  [40, { file: "en.2.json", name: "Championship", country: "England" }],
  [41, { file: "en.3.json", name: "League One", country: "England" }],
  [42, { file: "en.4.json", name: "League Two", country: "England" }],
  [78, { file: "de.1.json", name: "Bundesliga", country: "Germany" }],
  [79, { file: "de.2.json", name: "2. Bundesliga", country: "Germany" }],
  [140, { file: "es.1.json", name: "La Liga", country: "Spain" }],
  [135, { file: "it.1.json", name: "Serie A", country: "Italy" }],
  [61, { file: "fr.1.json", name: "Ligue 1", country: "France" }],
]);

export function getOpenFootballLeague(leagueId) {
  return OPENFOOTBALL_LEAGUES.get(Number(leagueId));
}
