// src/lib/auth.ts
const BASE = import.meta.env.VITE_API_BASE_URL;

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role_hint?: 'host' | 'manager' | 'viewer';
}

// Token management
const ACCESS_TOKEN_KEY = 'tournament_access_token';
const REFRESH_TOKEN_KEY = 'tournament_refresh_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function saveAuthToken(accessToken: string, refreshToken: string): void {
  setAuthToken(accessToken);
  setRefreshToken(refreshToken);
}

// Auth API calls
export async function login(username: string, password: string): Promise<LoginResponse> {
  try {
    const response = await fetch(`${BASE}/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Login failed: ${response.status} ${response.statusText}`);
    }

    const data: LoginResponse = await response.json();
    
    // Store tokens
    setAuthToken(data.access);
    setRefreshToken(data.refresh);
    
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please check if the backend is running.');
    }
    throw error;
  }
}

export async function refresh(): Promise<LoginResponse> {
  const refreshToken = getRefreshToken();
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${BASE}/auth/refresh/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!response.ok) {
    clearAuthToken();
    throw new Error('Token refresh failed');
  }

  const data: LoginResponse = await response.json();
  
  // Update stored tokens
  setAuthToken(data.access);
  if (data.refresh) {
    setRefreshToken(data.refresh);
  }
  
  return data;
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  
  if (refreshToken) {
    try {
      await fetch(`${BASE}/auth/logout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });
    } catch (error) {
      console.warn('Logout API call failed:', error);
    }
  }
  
  clearAuthToken();
}

export async function getCurrentUser(): Promise<User> {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('No access token available');
  }

  const response = await fetch(`${BASE}/auth/me/`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token might be expired, try to refresh
      try {
        await refresh();
        return getCurrentUser(); // Retry with new token
      } catch (refreshError) {
        clearAuthToken();
        throw new Error('Authentication failed');
      }
    }
    throw new Error('Failed to fetch user data');
  }

  return response.json();
}

export interface RegisterManagerPayload {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface RegisterManagerResponse {
  detail: string;
  user: User;
  tokens: {
    access: string;
    refresh: string;
  };
}

export async function registerManager(payload: RegisterManagerPayload): Promise<RegisterManagerResponse> {
  const response = await fetch(`${BASE}/auth/register-manager/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Registration failed');
  }

  const data: RegisterManagerResponse = await response.json();
  
  // Store tokens
  setAuthToken(data.tokens.access);
  setRefreshToken(data.tokens.refresh);
  
  return data;
}

// Utility function to check if user is authenticated
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}
