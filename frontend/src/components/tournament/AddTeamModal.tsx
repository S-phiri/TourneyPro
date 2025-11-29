import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface PlayerData {
  first_name: string;
  last_name: string;
  position?: string;
  number?: string;
}

interface AddTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTeam: (teamName: string, managerName?: string, managerEmail?: string, players?: PlayerData[]) => Promise<void>;
}

export default function AddTeamModal({ isOpen, onClose, onAddTeam }: AddTeamModalProps) {
  const [teamName, setTeamName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [playerErrors, setPlayerErrors] = useState<Record<number, string>>({});
  const [showPlayersSection, setShowPlayersSection] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addPlayerRow = () => {
    setPlayers([...players, { first_name: '', last_name: '', position: '', number: '' }]);
  };

  const removePlayerRow = (index: number) => {
    const newPlayers = players.filter((_, i) => i !== index);
    setPlayers(newPlayers);
    // Remove error for this player
    const newErrors = { ...playerErrors };
    delete newErrors[index];
    setPlayerErrors(newErrors);
  };

  const updatePlayer = (index: number, field: keyof PlayerData, value: string) => {
    const newPlayers = [...players];
    newPlayers[index] = { ...newPlayers[index], [field]: value };
    setPlayers(newPlayers);
    // Clear error for this player when they start typing
    if (playerErrors[index]) {
      const newErrors = { ...playerErrors };
      delete newErrors[index];
      setPlayerErrors(newErrors);
    }
  };

  const validatePlayers = (): boolean => {
    const errors: Record<number, string> = {};
    players.forEach((player, index) => {
      if (player.first_name.trim() || player.last_name.trim()) {
        // If any field is filled, require first and last name
        if (!player.first_name.trim()) {
          errors[index] = 'First name is required';
        }
        if (!player.last_name.trim()) {
          errors[index] = errors[index] ? errors[index] + '. Last name is required' : 'Last name is required';
        }
      }
    });
    
    if (Object.keys(errors).length > 0) {
      setPlayerErrors(errors);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPlayerErrors({});

    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    // Validate players if any are added
    if (players.length > 0 && !validatePlayers()) {
      setError('Please fix player errors before submitting');
      return;
    }

    setIsSubmitting(true);
    try {
      // Filter out empty player entries
      const validPlayers = players.filter(
        p => p.first_name.trim() && p.last_name.trim()
      );

      await onAddTeam(
        teamName.trim(), 
        managerName.trim() || undefined, 
        managerEmail.trim() || undefined,
        validPlayers.length > 0 ? validPlayers : undefined
      );
      
      // Reset form
      setTeamName('');
      setManagerName('');
      setManagerEmail('');
      setPlayers([]);
      setPlayerErrors({});
      setShowPlayersSection(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add team');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <h2 className="text-2xl font-bold text-white mb-6">Add Team</h2>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Team Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Team Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition-colors"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Manager Name (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Manager Name <span className="text-gray-500 text-xs">(Optional)</span>
              </label>
              <input
                type="text"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="Manager name"
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition-colors"
                disabled={isSubmitting}
              />
            </div>

            {/* Manager Email (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Manager Email <span className="text-gray-500 text-xs">(Optional)</span>
              </label>
              <input
                type="email"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                placeholder="manager@example.com"
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition-colors"
                disabled={isSubmitting}
              />
            </div>

            {/* Players Section */}
            <div className="border-t border-zinc-700 pt-4">
              <button
                type="button"
                onClick={() => setShowPlayersSection(!showPlayersSection)}
                className="w-full flex items-center justify-between text-left mb-3"
              >
                <label className="block text-sm font-medium text-gray-300 cursor-pointer">
                  Add Players <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                {showPlayersSection ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {showPlayersSection && (
                <div className="space-y-4">
                  {players.map((player, index) => (
                    <div key={index} className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-300">Player {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removePlayerRow(index)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          disabled={isSubmitting}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <input
                            type="text"
                            value={player.first_name}
                            onChange={(e) => updatePlayer(index, 'first_name', e.target.value)}
                            placeholder="First name"
                            className={`w-full px-3 py-2 bg-zinc-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors ${
                              playerErrors[index] ? 'border-red-500' : 'border-zinc-600'
                            }`}
                            disabled={isSubmitting}
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={player.last_name}
                            onChange={(e) => updatePlayer(index, 'last_name', e.target.value)}
                            placeholder="Last name"
                            className={`w-full px-3 py-2 bg-zinc-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors ${
                              playerErrors[index] ? 'border-red-500' : 'border-zinc-600'
                            }`}
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <select
                            value={player.position || ''}
                            onChange={(e) => updatePlayer(index, 'position', e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-yellow-500 transition-colors"
                            disabled={isSubmitting}
                          >
                            <option value="">Position (Optional)</option>
                            <option value="GK">GK</option>
                            <option value="DEF">DEF</option>
                            <option value="MID">MID</option>
                            <option value="FWD">FWD</option>
                          </select>
                        </div>
                        <div>
                          <input
                            type="text"
                            value={player.number || ''}
                            onChange={(e) => updatePlayer(index, 'number', e.target.value)}
                            placeholder="Jersey number"
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors"
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>

                      {playerErrors[index] && (
                        <div className="text-red-400 text-xs mt-1">{playerErrors[index]}</div>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addPlayerRow}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-gray-300 font-medium transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Add Player
                  </button>
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !teamName.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Adding...' : 'Add Team'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

