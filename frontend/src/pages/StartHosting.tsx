import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Tournament, Venue } from '../types/tournament';
import TournamentForm from '../components/TournamentForm';

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center min-h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// Error alert component
const ErrorAlert = ({ message }: { message: string }) => (
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
            Error
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{message}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Success alert component
const SuccessAlert = ({ message }: { message: string }) => (
  <div className="max-w-md mx-auto mt-8">
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-green-800">
            Success
          </h3>
          <div className="mt-2 text-sm text-green-700">
            <p>{message}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const StartHosting: React.FC = () => {
  const navigate = useNavigate();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api<Venue[]>('/venues/');
      setVenues(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch venues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const handleSubmit = async (payload: Partial<Tournament>) => {
    try {
      setError(null);
      setSuccess(null);

      // Prepare the payload for the backend
      const submitPayload = {
        name: payload.name,
        description: payload.description,
        city: payload.city,
        start_date: payload.start_date,
        end_date: payload.end_date,
        entry_fee: payload.entry_fee,
        team_min: payload.team_min,
        team_max: payload.team_max,
        status: payload.status,
        hero_image: payload.hero_image,
        venue_id: payload.venue_id // Backend expects 'venue_id' field
      };

      const created = await api<any>('/tournaments/', {
        method: 'POST',
        body: JSON.stringify(submitPayload)
      });

      setSuccess('Tournament created successfully!');
      
      // Navigate to tournament detail using slug (or ID as fallback)
      const tournamentSlug = created.slug || created.id;
      setTimeout(() => {
        navigate(`/tournaments/${tournamentSlug}`);
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tournament');
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <h1 className="page-header">Create Your Tournament</h1>
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !venues.length) {
    return (
      <div className="container py-8">
        <h1 className="page-header">Create Your Tournament</h1>
        <ErrorAlert message={error} />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="text-center mb-8">
        <h1 className="page-header">Create Your Tournament</h1>
        <p className="text-gray-600 max-w-2xl mx-auto mb-4">
          Create your next football showdown and bring teams together for an unforgettable experience.
        </p>
        <Link
          to="/host/new"
          className="inline-block px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold rounded-lg transition-colors"
        >
          Use Step-by-Step Wizard →
        </Link>
      </div>
      
      {/* Success Message */}
      {success && <SuccessAlert message={success} />}
      
      {/* Error Message */}
      {error && <ErrorAlert message={error} />}

      {/* Tournament Form */}
      <TournamentForm
        venues={venues}
        submitLabel="Create Tournament"
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default StartHosting;
