import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Mail, Phone, Award, Goal, Zap, Shield, Calendar } from 'lucide-react';
import TeamChip from '../components/tournament/TeamChip';
import { api } from '../lib/api';
import TournamentNav from '../components/tournament/TournamentNav';
// NEW: Import computePlayerStats utility
import { computePlayerStats } from '../utils/computeStats';

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

  // NEW: Compute player stats using utility (includes 5/6-aside calculations)
  const playerStats = computePlayerStats(player);
  
  // Goal contribution rate as decimal per game (not percentage)
  const goalContributionRate = playerStats.goalContributionsPerGame.toFixed(1);

  return (
    <div className="min-h-screen relative text-white">
      {/* Background Gradient - Lighter black */}
      <div className="fixed inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-900 -z-10" />
      
      {/* Subtle Football Field Lines Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[1] opacity-10">
        <svg className="absolute inset-0 w-full h-full" style={{ mixBlendMode: 'overlay' }}>
          {/* Center circle */}
          <circle cx="50%" cy="50%" r="15%" fill="none" stroke="rgba(234, 179, 8, 0.3)" strokeWidth="1" />
          {/* Center line */}
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(234, 179, 8, 0.2)" strokeWidth="1" />
          {/* Penalty boxes */}
          <rect x="0" y="30%" width="20%" height="40%" fill="none" stroke="rgba(234, 179, 8, 0.2)" strokeWidth="1" />
          <rect x="80%" y="30%" width="20%" height="40%" fill="none" stroke="rgba(234, 179, 8, 0.2)" strokeWidth="1" />
          {/* Goal boxes */}
          <rect x="0" y="40%" width="8%" height="20%" fill="none" stroke="rgba(234, 179, 8, 0.2)" strokeWidth="1" />
          <rect x="92%" y="40%" width="8%" height="20%" fill="none" stroke="rgba(234, 179, 8, 0.2)" strokeWidth="1" />
        </svg>
      </div>
      
      {/* Subtle Faint Lights */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[1]">
        {[...Array(30)].map((_, i) => {
          const baseX = (i * 6) % 100;
          const baseY = (i * 8) % 100;
          const size = 2 + (i % 2); // 2-3px - much smaller
          const duration = 4 + (i % 3);
          const delay = (i * 0.2) % 2;
          
          return (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${baseX}%`,
                top: `${baseY}%`,
                width: `${size}px`,
                height: `${size}px`,
                background: 'rgba(234, 179, 8, 0.3)',
                boxShadow: '0 0 4px rgba(234, 179, 8, 0.4)',
              }}
              initial={{
                opacity: 0.2,
              }}
              animate={{
                opacity: [0.2, 0.4, 0.2],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: delay,
              }}
            />
          );
        })}
      </div>
      <div className="relative z-10">
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
                <p className="text-3xl font-black text-white">{playerStats.goals}</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.45 }}
                className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-center hover:border-yellow-500/30 transition-all cursor-pointer"
              >
                <Award className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm mb-1">Assists</p>
                <p className="text-3xl font-black text-white">{playerStats.assists}</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-center hover:border-yellow-500/30 transition-all cursor-pointer"
              >
                <Shield className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm mb-1">Clean Sheets</p>
                <p className="text-3xl font-black text-white">{playerStats.cleanSheets ?? 0}</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.55 }}
                className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-center hover:border-yellow-500/30 transition-all cursor-pointer"
              >
                <Calendar className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm mb-1">Appearances</p>
                <p className="text-3xl font-black text-white">{playerStats.appearances}</p>
              </motion.div>
            </div>

            {/* NEW: 5/6-aside per-game stats row */}
            {playerStats.appearances > 0 && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-center hover:border-yellow-500/30 transition-all"
                >
                  <Goal className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
                  <p className="text-gray-400 text-xs mb-1">Goals/Game</p>
                  <p className="text-xl font-bold text-white">{playerStats.goalsPerMatch.toFixed(1)}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.65 }}
                  className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-center hover:border-yellow-500/30 transition-all"
                >
                  <Award className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
                  <p className="text-gray-400 text-xs mb-1">Assists/Game</p>
                  <p className="text-xl font-bold text-white">{playerStats.assistsPerMatch.toFixed(1)}</p>
                </motion.div>
                {(playerStats.cleanSheets ?? 0) > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 }}
                    className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-center hover:border-yellow-500/30 transition-all"
                  >
                    <Shield className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
                    <p className="text-gray-400 text-xs mb-1">Clean Sheet %</p>
                    <p className="text-xl font-bold text-white">{playerStats.cleanSheetRate.toFixed(0)}%</p>
                  </motion.div>
                )}
              </div>
            )}

            {/* Additional Stats Summary - Fixed Goal Contribution Display */}
            {playerStats.appearances > 0 && (
              <div className="mt-6 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-yellow-500 text-sm font-semibold mb-1">
                  ⚽ Goal Contributions per Game
                </p>
                <p className="text-white text-2xl font-black">
                  {goalContributionRate} per game
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
    </div>
  );
}
