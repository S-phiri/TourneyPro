// src/pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trophy } from 'lucide-react';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the intended destination from state, default to dashboard
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      await login(formData.username, formData.password);
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
    <div className="min-h-screen hero-gradient flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <Trophy className="w-8 h-8 text-yellow-500" />
        <span className="text-2xl font-bold text-white">TourneyPro</span>
      </div>

      {/* Login Card */}
      <div className="card max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Login to Host</h1>
          <p className="text-gray-600">Access your tournament dashboard</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your username"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full ${
              isLoading
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                : 'btn-primary'
            } py-3`}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-yellow-500 hover:text-yellow-600 font-medium">
              Create account
            </Link>
          </p>
        </div>
      </div>

      {/* Back to Home */}
      <div className="mt-8">
        <button
          onClick={() => navigate('/')}
          className="text-white hover:text-yellow-500 transition-colors font-medium"
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
};

export default Login;
