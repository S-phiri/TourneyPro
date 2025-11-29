import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getRegistrationStatus } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface RegistrationStatus {
  status: 'pending' | 'paid' | 'cancelled' | null;
  team_id: number | null;
  tournament_id: number | null;
  tournament_slug: string | null;
  can_edit: boolean;
  reason: string | null;
}

const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_TIME = 30000; // 30 seconds max

export default function RegistrationSuccess() {
  const { id, slug } = useParams<{ id?: string; slug?: string }>();
  const [searchParams] = useSearchParams();
  const registrationIdParam = searchParams.get('registrationId');
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [status, setStatus] = useState<RegistrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);
  const [pollStartTime] = useState(Date.now());
  const [manualRefresh, setManualRefresh] = useState(0);

  const registrationId = registrationIdParam ? parseInt(registrationIdParam) : null;

  useEffect(() => {
    if (!registrationId) {
      setError('Missing registration ID');
      setLoading(false);
      return;
    }

    const checkStatus = async () => {
      try {
        const data = await getRegistrationStatus(registrationId);
        setStatus(data);
        setError(null);
        
        // If paid and user can edit, redirect to roster
        if (data.status === 'paid' && data.can_edit && data.team_id) {
          setPolling(false);
          // Small delay to show success message
          setTimeout(() => {
            // Navigate to add players page (teams route doesn't need tournament in path)
            navigate(`/teams/${data.team_id}/add-players?onboard=1`);
          }, 500);
          return;
        }
        
        // Stop polling if max time exceeded
        if (Date.now() - pollStartTime > MAX_POLL_TIME) {
          setPolling(false);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to check registration status');
        setPolling(false);
      } finally {
        setLoading(false);
      }
    };

    // Initial check
    checkStatus();

    // Poll if status is pending
    if (polling) {
      const interval = setInterval(() => {
        if (Date.now() - pollStartTime <= MAX_POLL_TIME) {
          checkStatus();
        } else {
          setPolling(false);
          clearInterval(interval);
        }
      }, POLL_INTERVAL);

      return () => clearInterval(interval);
    }
  }, [registrationId, polling, pollStartTime, navigate, slug, id, manualRefresh]);

  const handleManualRefresh = () => {
    setManualRefresh(prev => prev + 1);
    setPolling(true);
  };

  if (loading && !status) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container py-12">
          <div className="max-w-2xl mx-auto">
            <div className="card text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">Error</h1>
                <p className="text-lg text-gray-700 mb-4">{error}</p>
                <button
                  onClick={handleManualRefresh}
                  className="btn-primary"
                >
                  Refresh Status
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isPaid = status?.status === 'paid';
  const isPending = status?.status === 'pending';
  const isCancelled = status?.status === 'cancelled';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-12">
        <div className="max-w-2xl mx-auto">
          {/* Success/Pending Message */}
          <div className="card text-center mb-8">
            <div className="mb-6">
              {isPaid ? (
                <>
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h1 className="text-3xl font-bold text-green-600 mb-3">Payment Confirmed!</h1>
                  <p className="text-lg text-gray-700 mb-2">
                    Your registration has been confirmed and your team is ready to go.
                  </p>
                </>
              ) : isPending ? (
                <>
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mb-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
                  </div>
                  <h1 className="text-3xl font-bold text-yellow-600 mb-3">Waiting for Payment</h1>
                  <p className="text-lg text-gray-700 mb-2">
                    We're confirming your payment. This usually takes about 10 seconds.
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Please don't close this page. We'll redirect you automatically once payment is confirmed.
                  </p>
                </>
              ) : isCancelled ? (
                <>
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h1 className="text-3xl font-bold text-red-600 mb-3">Registration Cancelled</h1>
                  <p className="text-lg text-gray-700 mb-2">
                    This registration has been cancelled.
                  </p>
                </>
              ) : null}
            </div>

            {/* Status Info */}
            {status && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className={`ml-2 font-semibold ${
                      isPaid ? 'text-green-600' : isPending ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {status.status?.toUpperCase() || 'Unknown'}
                    </span>
                  </div>
                  {status.team_id && (
                    <div>
                      <span className="text-gray-600">Team ID:</span>
                      <span className="ml-2 font-semibold">{status.team_id}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-4">
              {isPending && polling && (
                <>
                  <button
                    onClick={handleManualRefresh}
                    className="btn-outline w-full"
                  >
                    Refresh Status
                  </button>
                  <p className="text-xs text-gray-500">
                    Auto-refreshing every 2 seconds...
                  </p>
                </>
              )}
              
              {isPaid && status.can_edit && status.team_id && (
                <button
                  onClick={() => {
                    // Navigate to add players page (teams route doesn't need tournament in path)
                    navigate(`/teams/${status.team_id}/add-players?onboard=1`);
                  }}
                  className="btn-primary w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 text-lg"
                >
                  Go to Team Roster →
                </button>
              )}

              {(isPending || isCancelled || !polling) && (
                <button
                  onClick={() => {
                    // Navigate to tournament using slug or ID
                    if (status.tournament_slug) {
                      navigate(`/tournaments/${status.tournament_slug}`);
                    } else if (status.tournament_id) {
                      navigate(`/tournaments/${status.tournament_id}`);
                    } else if (slug) {
                      navigate(`/tournaments/${slug}`);
                    } else if (id) {
                      navigate(`/tournaments/${id}`);
                    } else {
                      navigate('/leagues');
                    }
                  }}
                  className="btn-outline w-full"
                >
                  Back to Tournament
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

