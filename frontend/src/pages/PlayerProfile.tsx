import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Mail, Phone, Award, Goal, Zap, Shield, Calendar } from 'lucide-react';
import TeamChip from '../components/tournament/TeamChip';
import { api } from '../lib/api';
import TournamentNav from '../components/tournament/TournamentNav';

export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<any>(null);
  const [tournamentId, setTournamentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) {
        setError('Player ID is missing');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await api(`/players/${id}/`);
        setPlayer(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load player profile');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center p-6">
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">Error</h2>
          <p className="text-gray-400 mb-6">{error || 'Player not found or could not be loaded.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold px-6 py-3 rounded-xl transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Calculate player initials
  const firstNameInitial = player.first_name?.charAt(0) || 'P';
  const lastNameInitial = player.last_name?.charAt(0) || '';
  const playerInitials = `${firstNameInitial}${lastNameInitial}`.toUpperCase();

  // Calculate goal contribution rate
  const goals = player.goals ?? 0;
  const assists = player.assists ?? 0;
  const appearances = Math.max(player.appearances ?? 1, 1);
  const goalContributionRate = appearances > 0 ? ((goals + assists) / appearances * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 text-white">
      {/* Tournament Navigation */}
      <TournamentNav tournamentId={tournamentId || undefined} />

      <div className="container mx-auto px-6 py-8">

        {/* Player Hero */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-4">
            <TeamChip name={`${player.first_name} ${player.last_name}`} initials={playerInitials} size="lg" />
          </div>
          <h1 className="text-5xl font-black text-yellow-500 mb-2">
            {player.first_name} {player.last_name}
          </h1>
          <p className="text-gray-300 text-xl italic">
            {player.position || 'Player'}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Player Info Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-gradient-to-br from-zinc-900 to-black border border-yellow-500/20 rounded-2xl p-6 hover:border-yellow-500/50 transition-all"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <User className="w-6 h-6 text-yellow-500" />
              Player Details
            </h2>
            <div className="space-y-4 text-gray-300">
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Full Name</p>
                <p className="text-white font-semibold">
                  {player.first_name} {player.last_name}
                </p>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Position</p>
                <p className="text-white font-semibold">{player.position || 'N/A'}</p>
              </div>
              {player.email && (
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <Mail className="w-4 h-4" />
                    Email
                  </div>
                  <p className="text-white">{player.email}</p>
                </div>
              )}
              {player.phone && (
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <Phone className="w-4 h-4" />
                    Phone
                  </div>
                  <p className="text-white">{player.phone}</p>
                </div>
              )}
              {player.user && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-500 text-sm">
                    <Award className="w-4 h-4" />
                    Linked to user account
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Season Stats Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-gradient-to-br from-zinc-900 to-black border border-yellow-500/20 rounded-2xl p-6 hover:border-yellow-500/50 transition-all"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Zap className="w-6 h-6 text-yellow-500" />
              Season Stats
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-center hover:border-yellow-500/30 transition-all cursor-pointer"
              >
                <Goal className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm mb-1">Goals</p>
                <p className="text-3xl font-black text-white">{player.goals ?? 0}</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.45 }}
                className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-center hover:border-yellow-500/30 transition-all cursor-pointer"
              >
                <Award className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm mb-1">Assists</p>
                <p className="text-3xl font-black text-white">{player.assists ?? 0}</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-center hover:border-yellow-500/30 transition-all cursor-pointer"
              >
                <Shield className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm mb-1">Clean Sheets</p>
                <p className="text-3xl font-black text-white">{player.clean_sheets ?? 0}</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.55 }}
                className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-center hover:border-yellow-500/30 transition-all cursor-pointer"
              >
                <Calendar className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm mb-1">Appearances</p>
                <p className="text-3xl font-black text-white">{player.appearances ?? 0}</p>
              </motion.div>
            </div>

            {/* Additional Stats Summary */}
            {(player.goals ?? 0) > 0 && (
              <div className="mt-6 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-yellow-500 text-sm font-semibold mb-1">
                  ⚽ Goal Contribution Rate
                </p>
                <p className="text-white text-2xl font-black">
                  {goalContributionRate}%
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Goals + Assists per Appearance
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Future: Match History, Achievements, etc. */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Match history and achievements coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
