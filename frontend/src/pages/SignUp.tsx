// src/pages/SignUp.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trophy } from 'lucide-react';

interface SignUpData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
}

const SignUp: React.FC = () => {
  const [formData, setFormData] = useState<SignUpData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.username || !formData.email || !formData.password || !formData.first_name || !formData.last_name) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Create user account
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }

      const responseData = await response.json();
      
      // Auto-login after successful registration
      if (responseData.tokens) {
        // Store tokens manually
        localStorage.setItem('accessToken', responseData.tokens.access);
        localStorage.setItem('refreshToken', responseData.tokens.refresh);
        
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        // Fallback: redirect to login page
        navigate('/login', { 
          state: { 
            message: 'Account created successfully! Please log in.' 
          } 
        });
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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

      {/* Sign Up Card */}
      <div className="card max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600">Join TourneyPro and start hosting tournaments</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="form-label">
                First Name *
              </label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter first name"
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="last_name" className="form-label">
                Last Name *
              </label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter last name"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="username" className="form-label">
              Username *
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="form-input"
              placeholder="Choose a username"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="email" className="form-label">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter email address"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="form-label">
              Password *
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Create a password (min 8 characters)"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password *
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="form-input"
              placeholder="Confirm your password"
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
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-yellow-500 hover:text-yellow-600 font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>

      {/* Back to Home */}
      <div className="mt-8">
        <Link
          to="/"
          className="text-white hover:text-yellow-500 transition-colors font-medium"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
};

export default SignUp;
