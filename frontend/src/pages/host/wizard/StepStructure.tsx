import React, { useEffect } from 'react';
import { WizardState } from './TournamentWizard';

interface StepStructureProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
}

export default function StepStructure({ state, updateState }: StepStructureProps) {
  // Initialize default structure values when format changes
  useEffect(() => {
    const teamCapacity = state.basics.team_capacity || 8;
    
    // Helper function to get nearest power-of-2
    const getNearestPowerOf2 = (num: number): number => {
      const powersOf2 = [4, 8, 16, 32, 64];
      return powersOf2.reduce((prev, curr) => 
        Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev
      );
    };
    
    if (state.format === 'league' && !state.structure.rounds) {
      updateState({
        structure: { ...state.structure, rounds: 1 },
      });
    } else if (state.format === 'knockout' && !state.structure.knockout) {
      // Auto-set bracket size to nearest power-of-2
      const nearestPowerOf2 = getNearestPowerOf2(teamCapacity);
      updateState({
        structure: {
          ...state.structure,
          knockout: { bracket_size: nearestPowerOf2, single_leg: true, third_place: false },
        },
      });
    } else if (state.format === 'knockout' && state.structure.knockout) {
      // Update bracket size if team capacity changed - round to nearest power-of-2
      const nearestPowerOf2 = getNearestPowerOf2(teamCapacity);
      const validSizes = [4, 8, 16, 32, 64];
      const currentBracketSize = state.structure.knockout.bracket_size;
      
      // Only update if current bracket size is not a valid power-of-2 or doesn't match nearest
      if (!validSizes.includes(currentBracketSize) || currentBracketSize !== nearestPowerOf2) {
        updateState({
          structure: {
            ...state.structure,
            knockout: { ...state.structure.knockout, bracket_size: nearestPowerOf2 },
          },
        });
      }
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
            bracket_size: Math.min(teamCapacity, 16), // Use team capacity or max 16 for combination
            single_leg: true,
            third_place: false,
          },
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.format, state.basics.team_capacity]); // Run when format or team capacity changes
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
        {state.format === 'knockout' && (() => {
          const teamCapacity = state.basics.team_capacity || 8;
          
          // Helper function to get nearest power-of-2
          const getNearestPowerOf2 = (num: number): number => {
            const powersOf2 = [4, 8, 16, 32, 64];
            return powersOf2.reduce((prev, curr) => 
              Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev
            );
          };
          
          // Only allow power-of-2 bracket sizes: 4, 8, 16, 32, 64
          const validBracketSizes = [4, 8, 16, 32, 64];
          const nearestValid = getNearestPowerOf2(teamCapacity);
          const recommendedSize = validBracketSizes.includes(teamCapacity) ? teamCapacity : nearestValid;
          
          // Filter to only show valid sizes <= team capacity (or nearest if capacity is higher)
          const bracketOptions = validBracketSizes.filter(size => size <= Math.max(teamCapacity, nearestValid));
          
          // If no valid sizes found, show at least the nearest one
          if (bracketOptions.length === 0) {
            bracketOptions.push(nearestValid);
          }
          
          // Ensure recommended size is in options
          if (!bracketOptions.includes(recommendedSize)) {
            bracketOptions.push(recommendedSize);
            bracketOptions.sort((a, b) => a - b);
          }
          
          const currentBracketSize = state.structure.knockout?.bracket_size || recommendedSize;
          const isPowerOf2 = validBracketSizes.includes(teamCapacity);
          
          return (
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Knockout Bracket Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="form-label text-white">Bracket Size</label>
                  <select
                    value={currentBracketSize}
                    onChange={(e) =>
                      handleKnockoutChange('bracket_size', parseInt(e.target.value))
                    }
                    className="form-input bg-zinc-800 border-zinc-600 text-white"
                  >
                    {bracketOptions.map(size => (
                      <option key={size} value={size}>
                        {size} Teams {size === recommendedSize ? '(Recommended)' : ''}
                      </option>
                    ))}
                  </select>
                  {!isPowerOf2 && (
                    <p className="text-xs text-yellow-400 mt-1">
                      ⚠️ Team capacity ({teamCapacity}) is not a power-of-2. Recommended bracket size: {recommendedSize} teams.
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Knockout brackets must be power-of-2 sizes (4, 8, 16, 32, 64) for clean progression.
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
          );
        })()}

        {/* Combination Format */}
        {state.format === 'combination' && (
          <div className="space-y-8">
            {/* Show different settings based on combination type */}
            {state.structure?.combination_type === 'combinationB' ? (
              /* Groups → Knockout (World Cup style) - Show Group Settings */
              <>
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

                <div className="pt-8 border-t border-zinc-700">
                  <h3 className="text-xl font-bold text-white mb-4">Knockout Stage Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label text-white">Bracket Size</label>
                      {(() => {
                        const teamCapacity = state.basics.team_capacity || 8;
                        // For combination, calculate expected qualifiers
                        const teamsPerGroup = state.structure.groups?.teams_per_group || 4;
                        const advancePerGroup = state.structure.groups?.advance_per_group || 2;
                        // Estimate number of groups
                        const numGroups = Math.ceil(teamCapacity / teamsPerGroup);
                        const expectedQualifiers = numGroups * advancePerGroup;
                        
                        // Generate options based on expected qualifiers
                        const bracketOptions = [];
                        const standardSizes = [4, 8, 16];
                        
                        if (!standardSizes.includes(expectedQualifiers) && expectedQualifiers <= teamCapacity) {
                          bracketOptions.push(expectedQualifiers);
                        }
                        
                        standardSizes.forEach(size => {
                          if (size <= teamCapacity && !bracketOptions.includes(size)) {
                            bracketOptions.push(size);
                          }
                        });
                        
                        bracketOptions.sort((a, b) => a - b);
                        
                        return (
                          <select
                            value={state.structure.knockout?.bracket_size || expectedQualifiers}
                            onChange={(e) =>
                              handleKnockoutChange('bracket_size', parseInt(e.target.value))
                            }
                            className="form-input bg-zinc-800 border-zinc-600 text-white"
                          >
                            {bracketOptions.map(size => (
                              <option key={size} value={size}>
                                {size} {size === expectedQualifiers ? `(Expected: ${numGroups} groups × ${advancePerGroup} teams)` : 'Teams'}
                              </option>
                            ))}
                          </select>
                        );
                      })()}
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
              </>
            ) : (
              /* League → Knockout (Champions League style) - Show League Settings */
              <>
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">League Stage Settings</h3>
                  <p className="text-gray-400 mb-4">
                    All teams play in one league table. Top teams advance to knockout stage.
                  </p>
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

                <div className="pt-8 border-t border-zinc-700">
                  <h3 className="text-xl font-bold text-white mb-4">Knockout Stage Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label text-white">Bracket Size</label>
                      {(() => {
                        const teamCapacity = state.basics.team_capacity || 8;
                        // For combinationA, typically top 4, 8, or 16 qualify
                        const bracketOptions = [];
                        const standardSizes = [4, 8, 16];
                        
                        // Add team capacity if reasonable
                        if (teamCapacity <= 16 && !standardSizes.includes(teamCapacity)) {
                          bracketOptions.push(teamCapacity);
                        }
                        
                        standardSizes.forEach(size => {
                          if (size <= teamCapacity && !bracketOptions.includes(size)) {
                            bracketOptions.push(size);
                          }
                        });
                        
                        bracketOptions.sort((a, b) => a - b);
                        
                        return (
                          <select
                            value={state.structure.knockout?.bracket_size || Math.min(8, teamCapacity)}
                            onChange={(e) =>
                              handleKnockoutChange('bracket_size', parseInt(e.target.value))
                            }
                            className="form-input bg-zinc-800 border-zinc-600 text-white"
                          >
                            {bracketOptions.map(size => (
                              <option key={size} value={size}>
                                {size} Teams
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                      <p className="text-xs text-gray-400 mt-1">
                        Number of top teams from league that advance to knockout (based on team capacity: {state.basics.team_capacity || 8} teams)
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

