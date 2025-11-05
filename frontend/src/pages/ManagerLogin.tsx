import React, { useState } from 'react';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TournamentNav from '../components/tournament/TournamentNav';
import { api } from '../lib/api';

const ManagerLogin: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, getMe } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Get tournament ID from query param if present
  const tournamentId = searchParams.get('tournament');
  
  // Get the intended destination from state, default based on context
  const from = (location.state as any)?.from?.pathname || '/leagues';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Managers can log in with email or username
      // Extract username from email if it contains @
      const username = formData.email.includes('@') 
        ? formData.email.split('@')[0] 
        : formData.email;
      
      await login(username, formData.password);
      await getMe(); // Refresh user context
      
      // If there's a tournament ID, try to find the user's team for that tournament
      if (tournamentId) {
        try {
          const registrations = await api<any[]>(`/registrations/?tournament=${tournamentId}`);
          const userReg = registrations.find((reg: any) => {
            const managerId = reg?.team?.manager_user?.id || reg?.team?.manager?.id;
            return managerId === location.state?.userId; // This might not work, let's use email check instead
          });
          
          // Try matching by email instead
          const emailReg = registrations.find((reg: any) => {
            return reg?.team?.manager_email === formData.email;
          });
          
          if (emailReg?.team?.id) {
            navigate(`/teams/${emailReg.team.id}`, { replace: true });
            return;
          }
        } catch (err) {
          console.error('Failed to find team:', err);
          // Continue with default navigation
        }
      }
      
      // Default navigation
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 text-white">
      {/* Tournament Navigation */}
      <TournamentNav />

      <div className="container py-12 px-6">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-yellow-500 mb-3">Manager Login</h1>
            <p className="text-gray-400 text-lg">Sign in to manage your team</p>
          </div>

          {/* Login Card */}
          <div className="bg-zinc-900/50 border border-zinc-700 rounded-2xl p-8 backdrop-blur-sm">
            {error && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {location.state?.message && (
              <div className="mb-6 p-4 bg-green-900/30 border border-green-500/50 rounded-xl">
                <p className="text-sm text-green-400">{(location.state as any).message}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email / Username
                </label>
                <input
                  type="text"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition-colors"
                  placeholder="Enter your email or username"
                  disabled={isLoading}
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition-colors"
                  placeholder="Enter your password"
                  disabled={isLoading}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 rounded-lg font-bold transition-all shadow-lg hover:-translate-y-0.5 ${
                  isLoading
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black shadow-yellow-500/20'
                }`}
              >
                {isLoading ? 'Logging in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-400">
                Don't have a manager account?{' '}
                <Link 
                  to={`/manager/signup${tournamentId ? `?redirect=${encodeURIComponent(from)}` : ''}`} 
                  className="text-yellow-500 hover:text-yellow-400 font-medium transition-colors"
                >
                  Sign up here
                </Link>
              </p>
            </div>
          </div>

          {/* Back to Leagues */}
          <div className="mt-8 text-center">
            <Link
              to="/leagues"
              className="text-gray-400 hover:text-yellow-500 transition-colors font-medium inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Tournaments
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerLogin;

