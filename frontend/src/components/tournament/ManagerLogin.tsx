import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface ManagerLoginProps {
  tournamentId: number;
  onSuccess?: () => void;
}

export default function ManagerLogin({ tournamentId, onSuccess }: ManagerLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, getMe, user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Find username from email (or use email directly if it's the username)
      // For now, we'll try email first, then construct username
      const username = email.includes('@') ? email.split('@')[0] : email;
      
      await login(username, password);
      await getMe();
      
      // Get user's team for this tournament
      // We'll need to fetch registrations to find the team
      const { api } = await import('../../lib/api');
      const registrations = await api<any[]>(`/registrations/?tournament=${tournamentId}`);
      
      // Find registration where user is the manager
      // After login, getMe() updates the user state in context
      const userReg = registrations.find((reg: any) => {
        // Check if the logged-in user is the manager
        const managerId = reg?.team?.manager_user?.id || reg?.team?.manager?.id;
        const userEmail = reg?.team?.manager_email;
        // Use email match since user context may not be updated yet
        return userEmail === email;
      });
      
      if (userReg?.team?.id) {
        navigate(`/teams/${userReg.team.id}`);
        if (onSuccess) onSuccess();
        return;
      }
      
      // If no team found, just refresh the page to show manager actions
      if (onSuccess) onSuccess();
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">Manager Login</h3>
      <p className="text-gray-400 text-sm mb-4">
        Log in to manage your team for this tournament
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="manager-email" className="block text-sm font-medium text-gray-300 mb-2">
            Email
          </label>
          <input
            type="email"
            id="manager-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500"
            placeholder="manager@example.com"
            required
            disabled={loading}
          />
        </div>
        
        <div>
          <label htmlFor="manager-password" className="block text-sm font-medium text-gray-300 mb-2">
            Password
          </label>
          <input
            type="password"
            id="manager-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500"
            placeholder="Enter your password"
            required
            disabled={loading}
          />
        </div>
        
        {error && (
          <div className="text-red-400 text-sm">{error}</div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

