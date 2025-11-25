// src/lib/api.ts
import { getAuthToken, getRefreshToken, refresh as refreshToken, clearAuthToken, setAuthToken } from './auth';

const BASE = import.meta.env.VITE_API_BASE_URL;

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = { 
    'Content-Type': 'application/json', 
    ...(opts.headers || {}) 
  };
  
  let token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Note: Cache-Control header removed to avoid CORS issues
  // Backend should handle caching appropriately
  
  let res = await fetch(`${BASE}${path}`, { 
    ...opts, 
    headers,
    credentials: 'omit',
  });
  
  // NEW: Handle token expiration - try to refresh and retry once
  if (res.status === 401 && token) {
    try {
      const refresh = getRefreshToken();
      if (refresh) {
        const refreshResponse = await refreshToken();
        token = refreshResponse.access;
        setAuthToken(token);
        headers['Authorization'] = `Bearer ${token}`;
        
        // Retry the request with new token
        res = await fetch(`${BASE}${path}`, { 
          ...opts, 
          headers,
          credentials: 'omit'
        });
      }
    } catch (refreshError) {
      // Refresh failed, clear tokens and let the error propagate
      clearAuthToken();
      throw new Error('Session expired. Please log in again.');
    }
  }
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `HTTP ${res.status}: ${res.statusText}`);
  }
  
  return res.json();
}

// Resilient single tournament fetcher (no schema assumptions)
export async function getTournament(id: string | number) {
  const res = await fetch(`${BASE}/tournaments/${id}/`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch tournament');
  const data = await res.json();
  if (!Array.isArray(data.registrations)) data.registrations = [];
  if (!Array.isArray(data.matches)) data.matches = [];
  return data;
}

// Minimal open registration endpoint (status remains pending until payment webhook)
export async function registerTeam(payload: {
  tournament: number;
  team: { name: string; manager_email: string; manager_name?: string; phone?: string };
}) {
  const res = await fetch(`${BASE}/registrations/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to register team');
  return res.json();
}

export async function registerTeamToTournament(
  tournamentId: number,
  payload: {
    team: { name: string; manager_name: string; manager_email: string; manager_password?: string; phone?: string };
    note?: string;
  }
) {
  return api(`/tournaments/${tournamentId}/register/`, {
    method: 'POST',
    body: JSON.stringify({ tournament_id: tournamentId, ...payload }),
  });
}

// Additional helpers for teams/players/matches
export async function getTeam(id: number) {
  const res = await fetch(`${BASE}/teams/${id}/`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch team');
  return res.json();
}

export async function createPlayer(body: any) {
  const res = await fetch(`${BASE}/players/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create player');
  return res.json();
}

export async function addPlayerToTeam(body: any) {
  const res = await fetch(`${BASE}/teamplayers/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to add player to team');
  return res.json();
}

export async function listMatches(params?: Record<string, any>) {
  const query = params ? `?${new URLSearchParams(params as any).toString()}` : '';
  const res = await fetch(`${BASE}/matches/${query}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch matches');
  return res.json();
}

export async function listTeams(params?: Record<string, any>) {
  const query = params ? `?${new URLSearchParams(params as any).toString()}` : '';
  const res = await fetch(`${BASE}/teams/${query}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch teams');
  return res.json();
}

export async function listTeamPlayers(params?: Record<string, any>) {
  const query = params ? `?${new URLSearchParams(params as any).toString()}` : '';
  const res = await fetch(`${BASE}/teamplayers/${query}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch team players');
  return res.json();
}

export async function generateFixtures(tournamentId: number) {
  const token = getAuthToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/tournaments/${tournamentId}/generate-fixtures/`, {
    method: 'POST',
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Failed to generate fixtures');
  }
  return res.json();
}

export async function setMatchScore(id: number, body: { home_score: number; away_score: number }) {
  const token = getAuthToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/matches/${id}/score/`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Failed to set match score');
  }
  return res.json();
}

// Registration status check for polling
export async function getRegistrationStatus(registrationId: number) {
  const token = getAuthToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/registrations/${registrationId}/status/`, {
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Failed to get registration status');
  }
  return res.json();
}

export async function getTournamentStandings(tournamentId: number) {
  const res = await fetch(`${BASE}/tournaments/${tournamentId}/standings/`, { 
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    // Don't throw for 401, just return empty array
    if (res.status === 401) {
      console.warn('Unauthorized access to standings, returning empty array');
      return [];
    }
    throw new Error('Failed to fetch standings');
  }
  return res.json();
}

export async function getTournamentTopScorers(tournamentId: number) {
  const res = await fetch(`${BASE}/tournaments/${tournamentId}/top-scorers/`, { 
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    // Don't throw for 401, just return empty array
    if (res.status === 401) {
      console.warn('Unauthorized access to top scorers, returning empty array');
      return [];
    }
    throw new Error('Failed to fetch top scorers');
  }
  return res.json();
}

// NEW: Get top assists for tournament
export async function getTournamentAwards(tournamentId: number) {
  const res = await fetch(`${BASE}/tournaments/${tournamentId}/awards/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'omit',
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch tournament awards');
  }
  
  return res.json();
}

export async function getTournamentTopAssists(tournamentId: number) {
  const res = await fetch(`${BASE}/tournaments/${tournamentId}/top-assists/`, { 
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    // Don't throw for 401, just return empty array
    if (res.status === 401) {
      console.warn('Unauthorized access to top assists, returning empty array');
      return [];
    }
    throw new Error('Failed to fetch top assists');
  }
  return res.json();
}

export async function getTournamentRole(tournamentId: number): Promise<{ is_organiser: boolean; is_manager: boolean }> {
  const token = getAuthToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/tournaments/${tournamentId}/role/`, { 
    headers,
    credentials: 'include' 
  });
  if (!res.ok) throw new Error('Failed to fetch tournament role');
  return res.json();
}

export async function createTeam(payload: { name: string; manager_name: string; manager_email: string; phone?: string; manager_id?: number }) {
  const token = getAuthToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/teams/`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create team');
  return res.json();
}

export async function getTeamsByTournament(tournamentId: number) {
  const res = await fetch(`${BASE}/registrations/?tournament=${tournamentId}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch teams');
  return res.json();
}

export async function publishTournament(tournamentId: number) {
  const token = getAuthToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/tournaments/${tournamentId}/publish/`, {
    method: 'POST',
    headers,
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to publish tournament');
  return res.json();
}

// NEW: Mark registration as paid (organizer only)
export async function markRegistrationPaid(registrationId: number) {
  return api(`/registrations/${registrationId}/mark-paid/`, {
    method: 'POST',
  });
}

// NEW: Seed test teams for tournament (organizer only)
export async function seedTestTeams(tournamentId: number, options?: { teams?: number; paid?: boolean; players?: number; simulate_games?: boolean }) {
  const token = getAuthToken();
  const headers: HeadersInit = { 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/tournaments/${tournamentId}/seed-test-teams/`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      teams: options?.teams || 8,
      paid: options?.paid || false,
      players: options?.players || 0,
      simulate_games: options?.simulate_games === true  // Default to false
    }),
  });
  if (!res.ok) {
    // Check if response is JSON before parsing
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        const error = await res.json();
        throw new Error(error.detail || error.message || 'Failed to seed test teams');
      } catch (e) {
        if (e instanceof Error) throw e;
        throw new Error(`Failed to seed test teams: ${res.status} ${res.statusText}`);
      }
    } else {
      // HTML error page or other non-JSON response
      const text = await res.text();
      throw new Error(`Failed to seed test teams: ${res.status} ${res.statusText}. ${text.substring(0, 100)}`);
    }
  }
  return res.json();
}

// NEW: Simulate one round of matches for tournament (organizer only)
export async function simulateRound(tournamentId: number) {
  const token = getAuthToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/tournaments/${tournamentId}/simulate-round/`, {
    method: 'POST',
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to simulate round');
  }
  return res.json();
}

export async function clearFixtures(tournamentId: number): Promise<{ detail: string; matches_deleted: number }> {
  const token = getAuthToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/tournaments/${tournamentId}/clear-fixtures/`, {
    method: 'POST',
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to clear fixtures');
  }
  return res.json();
}