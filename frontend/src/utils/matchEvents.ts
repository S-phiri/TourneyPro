// NEW: Match events utility for goal and assist tracking
// Provides a facade for reading/writing match events without changing schemas

import { api } from '../lib/api';

export interface GoalEvent {
  id: number;
  scorerId: number;
  assisterId?: number | null;
  minute?: number;
}

export interface MatchEvents {
  goals: GoalEvent[];
  assists: Array<{ goalId: number; assisterId: number }>;
}

/**
 * Record a goal event (creates MatchScorer record)
 * Returns the goal event ID for linking assists
 */
export async function recordGoal({
  matchId,
  teamId,
  scorerId,
  minute
}: {
  matchId: number;
  teamId: number;
  scorerId: number;
  minute?: number;
}): Promise<number> {
  // This is handled by the set_score endpoint, so we'll return a placeholder
  // The actual goal ID will be returned from the backend after saving
  return Promise.resolve(0);
}

/**
 * Set assist for a specific goal
 * Creates/updates MatchAssist record linked to the goal
 */
export async function setAssistForGoal({
  goalEventId,
  assisterId
}: {
  goalEventId: number;
  assisterId: number | null;
}): Promise<void> {
  // This is handled by the set_score endpoint with assists array
  // Stub implementation - actual logic in set_score
  return Promise.resolve();
}

/**
 * Remove a goal (and its linked assist)
 */
export async function removeGoal({
  goalEventId
}: {
  goalEventId: number;
}): Promise<void> {
  // This is handled by clearing and re-saving via set_score
  return Promise.resolve();
}

/**
 * Get all events for a match (goals and assists)
 * Reads from MatchScorer and MatchAssist models
 */
export async function getEventsByMatch(matchId: number): Promise<MatchEvents> {
  try {
    // Fetch match with scorers and assists
    const match = await api(`/matches/${matchId}/`);
    
    // If backend provides scorers/assists in match response, use them
    // Otherwise, we'll need a separate endpoint or include them in serializer
    const goals: GoalEvent[] = [];
    const assists: Array<{ goalId: number; assisterId: number }> = [];
    
    // Stub: Return empty events for now
    // Backend should include scorers and assists in match serializer or provide separate endpoint
    return { goals, assists };
  } catch (error) {
    console.error('Failed to fetch match events:', error);
    return { goals: [], assists: [] };
  }
}

