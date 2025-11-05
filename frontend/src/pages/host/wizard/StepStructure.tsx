import React, { useEffect } from 'react';
import { WizardState } from './TournamentWizard';

interface StepStructureProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
}

export default function StepStructure({ state, updateState }: StepStructureProps) {
  // Initialize default structure values when format changes
  useEffect(() => {
    if (state.format === 'league' && !state.structure.rounds) {
      updateState({
        structure: { ...state.structure, rounds: 1 },
      });
    } else if (state.format === 'knockout' && !state.structure.knockout) {
      updateState({
        structure: {
          ...state.structure,
          knockout: { bracket_size: 8, single_leg: true, third_place: false },
        },
      });
    } else if (state.format === 'combination' && (!state.structure.groups || !state.structure.knockout)) {
      updateState({
        structure: {
          ...state.structure,
          groups: state.structure.groups || {
            teams_per_group: 4,
            rounds_per_group: 1,
            advance_per_group: 2,
            seeding: 'random',
          },
          knockout: state.structure.knockout || {
            bracket_size: 8,
            single_leg: true,
            third_place: false,
          },
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.format]); // Only run when format changes
  const handleStructureChange = (field: string, value: any) => {
    updateState({
      structure: {
        ...state.structure,
        [field]: value,
      },
    });
  };

  const handleGroupsChange = (field: string, value: any) => {
    updateState({
      structure: {
        ...state.structure,
        groups: {
          ...state.structure.groups,
          [field]: value,
        } as any,
      },
    });
  };

  const handleKnockoutChange = (field: string, value: any) => {
    updateState({
      structure: {
        ...state.structure,
        knockout: {
          ...state.structure.knockout,
          [field]: value,
        } as any,
      },
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Structure Configuration</h2>
        <p className="text-gray-400">
          Configure the tournament structure based on your selected format
        </p>
      </div>

      <div className="card bg-zinc-900/50 border border-zinc-700">
        {/* League Format */}
        {state.format === 'league' && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Round Robin Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="form-label text-white">Number of Rounds</label>
                <select
                  value={state.structure.rounds || 1}
                  onChange={(e) => handleStructureChange('rounds', parseInt(e.target.value))}
                  className="form-input bg-zinc-800 border-zinc-600 text-white"
                >
                  <option value={1}>1 Round (Single Round-Robin)</option>
                  <option value={2}>2 Rounds (Double Round-Robin)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Single round: each team plays once. Double round: home and away.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Knockout Format */}
        {state.format === 'knockout' && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Knockout Bracket Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="form-label text-white">Bracket Size</label>
                <select
                  value={state.structure.knockout?.bracket_size || 8}
                  onChange={(e) =>
                    handleKnockoutChange('bracket_size', parseInt(e.target.value))
                  }
                  className="form-input bg-zinc-800 border-zinc-600 text-white"
                >
                  <option value={4}>4 Teams</option>
                  <option value={8}>8 Teams</option>
                  <option value={16}>16 Teams</option>
                  <option value={32}>32 Teams</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Number of teams in the knockout bracket
                </p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.structure.knockout?.single_leg ?? true}
                  onChange={(e) => handleKnockoutChange('single_leg', e.target.checked)}
                  className="w-5 h-5 text-yellow-600 bg-zinc-800 border-zinc-600 rounded"
                />
                <span className="text-white">Single Leg (one match per round)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.structure.knockout?.third_place ?? false}
                  onChange={(e) => handleKnockoutChange('third_place', e.target.checked)}
                  className="w-5 h-5 text-yellow-600 bg-zinc-800 border-zinc-600 rounded"
                />
                <span className="text-white">Third Place Match</span>
              </label>
            </div>
          </div>
        )}

        {/* Combination Format */}
        {state.format === 'combination' && (
          <div className="space-y-8">
            {/* Groups Section */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Group Stage Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="form-label text-white">Teams Per Group</label>
                  <select
                    value={state.structure.groups?.teams_per_group || 4}
                    onChange={(e) =>
                      handleGroupsChange('teams_per_group', parseInt(e.target.value))
                    }
                    className="form-input bg-zinc-800 border-zinc-600 text-white"
                  >
                    <option value={4}>4 Teams</option>
                    <option value={5}>5 Teams</option>
                    <option value={6}>6 Teams</option>
                  </select>
                </div>

                <div>
                  <label className="form-label text-white">Rounds Per Group</label>
                  <select
                    value={state.structure.groups?.rounds_per_group || 1}
                    onChange={(e) =>
                      handleGroupsChange('rounds_per_group', parseInt(e.target.value))
                    }
                    className="form-input bg-zinc-800 border-zinc-600 text-white"
                  >
                    <option value={1}>1 Round</option>
                    <option value={2}>2 Rounds</option>
                  </select>
                </div>

                <div>
                  <label className="form-label text-white">Teams Advancing Per Group</label>
                  <select
                    value={state.structure.groups?.advance_per_group || 2}
                    onChange={(e) =>
                      handleGroupsChange('advance_per_group', parseInt(e.target.value))
                    }
                    className="form-input bg-zinc-800 border-zinc-600 text-white"
                  >
                    <option value={1}>1 Team (Winner)</option>
                    <option value={2}>2 Teams (Top 2)</option>
                  </select>
                </div>

                <div>
                  <label className="form-label text-white">Seeding Method</label>
                  <select
                    value={state.structure.groups?.seeding || 'random'}
                    onChange={(e) =>
                      handleGroupsChange('seeding', e.target.value as 'random' | 'pots')
                    }
                    className="form-input bg-zinc-800 border-zinc-600 text-white"
                  >
                    <option value="random">Random</option>
                    <option value="pots">Seeded Pots</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Knockout Section */}
            <div className="pt-8 border-t border-zinc-700">
              <h3 className="text-xl font-bold text-white mb-4">Knockout Stage Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="form-label text-white">Bracket Size</label>
                  <select
                    value={state.structure.knockout?.bracket_size || 8}
                    onChange={(e) =>
                      handleKnockoutChange('bracket_size', parseInt(e.target.value))
                    }
                    className="form-input bg-zinc-800 border-zinc-600 text-white"
                  >
                    <option value={4}>4 Teams</option>
                    <option value={8}>8 Teams</option>
                    <option value={16}>16 Teams</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Should match number of advancing teams from groups
                  </p>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.structure.knockout?.single_leg ?? true}
                    onChange={(e) => handleKnockoutChange('single_leg', e.target.checked)}
                    className="w-5 h-5 text-yellow-600 bg-zinc-800 border-zinc-600 rounded"
                  />
                  <span className="text-white">Single Leg</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.structure.knockout?.third_place ?? false}
                    onChange={(e) => handleKnockoutChange('third_place', e.target.checked)}
                    className="w-5 h-5 text-yellow-600 bg-zinc-800 border-zinc-600 rounded"
                  />
                  <span className="text-white">Third Place Match</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

