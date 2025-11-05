import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Loader2 } from 'lucide-react';
import { listTeamPlayers, api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

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
  onSave: (scores: { home: number; away: number }, scorers: { home: number[]; away: number[] }) => Promise<void>;
}

interface Scorer {
  player: Player;
  goals: number;
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
  const [homeScorers, setHomeScorers] = useState<Scorer[]>([]);
  const [awayScorers, setAwayScorers] = useState<Scorer[]>([]);
  const [currentHomeScore, setCurrentHomeScore] = useState(currentScores.home);
  const [currentAwayScore, setCurrentAwayScore] = useState(currentScores.away);

  useEffect(() => {
    if (isOpen) {
      setCurrentHomeScore(currentScores.home);
      setCurrentAwayScore(currentScores.away);
      fetchPlayers();
    } else {
      // Reset state when modal closes
      setHomeScorers([]);
      setAwayScorers([]);
    }
  }, [isOpen, currentScores]);

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

  const addScorer = (team: 'home' | 'away', player: Player) => {
    const existing = team === 'home' 
      ? homeScorers.find(s => s.player.id === player.id)
      : awayScorers.find(s => s.player.id === player.id);
    
    if (existing) {
      if (team === 'home') {
        setHomeScorers(homeScorers.map(s => 
          s.player.id === player.id ? { ...s, goals: s.goals + 1 } : s
        ));
        setCurrentHomeScore(currentHomeScore + 1);
      } else {
        setAwayScorers(awayScorers.map(s => 
          s.player.id === player.id ? { ...s, goals: s.goals + 1 } : s
        ));
        setCurrentAwayScore(currentAwayScore + 1);
      }
    } else {
      if (team === 'home') {
        setHomeScorers([...homeScorers, { player, goals: 1 }]);
        setCurrentHomeScore(currentHomeScore + 1);
      } else {
        setAwayScorers([...awayScorers, { player, goals: 1 }]);
        setCurrentAwayScore(currentAwayScore + 1);
      }
    }
  };

  const removeScorer = (team: 'home' | 'away', playerId: number, goals: number) => {
    if (goals <= 1) {
      if (team === 'home') {
        setHomeScorers(homeScorers.filter(s => s.player.id !== playerId));
        setCurrentHomeScore(Math.max(0, currentHomeScore - 1));
      } else {
        setAwayScorers(awayScorers.filter(s => s.player.id !== playerId));
        setCurrentAwayScore(Math.max(0, currentAwayScore - 1));
      }
    } else {
      if (team === 'home') {
        setHomeScorers(homeScorers.map(s => 
          s.player.id === playerId ? { ...s, goals: s.goals - 1 } : s
        ));
        setCurrentHomeScore(Math.max(0, currentHomeScore - 1));
      } else {
        setAwayScorers(awayScorers.map(s => 
          s.player.id === playerId ? { ...s, goals: s.goals - 1 } : s
        ));
        setCurrentAwayScore(Math.max(0, currentAwayScore - 1));
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(
        { home: currentHomeScore, away: currentAwayScore },
        { 
          home: homeScorers.flatMap(s => Array(s.goals).fill(s.player.id)), 
          away: awayScorers.flatMap(s => Array(s.goals).fill(s.player.id)) 
        }
      );
      onClose();
    } catch (err) {
      console.error('Failed to save scores:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

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
              <div className="text-5xl font-black text-white">{currentHomeScore}</div>
              <div className="text-sm text-gray-500">{homeTeam.name}</div>
            </div>
            <div className="text-4xl font-bold text-gray-500">-</div>
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-2">Away</div>
              <div className="text-5xl font-black text-white">{currentAwayScore}</div>
              <div className="text-sm text-gray-500">{awayTeam.name}</div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Home Team Scorers */}
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  {homeTeam.name}
                </h3>
                
                {/* Current Scorers */}
                {homeScorers.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {homeScorers.map(scorer => (
                      <div key={scorer.player.id} className="flex items-center justify-between bg-zinc-900/50 border border-zinc-700 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">⚽</span>
                          <span className="text-white font-medium">
                            {scorer.player.first_name} {scorer.player.last_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-400 font-bold text-xl">{scorer.goals}</span>
                          <button
                            onClick={() => removeScorer('home', scorer.player.id, scorer.goals)}
                            className="p-1 hover:bg-zinc-700 rounded transition-colors"
                            disabled={saving}
                          >
                            <Minus className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Player Selection */}
                <div className="space-y-2">
                  {homePlayers.map(tp => (
                    <button
                      key={tp.id}
                      onClick={() => addScorer('home', tp.player)}
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

              {/* Away Team Scorers */}
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  {awayTeam.name}
                </h3>
                
                {/* Current Scorers */}
                {awayScorers.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {awayScorers.map(scorer => (
                      <div key={scorer.player.id} className="flex items-center justify-between bg-zinc-900/50 border border-zinc-700 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">⚽</span>
                          <span className="text-white font-medium">
                            {scorer.player.first_name} {scorer.player.last_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-400 font-bold text-xl">{scorer.goals}</span>
                          <button
                            onClick={() => removeScorer('away', scorer.player.id, scorer.goals)}
                            className="p-1 hover:bg-zinc-700 rounded transition-colors"
                            disabled={saving}
                          >
                            <Minus className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Player Selection */}
                <div className="space-y-2">
                  {awayPlayers.map(tp => (
                    <button
                      key={tp.id}
                      onClick={() => addScorer('away', tp.player)}
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

