// src/lib/registrations.ts
import { api } from './api';

export interface Manager {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

export interface Team {
  id: number;
  name: string;
  manager_name: string;
  manager_email: string;
  phone?: string;
  manager?: Manager;
  manager_user?: Manager;
}

export interface Registration {
  id: number;
  tournament: number;
  team: Team;
  status: 'pending' | 'paid' | 'cancelled';
  paid_amount: number;
  created_at: string;
}

export interface CreateTeamData {
  name: string;
  manager_name: string;
  manager_email: string;
  phone?: string;
}

export interface CreateRegistrationData {
  tournament: number;
  team: number;
  status?: 'pending' | 'paid' | 'cancelled';
  paid_amount?: number;
}

export const listRegistrations = (tournamentId: number): Promise<Registration[]> => 
  api(`/registrations/?tournament=${tournamentId}`);

export const createTeam = (payload: CreateTeamData): Promise<Team> => 
  api('/teams/', { method: 'POST', body: JSON.stringify(payload) });

export const createRegistration = (payload: CreateRegistrationData): Promise<Registration> => 
  api('/registrations/', { method: 'POST', body: JSON.stringify(payload) });
