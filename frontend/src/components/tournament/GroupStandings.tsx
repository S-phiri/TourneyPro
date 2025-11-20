// NEW: Component for displaying group-based standings (combinationB format)
import React from 'react';
import { motion } from 'framer-motion';
import TeamChip from './TeamChip';

interface GroupStandingEntry {
  position: number;
  team: {
    id: number;
    name: string;
  };
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
}

interface GroupStandingsProps {
  groups: Record<string, GroupStandingEntry[]>;
}

export default function GroupStandings({ groups }: GroupStandingsProps) {
  const groupNames = Object.keys(groups).sort();

  return (
    <div className="space-y-8">
      {groupNames.map((groupName, groupIndex) => {
        const standings = groups[groupName];
        
        return (
          <motion.div
            key={groupName}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.1 }}
            className="bg-zinc-800/50 border border-zinc-700 rounded-lg overflow-hidden"
          >
            <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-b border-yellow-500/30 px-6 py-4">
              <h4 className="text-xl font-bold text-yellow-500">{groupName}</h4>
              <p className="text-sm text-gray-400 mt-1">Top 2 teams advance to knockout stage</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left text-gray-400 font-semibold py-3 px-4">Pos</th>
                    <th className="text-left text-gray-400 font-semibold py-3 px-4">Team</th>
                    <th className="text-center text-gray-400 font-semibold py-3 px-4">P</th>
                    <th className="text-center text-gray-400 font-semibold py-3 px-4">W</th>
                    <th className="text-center text-gray-400 font-semibold py-3 px-4">D</th>
                    <th className="text-center text-gray-400 font-semibold py-3 px-4">L</th>
                    <th className="text-center text-gray-400 font-semibold py-3 px-4">GF</th>
                    <th className="text-center text-gray-400 font-semibold py-3 px-4">GA</th>
                    <th className="text-center text-gray-400 font-semibold py-3 px-4">GD</th>
                    <th className="text-center text-gray-400 font-semibold py-3 px-4">PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((entry, index) => {
                    const isQualified = entry.position <= 2;
                    return (
                      <motion.tr
                        key={entry.team.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (groupIndex * 0.1) + (index * 0.05) }}
                        className={`border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors ${
                          isQualified ? 'bg-green-500/10' : ''
                        }`}
                      >
                        <td className="py-4 px-4">
                          <span className={`font-bold ${
                            entry.position === 1 ? 'text-yellow-500' : 
                            isQualified ? 'text-green-400' : 'text-white'
                          }`}>
                            {entry.position}
                            {isQualified && entry.position <= 2 && (
                              <span className="ml-1 text-green-400 text-xs">✓</span>
                            )}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <TeamChip
                            name={entry.team.name}
                            initials={(entry.team.name || 'UN').substring(0, 2).toUpperCase()}
                            size="sm"
                          />
                        </td>
                        <td className="text-center text-white py-4 px-4">{entry.played}</td>
                        <td className="text-center text-white py-4 px-4">{entry.won}</td>
                        <td className="text-center text-white py-4 px-4">{entry.drawn}</td>
                        <td className="text-center text-white py-4 px-4">{entry.lost}</td>
                        <td className="text-center text-white py-4 px-4">{entry.goals_for}</td>
                        <td className="text-center text-white py-4 px-4">{entry.goals_against}</td>
                        <td className={`text-center py-4 px-4 font-semibold ${
                          entry.goal_difference > 0 ? 'text-green-400' :
                          entry.goal_difference < 0 ? 'text-red-400' : 'text-white'
                        }`}>
                          {entry.goal_difference > 0 ? '+' : ''}{entry.goal_difference}
                        </td>
                        <td className="text-center font-bold text-yellow-500 py-4 px-4">{entry.points}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

