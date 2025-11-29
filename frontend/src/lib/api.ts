// src/lib/api.ts
import { getAuthToken, getRefreshToken, refresh as refreshToken, clearAuthToken, setAuthToken } from './auth';

// Auto-detect API base URL based on environment variable or hostname
export function getApiBaseUrl(): string {
  // Use environment variable if set (production)
  if (import.meta.env.VITE_API_BASE_URL) {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    // Ensure it ends with /api if not already
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }
  
  // Development fallback: auto-detect based on current hostname
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  
  let apiUrl: string;
  if (isLocalhost) {
    apiUrl = 'http://localhost:8000/api';
  } else {
    // Use the same hostname as the frontend, just change port to 8000
    // For production, this assumes backend is on same hostname but port 8000
    // Better to set VITE_API_BASE_URL env var in production
    apiUrl = `http://${hostname}:8000/api`;
  }
  
  // Debug logging (remove in production)
  if (import.meta.env.DEV) {
    console.log('[API] Detected hostname:', hostname);
    console.log('[API] Using API base URL:', apiUrl);
  }
  
  return apiUrl;
}

const BASE = getApiBaseUrl();

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
  
  // Ensure body is properly handled (already stringified or will be stringified)
  const fetchOpts: RequestInit = {
    ...opts,
    headers,
    credentials: 'omit',
  };
  
  // If body is already a string, use it directly; otherwise stringify if it's an object
  if (opts.body && typeof opts.body !== 'string') {
    try {
      fetchOpts.body = JSON.stringify(opts.body);
    } catch (e) {
      // If stringify fails (circular reference), use the original body
      fetchOpts.body = opts.body;
    }
  }
  
  let res = await fetch(`${BASE}${path}`, fetchOpts);
  
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
        const retryOpts: RequestInit = {
          ...opts,
          headers,
          credentials: 'omit'
        };
        
        // Ensure body is properly handled for retry
        if (opts.body && typeof opts.body !== 'string') {
          try {
            retryOpts.body = JSON.stringify(opts.body);
          } catch (e) {
            retryOpts.body = opts.body;
          }
        }
        
        res = await fetch(`${BASE}${path}`, retryOpts);
      }
    } catch (refreshError) {
      // Refresh failed, clear tokens and let the error propagate
      clearAuthToken();
      throw new Error('Session expired. Please log in again.');
    }
  }
  
  if (!res.ok) {
    let errorText = '';
    try {
      errorText = await res.text();
      
      // Check if response is HTML (Django error page)
      if (errorText.trim().startsWith('<!DOCTYPE') || errorText.includes('<html')) {
        // Try to extract error from HTML
        const titleMatch = errorText.match(/<title>(.*?)<\/title>/i);
        const h1Match = errorText.match(/<h1[^>]*>(.*?)<\/h1>/i);
        const preMatch = errorText.match(/<pre[^>]*>(.*?)<\/pre>/is);
        
        if (titleMatch) {
          errorText = titleMatch[1].replace(/Error at.*?:\s*/i, '').trim();
        } else if (h1Match) {
          errorText = h1Match[1].trim();
        } else if (preMatch) {
          errorText = preMatch[1].substring(0, 200).trim(); // Limit length
        } else {
          errorText = 'Server error occurred. Please try again.';
        }
      } else {
        // Try to parse as JSON
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail) {
            errorText = errorJson.detail;
          } else if (errorJson.message) {
            errorText = errorJson.message;
          } else if (errorJson.team && errorJson.team.name) {
            errorText = errorJson.team.name;
          } else if (typeof errorJson === 'object') {
            // Extract first error message from nested structure
            const firstKey = Object.keys(errorJson)[0];
            if (errorJson[firstKey]) {
              if (typeof errorJson[firstKey] === 'string') {
                errorText = errorJson[firstKey];
              } else if (Array.isArray(errorJson[firstKey]) && errorJson[firstKey].length > 0) {
                errorText = errorJson[firstKey][0];
              } else if (typeof errorJson[firstKey] === 'object') {
                const nestedKey = Object.keys(errorJson[firstKey])[0];
                if (nestedKey && errorJson[firstKey][nestedKey]) {
                  errorText = Array.isArray(errorJson[firstKey][nestedKey]) 
                    ? errorJson[firstKey][nestedKey][0] 
                    : errorJson[firstKey][nestedKey];
                }
              }
            }
          }
        } catch {
          // Keep original errorText if JSON parsing fails
          if (errorText.length > 200) {
            errorText = errorText.substring(0, 200) + '...';
          }
        }
      }
    } catch {
      errorText = `HTTP ${res.status}: ${res.statusText}`;
    }
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
export async function getTeam(idOrSlug: number | string) {
  const res = await fetch(`${BASE}/teams/${idOrSlug}/`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch team');
  return res.json();
}

export async function getTeamBySlug(slug: string) {
  return api<any>(`/teams/by-slug/${slug}/`);
}

export async function createPlayer(body: any) {
  return api<any>('/players/', {
    method: 'POST',
    body: body,
  });
}

export async function addPlayerToTeam(body: any) {
  return api<any>('/teamplayers/', {
    method: 'POST',
    body: body,
  });
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
  const headers: HeadersInit = { 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/tournaments/${tournamentId}/simulate-round/`, {
    method: 'POST',
    headers,
    credentials: 'include',
  });
  
  // Check content type before parsing
  const contentType = res.headers.get('content-type');
  if (!res.ok) {
    if (contentType && contentType.includes('application/json')) {
      try {
        const error = await res.json();
        throw new Error(error.detail || `Failed to simulate round: ${res.status} ${res.statusText}`);
      } catch (e) {
        if (e instanceof Error) throw e;
        throw new Error(`Failed to simulate round: ${res.status} ${res.statusText}`);
      }
    } else {
      // Server returned HTML (likely an error page)
      const text = await res.text();
      const errorMatch = text.match(/<title>(.*?)<\/title>/i) || text.match(/<h1>(.*?)<\/h1>/i);
      const errorMsg = errorMatch ? errorMatch[1] : `Server error (${res.status})`;
      throw new Error(`Simulation failed: ${errorMsg}. Please check the backend console for details.`);
    }
  }
  
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  } else {
    const text = await res.text();
    throw new Error(`Unexpected response format. Expected JSON but got: ${contentType || 'unknown'}`);
  }
}

export async function clearFixtures(tournamentId: number): Promise<{ detail: string; matches_deleted: number }> {
  return api<{ detail: string; matches_deleted: number }>(`/tournaments/${tournamentId}/clear-fixtures/`, {
    method: 'POST',
  });
}

export async function debugKnockout(tournamentId: number): Promise<any> {
  return api<any>(`/tournaments/${tournamentId}/debug-knockout/`);
}

export async function resetTournament(tournamentId: number): Promise<{ 
  detail: string; 
  matches_deleted: number;
  registrations_deleted: number;
  teams_deleted: number;
  team_players_deleted: number;
  players_deleted: number;
  tournament_id: number;
  tournament_status: string;
}> {
  return api<{ 
    detail: string; 
    matches_deleted: number;
    registrations_deleted: number;
    teams_deleted: number;
    team_players_deleted: number;
    players_deleted: number;
    tournament_id: number;
    tournament_status: string;
  }>(`/tournaments/${tournamentId}/reset-tournament/`, {
    method: 'POST',
  });
}

export async function resetMatches(tournamentId: number): Promise<{
  detail: string;
  matches_reset: number;
  knockout_matches_deleted: number;
  tournament_id: number;
  tournament_status: string;
}> {
  return api<{
    detail: string;
    matches_reset: number;
    knockout_matches_deleted: number;
    tournament_id: number;
    tournament_status: string;
  }>(`/tournaments/${tournamentId}/reset-matches/`, {
    method: 'POST',
  });
}

export async function generateKnockouts(tournamentId: number): Promise<{
  detail: string;
  generated?: boolean;
  already_generated?: boolean;
  tournament_id: number;
}> {
  return api<{
    detail: string;
    generated?: boolean;
    already_generated?: boolean;
    tournament_id: number;
  }>(`/tournaments/${tournamentId}/generate-knockouts/`, {
    method: 'POST',
  });
}

export async function fixFixtures(tournamentId: number): Promise<{
  detail: string;
  fixed_groups: Array<{ group: string; matches_deleted: number; matches_created: number }>;
  matches_deleted: number;
  matches_created: number;
  skipped?: boolean;
}> {
  return api<{
    detail: string;
    fixed_groups: Array<{ group: string; matches_deleted: number; matches_created: number }>;
    matches_deleted: number;
    matches_created: number;
    skipped?: boolean;
  }>(`/tournaments/${tournamentId}/fix-fixtures/`, {
    method: 'POST',
  });
}

export async function getPlayersForMvp(tournamentId: number): Promise<{
  players: Array<{
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    team_id: number;
    team_name: string;
    goals: number;
    assists: number;
    appearances: number;
    mvp_score: number;
  }>;
}> {
  return api<{
    players: Array<{
      id: number;
      first_name: string;
      last_name: string;
      full_name: string;
      team_id: number;
      team_name: string;
      goals: number;
      assists: number;
      appearances: number;
      mvp_score: number;
    }>;
  }>(`/tournaments/${tournamentId}/players-for-mvp/`, {
    method: 'GET',
  });
}

export async function setTournamentMvp(tournamentId: number, playerId: number): Promise<{
  detail: string;
  mvp: any;
}> {
  return api<{
    detail: string;
    mvp: any;
  }>(`/tournaments/${tournamentId}/set-mvp/`, {
    method: 'POST',
    body: { player_id: playerId },
  });
}