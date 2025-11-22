import React from 'react';
import { WizardState } from './TournamentWizard';

interface StepPrizesProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
}

const StepPrizes: React.FC<StepPrizesProps> = ({ state, updateState }) => {
  const prizes = state.prizes || {};

  const handleChange = (field: 'first_prize' | 'second_prize' | 'third_prize', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    updateState({
      prizes: {
        ...prizes,
        [field]: numValue,
      },
    });
  };

  const firstPrize = prizes.first_prize || 0;
  const secondPrize = prizes.second_prize || 0;
  const thirdPrize = prizes.third_prize || 0;

  const isValid = firstPrize >= secondPrize && (secondPrize >= thirdPrize || thirdPrize === 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Prize Money</h2>
        <p className="text-gray-400">Set the prize amounts for the top teams</p>
      </div>

      <div className="space-y-4">
        {/* First Prize */}
        <div>
          <label className="form-label text-white">
            1st Prize <span className="text-yellow-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-semibold">
              R
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={firstPrize || ''}
              onChange={(e) => handleChange('first_prize', e.target.value)}
              className="form-input bg-zinc-800 border-zinc-600 text-white pl-8"
              placeholder="2000"
            />
          </div>
        </div>

        {/* Second Prize */}
        <div>
          <label className="form-label text-white">
            2nd Prize <span className="text-yellow-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-semibold">
              R
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={secondPrize || ''}
              onChange={(e) => handleChange('second_prize', e.target.value)}
              className="form-input bg-zinc-800 border-zinc-600 text-white pl-8"
              placeholder="500"
            />
          </div>
        </div>

        {/* Third Prize (Optional) */}
        <div>
          <label className="form-label text-white">3rd Prize (Optional)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-semibold">
              R
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={thirdPrize || ''}
              onChange={(e) => handleChange('third_prize', e.target.value)}
              className="form-input bg-zinc-800 border-zinc-600 text-white pl-8"
              placeholder="0"
            />
          </div>
        </div>

        {!isValid && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-300 text-sm">
            Prize amounts must be in descending order (1st ≥ 2nd ≥ 3rd)
          </div>
        )}
      </div>
    </div>
  );
};

export default StepPrizes;

