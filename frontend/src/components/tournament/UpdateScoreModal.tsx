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
  onSave: (scores: { home: number; away: number }, scorers: { home: number[]; away: number[] }, assists: { home: (number | null)[]; away: (number | null)[] }) => Promise<void>;
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
  onSave
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
    } else {
      // Reset state when modal closes
      setHomeGoals([]);
      setAwayGoals([]);
      setOpenAssistDropdown(null);
    }
  }, [isOpen]);

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

  const handleSave = async () => {
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
        { home: homeAssists, away: awayAssists } // NEW: Pass assists
      );
      onClose();
    } catch (err) {
      console.error('Failed to save scores:', err);
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
