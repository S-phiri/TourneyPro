// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, login as authLogin, logout as authLogout, getCurrentUser, getAuthToken, clearAuthToken } from '../lib/auth';
import { getTournamentRole as apiGetTournamentRole } from '../lib/api';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isOrganizer: boolean;
  roleHint: 'host' | 'manager' | 'viewer' | null;
  getMe: () => Promise<void>;
  getTournamentRole: (tournamentId: number) => Promise<{ is_organiser: boolean; is_manager: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!accessToken && !!user;
  const isOrganizer = !!accessToken; // Any authenticated user can be an organizer
  const roleHint = user?.role_hint || null;

  // Initialize auth state on app load
  useEffect(() => {
    getMe();
  }, []);

  const getMe = async () => {
    setIsLoading(true);
    const token = getAuthToken();
    
    if (token) {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        setAccessToken(token);
      } catch (error) {
        console.warn('Failed to restore auth state:', error);
        clearAuthToken();
        setUser(null);
        setAccessToken(null);
      }
    } else {
      // No token means no user - clear any stale state
      setUser(null);
      setAccessToken(null);
    }
    
    setIsLoading(false);
  };

  const getTournamentRole = async (tournamentId: number) => {
    return apiGetTournamentRole(tournamentId);
  };

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      // Clear old user state and tokens BEFORE logging in with new credentials
      setUser(null);
      setAccessToken(null);
      clearAuthToken(); // Clear any stale tokens from localStorage
      
      // Now login with new credentials
      const response = await authLogin(username, password);
      setAccessToken(response.access);
      
      // Fetch NEW user data with the fresh token
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      clearAuthToken();
      setUser(null);
      setAccessToken(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authLogout();
    } catch (error) {
      console.warn('Logout error:', error);
    } finally {
      setUser(null);
      setAccessToken(null);
      clearAuthToken();
    }
  };

  const value: AuthContextType = {
    user,
    accessToken,
    isLoading,
    login,
    logout,
    isAuthenticated,
    isOrganizer,
    roleHint,
    getMe,
    getTournamentRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
