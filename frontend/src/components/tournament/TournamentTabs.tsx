import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trophy } from "lucide-react";
import TeamChip from "./TeamChip";

interface Team {
  id: string;
  name: string;
  crest?: string;
  initials?: string;
  manager?: string;
}

interface Match {
  id: string;
  time: string;
  pitch: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore?: number;
  awayScore?: number;
  status: "upcoming" | "live" | "completed";
}

interface LeaderboardEntry {
  position: number;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
}

interface TopScorer {
  name: string;
  team: string;
  goals: number;
}

interface TournamentTabsProps {
  teams?: Team[];
  fixtures?: Match[];
  results?: Match[];
  leaderboard?: LeaderboardEntry[];
  topScorers?: TopScorer[];
  isOrganiser?: boolean;
  onAddTeam?: () => void;
  onAddMatch?: () => void;
  onUpdateScore?: (matchId: string) => void;
  onViewTeam?: (teamId: string) => void;
}

const defaultTeams: Team[] = [
  { id: "1", name: "Thunder FC", initials: "TFC", manager: "John Smith" },
  { id: "2", name: "Lightning United", initials: "LU", manager: "Sarah Johnson" },
  { id: "3", name: "Storm Strikers", initials: "SS", manager: "Mike Davis" }
];

const defaultFixtures: Match[] = [
  {
    id: "1",
    time: "18:00",
    pitch: "Pitch A",
    homeTeam: { id: "1", name: "Thunder FC", initials: "TFC" },
    awayTeam: { id: "2", name: "Lightning United", initials: "LU" },
    status: "upcoming"
  }
];

const defaultResults: Match[] = [
  {
    id: "2",
    time: "16:00",
    pitch: "Pitch B",
    homeTeam: { id: "3", name: "Storm Strikers", initials: "SS" },
    awayTeam: { id: "1", name: "Thunder FC", initials: "TFC" },
    homeScore: 2,
    awayScore: 1,
    status: "completed"
  }
];

const defaultLeaderboard: LeaderboardEntry[] = [
  { position: 1, team: { id: "1", name: "Thunder FC", initials: "TFC" }, played: 3, won: 3, drawn: 0, lost: 0, points: 9 },
  { position: 2, team: { id: "2", name: "Lightning United", initials: "LU" }, played: 3, won: 2, drawn: 0, lost: 1, points: 6 },
  { position: 3, team: { id: "3", name: "Storm Strikers", initials: "SS" }, played: 3, won: 1, drawn: 0, lost: 2, points: 3 }
];

const defaultTopScorers: TopScorer[] = [
  { name: "Marcus Johnson", team: "Thunder FC", goals: 8 },
  { name: "David Lee", team: "Lightning United", goals: 6 },
  { name: "Chris Brown", team: "Storm Strikers", goals: 5 }
];

export default function TournamentTabs({
  teams = defaultTeams,
  fixtures = defaultFixtures,
  results = defaultResults,
  leaderboard = defaultLeaderboard,
  topScorers = defaultTopScorers,
  isOrganiser = false,
  onAddTeam = () => {},
  onAddMatch = () => {},
  onUpdateScore = () => {},
  onViewTeam
}: TournamentTabsProps) {
  const [activeTab, setActiveTab] = useState<"registrations" | "fixtures" | "leaderboard">("registrations");

  const tabs = [
    { id: "registrations", label: "Registrations" },
    { id: "fixtures", label: "Fixtures & Results" },
    { id: "leaderboard", label: "Standings" }
  ];

  return (
    <div className="container mx-auto px-6 py-16">
      <div className="bg-gradient-to-br from-zinc-900 to-black border border-yellow-500/20 rounded-2xl overflow-hidden">
        {/* Tabs Header */}
        <div className="flex border-b border-zinc-800 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="relative px-8 py-4 text-white font-semibold whitespace-nowrap transition-colors hover:bg-zinc-800/50"
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-yellow-600"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-8">
          {activeTab === "registrations" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Registered Teams</h3>
                {isOrganiser && (
                  <Button onClick={onAddTeam} className="bg-yellow-500 hover:bg-yellow-600 text-black">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Team
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-400 text-lg">No teams registered yet.</p>
                  </div>
                ) : (
                  teams.map((team) => (
                    <motion.div
                      key={team.id}
                      whileHover={{ scale: 1.02, y: -4 }}
                      onClick={() => onViewTeam?.(team.id)}
                      className={`bg-zinc-800/50 border border-zinc-700 rounded-lg p-5 cursor-pointer transition-all hover:border-yellow-500/50 hover:bg-zinc-800/70 ${onViewTeam ? 'cursor-pointer' : ''}`}
                    >
                      <div className="mb-3">
                        <TeamChip name={team.name || 'Unnamed Team'} crest={team.crest} initials={team.initials} />
                      </div>
                      {team.name && (
                        <h4 className="text-lg font-bold text-white mb-2 line-clamp-1">{team.name}</h4>
                      )}
                      {team.manager && (
                        <div className="text-sm text-gray-400">
                          Manager: <span className="text-yellow-400">{team.manager}</span>
                        </div>
                      )}
                      {onViewTeam && (
                        <div className="mt-3 text-xs text-yellow-500 hover:text-yellow-400">
                          View Team Hub →
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "fixtures" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="grid md:grid-cols-2 gap-8">
                {/* Upcoming Fixtures */}
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-white">Upcoming Fixtures</h3>
                    {isOrganiser && (
                      <Button onClick={onAddMatch} size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black">
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {fixtures.map((match) => (
                      <motion.div
                        key={match.id}
                        whileHover={{ scale: 1.02 }}
                        className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-yellow-500 font-bold">{match.time}</span>
                          <span className="text-gray-400 text-sm">{match.pitch}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <TeamChip name={match.homeTeam.name} initials={match.homeTeam.initials} size="sm" />
                          <span className="text-white font-bold mx-4">VS</span>
                          <TeamChip name={match.awayTeam.name} initials={match.awayTeam.initials} size="sm" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Recent Results */}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Recent Results</h3>
                  <div className="space-y-4">
                    {results.map((match) => (
                      <motion.div
                        key={match.id}
                        whileHover={{ scale: 1.02 }}
                        className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-gray-400 text-sm">{match.pitch}</span>
                          {isOrganiser && (
                            <Button
                              onClick={() => onUpdateScore(match.id)}
                              size="sm"
                              variant="ghost"
                              className="text-yellow-500"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <TeamChip name={match.homeTeam.name} initials={match.homeTeam.initials} size="sm" />
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-2xl font-black text-white"
                            >
                              {match.homeScore}
                            </motion.span>
                          </div>
                          <span className="text-gray-500 font-bold mx-4">-</span>
                          <div className="flex items-center gap-3">
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-2xl font-black text-white"
                            >
                              {match.awayScore}
                            </motion.span>
                            <TeamChip name={match.awayTeam.name} initials={match.awayTeam.initials} size="sm" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "leaderboard" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h3 className="text-2xl font-bold text-white mb-6">Standings</h3>
              {leaderboard.length === 0 ? (
                <div className="text-center py-12 bg-zinc-800/30 border border-zinc-700 rounded-lg">
                  <p className="text-gray-400 text-lg">No standings yet. Matches need to be played first.</p>
                </div>
              ) : (
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
                        <th className="text-center text-gray-400 font-semibold py-3 px-4">PTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((entry) => (
                      <motion.tr
                        key={entry.team.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: entry.position * 0.1 }}
                        className="border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <span className={`font-bold ${entry.position === 1 ? 'text-yellow-500' : 'text-white'}`}>
                            {entry.position}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <TeamChip name={entry.team.name} initials={entry.team.initials} size="sm" />
                        </td>
                        <td className="text-center text-white py-4 px-4">{entry.played}</td>
                        <td className="text-center text-white py-4 px-4">{entry.won}</td>
                        <td className="text-center text-white py-4 px-4">{entry.drawn}</td>
                        <td className="text-center text-white py-4 px-4">{entry.lost}</td>
                        <td className="text-center font-bold text-yellow-500 py-4 px-4">{entry.points}</td>
                      </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Top Scorers */}
              {topScorers.length > 0 && (
                <div className="mt-8 bg-zinc-800/30 border border-zinc-700 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <h4 className="text-xl font-bold text-white">Top Scorers</h4>
                  </div>
                  <div className="space-y-3">
                    {topScorers.map((scorer, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`font-bold ${index === 0 ? 'text-yellow-500' : 'text-gray-400'}`}>
                          {index + 1}
                        </span>
                        <div>
                          <div className="text-white font-semibold">{scorer.name}</div>
                          <div className="text-gray-400 text-sm">{scorer.team}</div>
                        </div>
                      </div>
                      <div className="text-2xl font-black text-yellow-500">{scorer.goals}</div>
                    </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

