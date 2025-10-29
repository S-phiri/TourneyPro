import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Tournament, Registration, Match } from '../types/tournament';
import { listRegistrations } from '../lib/registrations';
import { listMatches } from '../lib/matches';
import StatPill from '../components/StatPill';
import { formatDate, formatCurrency } from '../lib/helpers';

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center min-h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
  </div>
);

// Error alert component
const ErrorAlert = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="max-w-md mx-auto mt-8">
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">Error loading tournament</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{message}</p>
          </div>
          <div className="mt-4">
            <button
              onClick={onRetry}
              className="bg-red-100 text-red-800 px-3 py-1 rounded-md text-sm font-medium hover:bg-red-200 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const TournamentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isOrganizer } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'registrations' | 'fixtures' | 'leaderboard'>('registrations');

  const fetchTournament = async () => {
    if (!id) {
      setError('Tournament ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch tournament details
      const tournamentData = await api<Tournament>(`/tournaments/${id}/`);
      setTournament(tournamentData);

      // Fetch related data in parallel
      const [registrationsData, matchesData] = await Promise.all([
        listRegistrations(parseInt(id)),
        listMatches(parseInt(id))
      ]);

      setRegistrations(registrationsData);
      setMatches(matchesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tournament');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournament();
  }, [id]);

  const handleBackToLeagues = () => {
    navigate('/leagues');
  };

  const handleEditTournament = () => {
    navigate(`/tournaments/${id}/edit`);
  };

  const handleRegisterTeam = () => {
    navigate(`/tournaments/${id}/register`);
  };

  const handleManageFixtures = () => {
    navigate(`/tournaments/${id}/fixtures`);
  };

  if (loading) {
    return (
      <div className="container py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="container py-8">
        <div className="mb-6">
          <button
            onClick={handleBackToLeagues}
            className="text-yellow-500 hover:text-yellow-600 font-medium"
          >
            ← Back to Tournaments
          </button>
        </div>
        <ErrorAlert message={error || 'Tournament not found'} onRetry={fetchTournament} />
      </div>
    );
  }

  const completedMatches = matches.filter(match => match.status === 'finished');
  const upcomingMatches = matches.filter(match => match.status === 'scheduled');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={handleBackToLeagues}
                className="text-yellow-500 hover:text-yellow-600 font-medium mb-2"
              >
                ← Back to Tournaments
              </button>
              <h1 className="page-header text-left mb-2">{tournament.name}</h1>
              {tournament.organizer && (
                <p className="text-sm text-gray-600">
                  Hosted by <span className="text-yellow-600 font-medium">{tournament.organizer.username}</span>
                </p>
              )}
            </div>
            
            {/* Status Badge */}
            <div className="flex items-center space-x-3">
              <span className={`pill ${
                tournament.status === 'open' 
                  ? 'bg-green-100 text-green-800' 
                  : tournament.status === 'draft'
                  ? 'bg-gray-100 text-gray-800'
                  : tournament.status === 'closed'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {tournament.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Tournament Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary Stats */}
            <div className="card">
              <h2 className="section-title mb-6">Tournament Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatPill label="Teams Registered" value={registrations.length} />
                <StatPill label="Matches Played" value={completedMatches.length} />
                <StatPill label="Upcoming Matches" value={upcomingMatches.length} />
                <StatPill label="Entry Fee" value={formatCurrency(tournament.entry_fee)} />
              </div>
              
              {/* Tournament Details Grid */}
              <div className="border-t border-gray-200 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Location</h3>
                      <p className="text-gray-600">{tournament.city}</p>
                      {tournament.venue?.name && (
                        <p className="text-gray-600 font-medium">{tournament.venue.name}</p>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Duration</h3>
                      <p className="text-gray-600">{formatDate(tournament.start_date)}</p>
                      <p className="text-gray-600">to {formatDate(tournament.end_date)}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Team Capacity</h3>
                      <p className="text-gray-600">{tournament.team_min} - {tournament.team_max} teams</p>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Entry Fee</h3>
                      <p className="text-gray-600 font-bold text-green-600 text-xl">{formatCurrency(tournament.entry_fee)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs Section */}
            <div className="card">
              <div className="tabs mb-6">
                <button
                  className={`tab ${activeTab === 'registrations' ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab('registrations')}
                >
                  Registrations ({registrations.length})
                </button>
                <button
                  className={`tab ${activeTab === 'fixtures' ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab('fixtures')}
                >
                  Fixtures ({matches.length})
                </button>
                <button
                  className={`tab ${activeTab === 'leaderboard' ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab('leaderboard')}
                >
                  Leaderboard
                </button>
              </div>

              {/* Tab Content */}
              <div className="tab-content">
                {activeTab === 'registrations' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Registered Teams</h3>
                      {isOrganizer && (
                        <button
                          onClick={handleRegisterTeam}
                          className="btn-primary text-sm px-4 py-2"
                        >
                          Add Team
                        </button>
                      )}
                    </div>
                    
                    {registrations.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No teams registered yet.</p>
                        {isOrganizer && (
                          <button
                            onClick={handleRegisterTeam}
                            className="btn-primary mt-4"
                          >
                            Add First Team
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {registrations.map((registration) => (
                          <div key={registration.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-900">{registration.team.name}</h4>
                                <p className="text-sm text-gray-600">
                                  Manager: {registration.team.manager_name}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Email: {registration.team.manager_email}
                                </p>
                              </div>
                              <span className={`pill ${
                                registration.status === 'paid' 
                                  ? 'bg-green-100 text-green-800'
                                  : registration.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {registration.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'fixtures' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Match Fixtures</h3>
                      {isOrganizer && (
                        <button
                          onClick={handleManageFixtures}
                          className="btn-primary text-sm px-4 py-2"
                        >
                          Manage Fixtures
                        </button>
                      )}
                    </div>
                    
                    {matches.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No matches scheduled yet.</p>
                        {isOrganizer && (
                          <button
                            onClick={handleManageFixtures}
                            className="btn-primary mt-4"
                          >
                            Schedule First Match
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {matches.map((match) => (
                          <div key={match.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-4">
                                  <div className="text-center">
                                    <div className="font-semibold">{match.home_team.name}</div>
                                    <div className="text-sm text-gray-600">vs</div>
                                    <div className="font-semibold">{match.away_team.name}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-yellow-600">
                                      {match.home_score} - {match.away_score}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {new Date(match.kickoff_at).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                                {match.pitch && (
                                  <div className="text-sm text-gray-600 mt-2">
                                    Pitch: {match.pitch}
                                  </div>
                                )}
                              </div>
                              <span className={`pill ${
                                match.status === 'finished' 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {match.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'leaderboard' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Leaderboard</h3>
                    <div className="text-center py-8 text-gray-500">
                      <p>Leaderboard coming soon!</p>
                      <p className="text-sm mt-2">Points and standings will be displayed here.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Actions & Venue */}
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="card">
              <h3 className="section-title mb-4">Actions</h3>
              <div className="space-y-3">
                {isOrganizer && (
                  <>
                    <button
                      onClick={handleEditTournament}
                      className="btn-primary w-full"
                    >
                      Edit Tournament
                    </button>
                    <button
                      onClick={handleManageFixtures}
                      className="btn-outline w-full"
                    >
                      Manage Fixtures
                    </button>
                  </>
                )}
                <button
                  onClick={handleRegisterTeam}
                  className={`${isOrganizer ? 'btn-outline' : 'btn-primary'} w-full`}
                >
                  Register Your Team
                </button>
              </div>
            </div>

            {/* Venue Information */}
            {tournament.venue && (
              <div className="card">
                <h3 className="section-title mb-4">Venue</h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{tournament.venue.name}</h4>
                    <p className="text-gray-600">{tournament.venue.city}</p>
                    {tournament.venue.address && (
                      <p className="text-sm text-gray-600">{tournament.venue.address}</p>
                    )}
                  </div>
                  {tournament.venue.map_link && (
                    <a
                      href={tournament.venue.map_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline w-full text-center"
                    >
                      View on Map
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentDetail;