import { motion } from "framer-motion";
import TeamChip from "./TeamChip";

interface Team {
  id: string;
  name: string;
  crest?: string;
  initials?: string;
}

interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore?: number;
  awayScore?: number;
  status: "upcoming" | "live" | "completed";
  time?: string;
  pitch?: string;
}

interface KnockoutBracketProps {
  matches: Match[];
}

// Get round name based on actual number of teams in that round
// Since we only allow power-of-2 sizes, all sizes are standard
const getRoundName = (numTeams: number): string => {
  if (numTeams === 2) {
    return "Final";
  } else if (numTeams === 4) {
    return "Semi-Finals";
  } else if (numTeams === 8) {
    return "Quarter-Finals";
  } else if (numTeams === 16) {
    return "Round of 16";
  } else if (numTeams === 32) {
    return "Round of 32";
  } else if (numTeams === 64) {
    return "Round of 64";
  } else {
    // Should never reach here with power-of-2 restriction, but handle gracefully
    return `Round of ${numTeams}`;
  }
};

// Round names for different bracket sizes (for reference, not used in current implementation)
const getRoundNames = (numTeams: number): string[] => {
  const rounds: string[] = [];
  let current = numTeams;
  
  while (current > 1) {
    rounds.push(getRoundName(current));
    current = Math.floor(current / 2);
  }
  
  return rounds; // Keep in order from first round to final
};

// Organize matches into rounds based on actual matches, not theoretical bracket
const organizeMatchesByRound = (matches: Match[]): Record<string, Match[]> => {
  const rounds: Record<string, Match[]> = {};
  
  if (matches.length === 0) return rounds;
  
  // Group matches by round number from pitch field or infer from match order
  // For knockout, matches are typically organized by round number in pitch field
  const matchesByRound: Record<string, Match[]> = {};
  
  matches.forEach(match => {
    // Try to extract round number from pitch field (e.g., "Round 1", "Round 2")
    const pitch = match.pitch || '';
    const roundMatch = pitch.match(/Round\s+(\d+)/i);
    const roundNum = roundMatch ? parseInt(roundMatch[1]) : null;
    
    if (roundNum) {
      const roundKey = `Round ${roundNum}`;
      if (!matchesByRound[roundKey]) {
        matchesByRound[roundKey] = [];
      }
      matchesByRound[roundKey].push(match);
    } else {
      // If no round info, infer from match count and order
      // First round has most matches, subsequent rounds have fewer
      const totalMatches = matches.length;
      const firstRoundMatches = Math.ceil(totalMatches / 2); // Approximate
      
      if (matches.indexOf(match) < firstRoundMatches) {
        if (!matchesByRound['Round 1']) {
          matchesByRound['Round 1'] = [];
        }
        matchesByRound['Round 1'].push(match);
      } else {
        // Subsequent rounds
        if (!matchesByRound['Round 2']) {
          matchesByRound['Round 2'] = [];
        }
        matchesByRound['Round 2'].push(match);
      }
    }
  });
  
  // Convert round numbers to proper names based on actual number of teams in that round
  Object.keys(matchesByRound).forEach(roundKey => {
    const roundMatches = matchesByRound[roundKey];
    // Each match has 2 teams, so teams in round = matches * 2
    const teamsInRound = roundMatches.length * 2;
    
    // Get round name based on actual team count
    const roundName = getRoundName(teamsInRound);
    rounds[roundName] = roundMatches;
  });
  
  return rounds;
};

// Get winner of a match
const getWinner = (match: Match): Team | null => {
  if (match.status !== 'completed' || match.homeScore === undefined || match.awayScore === undefined) {
    return null;
  }
  if (match.homeScore > match.awayScore) {
    return match.homeTeam;
  } else if (match.awayScore > match.homeScore) {
    return match.awayTeam;
  }
  return null; // Draw (shouldn't happen in knockout, but handle it)
};

const MatchCard = ({ match, roundName }: { match: Match; roundName: string }) => {
  const winner = getWinner(match);
  const isCompleted = match.status === 'completed';
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 mb-4 min-w-[280px]"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-yellow-500 font-semibold uppercase">{roundName}</span>
        {match.time && (
          <span className="text-xs text-gray-400">{match.time}</span>
        )}
      </div>
      
      {/* Home Team */}
      <div className={`flex items-center justify-between py-2 px-3 rounded mb-1 ${
        isCompleted && winner?.id === match.homeTeam.id 
          ? 'bg-yellow-500/20 border border-yellow-500/50' 
          : 'bg-zinc-900/50'
      }`}>
        <TeamChip 
          name={match.homeTeam.name} 
          initials={match.homeTeam.initials} 
          size="sm"
        />
        {isCompleted && match.homeScore !== undefined && (
          <span className={`text-lg font-bold ${
            winner?.id === match.homeTeam.id ? 'text-yellow-500' : 'text-white'
          }`}>
            {match.homeScore}
          </span>
        )}
      </div>
      
      {/* Away Team */}
      <div className={`flex items-center justify-between py-2 px-3 rounded ${
        isCompleted && winner?.id === match.awayTeam.id 
          ? 'bg-yellow-500/20 border border-yellow-500/50' 
          : 'bg-zinc-900/50'
      }`}>
        <TeamChip 
          name={match.awayTeam.name} 
          initials={match.awayTeam.initials} 
          size="sm"
        />
        {isCompleted && match.awayScore !== undefined && (
          <span className={`text-lg font-bold ${
            winner?.id === match.awayTeam.id ? 'text-yellow-500' : 'text-white'
          }`}>
            {match.awayScore}
          </span>
        )}
      </div>
      
      {match.status === 'live' && (
        <div className="mt-2 text-center">
          <span className="px-2 py-1 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-xs font-semibold">
            LIVE
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default function KnockoutBracket({ matches }: KnockoutBracketProps) {
  if (!matches || matches.length === 0) {
    return (
      <div className="text-center py-12 bg-zinc-800/30 border border-zinc-700 rounded-lg">
        <p className="text-gray-400 text-lg">No matches available for bracket visualization.</p>
      </div>
    );
  }
  
  const rounds = organizeMatchesByRound(matches);
  // Only show rounds that have actual matches (filter out empty rounds)
  const roundNames = Object.keys(rounds).filter(roundName => rounds[roundName].length > 0);
  
  if (roundNames.length === 0) {
    return (
      <div className="text-center py-12 bg-zinc-800/30 border border-zinc-700 rounded-lg">
        <p className="text-gray-400 text-lg">No matches available for bracket visualization.</p>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row gap-8 justify-center items-start py-8 overflow-x-auto">
        {roundNames.map((roundName, roundIndex) => {
          const roundMatches = rounds[roundName];
          const isFinal = roundName === "Final";
          const isSemiFinal = roundName === "Semi-Finals";
          const isQuarterFinal = roundName === "Quarter-Finals";
          
          return (
            <motion.div
              key={roundName}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: roundIndex * 0.1 }}
              className="flex flex-col items-center relative"
            >
              {/* Round Header */}
              <div className="mb-4 text-center sticky top-0 bg-zinc-900/95 backdrop-blur-sm z-10 pb-2 w-full">
                <h4 className={`font-bold ${
                  isFinal ? 'text-2xl text-yellow-500' : 
                  isSemiFinal ? 'text-xl text-yellow-400' : 
                  isQuarterFinal ? 'text-lg text-yellow-300' :
                  'text-base text-white'
                }`}>
                  {roundName}
                </h4>
                <p className="text-xs text-gray-400 mt-1">
                  {roundMatches.length} {roundMatches.length === 1 ? 'match' : 'matches'}
                </p>
              </div>
              
              {/* Matches in this round */}
              <div className="flex flex-col gap-4 min-w-[300px]">
                {roundMatches.map((match, matchIndex) => (
                  <MatchCard 
                    key={match.id || `${roundName}-${matchIndex}`} 
                    match={match} 
                    roundName={roundName}
                  />
                ))}
              </div>
              
              {/* Connector arrow to next round */}
              {roundIndex < roundNames.length - 1 && (
                <div className="hidden lg:block absolute left-full top-1/2 transform -translate-y-1/2 translate-x-4">
                  <div className="w-8 h-0.5 bg-yellow-500/50"></div>
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-0.5">
                    <div className="w-0 h-0 border-l-4 border-l-yellow-500/50 border-t-2 border-t-transparent border-b-2 border-b-transparent"></div>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-8 pt-6 border-t border-zinc-700 flex flex-wrap gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500/20 border border-yellow-500/50 rounded"></div>
          <span className="text-gray-400">Winner</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-zinc-900/50 rounded"></div>
          <span className="text-gray-400">Team</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-xs">LIVE</span>
          <span className="text-gray-400">Live Match</span>
        </div>
      </div>
    </div>
  );
}

