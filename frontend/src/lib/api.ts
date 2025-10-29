// src/lib/api.ts
import { getAuthToken } from './auth';

const BASE = import.meta.env.VITE_API_BASE_URL;

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = { 
    'Content-Type': 'application/json', 
    ...(opts.headers || {}) 
  };
  
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch(`${BASE}${path}`, { 
    ...opts, 
    headers,
    credentials: 'omit'
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `HTTP ${res.status}: ${res.statusText}`);
  }
  
  return res.json();
}

export async function registerTeamToTournament(
  tournamentId: number,
  payload: {
    team: { name: string; manager_name: string; manager_email: string; phone?: string };
    note?: string;
  }
) {
  return api(`/tournaments/${tournamentId}/register/`, {
    method: 'POST',
    body: JSON.stringify({ tournament_id: tournamentId, ...payload }),
  });
}