import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, LogIn, Home, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

interface TournamentNavProps {
  tournamentId?: number;
  tournamentSlug?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

export default function TournamentNav({ 
  tournamentId, 
  tournamentSlug,
  showBackButton = false,
  onBackClick 
}: TournamentNavProps) {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, isLoading } = useAuth();

  const getTournamentPath = () => {
    if (tournamentSlug) return `/t/${tournamentSlug}`;
    if (tournamentId) return `/tournaments/${tournamentId}`;
    return '/leagues';
  };

  const handleLogout = async () => {
    await logout();
    // Redirect to tournament page or leagues
    navigate(getTournamentPath());
  };

  const handleLoginClick = () => {
    // Navigate to manager login with tournament context if available
    const path = tournamentId 
      ? `/manager/login?tournament=${tournamentId}`
      : '/manager/login';
    navigate(path);
  };

  if (isLoading) {
    return (
      <nav className="bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
            <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Back button and tournament link */}
          <div className="flex items-center gap-4">
            {showBackButton && (
              <motion.button
                whileHover={{ x: -2 }}
                onClick={onBackClick || (() => navigate(-1))}
                className="flex items-center gap-2 text-yellow-500 hover:text-yellow-400 font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </motion.button>
            )}
            <button
              onClick={() => navigate(getTournamentPath())}
              className="flex items-center gap-2 text-white hover:text-yellow-400 transition-colors"
            >
              <Home className="w-5 h-5" />
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold">Tournament</span>
            </button>
          </div>

          {/* Right: Auth buttons */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg border border-zinc-700">
                  <span className="text-sm text-gray-300">Welcome,</span>
                  <span className="text-sm font-semibold text-yellow-400">
                    {user?.first_name || user?.username || 'Manager'}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-red-600/20"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </motion.button>
              </>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLoginClick}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black rounded-lg font-bold transition-all shadow-lg shadow-yellow-500/20"
              >
                <LogIn className="w-4 h-4" />
                Manager Login
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

