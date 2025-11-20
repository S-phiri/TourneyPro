// NEW: Utility to compute derived team and player statistics
// This is a helper that works with existing data - no backend changes required

export interface TeamStats {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  cleanSheets: number;
  goalsPerMatch: number;
  goalsAgainstPerMatch: number;
}

export interface PlayerStats {
  appearances: number;
  goals: number;
  assists: number;
  cleanSheets?: number;
  goalsPerMatch: number;
  assistsPerMatch: number;
  goalContributionsPerGame: number; // (goals + assists) / appearances
  // NEW: 5/6-aside stats (40 minutes per match)
  minutesPlayed: number; // appearances × 40 (default)
  goalsPer40Min: number;
  assistsPer40Min: number;
  contributionsPer40Min: number;
  cleanSheetRate: number; // percentage for GK/DEF
}

export interface ComputedTeamStats extends TeamStats {
  topPerformers: Array<{
    player: any;
    appearances: number;
    goals: number;
    assists: number;
    goalContributionsPerGame: number;
  }>;
}

/**
 * Compute team statistics from matches and team data
 * @param matches Array of match objects
 * @param teamId The team ID to compute stats for
 * @param existingTeamData Existing team data (to use existing values if available)
 */
export function computeTeamStats(
  matches: any[],
  teamId: number,
  existingTeamData?: any
): TeamStats {
  const finishedMatches = matches.filter((m: any) => m.status === 'finished');
  const played = finishedMatches.length;

  // Use existing values if available, otherwise compute
  let wins = existingTeamData?.wins ?? 0;
  let draws = existingTeamData?.draws ?? 0;
  let losses = existingTeamData?.losses ?? 0;
  let points = existingTeamData?.points ?? 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let cleanSheets = 0;

  // Compute from matches if we don't have existing data
  if (!existingTeamData || played > 0) {
    finishedMatches.forEach((match: any) => {
      const isHome = match.home_team?.id === teamId;
      const isAway = match.away_team?.id === teamId;

      if (isHome) {
        const homeScore = match.home_score ?? 0;
        const awayScore = match.away_score ?? 0;
        goalsFor += homeScore;
        goalsAgainst += awayScore;

        if (awayScore === 0) cleanSheets += 1;

        if (homeScore > awayScore) {
          wins += 1;
          points += 3;
        } else if (homeScore === awayScore) {
          draws += 1;
          points += 1;
        } else {
          losses += 1;
        }
      } else if (isAway) {
        const homeScore = match.home_score ?? 0;
        const awayScore = match.away_score ?? 0;
        goalsFor += awayScore;
        goalsAgainst += homeScore;

        if (homeScore === 0) cleanSheets += 1;

        if (awayScore > homeScore) {
          wins += 1;
          points += 3;
        } else if (awayScore === homeScore) {
          draws += 1;
          points += 1;
        } else {
          losses += 1;
        }
      }
    });
  }

  const goalDifference = goalsFor - goalsAgainst;
  const goalsPerMatch = played > 0 ? goalsFor / played : 0;
  const goalsAgainstPerMatch = played > 0 ? goalsAgainst / played : 0;

  return {
    played,
    wins,
    draws,
    losses,
    points,
    goalsFor,
    goalsAgainst,
    goalDifference,
    cleanSheets,
    goalsPerMatch,
    goalsAgainstPerMatch,
  };
}

/**
 * Compute player statistics with 5/6-aside metrics (40 minutes per match)
 * @param player Player object with goals, assists, appearances, cleanSheets
 */
export function computePlayerStats(player: any): PlayerStats {
  const appearances = player.appearances ?? 0;
  const goals = player.goals ?? 0;
  const assists = player.assists ?? 0;
  const cleanSheets = player.clean_sheets ?? 0;

  // Basic per-game stats
  const goalsPerMatch = appearances > 0 ? goals / appearances : 0;
  const assistsPerMatch = appearances > 0 ? assists / appearances : 0;
  const goalContributionsPerGame = appearances > 0 ? (goals + assists) / appearances : 0;

  // NEW: 5/6-aside stats (40 minutes per match)
  const MINUTES_PER_MATCH = 40;
  const minutesPlayed = appearances * MINUTES_PER_MATCH;
  
  const goalsPer40Min = minutesPlayed > 0 ? (goals / minutesPlayed) * MINUTES_PER_MATCH : 0;
  const assistsPer40Min = minutesPlayed > 0 ? (assists / minutesPlayed) * MINUTES_PER_MATCH : 0;
  const contributionsPer40Min = minutesPlayed > 0 ? ((goals + assists) / minutesPlayed) * MINUTES_PER_MATCH : 0;
  const cleanSheetRate = appearances > 0 ? (cleanSheets / appearances) * 100 : 0;

  return {
    appearances,
    goals,
    assists,
    cleanSheets,
    goalsPerMatch,
    assistsPerMatch,
    goalContributionsPerGame,
    minutesPlayed,
    goalsPer40Min,
    assistsPer40Min,
    contributionsPer40Min,
    cleanSheetRate,
  };
}

/**
 * Get top performers from a list of players
 * @param players Array of player objects (from TeamPlayer relationships)
 */
export function getTopPerformers(players: any[]): Array<{
  player: any;
  appearances: number;
  goals: number;
  assists: number;
  goalContributionsPerGame: number;
}> {
  return players
    .map((tp: any) => {
      const player = tp.player || tp;
      const stats = computePlayerStats(player);
      return {
        player,
        ...stats,
      };
    })
    .sort((a, b) => {
      // Sort by goal contributions per game (descending), then by total goals
      if (b.goalContributionsPerGame !== a.goalContributionsPerGame) {
        return b.goalContributionsPerGame - a.goalContributionsPerGame;
      }
      return b.goals - a.goals;
    })
    .filter((p) => p.appearances > 0); // Only show players who have played
}

/**
 * Compute all stats for team dashboard
 */
export function computeAllTeamStats(
  matches: any[],
  teamId: number,
  players: any[],
  existingTeamData?: any
): ComputedTeamStats {
  const teamStats = computeTeamStats(matches, teamId, existingTeamData);
  const topPerformers = getTopPerformers(players);

  return {
    ...teamStats,
    topPerformers,
  };
}

