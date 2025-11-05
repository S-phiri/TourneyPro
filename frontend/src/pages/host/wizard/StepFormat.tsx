import React from 'react';
import { motion } from 'framer-motion';
import { WizardState, Format } from './TournamentWizard';

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
    updateState({
      format,
      // Reset structure when format changes (keep basics/rules)
      structure: {},
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

