import React from 'react';
import { WizardState } from './TournamentWizard';

interface StepRulesProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
}

const TIEBREAKER_OPTIONS = ['GD', 'GF', 'GA', 'H2H', 'Coin Toss'];

export default function StepRules({ state, updateState }: StepRulesProps) {
  const handleRulesChange = (field: string, value: any) => {
    updateState({
      rules: {
        ...state.rules,
        [field]: value,
      },
    });
  };

  const handleTiebreakerToggle = (option: string) => {
    const current = state.rules.tiebreakers || [];
    const updated = current.includes(option)
      ? current.filter((t) => t !== option)
      : [...current, option];
    
    handleRulesChange('tiebreakers', updated);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Rules & Settings</h2>
        <p className="text-gray-400">Configure scoring, tiebreakers, and match settings</p>
      </div>

      <div className="card bg-zinc-900/50 border border-zinc-700">
        {/* Points System */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-white mb-4">Points System</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label text-white">Win Points</label>
              <input
                type="number"
                value={state.rules.win_pts}
                onChange={(e) => handleRulesChange('win_pts', parseInt(e.target.value) || 3)}
                className="form-input bg-zinc-800 border-zinc-600 text-white"
                min="0"
              />
            </div>
            <div>
              <label className="form-label text-white">Draw Points</label>
              <input
                type="number"
                value={state.rules.draw_pts}
                onChange={(e) => handleRulesChange('draw_pts', parseInt(e.target.value) || 1)}
                className="form-input bg-zinc-800 border-zinc-600 text-white"
                min="0"
              />
            </div>
            <div>
              <label className="form-label text-white">Loss Points</label>
              <input
                type="number"
                value={state.rules.loss_pts}
                onChange={(e) => handleRulesChange('loss_pts', parseInt(e.target.value) || 0)}
                className="form-input bg-zinc-800 border-zinc-600 text-white"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Tiebreakers */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-white mb-4">Tiebreakers (Ordered Priority)</h3>
          <p className="text-sm text-gray-400 mb-4">
            Drag to reorder (or click to remove). First item is the primary tiebreaker.
          </p>
          <div className="space-y-2">
            {state.rules.tiebreakers?.map((tiebreaker, idx) => (
              <div
                key={tiebreaker}
                className="flex items-center justify-between bg-zinc-800 p-3 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-yellow-500 font-bold">{idx + 1}.</span>
                  <span className="text-white">{tiebreaker}</span>
                </div>
                <button
                  onClick={() => handleTiebreakerToggle(tiebreaker)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {TIEBREAKER_OPTIONS.filter(
              (opt) => !state.rules.tiebreakers?.includes(opt)
            ).map((option) => (
              <button
                key={option}
                onClick={() => handleTiebreakerToggle(option)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-white text-sm"
              >
                + {option}
              </button>
            ))}
          </div>
        </div>

        {/* Match Settings */}
        <div className="mb-8 pt-8 border-t border-zinc-700">
          <h3 className="text-xl font-bold text-white mb-4">Match Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label text-white">Max Players Per Team</label>
              <input
                type="number"
                value={state.rules.max_players || 15}
                onChange={(e) =>
                  handleRulesChange('max_players', parseInt(e.target.value) || 15)
                }
                className="form-input bg-zinc-800 border-zinc-600 text-white"
                min="1"
              />
            </div>

            <div>
              <label className="form-label text-white">Match Duration (minutes)</label>
              <input
                type="number"
                value={state.rules.duration_mins || 20}
                onChange={(e) =>
                  handleRulesChange('duration_mins', parseInt(e.target.value) || 20)
                }
                className="form-input bg-zinc-800 border-zinc-600 text-white"
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Knockout Options */}
        {(state.format === 'knockout' || state.format === 'combination') && (
          <div className="pt-8 border-t border-zinc-700">
            <h3 className="text-xl font-bold text-white mb-4">Knockout Options</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.rules.extra_time || false}
                  onChange={(e) => handleRulesChange('extra_time', e.target.checked)}
                  className="w-5 h-5 text-yellow-600 bg-zinc-800 border-zinc-600 rounded"
                />
                <span className="text-white">Extra Time</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.rules.pens || false}
                  onChange={(e) => handleRulesChange('pens', e.target.checked)}
                  className="w-5 h-5 text-yellow-600 bg-zinc-800 border-zinc-600 rounded"
                />
                <span className="text-white">Penalties</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

