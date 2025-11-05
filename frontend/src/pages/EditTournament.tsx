import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
            Error
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

const EditTournament: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id) {
      setError('Tournament ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch both tournament and venues in parallel
      const [tournamentData, venuesData] = await Promise.all([
        api<Tournament>(`/tournaments/${id}/`),
        api<Venue[]>('/venues/')
      ]);

      setTournament(tournamentData);
      setVenues(venuesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSubmit = async (payload: Partial<Tournament>) => {
    if (!id) return;

    try {
      setError(null);
      setSuccess(null);

      // Prepare the payload for the backend
      const venueId = payload.venue_id || (tournament.venue as any)?.id;
      if (!venueId) {
        setError('Venue is required');
        return;
      }

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
        format: (payload as any).format || tournament.format || 'league',
        hero_image: payload.hero_image,
        venue_id: venueId, // Send venue_id to serializer
        // Include all marketing fields
        tagline: (payload as any).tagline,
        logo_url: (payload as any).logo_url,
        banner_image: (payload as any).banner_image,
        gallery_urls: (payload as any).gallery_urls,
        sponsors: (payload as any).sponsors,
        rules_md: (payload as any).rules_md,
        prizes_md: (payload as any).prizes_md,
        contact_email: (payload as any).contact_email,
        contact_phone: (payload as any).contact_phone,
        whatsapp_url: (payload as any).whatsapp_url,
        registration_deadline: (payload as any).registration_deadline,
        published: (payload as any).published !== undefined ? (payload as any).published : tournament.published
      };

      await api(`/tournaments/${id}/`, {
        method: 'PUT',
        body: JSON.stringify(submitPayload)
      });

      setSuccess('Tournament updated successfully!');
      
      // Navigate to tournament detail page after a short delay
      setTimeout(() => {
        navigate(`/tournaments/${id}`);
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tournament');
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <h1 className="page-header">Edit Tournament</h1>
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="container py-8">
        <h1 className="page-header">Edit Tournament</h1>
        <ErrorAlert 
          message={error || 'Tournament not found'} 
          onRetry={fetchData}
        />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="page-header">Edit Tournament</h1>
      
      {/* Success Message */}
      {success && <SuccessAlert message={success} />}
      
      {/* Error Message */}
      {error && <ErrorAlert message={error} />}

      {/* Tournament Form */}
      <TournamentForm
        initial={tournament}
        venues={venues}
        submitLabel="Save Changes"
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default EditTournament;
