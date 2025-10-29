// src/lib/matches.ts
import { api } from './api';

export interface Match {
  id: number;
  tournament: number;
  home_team: {
    id: number;
    name: string;
  };
  away_team: {
    id: number;
    name: string;
  };
  pitch?: string;
  kickoff_at: string;
  home_score: number;
  away_score: number;
  status: 'scheduled' | 'finished';
}

export interface CreateMatchData {
  tournament: number;
  home_team: number;
  away_team: number;
  pitch?: string;
  kickoff_at: string;
}

export interface UpdateMatchData {
  home_score?: number;
  away_score?: number;
  status?: 'scheduled' | 'finished';
  pitch?: string;
  kickoff_at?: string;
}

export const listMatches = (tournamentId: number): Promise<Match[]> => 
  api(`/matches/?tournament=${tournamentId}`);

export const createMatch = (payload: CreateMatchData): Promise<Match> => 
  api('/matches/', { method: 'POST', body: JSON.stringify(payload) });

export const updateMatch = (id: number, payload: UpdateMatchData): Promise<Match> => 
  api(`/matches/${id}/`, { method: 'PUT', body: JSON.stringify(payload) });
