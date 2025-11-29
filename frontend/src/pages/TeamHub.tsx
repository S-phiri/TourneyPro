import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getTeam, getTeamBySlug, listTeamPlayers, listMatches, api } from '../lib/api';
import { motion } from 'framer-motion';
import { Users, Trophy, Calendar, DollarSign, MapPin, PlusCircle, Edit, ArrowLeft, Award, Goal, Shield, TrendingUp, BarChart3 } from 'lucide-react';
import TeamChip from '../components/tournament/TeamChip';
import { formatDate } from '../lib/helpers';
import { useAuth } from '../context/AuthContext';
import TournamentNav from '../components/tournament/TournamentNav';
// NEW: Import stats utilities and components
import { computeAllTeamStats } from '../utils/computeStats';
import StatCard from '../components/stats/StatCard';
import TopPerformers from '../components/stats/TopPerformers';

export default function TeamHub() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  
  // Get tournament context from URL if provided
  const tournamentSlugFromUrl = searchParams.get('tournament');

  const [team, setTeam] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [tournamentId, setTournamentId] = useState<number | null>(null);
  const [tournamentSlug, setTournamentSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // NEW: Added 'stats' tab
  const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'fixtures' | 'stats'>('overview');
  
  // Check if current user is the team manager or organiser
  const isManager = user && team && (team.manager?.id === user.id || team.manager_user?.id === user.id);
  const isOrganiser = user?.is_staff || false;

  useEffect(() => {
    async function load() {
      if (!slug) {
        setError('Invalid team slug');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // Try to get team by slug first
        let t;
        try {
          t = await getTeamBySlug(slug);
        } catch (e) {
          // Fallback to ID if slug doesn't work
          const teamIdNum = Number(slug);
          if (isNaN(teamIdNum)) throw e;
          t = await getTeam(teamIdNum);
        }
        setTeam(t);
        const teamIdNum = t.id;
        const roster = await listTeamPlayers({ team: teamIdNum });
        setPlayers(Array.isArray(roster) ? roster : []);
        
        // Get tournament ID and slug - prefer tournament from URL context, otherwise from registration
        let tid: number | null = null;
        let tslug: string | null = null;
        
        // If tournament context is provided in URL, use it
        if (tournamentSlugFromUrl) {
          try {
            const tournamentData = await api<any>(`/tournaments/by-slug/${tournamentSlugFromUrl}/`);
            if (tournamentData) {
              tid = tournamentData.id;
              tslug = tournamentData.slug || tournamentSlugFromUrl;
            }
          } catch (e) {
            console.warn('Failed to fetch tournament from URL context:', e);
          }
        }
        
        // If no tournament from URL, get from team's registration
        if (!tid) {
          const registrationsData = await api<any[]>(`/registrations/?team=${teamIdNum}`);
          
          if (registrationsData && registrationsData.length > 0) {
            // Find the registration for the tournament we're looking for, or use the first one
            let registration = registrationsData.find((r: any) => 
              r.tournament?.slug === tournamentSlugFromUrl || 
              (typeof r.tournament === 'object' && r.tournament?.slug === tournamentSlugFromUrl)
            ) || registrationsData[0];
            
            if (registration?.tournament) {
              const tournament = registration.tournament;
              
              if (typeof tournament === 'object') {
                // Tournament is a full object (from serializer)
                tid = tournament.id;
                tslug = tournament.slug || null;
                
                // If slug is missing, fetch it explicitly
                if (!tslug && tid) {
                  try {
                    const tournamentData = await api<any>(`/tournaments/${tid}/`);
                    if (tournamentData?.slug) {
                      tslug = tournamentData.slug;
                    }
                  } catch (e) {
                    console.warn('Failed to fetch tournament slug:', e);
                  }
                }
              } else if (typeof tournament === 'number') {
                // Tournament is just an ID
                tid = tournament;
                // Fetch full tournament data to get slug
                try {
                  const tournamentData = await api<any>(`/tournaments/${tid}/`);
                  if (tournamentData?.slug) {
                    tslug = tournamentData.slug;
                  }
                } catch (e) {
                  console.warn('Failed to fetch tournament data:', e);
                }
              }
            }
          }
        }
        
        setTournamentId(tid);
        setTournamentSlug(tslug);
        
        // Fetch matches filtered by tournament and team
        if (tid) {
          const m = await listMatches({ tournament: tid, team: teamIdNum });
          setFixtures(Array.isArray(m) ? m : []);
        } else {
          // Try fetching matches with team filter directly
          const m = await listMatches({ team: teamIdNum });
          setFixtures(Array.isArray(m) ? m : []);
        }
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load team');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, tournamentSlugFromUrl]);

  // NEW: Compute derived statistics - must be before early returns (React Hooks rules)
  const computedStats = useMemo(() => {
    if (!team || !fixtures || !players) return null;
    const teamPlayersList = players || [];
    return computeAllTeamStats(fixtures, team?.id, teamPlayersList, team);
  }, [fixtures, players, team]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center p-6">
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">Error</h2>
          <p className="text-gray-400 mb-6">{error || 'Team not found or could not be loaded.'}</p>
          <button 
            onClick={() => navigate('/leagues')} 
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold px-6 py-3 rounded-xl"
          >
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  const upcomingMatches = fixtures.filter((m: any) => m?.status === 'scheduled');
  const pastMatches = fixtures.filter((m: any) => m?.status === 'finished');
  const teamPlayers = players || [];
  const teamInitials = (team.name || 'TE').substring(0, 2).toUpperCase();

  return (
    <div className="min-h-screen relative text-white">
      {/* Background Gradient - Lighter black */}
      <div className="fixed inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-900 -z-10" />
      
      {/* Subtle Football Field Lines Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[1] opacity-10">
        <svg className="absolute inset-0 w-full h-full" style={{ mixBlendMode: 'overlay' }}>
          {/* Center circle */}
          <circle cx="50%" cy="50%" r="15%" fill="none" stroke="rgba(234, 179, 8, 0.3)" strokeWidth="1" />
          {/* Center line */}
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(234, 179, 8, 0.2)" strokeWidth="1" />
          {/* Penalty boxes */}
          <rect x="0" y="30%" width="20%" height="40%" fill="none" stroke="rgba(234, 179, 8, 0.2)" strokeWidth="1" />
          <rect x="80%" y="30%" width="20%" height="40%" fill="none" stroke="rgba(234, 179, 8, 0.2)" strokeWidth="1" />
          {/* Goal boxes */}
          <rect x="0" y="40%" width="8%" height="20%" fill="none" stroke="rgba(234, 179, 8, 0.2)" strokeWidth="1" />
          <rect x="92%" y="40%" width="8%" height="20%" fill="none" stroke="rgba(234, 179, 8, 0.2)" strokeWidth="1" />
        </svg>
      </div>
      
      {/* Subtle Faint Lights */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[1]">
        {[...Array(30)].map((_, i) => {
          const baseX = (i * 6) % 100;
          const baseY = (i * 8) % 100;
          const size = 2 + (i % 2); // 2-3px - much smaller
          const duration = 4 + (i % 3);
          const delay = (i * 0.2) % 2;
          
          return (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${baseX}%`,
                top: `${baseY}%`,
                width: `${size}px`,
                height: `${size}px`,
                background: 'rgba(234, 179, 8, 0.3)',
                boxShadow: '0 0 4px rgba(234, 179, 8, 0.4)',
              }}
              initial={{
                opacity: 0.2,
              }}
              animate={{
                opacity: [0.2, 0.4, 0.2],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: delay,
              }}
            />
          );
        })}
      </div>
      <div className="relative z-10">
      {/* Tournament Navigation */}
      <TournamentNav 
        tournamentId={tournamentId || undefined} 
        tournamentSlug={tournamentSlug || undefined}
        showBackButton={true} 
      />

      {/* Header */}
      <div className="container mx-auto px-6 py-8">

        {/* Team Hero */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-4">
            <TeamChip name={team.name || 'Team'} initials={teamInitials} size="lg" />
          </div>
          <h1 className="text-5xl font-black text-yellow-500 mb-2">{team.name || 'Team'}</h1>
          <p className="text-gray-300 text-xl italic">
            {team.manager_name || 'Manager'}'s Squad
          </p>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8"
        >
          <div className="bg-gradient-to-br from-zinc-900 to-black border border-yellow-500/20 rounded-xl p-6 text-center hover:border-yellow-500/50 transition-all">
            <Users className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
            <p className="text-gray-400 text-sm mb-1">Players</p>
            <p className="text-3xl font-bold text-white">{teamPlayers.length}</p>
          </div>
          <div className="bg-gradient-to-br from-zinc-900 to-black border border-yellow-500/20 rounded-xl p-6 text-center hover:border-yellow-500/50 transition-all">
            <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
            <p className="text-gray-400 text-sm mb-1">Record (W-D-L)</p>
            <p className="text-3xl font-bold text-white">
              {computedStats ? `${computedStats.wins}-${computedStats.draws}-${computedStats.losses}` : `${team.wins ?? 0}-${team.draws ?? 0}-${team.losses ?? 0}`}
            </p>
          </div>
          <div className="bg-gradient-to-br from-zinc-900 to-black border border-yellow-500/20 rounded-xl p-6 text-center hover:border-yellow-500/50 transition-all">
            <Calendar className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
            <p className="text-gray-400 text-sm mb-1">Points</p>
            <p className="text-3xl font-bold text-white">{team.points ?? 0}</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-gradient-to-br from-zinc-900 to-black border border-yellow-500/20 rounded-2xl overflow-hidden"
        >
          {/* Tab Headers */}
          <div className="flex border-b border-zinc-800 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-8 py-4 text-white font-semibold whitespace-nowrap transition-colors hover:bg-zinc-800/50 relative ${
                activeTab === 'overview' ? 'text-yellow-500' : ''
              }`}
            >
              Overview
              {activeTab === 'overview' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-yellow-600"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab('players')}
              className={`px-8 py-4 text-white font-semibold whitespace-nowrap transition-colors hover:bg-zinc-800/50 relative ${
                activeTab === 'players' ? 'text-yellow-500' : ''
              }`}
            >
              Players ({teamPlayers.length})
              {activeTab === 'players' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-yellow-600"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab('fixtures')}
              className={`px-8 py-4 text-white font-semibold whitespace-nowrap transition-colors hover:bg-zinc-800/50 relative ${
                activeTab === 'fixtures' ? 'text-yellow-500' : ''
              }`}
            >
              Fixtures ({fixtures.length})
              {activeTab === 'fixtures' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-yellow-600"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
            {/* NEW: Stats tab */}
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-8 py-4 text-white font-semibold whitespace-nowrap transition-colors hover:bg-zinc-800/50 relative ${
                activeTab === 'stats' ? 'text-yellow-500' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Stats
              </div>
              {activeTab === 'stats' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-yellow-600"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-2xl font-bold text-white mb-4">Team Overview</h3>
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6 space-y-4">
                    <div>
                      <p className="text-gray-400 text-sm">Manager</p>
                      <p className="text-white text-lg font-semibold">
                        {team.manager_name || 'N/A'} <span className="text-gray-400">({team.manager_email || 'N/A'})</span>
                      </p>
                    </div>
                    {team.phone && (
                      <div>
                        <p className="text-gray-400 text-sm">Phone</p>
                        <p className="text-white">{team.phone}</p>
                      </div>
                    )}
                    {upcomingMatches.length > 0 && (
                      <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-4 mt-4">
                        <h4 className="font-semibold text-yellow-500 mb-2">Next Match</h4>
                        <p className="text-white">
                          {upcomingMatches[0].home_team?.name || 'TBA'} vs {upcomingMatches[0].away_team?.name || 'TBA'}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          {upcomingMatches[0].kickoff_at ? formatDate(upcomingMatches[0].kickoff_at) : 'TBC'} at {upcomingMatches[0].pitch || 'TBC'}
                        </p>
                        {/* NEW: View Fixture link */}
                        {upcomingMatches[0].id && (tournamentSlug || tournamentId) && (
                          <button
                            onClick={() => navigate(`/tournaments/${tournamentSlug || tournamentId}/fixtures`)}
                            className="text-yellow-500 text-sm hover:text-yellow-400 hover:underline mt-2 flex items-center gap-1"
                          >
                            View Fixture →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'players' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-white">Roster</h3>
                  {(isManager || isOrganiser) && (
                    <button
                      onClick={() => navigate(`/teams/${slug || team?.id}/add-players`)}
                      className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-yellow-500/20 hover:-translate-y-0.5"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Add Player
                    </button>
                  )}
                </div>
                {teamPlayers.length === 0 ? (
                  <div className="text-center py-12 bg-zinc-800/30 border border-zinc-700 rounded-lg">
                    <p className="text-gray-400 text-lg mb-4">No players in this team yet.</p>
                    {(isManager || isOrganiser) && (
                      <button
                        onClick={() => navigate(`/teams/${slug || team?.id}/add-players`)}
                        className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold px-6 py-3 rounded-xl shadow-lg shadow-yellow-500/20 hover:-translate-y-0.5 transition-all"
                      >
                        Add First Player
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teamPlayers.map((tp: any) => (
                      <motion.div
                        key={tp.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.02, y: -4 }}
                        onClick={() => navigate(`/players/${tp.player?.id}`)}
                        className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 cursor-pointer hover:border-yellow-500/50 transition-all"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <TeamChip
                            initials={(tp.player?.first_name || 'P').substring(0, 2).toUpperCase()}
                            name={`${tp.player?.first_name || ''} ${tp.player?.last_name || ''}`.trim()}
                            size="sm"
                          />
                        </div>
                        <h4 className="font-semibold text-white mb-1 flex items-center gap-2">
                          <span>{tp.player?.first_name || ''} {tp.player?.last_name || ''}</span>
                          {tp.is_captain && (
                            <span className="inline-flex items-center" title="Captain">
                              <Award className="w-4 h-4 text-yellow-500" />
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {tp.player?.position || '—'} {tp.number ? `(#${tp.number})` : ''}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/players/${tp.player?.id}`);
                          }}
                          className="text-yellow-500 text-xs hover:text-yellow-400 hover:underline mt-2"
                        >
                          View Profile →
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* NEW: Stats tab content */}
            {activeTab === 'stats' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Team Summary</h3>
                  {computedStats ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      <StatCard
                        icon={Calendar}
                        label="Played"
                        value={computedStats.played}
                      />
                      <StatCard
                        icon={Trophy}
                        label="Wins"
                        value={computedStats.wins}
                        subValue={`${computedStats.played > 0 ? ((computedStats.wins / computedStats.played) * 100).toFixed(0) : 0}% win rate`}
                      />
                      <StatCard
                        label="Draws"
                        value={computedStats.draws}
                      />
                      <StatCard
                        label="Losses"
                        value={computedStats.losses}
                      />
                      <StatCard
                        icon={Award}
                        label="Points"
                        value={computedStats.points}
                      />
                      <StatCard
                        icon={Goal}
                        label="Goals For"
                        value={computedStats.goalsFor}
                        subValue={`${computedStats.goalsPerMatch.toFixed(1)} per match`}
                      />
                      <StatCard
                        label="Goals Against"
                        value={computedStats.goalsAgainst}
                        subValue={`${computedStats.goalsAgainstPerMatch.toFixed(1)} per match`}
                      />
                      <StatCard
                        icon={TrendingUp}
                        label="Goal Difference"
                        value={computedStats.goalDifference >= 0 ? `+${computedStats.goalDifference}` : computedStats.goalDifference}
                        className={computedStats.goalDifference >= 0 ? 'border-green-500/30' : 'border-red-500/30'}
                      />
                      <StatCard
                        icon={Shield}
                        label="Clean Sheets"
                        value={computedStats.cleanSheets}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-zinc-800/30 border border-zinc-700 rounded-lg">
                      <p className="text-gray-400 text-lg">No statistics available yet.</p>
                      <p className="text-gray-500 text-sm mt-2">Statistics will appear after matches have been played.</p>
                    </div>
                  )}
                </div>

                {computedStats && computedStats.topPerformers.length > 0 && (
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-6">Top Performers</h3>
                    <TopPerformers
                      performers={computedStats.topPerformers}
                      onPlayerClick={(playerId) => navigate(`/players/${playerId}`)}
                    />
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'fixtures' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="text-2xl font-bold text-white mb-6">Matches</h3>
                {fixtures.length === 0 ? (
                  <div className="text-center py-12 bg-zinc-800/30 border border-zinc-700 rounded-lg">
                    <p className="text-gray-400 text-lg">No matches scheduled or played for this team.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fixtures.map((match: any) => (
                      <motion.div
                        key={match.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 hover:border-yellow-500/50 transition-all"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-white font-semibold text-lg">
                              {match.home_team?.name || 'TBA'} vs {match.away_team?.name || 'TBA'}
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                              {match.kickoff_at ? formatDate(match.kickoff_at) : 'TBC'} - {match.pitch || 'TBC'}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            match.status === 'finished' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-500/20 text-zinc-400'
                          }`}>
                            {match.status?.toUpperCase() || 'SCHEDULED'}
                          </span>
                        </div>
                        {match.status === 'finished' && (
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-2">
                              <TeamChip name={match.home_team?.name || 'Home'} initials={(match.home_team?.name || 'H').substring(0, 2).toUpperCase()} size="sm" />
                              <span className="text-2xl font-black text-white">{match.home_score ?? 0}</span>
                            </div>
                            <span className="text-gray-500 font-bold">-</span>
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-black text-white">{match.away_score ?? 0}</span>
                              <TeamChip name={match.away_team?.name || 'Away'} initials={(match.away_team?.name || 'A').substring(0, 2).toUpperCase()} size="sm" />
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
      </div>
    </div>
  );
}
