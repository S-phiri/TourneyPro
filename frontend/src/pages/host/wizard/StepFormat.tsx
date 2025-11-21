import React from 'react';
import { motion } from 'framer-motion';
import { WizardState, Format } from './TournamentWizard';
// NEW: Import combination type utilities
import { getCombinationTypeOptions, CombinationType } from '../../../utils/tournamentFormats';

interface StepFormatProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
}

export default function StepFormat({ state, updateState }: StepFormatProps) {
  const formats: { value: Format; title: string; bullets: string[] }[] = [
    {
      value: 'league',
      title: 'Division (League/Round-Robin)',
      bullets: [
        'Round robin format',
        'All teams play each other once (or more)',
      ],
    },
    {
      value: 'knockout',
      title: 'Knockout',
      bullets: [
        'Teams advance from one round to the next',
        'Great for playoffs or cup tournaments',
      ],
    },
    {
      value: 'combination',
      title: 'Groups → Knockout (Combination)',
      bullets: [
        'Group stage up to 6 teams/group',
        'Top teams advance to knockout bracket',
      ],
    },
  ];

  const handleSelect = (format: Format) => {
    const newStructure = format === 'combination' 
      ? { ...state.structure, combination_type: state.structure?.combination_type || 'combinationA' }
      : {};
    
    // Immediately update state
    updateState({
      format,
      structure: newStructure,
    });
    
    // Log for debugging
    console.log(`Tournament format selected: ${format}`);
  };

  // NEW: Handle combination sub-type selection
  const handleCombinationTypeChange = (combinationType: CombinationType) => {
    updateState({
      structure: {
        ...state.structure,
        combination_type: combinationType,
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Choose Tournament Format</h2>
        <p className="text-gray-400">Select the format that best fits your competition</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {formats.map((format) => (
          <motion.button
            key={format.value}
            onClick={() => handleSelect(format.value)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`p-6 rounded-xl border-2 transition-all text-left ${
              state.format === format.value
                ? 'border-yellow-500 bg-yellow-500/10'
                : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
            }`}
          >
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white mb-3">{format.title}</h3>
              <ul className="space-y-2">
                {format.bullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-gray-300 text-sm">
                    <span className="text-yellow-500 mt-1">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
            {state.format === format.value && (
              <div className="mt-4 pt-4 border-t border-yellow-500/30">
                <span className="text-yellow-500 font-semibold text-sm">Selected</span>
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {/* NEW: Combination sub-type selection when combination is selected */}
      {state.format === 'combination' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 bg-zinc-800/50 border border-yellow-500/30 rounded-xl p-6"
        >
          <h3 className="text-xl font-bold text-white mb-4">Combination Format Type</h3>
          <p className="text-gray-400 mb-4">Choose how the combination format will work:</p>
          
          <div className="space-y-3">
            {getCombinationTypeOptions().map((option) => (
              <motion.button
                key={option.value}
                onClick={() => handleCombinationTypeChange(option.value)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  state.structure?.combination_type === option.value
                    ? 'border-yellow-500 bg-yellow-500/10'
                    : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white mb-1">{option.label}</div>
                    {option.value === 'combinationA' && (
                      <div className="text-sm text-gray-400">
                        All teams play in one league table, top teams qualify for knockout
                      </div>
                    )}
                    {option.value === 'combinationB' && (
                      <div className="text-sm text-gray-400">
                        Teams divided into groups, top 2 from each group advance to knockout
                      </div>
                    )}
                  </div>
                  {state.structure?.combination_type === option.value && (
                    <div className="text-yellow-500 font-bold">✓</div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      <div className="mt-8 text-center">
        <a
          href="/tournaments/new"
          className="text-yellow-500 hover:text-yellow-400 text-sm underline"
        >
          Quick Create (Advanced)
        </a>
      </div>
    </div>
  );
}

