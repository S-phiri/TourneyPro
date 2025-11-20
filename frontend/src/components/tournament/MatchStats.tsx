// Helper component to display individual match stats
import React from 'react';

interface Match {
  id: string;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  scorers?: Array<{
    id: number;
    player_id: number;
    player_name: string;
    team_id: number;
    team_name: string;
    minute?: number;
    assist?: {
      player_id: number;
      player_name: string;
    };
  }>;
}

export default function MatchStats({ match }: { match: Match }) {
  if (!match.scorers || match.scorers.length === 0) return null;
  
  // Separate home and away scorers
  const homeScorers = match.scorers.filter(s => String(s.team_id) === String(match.homeTeam.id));
  const awayScorers = match.scorers.filter(s => String(s.team_id) === String(match.awayTeam.id));
  
  if (homeScorers.length === 0 && awayScorers.length === 0) return null;
  
  return (
    <div className="mt-3 pt-3 border-t border-zinc-700 space-y-2 text-xs">
      {/* Home Team Scorers */}
      {homeScorers.length > 0 && (
        <div>
          <div className="text-gray-400 mb-1 font-semibold">{match.homeTeam.name}:</div>
          <div className="space-y-1 ml-2">
            {homeScorers.map((scorer, idx) => (
              <div key={idx} className="text-gray-300">
                <span className="text-yellow-400">⚽</span> {scorer.player_name}
                {scorer.assist && (
                  <span className="text-gray-500 ml-2">
                    🎯 assist: <span className="text-gray-300">{scorer.assist.player_name}</span>
                  </span>
                )}
                {scorer.minute && (
                  <span className="text-gray-500 ml-2">({scorer.minute}')</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Away Team Scorers */}
      {awayScorers.length > 0 && (
        <div>
          <div className="text-gray-400 mb-1 font-semibold">{match.awayTeam.name}:</div>
          <div className="space-y-1 ml-2">
            {awayScorers.map((scorer, idx) => (
              <div key={idx} className="text-gray-300">
                <span className="text-yellow-400">⚽</span> {scorer.player_name}
                {scorer.assist && (
                  <span className="text-gray-500 ml-2">
                    🎯 assist: <span className="text-gray-300">{scorer.assist.player_name}</span>
                  </span>
                )}
                {scorer.minute && (
                  <span className="text-gray-500 ml-2">({scorer.minute}')</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

