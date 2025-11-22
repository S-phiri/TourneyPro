import React from 'react';
import { WizardState } from './TournamentWizard';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, DollarSign, Trophy } from 'lucide-react';

interface StepReviewProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  onFinish: () => void;
  onSaveDraft: () => void;
}

export default function StepReview({ state, onFinish, onSaveDraft }: StepReviewProps) {
  const formatLabels: Record<string, string> = {
    league: 'Division (League/Round-Robin)',
    knockout: 'Knockout',
    combination: 'Groups → Knockout',
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Review & Create</h2>
        <p className="text-gray-400">Review all settings before creating your competition</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Basics Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-zinc-900/50 border border-zinc-700"
        >
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-yellow-500" />
            Basics
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-400">Name:</span>
              <span className="text-white ml-2 font-semibold">{state.basics.name}</span>
            </div>
            <div>
              <span className="text-gray-400">City:</span>
              <span className="text-white ml-2">{state.basics.city}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">
                {new Date(state.basics.start_date).toLocaleDateString()} -{' '}
                {new Date(state.basics.end_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">Capacity: {state.basics.team_capacity} teams</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">Entry Fee: R{state.basics.entry_fee}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">{state.basics.venue_name}</span>
            </div>
          </div>
        </motion.div>

        {/* Prizes Card */}
        {state.prizes && (state.prizes.first_prize || state.prizes.second_prize || state.prizes.third_prize) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card bg-zinc-900/50 border border-zinc-700"
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Prize Money
            </h3>
            <div className="space-y-3 text-sm">
              {state.prizes.first_prize > 0 && (
                <div>
                  <span className="text-gray-400">1st Prize:</span>
                  <span className="text-white ml-2 font-semibold text-yellow-500">R{state.prizes.first_prize}</span>
                </div>
              )}
              {state.prizes.second_prize > 0 && (
                <div>
                  <span className="text-gray-400">2nd Prize:</span>
                  <span className="text-white ml-2 font-semibold text-gray-300">R{state.prizes.second_prize}</span>
                </div>
              )}
              {state.prizes.third_prize > 0 && (
                <div>
                  <span className="text-gray-400">3rd Prize:</span>
                  <span className="text-white ml-2 font-semibold text-orange-400">R{state.prizes.third_prize}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Rules Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card bg-zinc-900/50 border border-zinc-700"
        >
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Rules
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-400">Points:</span>
              <span className="text-white ml-2">
                Win: {state.rules.win_pts} | Draw: {state.rules.draw_pts} | Loss:{' '}
                {state.rules.loss_pts}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Tiebreakers:</span>
              <div className="text-white ml-2 mt-1">
                {state.rules.tiebreakers?.map((t, idx) => (
                  <span key={t} className="mr-2">
                    {idx + 1}. {t}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-gray-400">Match Duration:</span>
              <span className="text-white ml-2">{state.rules.duration_mins} minutes</span>
            </div>
            <div>
              <span className="text-gray-400">Max Players:</span>
              <span className="text-white ml-2">{state.rules.max_players} per team</span>
            </div>
          </div>
        </motion.div>

        {/* Structure Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card bg-zinc-900/50 border border-zinc-700"
        >
          <h3 className="text-xl font-bold text-white mb-4">Structure</h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-400">Format:</span>
              <span className="text-white ml-2 font-semibold">
                {formatLabels[state.format]}
              </span>
            </div>
            {state.format === 'league' && (
              <div>
                <span className="text-gray-400">Rounds:</span>
                <span className="text-white ml-2">
                  {state.structure.rounds || 1}{' '}
                  {state.structure.rounds === 2 ? '(Double)' : '(Single)'}
                </span>
              </div>
            )}
            {state.format === 'knockout' && state.structure.knockout && (
              <div>
                <span className="text-gray-400">Bracket Size:</span>
                <span className="text-white ml-2">
                  {state.structure.knockout.bracket_size} teams
                </span>
                <div className="text-gray-400 mt-2">
                  {state.structure.knockout.single_leg ? 'Single Leg' : 'Two Legs'} •{' '}
                  {state.structure.knockout.third_place ? 'Third Place Match' : 'No Third Place'}
                </div>
              </div>
            )}
            {state.format === 'combination' && (
              <div className="space-y-2">
                <div>
                  <span className="text-gray-400">Groups:</span>
                  <span className="text-white ml-2">
                    {state.structure.groups?.teams_per_group} teams per group,{' '}
                    {state.structure.groups?.advance_per_group} advance
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Knockout:</span>
                  <span className="text-white ml-2">
                    {state.structure.knockout?.bracket_size} team bracket
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Marketing Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card bg-zinc-900/50 border border-zinc-700"
        >
          <h3 className="text-xl font-bold text-white mb-4">Branding</h3>
          <div className="space-y-3 text-sm">
            {state.marketing?.tagline && (
              <div>
                <span className="text-gray-400">Tagline:</span>
                <span className="text-white ml-2">{state.marketing.tagline}</span>
              </div>
            )}
            {(state.marketing?.logo_url ||
              state.marketing?.banner_image ||
              state.marketing?.gallery_urls) && (
              <div>
                <span className="text-gray-400">Images:</span>
                <span className="text-white ml-2">
                  {state.marketing.logo_url && 'Logo, '}
                  {state.marketing.banner_image && 'Banner, '}
                  {state.marketing.gallery_urls && 'Gallery'}
                </span>
              </div>
            )}
            {state.marketing?.sponsors && (
              <div>
                <span className="text-gray-400">Sponsors:</span>
                <span className="text-white ml-2">
                  {state.marketing.sponsors.split(',').length} sponsor(s)
                </span>
              </div>
            )}
            {!state.marketing?.tagline &&
              !state.marketing?.logo_url &&
              !state.marketing?.banner_image && (
                <span className="text-gray-500 italic">No branding added</span>
              )}
          </div>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={onSaveDraft}
          className="btn-outline px-8 py-3 bg-zinc-800 hover:bg-zinc-700 border-zinc-600 text-white"
        >
          Save Draft
        </button>
        <button
          onClick={onFinish}
          className="btn-primary px-8 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold"
        >
          Create & Generate Fixtures
        </button>
      </div>
    </div>
  );
}

