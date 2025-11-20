import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api, registerTeamToTournament } from '../lib/api';
import { Tournament } from '../types/tournament';
import { formatDate, formatCurrency, getDaysUntilDeadline, getDeadlineColor } from '../lib/helpers';
import { useAuth } from '../context/AuthContext';
import { saveAuthToken } from '../lib/auth';

interface TeamFormData {
  name: string;
  manager_name: string;
  manager_email: string;
  manager_password: string;
  phone: string;
  note: string;
}

interface FormErrors {
  name?: string;
  manager_name?: string;
  manager_email?: string;
  manager_password?: string;
  phone?: string;
}

const RegisterTeam: React.FC = () => {
  const { id, slug } = useParams<{ id?: string; slug?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, roleHint, getMe, user, isLoading } = useAuth();
  const isManager = isAuthenticated && roleHint === 'manager';
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [formData, setFormData] = useState<TeamFormData>({
    name: '',
    manager_name: '',
    manager_email: '',
    manager_password: '',
    phone: '',
    note: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [registrationId, setRegistrationId] = useState<number | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NEW: Ensure only authenticated managers can access this page
  useEffect(() => {
    if (isLoading) {
      return;
    }

    const targetPath = id
      ? `/tournaments/${id}/register`
      : slug
        ? `/t/${slug}/register`
        : location.pathname;

    if (!isAuthenticated) {
      navigate('/manager/login', {
        replace: true,
        state: {
          from: { pathname: targetPath },
          message: 'Sign in as a manager to register your team.',
        },
      });
      return;
    }

    if (!isManager) {
      navigate('/manager/signup', {
        replace: true,
        state: {
          from: { pathname: targetPath },
          message: 'Create a manager account before registering a team.',
        },
      });
    }
  }, [isLoading, isAuthenticated, isManager, navigate, id, slug, location.pathname]);

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        setLoading(true);
        let data: Tournament;
        
        if (slug) {
          data = await api<Tournament>(`/tournaments/by-slug/${slug}/`);
        } else if (id) {
          data = await api<Tournament>(`/tournaments/${id}/`);
        } else {
          setError('Invalid tournament identifier');
          return;
        }
        
        setTournament(data);
        
        // Fire analytics event
        if (typeof window !== 'undefined' && window.dataLayer) {
          window.dataLayer.push({ event: 'team_register_attempt' });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tournament details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTournament();
  }, [id, slug]);

  // NEW: Prefill manager details from authenticated user
  useEffect(() => {
    if (!isManager || !user) {
      return;
    }

    setFormData(prev => ({
      ...prev,
      manager_email: prev.manager_email || user.email || '',
      manager_name:
        prev.manager_name || [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username || '',
      manager_password: '',
    }));
  }, [isManager, user]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Team name is required';
    }
    
    if (!formData.manager_name.trim()) {
      newErrors.manager_name = 'Manager name is required';
    }
    
    if (!formData.manager_email.trim()) {
      newErrors.manager_email = 'Email is required';
    } else if (!validateEmail(formData.manager_email)) {
      newErrors.manager_email = 'Please enter a valid email address';
    }
    
    if (!isManager) {
      if (!formData.manager_password.trim()) {
        newErrors.manager_password = 'Password is required';
      } else if (formData.manager_password.length < 8) {
        newErrors.manager_password = 'Password must be at least 8 characters';
      }
    }
    
    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    if (!rulesAccepted && tournament?.rules_md) {
      setError('Please accept the rules to continue');
      return;
    }

    const tournamentId = tournament?.id;
    if (!tournamentId) {
      setError('Invalid tournament');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const teamPayload: {
        name: string;
        manager_name: string;
        manager_email: string;
        manager_password?: string;
        phone?: string;
      } = {
        name: formData.name.trim(),
        manager_name: formData.manager_name.trim(),
        manager_email: formData.manager_email.trim(),
      };

      if (!isManager && formData.manager_password.trim()) {
        teamPayload.manager_password = formData.manager_password.trim();
      }

      if (formData.phone.trim()) {
        teamPayload.phone = formData.phone.trim();
      }

      const response: any = await registerTeamToTournament(tournamentId, {
        team: teamPayload,
        note: formData.note.trim() || undefined,
      });
      
      // Store registration ID and team ID for success screen
      setRegistrationId(response.registration_id);
      setTeamId(response.team_id);
      
      // If a new user account was created, log them in automatically
      if (response.tokens && response.user_created) {
        try {
          // Save tokens first
          saveAuthToken(response.tokens.access, response.tokens.refresh);
          // Refresh user context - wait for it to complete
          await getMe();
        } catch (e) {
          console.error('Failed to auto-login after registration:', e);
          // Continue anyway - they can log in manually later
        }
      } else if (isAuthenticated) {
        // Refresh user data if already authenticated
        try {
          await getMe();
        } catch (e) {
          // Ignore errors refreshing user data
        }
      }
      
      // Show success screen briefly, then redirect to tournament
      setIsSubmitted(true);
      
      // Fire success analytics event
      if (typeof window !== 'undefined' && window.dataLayer) {
        window.dataLayer.push({ event: 'team_register_success' });
      }
      
      // NEW: Automatically redirect to the tournament page after 2 seconds
      setTimeout(() => {
        if (slug) {
          navigate(`/t/${slug}?registered=1`);
        } else if (tournamentId) {
          navigate(`/tournaments/${tournamentId}?registered=1`);
        }
      }, 2000);
    } catch (err: any) {
      // Parse error message from backend
      let errorMessage = 'Failed to register team. Please try again.';
      if (err instanceof Error) {
        try {
          const errorData = JSON.parse(err.message);
          errorMessage = errorData.detail || Object.values(errorData).flat().join(' ');
        } catch {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name as keyof FormErrors]: undefined }));
    }
    
    if (error) {
      setError(null);
    }
  };

  const handleBlur = (field: keyof TeamFormData) => {
    if (field === 'manager_email') {
      if (formData.manager_email && !validateEmail(formData.manager_email)) {
        setErrors(prev => ({ ...prev, manager_email: 'Please enter a valid email address' }));
      }
    }
  };

  const isRegistrationClosed = () => {
    if (!tournament) return true;
    if (tournament.status !== 'open') return true;
    if (tournament.registration_deadline) {
      const deadline = new Date(tournament.registration_deadline);
      return new Date() > deadline;
    }
    return false;
  };

  const daysUntilDeadline = tournament?.registration_deadline 
    ? getDaysUntilDeadline(tournament.registration_deadline)
    : null;

  if (loading && !tournament) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="container py-8">
        <div className="card max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Tournament Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'Unable to load tournament details'}</p>
          <button onClick={() => navigate('/leagues')} className="btn-primary">
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  const registrationClosed = isRegistrationClosed();

  if (isSubmitted) {
    const isHost = isAuthenticated; // You can add more logic to check if user is the organizer
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container py-12">
          <div className="max-w-2xl mx-auto">
            {/* Success Message */}
            <div className="card text-center mb-8">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-yellow-600 mb-3">Registration Successful!</h1>
                <p className="text-lg text-gray-700 mb-2">
                  Your team has been registered for <span className="font-semibold">{tournament.name}</span>.
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  You can now manage your team, add players, and complete payment when ready.
                </p>
                <p className="text-xs text-yellow-600 font-medium mb-4">
                  Redirecting to tournament page...
                </p>
                {registrationId && (
                  <p className="text-xs text-gray-500">
                    Registration ID: {registrationId}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              {teamId && (
                <>
                  <button 
                    onClick={() => navigate(`/teams/${teamId}/add-players`)}
                    className="btn-primary w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-3 text-lg"
                  >
                    ➕ Add Players →
                  </button>
                  <button 
                    onClick={() => navigate(`/teams/${teamId}`)}
                    className="btn-outline w-full border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                  >
                    Go to Team Hub →
                  </button>
                </>
              )}
              
              {/* Pay Now Button - Payment integration will be added here */}
              <button 
                onClick={() => alert('Payment integration coming soon! This would redirect to payment gateway.')}
                className="btn-outline w-full border-yellow-500 text-yellow-600 hover:bg-yellow-50"
              >
                Pay {formatCurrency(tournament.entry_fee)} Now
              </button>
              
              <button 
                onClick={() => navigate(tournament.id ? `/tournaments/${tournament.id}` : `/t/${slug}`)} 
                className="btn-outline w-full"
              >
                View Tournament
              </button>
              
              {tournament.whatsapp_url && (
                <a
                  href={tournament.whatsapp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline w-full text-center flex items-center justify-center space-x-2"
                >
                  <span>💬</span>
                  <span>Share via WhatsApp</span>
                </a>
              )}
              
              {isHost && tournament.id && (
                <button
                  onClick={() => navigate(`/tournaments/${tournament.id}/fixtures`)}
                  className="btn-outline w-full"
                >
                  Manage Fixtures
                </button>
              )}
              
              <button 
                onClick={() => navigate('/leagues')} 
                className="btn-outline w-full"
              >
                Browse More Tournaments
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container py-6">
          <button
            onClick={() => navigate(-1)}
            className="text-yellow-500 hover:text-yellow-600 font-medium mb-4"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Register your team</h1>
          <p className="text-lg text-gray-600">{tournament.name}</p>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="section-title mb-6">Team Information</h2>
              
              {registrationClosed && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-red-800 font-medium">Registration is closed for this tournament</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Team Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Team Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={() => handleBlur('name')}
                    className={`form-input w-full ${errors.name ? 'border-red-500' : ''}`}
                    placeholder="Enter your team name"
                    required
                    disabled={loading || registrationClosed}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                {/* Manager Name */}
                <div>
                  <label htmlFor="manager_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Manager Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="manager_name"
                    name="manager_name"
                    value={formData.manager_name}
                    onChange={handleChange}
                    onBlur={() => handleBlur('manager_name')}
                    className={`form-input w-full ${errors.manager_name ? 'border-red-500' : ''}`}
                    placeholder="Enter manager's full name"
                    required
                    disabled={loading || registrationClosed}
                  />
                  {errors.manager_name && <p className="mt-1 text-sm text-red-600">{errors.manager_name}</p>}
                </div>

                {/* Manager Email */}
                <div>
                  <label htmlFor="manager_email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="manager_email"
                    name="manager_email"
                    value={formData.manager_email}
                    onChange={handleChange}
                    onBlur={() => handleBlur('manager_email')}
                    className={`form-input w-full ${errors.manager_email ? 'border-red-500' : ''}`}
                    placeholder="Enter email address"
                    required
                    disabled={loading || registrationClosed || isManager}
                  />
                  {errors.manager_email && <p className="mt-1 text-sm text-red-600">{errors.manager_email}</p>}
                  {isManager && (
                    <p className="mt-1 text-xs text-gray-500">Using your signed-in manager account email.</p>
                  )}
                </div>

                {/* Manager Password - only for new accounts */}
                {!isManager && (
                  <div>
                    <label htmlFor="manager_password" className="block text-sm font-medium text-gray-700 mb-2">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      id="manager_password"
                      name="manager_password"
                      value={formData.manager_password}
                      onChange={handleChange}
                      onBlur={() => handleBlur('manager_password')}
                      className={`form-input w-full ${errors.manager_password ? 'border-red-500' : ''}`}
                      placeholder="Create a password (min 8 characters)"
                      required
                      disabled={loading || registrationClosed}
                    />
                    {errors.manager_password && <p className="mt-1 text-sm text-red-600">{errors.manager_password}</p>}
                    <p className="mt-1 text-xs text-gray-500">You'll use this to log in and manage your team</p>
                  </div>
                )}

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    onBlur={() => handleBlur('phone')}
                    className={`form-input w-full ${errors.phone ? 'border-red-500' : ''}`}
                    placeholder="Enter phone number (optional)"
                    disabled={loading || registrationClosed}
                  />
                  {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                </div>

                {/* Note */}
                <div>
                  <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    id="note"
                    name="note"
                    value={formData.note}
                    onChange={handleChange}
                    className="form-input w-full h-24"
                    placeholder="Any additional information you'd like to provide..."
                    disabled={loading || registrationClosed}
                  />
                </div>

                {/* Rules Acceptance */}
                {tournament.rules_md && (
                  <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <input
                      type="checkbox"
                      id="rulesAccepted"
                      checked={rulesAccepted}
                      onChange={(e) => setRulesAccepted(e.target.checked)}
                      className="mt-1 h-4 w-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                      disabled={loading || registrationClosed}
                    />
                    <label htmlFor="rulesAccepted" className="text-sm text-gray-700">
                      I accept the tournament rules and regulations
                      {tournament.rules_md && (
                        <a 
                          href="#rules" 
                          onClick={(e) => {
                            e.preventDefault();
                            // Scroll to rules section if on page
                            const rulesEl = document.getElementById('rules');
                            if (rulesEl) rulesEl.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="text-yellow-600 hover:text-yellow-700 underline ml-1"
                        >
                          (view rules)
                        </a>
                      )}
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || registrationClosed || (tournament.rules_md && !rulesAccepted)}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    loading || registrationClosed || (tournament.rules_md && !rulesAccepted)
                      ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                      : 'btn-primary'
                  }`}
                >
                  {loading ? 'Registering...' : 'Complete Registration'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column - Tournament Summary */}
          <div className="space-y-6">
            <div className="card sticky top-8">
              <h3 className="section-title mb-4">Tournament Summary</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Location</h4>
                  <p className="text-gray-600">{tournament.city}</p>
                  {tournament.venue?.name && (
                    <p className="text-gray-600 text-sm">{tournament.venue.name}</p>
                  )}
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Dates</h4>
                  <p className="text-gray-600 text-sm">{formatDate(tournament.start_date)}</p>
                  <p className="text-gray-600 text-sm">to {formatDate(tournament.end_date)}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Entry Fee</h4>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(tournament.entry_fee)}</p>
                </div>

                {daysUntilDeadline !== null && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Deadline</h4>
                    <p className={`text-sm font-medium ${getDeadlineColor(tournament.registration_deadline!)}`}>
                      {daysUntilDeadline > 0 
                        ? `${daysUntilDeadline} days remaining`
                        : 'Registration closed'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky CTA */}
      <div className="sticky-cta">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">Entry Fee</div>
            <div className="font-bold text-green-600">{formatCurrency(tournament.entry_fee)}</div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading || registrationClosed || (tournament.rules_md && !rulesAccepted)}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              loading || registrationClosed || (tournament.rules_md && !rulesAccepted)
                ? 'bg-gray-400 text-gray-700'
                : 'bg-yellow-500 hover:bg-yellow-600 text-black'
            }`}
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterTeam;