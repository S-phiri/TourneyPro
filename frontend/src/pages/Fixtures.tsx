// src/pages/Fixtures.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { listMatches, createMatch, updateMatch, Match, CreateMatchData } from '../lib/matches';
import { listRegistrations, Registration } from '../lib/registrations';
import { Tournament } from '../types/tournament';
import TournamentNav from '../components/tournament/TournamentNav';
import UpdateScoreModal from '../components/tournament/UpdateScoreModal';

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center min-h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
  </div>
);

// Error alert component
const ErrorAlert = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="max-w-md mx-auto mt-8">
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Error loading fixtures
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{message}</p>
          </div>
          {onRetry && (
            <div className="mt-4">
              <button
                onClick={onRetry}
                className="bg-red-100 text-red-800 px-3 py-1 rounded-md text-sm font-medium hover:bg-red-200 transition-colors"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

const Fixtures: React.FC = () => {
  const params = useParams<{ id?: string; slug?: string }>();
  const id = params.id;
  const slug = params.slug;
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [newMatch, setNewMatch] = useState<CreateMatchData>({
    tournament: 0,
    home_team: 0,
    away_team: 0,
    pitch: '',
    kickoff_at: '',
  });
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);

  const { isOrganizer } = useAuth();
  const navigate = useNavigate();

  const fetchData = async () => {
    if (!id && !slug) {
      setError('Tournament ID or slug is missing.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch tournament by ID or slug
      let tournamentData: Tournament;
      if (id) {
        tournamentData = await api<Tournament>(`/tournaments/${id}/`);
      } else if (slug) {
        tournamentData = await api<Tournament>(`/tournaments/by-slug/${slug}/`);
      } else {
        throw new Error('Tournament ID or slug is required');
      }

      // Update newMatch with tournament ID
      setNewMatch(prev => ({ ...prev, tournament: tournamentData.id }));

      const [matchesData, registrationsData] = await Promise.all([
        listMatches(tournamentData.id),
        listRegistrations(tournamentData.id)
      ]);

      setTournament(tournamentData);
      setMatches(matchesData);
      setRegistrations(registrationsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tournament data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMatch(newMatch);
      setNewMatch({
        tournament: parseInt(id || '0'),
        home_team: 0,
        away_team: 0,
        pitch: '',
        kickoff_at: '',
      });
      setShowAddMatch(false);
      fetchData(); // Refresh matches
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create match');
    }
  };

  const handleUpdateScore = async (matchId: number) => {
    // Find the match and open modal
    const match = matches.find(m => m.id === matchId);
    if (match) {
      setEditingMatch(match);
      setShowScoreModal(true);
    }
  };

  const handleSaveScore = async (
    scores: { home: number; away: number }, 
    scorers: { home: number[]; away: number[] },
    assists: { home: (number | null)[]; away: (number | null)[] } // NEW: assists parameter
  ) => {
    if (!editingMatch) return;
    
    try {
      // Use the score endpoint which handles scorers and assists
      await api(`/matches/${editingMatch.id}/score/`, {
        method: 'POST',
        body: JSON.stringify({
          home_score: scores.home,
          away_score: scores.away,
          home_scorers: scorers.home,
          away_scorers: scorers.away,
          home_assists: assists.home, // NEW: Send assists
          away_assists: assists.away   // NEW: Send assists
        })
      });
      
      setEditingMatch(null);
      setShowScoreModal(false);
      fetchData(); // Refresh matches
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update score');
      throw err; // Re-throw to let modal handle it
    }
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="container py-8">
        <h1 className="page-header">Fixtures</h1>
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="container py-8">
        <h1 className="page-header">Fixtures</h1>
        <ErrorAlert message={error || 'Tournament not found'} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
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
      <TournamentNav tournamentId={tournament.id} />

      <div className="container py-8">
        <h1 className="text-4xl font-black text-yellow-500 mb-6">{tournament.name} - Fixtures</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Add Match Form (Organizer Only) */}
        {isOrganizer && (
          <div className="mb-8">
            {!showAddMatch ? (
              <button
                onClick={() => setShowAddMatch(true)}
                className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black rounded-xl font-bold transition-all shadow-lg shadow-yellow-500/20 hover:-translate-y-0.5 mb-4 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Match
              </button>
            ) : (
              <div className="bg-zinc-900/50 border border-zinc-700 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Add New Match</h2>
                <form onSubmit={handleAddMatch} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="home_team" className="block text-sm font-medium text-gray-300 mb-2">Home Team</label>
                      <select
                        id="home_team"
                        value={newMatch.home_team}
                        onChange={(e) => setNewMatch({ ...newMatch, home_team: parseInt(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-yellow-500 transition-colors"
                        required
                      >
                        <option value={0}>Select home team</option>
                        {registrations.map(reg => (
                          <option key={reg.team.id} value={reg.team.id}>
                            {reg.team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="away_team" className="block text-sm font-medium text-gray-300 mb-2">Away Team</label>
                      <select
                        id="away_team"
                        value={newMatch.away_team}
                        onChange={(e) => setNewMatch({ ...newMatch, away_team: parseInt(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-yellow-500 transition-colors"
                        required
                      >
                        <option value={0}>Select away team</option>
                        {registrations.map(reg => (
                          <option key={reg.team.id} value={reg.team.id}>
                            {reg.team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="kickoff_at" className="block text-sm font-medium text-gray-300 mb-2">Kickoff Time</label>
                      <input
                        type="datetime-local"
                        id="kickoff_at"
                        value={newMatch.kickoff_at}
                        onChange={(e) => setNewMatch({ ...newMatch, kickoff_at: e.target.value })}
                        className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-yellow-500 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="pitch" className="block text-sm font-medium text-gray-300 mb-2">Pitch (Optional)</label>
                      <input
                        type="text"
                        id="pitch"
                        value={newMatch.pitch}
                        onChange={(e) => setNewMatch({ ...newMatch, pitch: e.target.value })}
                        className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition-colors"
                        placeholder="e.g., Pitch 1"
                      />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      type="submit" 
                      className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black rounded-xl font-bold transition-all shadow-lg shadow-yellow-500/20 hover:-translate-y-0.5"
                    >
                      Create Match
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddMatch(false)}
                      className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white rounded-xl font-medium transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Matches List */}
        <div className="bg-zinc-900/50 border border-zinc-700 rounded-2xl p-8">
          <h2 className="text-3xl font-bold text-white mb-6">Match Schedule</h2>
          
          {matches.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No matches scheduled yet.</p>
              {isOrganizer && (
                <button
                  onClick={() => setShowAddMatch(true)}
                  className="mt-4 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black rounded-xl font-bold text-sm transition-all shadow-lg shadow-yellow-500/20 hover:-translate-y-0.5"
                >
                  Add First Match
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left py-4 px-4 font-bold text-white">Date & Time</th>
                    <th className="text-left py-4 px-4 font-bold text-white">Home Team</th>
                    <th className="text-center py-4 px-4 font-bold text-white">Score</th>
                    <th className="text-left py-4 px-4 font-bold text-white">Away Team</th>
                    <th className="text-left py-4 px-4 font-bold text-white">Pitch</th>
                    {isOrganizer && <th className="text-left py-4 px-4 font-bold text-white">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match) => (
                    <tr key={match.id} className="border-b border-zinc-700/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="py-4 px-4 text-gray-300">
                        {formatDateTime(match.kickoff_at)}
                      </td>
                      <td className="py-4 px-4 font-semibold text-white">
                        {match.home_team.name}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-2xl font-black text-yellow-400">
                          {match.home_score} - {match.away_score}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-semibold text-white">
                        {match.away_team.name}
                      </td>
                      <td className="py-4 px-4 text-gray-400">
                        {match.pitch || '-'}
                      </td>
                      {isOrganizer && (
                        <td className="py-4 px-4">
                          <button
                            onClick={() => handleUpdateScore(match.id)}
                            className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black rounded-lg font-bold text-sm transition-all shadow-lg shadow-yellow-500/20 hover:-translate-y-0.5"
                          >
                            ⚽ Update Score
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Score Update Modal */}
      {editingMatch && (
        <UpdateScoreModal
          isOpen={showScoreModal}
          onClose={() => {
            setShowScoreModal(false);
            setEditingMatch(null);
          }}
          matchId={editingMatch.id}
          homeTeam={editingMatch.home_team}
          awayTeam={editingMatch.away_team}
          currentScores={{ home: editingMatch.home_score, away: editingMatch.away_score }}
          onSave={handleSaveScore}
        />
      )}
      </div>
    </div>
  );
};

export default Fixtures;
