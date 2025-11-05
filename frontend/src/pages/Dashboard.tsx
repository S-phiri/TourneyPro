// src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Tournament } from '../types/tournament';
import TournamentCard from '../components/TournamentCard';

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
          <h3 className="text-sm font-medium text-red-800">
            Error loading tournaments
          </h3>
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

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api<Tournament[]>('/tournaments/mine/'); // Get only organizer's tournaments
      setTournaments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tournaments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  if (loading) {
    return (
      <div className="container py-8">
        <h1 className="page-header">Your Tournaments</h1>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <h1 className="page-header">Your Tournaments</h1>
        <ErrorAlert message={error} onRetry={fetchTournaments} />
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="page-header">Your Tournaments</h1>
        {user && (
          <p className="text-center text-gray-600">
            Welcome back, {user.first_name || user.username}!
          </p>
        )}
      </div>

      {/* Tournaments Grid */}
      {tournaments.length === 0 ? (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="mb-6">
              <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No tournaments yet</h3>
            <p className="text-gray-500 mb-6">Create your first tournament to get started!</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/host/new" className="btn-primary">
                Create Competition (Wizard)
              </Link>
              <Link to="/start-hosting" className="btn-outline">
                Quick Create (Advanced)
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {tournaments.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                onClick={() => window.location.href = `/tournaments/${tournament.id}`}
              />
            ))}
          </div>

          {/* Create New Tournament Button */}
          <div className="text-center">
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/host/new" className="btn-primary">
                Create Competition (Wizard)
              </Link>
              <Link to="/start-hosting" className="btn-outline">
                Quick Create (Advanced)
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Quick Stats */}
      {tournaments.length > 0 && (
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card text-center">
            <h3 className="text-2xl font-bold text-yellow-600 mb-2">{tournaments.length}</h3>
            <p className="text-gray-600">Total Tournaments</p>
          </div>
          <div className="card text-center">
            <h3 className="text-2xl font-bold text-green-600 mb-2">
              {tournaments.filter(t => t.status === 'open').length}
            </h3>
            <p className="text-gray-600">Active Tournaments</p>
          </div>
          <div className="card text-center">
            <h3 className="text-2xl font-bold text-blue-600 mb-2">
              {tournaments.filter(t => t.status === 'completed').length}
            </h3>
            <p className="text-gray-600">Completed</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
