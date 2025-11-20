import React from 'react';
import { Award, Goal, Zap } from 'lucide-react';
import TeamChip from '../tournament/TeamChip';

interface TopPerformersProps {
  performers: Array<{
    player: any;
    appearances: number;
    goals: number;
    assists: number;
    goalContributionsPerGame: number;
  }>;
  onPlayerClick?: (playerId: number) => void;
}

export default function TopPerformers({ performers, onPlayerClick }: TopPerformersProps) {
  if (performers.length === 0) {
    return (
      <div className="text-center py-12 bg-zinc-800/30 border border-zinc-700 rounded-lg">
        <p className="text-gray-400 text-lg">No player statistics available yet.</p>
        <p className="text-gray-500 text-sm mt-2">Stats will appear after players have participated in matches.</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-700">
              <th className="text-left py-4 px-6 font-bold text-white">Player</th>
              <th className="text-center py-4 px-4 font-bold text-white">Apps</th>
              <th className="text-center py-4 px-4 font-bold text-white">
                <div className="flex items-center justify-center gap-1">
                  <Goal className="w-4 h-4 text-yellow-500" />
                  Goals
                </div>
              </th>
              <th className="text-center py-4 px-4 font-bold text-white">
                <div className="flex items-center justify-center gap-1">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Assists
                </div>
              </th>
              <th className="text-center py-4 px-4 font-bold text-white">
                <div className="flex items-center justify-center gap-1">
                  <Award className="w-4 h-4 text-yellow-500" />
                  G+A/Game
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {performers.map((performer, index) => {
              const player = performer.player;
              const playerName = `${player?.first_name || ''} ${player?.last_name || ''}`.trim() || 'Unknown Player';
              const initials = playerName.substring(0, 2).toUpperCase();

              return (
                <tr
                  key={player?.id || index}
                  className="border-b border-zinc-700/50 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                  onClick={() => onPlayerClick && player?.id && onPlayerClick(player.id)}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <TeamChip
                        initials={initials}
                        name={playerName}
                        size="sm"
                      />
                      <span className="font-semibold text-white">{playerName}</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4 text-gray-300">{performer.appearances}</td>
                  <td className="text-center py-4 px-4">
                    <span className="text-xl font-bold text-yellow-400">{performer.goals}</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="text-xl font-bold text-yellow-400">{performer.assists}</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="text-xl font-bold text-yellow-500">
                      {performer.goalContributionsPerGame.toFixed(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

