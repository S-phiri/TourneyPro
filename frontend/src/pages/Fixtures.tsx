// src/pages/Fixtures.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { listMatches, createMatch, updateMatch, Match, CreateMatchData } from '../lib/matches';
import { listRegistrations, Registration } from '../lib/registrations';
import { Tournament } from '../types/tournament';

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
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [newMatch, setNewMatch] = useState<CreateMatchData>({
    tournament: parseInt(id || '0'),
    home_team: 0,
    away_team: 0,
    pitch: '',
    kickoff_at: '',
  });
  const [editingMatch, setEditingMatch] = useState<number | null>(null);
  const [scoreUpdate, setScoreUpdate] = useState<{ home: number; away: number }>({ home: 0, away: 0 });

  const { isOrganizer } = useAuth();
  const navigate = useNavigate();

  const fetchData = async () => {
    if (!id) {
      setError('Tournament ID is missing.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [tournamentData, matchesData, registrationsData] = await Promise.all([
        api<Tournament>(`/tournaments/${id}/`),
        listMatches(parseInt(id)),
        listRegistrations(parseInt(id))
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
    try {
      await updateMatch(matchId, {
        home_score: scoreUpdate.home,
        away_score: scoreUpdate.away,
        status: 'finished'
      });
      setEditingMatch(null);
      setScoreUpdate({ home: 0, away: 0 });
      fetchData(); // Refresh matches
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update score');
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
    <div className="container py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/tournaments/${id}`)}
          className="text-yellow-500 hover:text-yellow-600 font-medium mb-4"
        >
          ← Back to Tournament
        </button>
        <h1 className="page-header">{tournament.name} - Fixtures</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Add Match Form (Organizer Only) */}
      {isOrganizer && (
        <div className="mb-8">
          {!showAddMatch ? (
            <button
              onClick={() => setShowAddMatch(true)}
              className="btn-primary mb-4"
            >
              Add Match
            </button>
          ) : (
            <div className="card">
              <h2 className="section-title mb-4">Add New Match</h2>
              <form onSubmit={handleAddMatch} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="home_team" className="form-label">Home Team</label>
                    <select
                      id="home_team"
                      value={newMatch.home_team}
                      onChange={(e) => setNewMatch({ ...newMatch, home_team: parseInt(e.target.value) })}
                      className="form-input"
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
                    <label htmlFor="away_team" className="form-label">Away Team</label>
                    <select
                      id="away_team"
                      value={newMatch.away_team}
                      onChange={(e) => setNewMatch({ ...newMatch, away_team: parseInt(e.target.value) })}
                      className="form-input"
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
                    <label htmlFor="kickoff_at" className="form-label">Kickoff Time</label>
                    <input
                      type="datetime-local"
                      id="kickoff_at"
                      value={newMatch.kickoff_at}
                      onChange={(e) => setNewMatch({ ...newMatch, kickoff_at: e.target.value })}
                      className="form-input"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="pitch" className="form-label">Pitch (Optional)</label>
                    <input
                      type="text"
                      id="pitch"
                      value={newMatch.pitch}
                      onChange={(e) => setNewMatch({ ...newMatch, pitch: e.target.value })}
                      className="form-input"
                      placeholder="e.g., Pitch 1"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <button type="submit" className="btn-primary">
                    Create Match
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddMatch(false)}
                    className="btn-outline"
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
      <div className="card">
        <h2 className="section-title mb-6">Match Schedule</h2>
        
        {matches.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No matches scheduled yet.</p>
            {isOrganizer && (
              <button
                onClick={() => setShowAddMatch(true)}
                className="btn-primary mt-4"
              >
                Add First Match
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Date & Time</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Home Team</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900">Score</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Away Team</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Pitch</th>
                  {isOrganizer && <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => (
                  <tr key={match.id} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-700">
                      {formatDateTime(match.kickoff_at)}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {match.home_team.name}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {editingMatch === match.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            value={scoreUpdate.home}
                            onChange={(e) => setScoreUpdate({ ...scoreUpdate, home: parseInt(e.target.value) || 0 })}
                            className="w-12 px-2 py-1 border border-gray-300 rounded text-center"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="number"
                            value={scoreUpdate.away}
                            onChange={(e) => setScoreUpdate({ ...scoreUpdate, away: parseInt(e.target.value) || 0 })}
                            className="w-12 px-2 py-1 border border-gray-300 rounded text-center"
                          />
                          <button
                            onClick={() => handleUpdateScore(match.id)}
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <span className="font-medium">
                          {match.home_score} - {match.away_score}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {match.away_team.name}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {match.pitch || '-'}
                    </td>
                    {isOrganizer && (
                      <td className="py-3 px-4">
                        {editingMatch !== match.id && match.status === 'scheduled' && (
                          <button
                            onClick={() => setEditingMatch(match.id)}
                            className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                          >
                            Update Score
                          </button>
                        )}
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
  );
};

export default Fixtures;
