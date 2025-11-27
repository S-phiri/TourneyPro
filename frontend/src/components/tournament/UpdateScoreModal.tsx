import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Minus, Loader2, ChevronDown } from 'lucide-react';
import { listTeamPlayers, api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

// NEW: Configuration - allow self-assist toggle
const ALLOW_SELF_ASSIST = false; // Set to true to allow scorer to also assist

interface Player {
  id: number;
  first_name: string;
  last_name: string;
  position?: string;
  goals?: number;
}

interface TeamPlayer {
  id: number;
  player: Player;
  team: number;
  number?: string;
  is_captain: boolean;
}

interface UpdateScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: number;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  currentScores: { home: number; away: number };
  onSave: (scores: { home: number; away: number }, scorers: { home: number[]; away: number[] }, assists: { home: (number | null)[]; away: (number | null)[] }, penalties?: { home: number | null; away: number | null }) => Promise<void>;
  isKnockout?: boolean; // NEW: Whether this is a knockout match
  matchStatus?: string; // NEW: Current match status (scheduled, live, finished)
  onStartMatch?: () => Promise<void>; // NEW: Callback to start the match
}

// NEW: Goal event with assist
interface GoalEvent {
  id: string; // Temporary ID for UI
  scorerId: number;
  scorerName: string;
  assisterId: number | null;
  assisterName: string | null;
}

export default function UpdateScoreModal({
  isOpen,
  onClose,
  matchId,
  homeTeam,
  awayTeam,
  currentScores,
  onSave,
  isKnockout = false,
  matchStatus = 'scheduled',
  onStartMatch
}: UpdateScoreModalProps) {
  const [homePlayers, setHomePlayers] = useState<TeamPlayer[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<TeamPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // NEW: Track individual goals with assists
  const [homeGoals, setHomeGoals] = useState<GoalEvent[]>([]);
  const [awayGoals, setAwayGoals] = useState<GoalEvent[]>([]);
  const [openAssistDropdown, setOpenAssistDropdown] = useState<string | null>(null); // goalId
  const dropdownRef = useRef<HTMLDivElement>(null);
  // NEW: Penalty scores
  const [homePenalties, setHomePenalties] = useState<number | null>(null);
  const [awayPenalties, setAwayPenalties] = useState<number | null>(null);
  // NEW: Match timer
  const [matchStarted, setMatchStarted] = useState(matchStatus === 'live');
  const [matchTime, setMatchTime] = useState(0); // minutes
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenAssistDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchPlayers();
      setMatchStarted(matchStatus === 'live');
      setHomePenalties(null);
      setAwayPenalties(null);
    } else {
      // Reset state when modal closes
      setHomeGoals([]);
      setAwayGoals([]);
      setOpenAssistDropdown(null);
      setHomePenalties(null);
      setAwayPenalties(null);
      setMatchTime(0);
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
    }
  }, [isOpen, matchStatus]);

  // Timer effect - update every second for better UX
  useEffect(() => {
    if (matchStarted) {
      const interval = setInterval(() => {
        setMatchTime(prev => prev + 1);
      }, 1000); // Update every second
      setTimerInterval(interval);
      return () => clearInterval(interval);
    } else if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  }, [matchStarted]);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const [homeData, awayData] = await Promise.all([
        listTeamPlayers({ team: homeTeam.id }),
        listTeamPlayers({ team: awayTeam.id })
      ]);
      setHomePlayers(Array.isArray(homeData) ? homeData : []);
      setAwayPlayers(Array.isArray(awayData) ? awayData : []);
    } catch (err) {
      console.error('Failed to fetch players:', err);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Add goal with scorer
  const addGoal = (team: 'home' | 'away', player: Player) => {
    const goalId = `goal-${Date.now()}-${Math.random()}`;
    const newGoal: GoalEvent = {
      id: goalId,
      scorerId: player.id,
      scorerName: `${player.first_name} ${player.last_name}`,
      assisterId: null,
      assisterName: null
    };

    if (team === 'home') {
      setHomeGoals([...homeGoals, newGoal]);
    } else {
      setAwayGoals([...awayGoals, newGoal]);
    }
  };

  // NEW: Remove goal
  const removeGoal = (team: 'home' | 'away', goalId: string) => {
    if (team === 'home') {
      setHomeGoals(homeGoals.filter(g => g.id !== goalId));
    } else {
      setAwayGoals(awayGoals.filter(g => g.id !== goalId));
    }
    if (openAssistDropdown === goalId) {
      setOpenAssistDropdown(null);
    }
  };

  // NEW: Set assist for a goal
  const setAssist = (team: 'home' | 'away', goalId: string, assisterId: number | null, assisterName: string | null) => {
    const updateGoal = (goal: GoalEvent) => {
      if (goal.id === goalId) {
        return { ...goal, assisterId, assisterName };
      }
      return goal;
    };

    if (team === 'home') {
      setHomeGoals(homeGoals.map(updateGoal));
    } else {
      setAwayGoals(awayGoals.map(updateGoal));
    }
    setOpenAssistDropdown(null);
  };

  // NEW: Get eligible assisters for a goal (teammates, excluding scorer if ALLOW_SELF_ASSIST is false)
  const getEligibleAssisters = (team: 'home' | 'away', scorerId: number): TeamPlayer[] => {
    const players = team === 'home' ? homePlayers : awayPlayers;
    return players.filter(tp => {
      if (!ALLOW_SELF_ASSIST && tp.player.id === scorerId) {
        return false;
      }
      return true;
    });
  };

  const handleStartMatch = async () => {
    if (onStartMatch) {
      try {
        await onStartMatch();
        setMatchStarted(true);
      } catch (err) {
        console.error('Failed to start match:', err);
      }
    }
  };

  const handleSave = async () => {
    // Check if knockout match ends in draw - require penalties
    const isDraw = homeGoals.length === awayGoals.length;
    if (isKnockout && isDraw) {
      if (homePenalties === null || awayPenalties === null) {
        alert('Knockout matches cannot end in a draw. Please provide penalty scores.');
        return;
      }
      if (homePenalties === awayPenalties) {
        alert('Penalty scores cannot be equal. One team must win.');
        return;
      }
    }

    setSaving(true);
    try {
      // Convert goals to arrays: one scorer ID per goal, one assister ID (or null) per goal
      const homeScorers = homeGoals.map(g => g.scorerId);
      const awayScorers = awayGoals.map(g => g.scorerId);
      const homeAssists = homeGoals.map(g => g.assisterId);
      const awayAssists = awayGoals.map(g => g.assisterId);

      await onSave(
        { home: homeGoals.length, away: awayGoals.length },
        { home: homeScorers, away: awayScorers },
        { home: homeAssists, away: awayAssists },
        isKnockout && isDraw ? { home: homePenalties, away: awayPenalties } : undefined
      );
      onClose();
    } catch (err: any) {
      // Check if error requires penalties
      if (err.message && err.message.includes('penalties')) {
        try {
          const errorData = JSON.parse(err.message);
          if (errorData.requires_penalties) {
            // Don't close modal, just show that penalties are needed
            return;
          }
        } catch {
          // Not JSON, continue with normal error
        }
      }
      console.error('Failed to save scores:', err);
      alert(err.message || 'Failed to save scores');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Render goal chip with assist selector
  const renderGoalChip = (goal: GoalEvent, team: 'home' | 'away', teamPlayers: TeamPlayer[]) => {
    const eligibleAssisters = getEligibleAssisters(team, goal.scorerId);
    const isDropdownOpen = openAssistDropdown === goal.id;

    return (
      <div key={goal.id} className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-2xl">⚽</span>
            <span className="text-white font-medium">{goal.scorerName}</span>
          </div>
          <button
            onClick={() => removeGoal(team, goal.id)}
            className="p-1 hover:bg-zinc-700 rounded transition-colors"
            disabled={saving}
            aria-label="Remove goal"
          >
            <Minus className="w-4 h-4 text-red-400" />
          </button>
        </div>
        
        {/* NEW: Assist selector */}
        <div className="relative" ref={isDropdownOpen ? dropdownRef : null}>
          <button
            onClick={() => setOpenAssistDropdown(isDropdownOpen ? null : goal.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpenAssistDropdown(isDropdownOpen ? null : goal.id);
              } else if (e.key === 'Escape') {
                setOpenAssistDropdown(null);
              }
            }}
            className="w-full flex items-center justify-between bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm transition-colors"
            disabled={saving}
            aria-label="Select assist"
            aria-expanded={isDropdownOpen}
          >
            <span className="text-gray-300">
              🎯 Assist: {goal.assisterName || '—'}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              <button
                onClick={() => setAssist(team, goal.id, null, null)}
                className="w-full text-left px-3 py-2 hover:bg-zinc-700 text-white text-sm transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setAssist(team, goal.id, null, null);
                  }
                }}
              >
                No assist
              </button>
              {eligibleAssisters.map(tp => (
                <button
                  key={tp.id}
                  onClick={() => setAssist(team, goal.id, tp.player.id, `${tp.player.first_name} ${tp.player.last_name}`)}
                  className="w-full text-left px-3 py-2 hover:bg-zinc-700 text-white text-sm transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setAssist(team, goal.id, tp.player.id, `${tp.player.first_name} ${tp.player.last_name}`);
                    }
                  }}
                >
                  {tp.player.first_name} {tp.player.last_name}
                  {tp.number && <span className="text-gray-400 ml-2">#{tp.number}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-black text-yellow-500">Update Match Score</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              disabled={saving}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Current Score Display */}
          <div className="flex items-center justify-center gap-8 mb-8 py-6 bg-zinc-800/50 rounded-xl border border-zinc-700">
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-2">Home</div>
              <div className="text-5xl font-black text-white">{homeGoals.length}</div>
              <div className="text-sm text-gray-500">{homeTeam.name}</div>
            </div>
            <div className="text-4xl font-bold text-gray-500">-</div>
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-2">Away</div>
              <div className="text-5xl font-black text-white">{awayGoals.length}</div>
              <div className="text-sm text-gray-500">{awayTeam.name}</div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Home Team */}
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  {homeTeam.name}
                </h3>
                
                {/* Current Goals */}
                {homeGoals.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {homeGoals.map(goal => renderGoalChip(goal, 'home', homePlayers))}
                  </div>
                )}

                {/* Player Selection */}
                <div className="space-y-2">
                  {homePlayers.map(tp => (
                    <button
                      key={tp.id}
                      onClick={() => addGoal('home', tp.player)}
                      className="w-full flex items-center justify-between bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-700 hover:border-yellow-500/50 rounded-lg p-3 transition-all group"
                      disabled={saving}
                    >
                      <div className="flex items-center gap-3">
                        {tp.number && (
                          <span className="text-xs text-gray-400 font-mono bg-zinc-800 px-2 py-0.5 rounded">
                            #{tp.number}
                          </span>
                        )}
                        <span className="text-white group-hover:text-yellow-400 transition-colors">
                          {tp.player.first_name} {tp.player.last_name}
                        </span>
                        {tp.player.position && (
                          <span className="text-xs text-gray-500">{tp.player.position}</span>
                        )}
                      </div>
                      <Plus className="w-5 h-5 text-gray-400 group-hover:text-yellow-400 transition-colors" />
                    </button>
                  ))}
                  {homePlayers.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-2">No players available</p>
                  )}
                </div>
              </div>

              {/* Away Team */}
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  {awayTeam.name}
                </h3>
                
                {/* Current Goals */}
                {awayGoals.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {awayGoals.map(goal => renderGoalChip(goal, 'away', awayPlayers))}
                  </div>
                )}

                {/* Player Selection */}
                <div className="space-y-2">
                  {awayPlayers.map(tp => (
                    <button
                      key={tp.id}
                      onClick={() => addGoal('away', tp.player)}
                      className="w-full flex items-center justify-between bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-700 hover:border-yellow-500/50 rounded-lg p-3 transition-all group"
                      disabled={saving}
                    >
                      <div className="flex items-center gap-3">
                        {tp.number && (
                          <span className="text-xs text-gray-400 font-mono bg-zinc-800 px-2 py-0.5 rounded">
                            #{tp.number}
                          </span>
                        )}
                        <span className="text-white group-hover:text-yellow-400 transition-colors">
                          {tp.player.first_name} {tp.player.last_name}
                        </span>
                        {tp.player.position && (
                          <span className="text-xs text-gray-500">{tp.player.position}</span>
                        )}
                      </div>
                      <Plus className="w-5 h-5 text-gray-400 group-hover:text-yellow-400 transition-colors" />
                    </button>
                  ))}
                  {awayPlayers.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-2">No players available</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Match Start Button & Timer */}
          {!matchStarted && matchStatus === 'scheduled' && onStartMatch && (
            <div className="mb-6 p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Match Not Started</h3>
                  <p className="text-sm text-gray-400">Start the match to begin tracking time</p>
                </div>
                <button
                  onClick={handleStartMatch}
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-500/20 hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Start Match
                </button>
              </div>
            </div>
          )}

          {matchStarted && (
            <div className="mb-6 p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-green-400 mb-1">Match Live</h3>
                  <p className="text-sm text-gray-400">
                    Duration: {Math.floor(matchTime / 60)}:{(matchTime % 60).toString().padStart(2, '0')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-400 text-sm font-semibold">LIVE</span>
                </div>
              </div>
            </div>
          )}

          {/* Penalty Shootout Section (for knockout matches that end in draw) */}
          {isKnockout && homeGoals.length === awayGoals.length && (
            <div className="mb-6 p-6 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-2 border-yellow-500/30 rounded-xl">
              <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                <span>⚽</span>
                Penalty Shootout Required
              </h3>
              <p className="text-sm text-gray-300 mb-4">
                This knockout match ended in a draw. Please enter penalty shootout scores.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {homeTeam.name} Penalties
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={homePenalties ?? ''}
                    onChange={(e) => setHomePenalties(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="0"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {awayTeam.name} Penalties
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={awayPenalties ?? ''}
                    onChange={(e) => setAwayPenalties(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="0"
                    disabled={saving}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white rounded-xl font-medium transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black rounded-xl font-bold transition-all shadow-lg shadow-yellow-500/20 hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Score'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
