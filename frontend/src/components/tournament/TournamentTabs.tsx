import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trophy, CheckCircle2 } from "lucide-react";
import TeamChip from "./TeamChip";
// NEW: Import GroupStandings component
import GroupStandings from "./GroupStandings";
// NEW: Import MatchStats component for individual stats
import MatchStats from "./MatchStats";
// NEW: Import KnockoutBracket component
import KnockoutBracket from "./KnockoutBracket";
import { markRegistrationPaid } from "../../lib/api";

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
  startedAt?: string;
  durationMinutes?: number;
  // NEW: Individual stats
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

interface TopAssister {
  name: string;
  team: string;
  assists: number;
  goals?: number;
}

interface GroupStandingsData {
  format: 'groups';
  groups: Record<string, Array<{
    position: number;
    team: { id: number; name: string };
    played: number;
    won: number;
    drawn: number;
    lost: number;
    points: number;
    goals_for: number;
    goals_against: number;
    goal_difference: number;
  }>>;
}

interface LeagueStandingsData {
  format: 'league';
  standings: LeaderboardEntry[];
}

interface RegistrationWithStatus {
  id: number;
  team: Team;
  status: 'pending' | 'paid' | 'cancelled';
  paid_amount?: number;
}

interface TournamentTabsProps {
  teams?: Team[];
  registrations?: RegistrationWithStatus[]; // NEW: Registrations with payment status
  fixtures?: Match[];
  liveMatches?: Match[];
  results?: Match[];
  leaderboard?: LeaderboardEntry[];
  // NEW: Support for format-based standings
  standingsData?: GroupStandingsData | LeagueStandingsData;
  topScorers?: TopScorer[];
  topAssists?: TopAssister[]; // NEW: Top assists leaderboard
  isOrganiser?: boolean;
  tournamentId?: number; // NEW: Tournament ID for mark-paid action
  tournamentFormat?: 'league' | 'knockout' | 'combination'; // NEW: Tournament format
  tournament?: { id: number; status: string; slug?: string }; // NEW: Tournament object for awards link
  onAddTeam?: () => void;
  onAddMatch?: () => void;
  onUpdateScore?: (matchId: string) => void;
  onViewTeam?: (teamId: string) => void;
  onRegistrationUpdate?: () => void; // NEW: Callback to refresh data after marking as paid
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
  registrations, // NEW: Registrations with payment status
  fixtures = defaultFixtures,
  liveMatches = [],
  results = defaultResults,
  leaderboard = defaultLeaderboard,
  standingsData, // NEW: Format-based standings data
  topScorers = defaultTopScorers,
  topAssists = [], // NEW: Top assists
  isOrganiser = false,
  tournamentId, // NEW: Tournament ID
  tournamentFormat, // NEW: Tournament format
  tournament, // NEW: Tournament object
  onAddTeam = () => {},
  onAddMatch = () => {},
  onUpdateScore = () => {},
  onViewTeam,
  onRegistrationUpdate = () => {} // NEW: Refresh callback
}: TournamentTabsProps) {
  // NEW: Determine which standings to display
  const displayStandings = standingsData?.format === 'groups' 
    ? null // Groups handled separately
    : (standingsData?.format === 'league' 
      ? (standingsData as LeagueStandingsData).standings 
      : leaderboard); // Fallback to legacy leaderboard prop
  const [activeTab, setActiveTab] = useState<"registrations" | "fixtures" | "live" | "leaderboard" | "individual-stats" | "awards">("registrations");
  const [activeStatTab, setActiveStatTab] = useState<"scorers" | "assists" | "clean-sheets" | "contributions">("scorers");

  const tabs = [
    { id: "registrations", label: "Registrations" },
    { id: "fixtures", label: "Fixtures & Results" },
    ...(liveMatches && liveMatches.length > 0 ? [{ id: "live" as const, label: `Live (${liveMatches.length})` }] : []),
    { id: "leaderboard", label: "Standings" },
    { id: "individual-stats", label: "Individual Stats" },
    ...(tournament && tournament.status === 'completed' ? [{ id: "awards" as const, label: "Awards" }] : [])
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
                {(!registrations || registrations.length === 0) && teams.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-400 text-lg">No teams registered yet.</p>
                  </div>
                ) : (
                  // NEW: Use registrations if available, otherwise fall back to teams
                  (registrations || teams.map(t => ({ id: 0, team: t, status: 'pending' as const }))).map((reg) => {
                    const team = 'team' in reg ? reg.team : reg;
                    const registrationId = 'id' in reg ? reg.id : undefined;
                    const paymentStatus = 'status' in reg ? reg.status : 'pending';
                    
                    return (
                      <motion.div
                        key={team.id}
                        whileHover={{ scale: 1.02, y: -4 }}
                        onClick={() => onViewTeam?.(team.id)}
                        className={`bg-zinc-800/50 border border-zinc-700 rounded-lg p-5 transition-all hover:border-yellow-500/50 hover:bg-zinc-800/70 ${onViewTeam ? 'cursor-pointer' : ''}`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <TeamChip name={team.name || 'Unnamed Team'} crest={team.crest} initials={team.initials} />
                          {/* NEW: Payment status badge */}
                          {paymentStatus === 'paid' ? (
                            <span className="px-2 py-1 bg-green-500/20 border border-green-500/50 rounded-full text-green-400 text-xs font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Paid
                            </span>
                          ) : paymentStatus === 'pending' ? (
                            <span className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-full text-yellow-400 text-xs font-semibold">
                              Pending
                            </span>
                          ) : null}
                        </div>
                        {team.name && (
                          <h4 className="text-lg font-bold text-white mb-2 line-clamp-1">{team.name}</h4>
                        )}
                        {team.manager && (
                          <div className="text-sm text-gray-400">
                            Manager: <span className="text-yellow-400">{team.manager}</span>
                          </div>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          {onViewTeam && (
                            <div className="text-xs text-yellow-500 hover:text-yellow-400">
                              View Team Hub →
                            </div>
                          )}
                          {/* NEW: Mark as Paid button for organizers */}
                          {isOrganiser && registrationId && paymentStatus === 'pending' && (
                            <Button
                              size="sm"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await markRegistrationPaid(registrationId);
                                  onRegistrationUpdate(); // Refresh data
                                } catch (err) {
                                  alert('Failed to mark as paid. Please try again.');
                                }
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1"
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "live" && liveMatches && liveMatches.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                Live Matches
              </h3>
              <div className="space-y-4">
                {liveMatches.map((match) => (
                  <motion.div
                    key={match.id}
                    whileHover={{ scale: 1.02 }}
                    className="bg-red-900/20 border-2 border-red-500 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-red-400 font-bold animate-pulse">LIVE</span>
                      <span className="text-gray-400 text-sm">{match.pitch}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <TeamChip name={match.homeTeam.name} initials={match.homeTeam.initials} size="sm" />
                      <span className="text-white font-bold text-xl mx-4">
                        {match.homeScore} - {match.awayScore}
                      </span>
                      <TeamChip name={match.awayTeam.name} initials={match.awayTeam.initials} size="sm" />
                    </div>
                    {match.startedAt && match.durationMinutes && (
                      <div className="text-xs text-gray-400 text-center mt-2">
                        Started: {new Date(match.startedAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                        {' • '}
                        Duration: {match.durationMinutes} min
                      </div>
                    )}
                  </motion.div>
                ))}
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
                        {/* NEW: Individual player stats (scorers and assists) */}
                        <MatchStats match={match} />
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
              
              {/* Knockout format - show bracket visualization */}
              {tournamentFormat === 'knockout' && (
                <KnockoutBracket 
                  matches={[...(fixtures || []), ...(results || [])]}
                />
              )}
              
              {/* NEW: Group-based standings (combinationB) */}
              {tournamentFormat !== 'knockout' && standingsData?.format === 'groups' && (
                <GroupStandings groups={(standingsData as GroupStandingsData).groups} />
              )}
              
              {/* League standings (league or combinationA) */}
              {tournamentFormat !== 'knockout' && standingsData?.format !== 'groups' && (
                <>
                  {(!displayStandings || displayStandings.length === 0) ? (
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
                            <th className="text-center text-gray-400 font-semibold py-3 px-4">GF</th>
                            <th className="text-center text-gray-400 font-semibold py-3 px-4">GA</th>
                            <th className="text-center text-gray-400 font-semibold py-3 px-4">GD</th>
                            <th className="text-center text-gray-400 font-semibold py-3 px-4">PTS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayStandings.map((entry) => (
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
                            <td className="text-center text-white py-4 px-4">{(entry as any).goals_for || '-'}</td>
                            <td className="text-center text-white py-4 px-4">{(entry as any).goals_against || '-'}</td>
                            <td className="text-center text-white py-4 px-4">{(entry as any).goal_difference || '-'}</td>
                            <td className="text-center font-bold text-yellow-500 py-4 px-4">{entry.points}</td>
                          </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

            </motion.div>
          )}

          {/* NEW: Individual Stats Tab */}
          {activeTab === "individual-stats" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-8"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Individual Stats</h3>
              
              {/* Sub-tabs for Individual Stats */}
              <div className="flex border-b border-zinc-800 mb-6 overflow-x-auto">
                {[
                  { id: "scorers", label: "Top Scorers" },
                  { id: "assists", label: "Assists" },
                  { id: "clean-sheets", label: "Clean Sheets" },
                  { id: "contributions", label: "G+A/Game" }
                ].map((subTab) => (
                  <button
                    key={subTab.id}
                    onClick={() => setActiveStatTab(subTab.id as any)}
                    className="relative px-6 py-3 text-white font-medium whitespace-nowrap transition-colors hover:bg-zinc-800/50"
                  >
                    {subTab.label}
                    {activeStatTab === subTab.id && (
                      <motion.div
                        layoutId="activeStatTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 to-yellow-600"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Top Scorers Sub-tab */}
              {activeStatTab === "scorers" && (
                <div className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-6">
                  {topScorers.length > 0 ? (
                    <div className="space-y-3">
                      {topScorers.map((scorer, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-zinc-700/50 last:border-0">
                          <div className="flex items-center gap-4">
                            <span className={`font-bold text-lg w-8 ${index === 0 ? 'text-yellow-500' : index < 3 ? 'text-yellow-400/70' : 'text-gray-400'}`}>
                              {index + 1}
                            </span>
                            <div>
                              <div className="text-white font-semibold">{scorer.name}</div>
                              <div className="text-gray-400 text-sm">{scorer.team}</div>
                            </div>
                          </div>
                          <div className="text-3xl font-black text-yellow-500">{scorer.goals}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-400 text-lg">No scorers yet. Matches need to be played first.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Assists Sub-tab */}
              {activeStatTab === "assists" && (
                <div className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-6">
                  {topAssists.length > 0 ? (
                    <div className="space-y-3">
                      {topAssists.map((assister, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-zinc-700/50 last:border-0">
                          <div className="flex items-center gap-4">
                            <span className={`font-bold text-lg w-8 ${index === 0 ? 'text-yellow-500' : index < 3 ? 'text-yellow-400/70' : 'text-gray-400'}`}>
                              {index + 1}
                            </span>
                            <div>
                              <div className="text-white font-semibold">{assister.name}</div>
                              <div className="text-gray-400 text-sm">{assister.team}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-3xl font-black text-yellow-500">{assister.assists}</div>
                              <div className="text-xs text-gray-400">assists</div>
                            </div>
                            {assister.goals !== undefined && assister.goals > 0 && (
                              <div className="text-right">
                                <div className="text-xl font-semibold text-gray-300">{assister.goals}</div>
                                <div className="text-xs text-gray-500">goals</div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-400 text-lg">No assists yet. Matches need to be played first.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Clean Sheets Sub-tab */}
              {activeStatTab === "clean-sheets" && (
                <div className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-6">
                  <div className="text-center py-12">
                    <p className="text-gray-400 text-lg">Clean sheets data will be available after matches are played.</p>
                    <p className="text-gray-500 text-sm mt-2">Only goalkeepers are credited with clean sheets.</p>
                  </div>
                </div>
              )}

              {/* G+A/Game Sub-tab */}
              {activeStatTab === "contributions" && (
                <div className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-6">
                  {/* Calculate G+A/Game from topScorers and topAssists */}
                  {(() => {
                    // Combine scorers and assisters, calculate G+A/Game
                    const contributionsMap = new Map<string, { name: string; team: string; goals: number; assists: number; appearances: number }>();
                    
                    topScorers.forEach(scorer => {
                      const key = `${scorer.name}-${scorer.team}`;
                      contributionsMap.set(key, {
                        name: scorer.name,
                        team: scorer.team,
                        goals: scorer.goals,
                        assists: 0,
                        appearances: scorer.goals // Estimate: assume at least as many appearances as goals
                      });
                    });
                    
                    topAssists.forEach(assister => {
                      const key = `${assister.name}-${assister.team}`;
                      const existing = contributionsMap.get(key);
                      if (existing) {
                        existing.assists = assister.assists;
                        existing.appearances = Math.max(existing.appearances, assister.assists);
                      } else {
                        contributionsMap.set(key, {
                          name: assister.name,
                          team: assister.team,
                          goals: assister.goals || 0,
                          assists: assister.assists,
                          appearances: assister.assists
                        });
                      }
                    });
                    
                    const contributions = Array.from(contributionsMap.values())
                      .map(player => ({
                        ...player,
                        contributionsPerGame: player.appearances > 0 
                          ? ((player.goals + player.assists) / player.appearances).toFixed(1)
                          : '0.0'
                      }))
                      .sort((a, b) => parseFloat(b.contributionsPerGame) - parseFloat(a.contributionsPerGame))
                      .slice(0, 10);
                    
                    return contributions.length > 0 ? (
                      <div className="space-y-3">
                        {contributions.map((player, index) => (
                          <div key={index} className="flex items-center justify-between py-2 border-b border-zinc-700/50 last:border-0">
                            <div className="flex items-center gap-4">
                              <span className={`font-bold text-lg w-8 ${index === 0 ? 'text-yellow-500' : index < 3 ? 'text-yellow-400/70' : 'text-gray-400'}`}>
                                {index + 1}
                              </span>
                              <div>
                                <div className="text-white font-semibold">{player.name}</div>
                                <div className="text-gray-400 text-sm">{player.team}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <div className="text-2xl font-black text-yellow-500">{player.contributionsPerGame}</div>
                                <div className="text-xs text-gray-400">per game</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-gray-300">{player.goals + player.assists}</div>
                                <div className="text-xs text-gray-500">G+A</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-gray-400 text-lg">No goal contributions yet. Matches need to be played first.</p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "awards" && tournament && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-4">Tournament Awards</h3>
                <p className="text-gray-400 mb-6">View all tournament awards and winners</p>
                <a
                  href={tournament.slug ? `/t/${tournament.slug}/awards` : `/tournaments/${tournament.id}/awards`}
                  className="inline-block bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold px-6 py-3 rounded-lg transition-all"
                >
                  View Awards Page
                </a>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

