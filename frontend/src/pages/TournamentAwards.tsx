import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import AwardCard from '../components/awards/AwardCard';
import { ArrowLeft } from 'lucide-react';

interface AwardsData {
  top_scorer?: {
    player: {
      id: number;
      first_name: string;
      last_name: string;
      full_name: string;
    };
    team: {
      id: number;
      name: string;
    };
    goals: number;
  };
  top_assister?: {
    player: {
      id: number;
      first_name: string;
      last_name: string;
      full_name: string;
    };
    team: {
      id: number;
      name: string;
    };
    assists: number;
  };
  clean_sheets_leader?: {
    player: {
      id: number;
      first_name: string;
      last_name: string;
      full_name: string;
    };
    team: {
      id: number;
      name: string;
    };
    clean_sheets: number;
  };
  mvp?: {
    player: {
      id: number;
      first_name: string;
      last_name: string;
      full_name: string;
    };
    team: {
      id: number;
      name: string;
    };
    goals: number;
    assists: number;
    mvp_score: number;
  };
  winner?: {
    team: {
      id: number;
      name: string;
    };
    position: number;
  };
  runner_up?: {
    team: {
      id: number;
      name: string;
    };
    position: number;
  };
  third_place?: {
    team: {
      id: number;
      name: string;
    };
    position: number;
  };
}

const TournamentAwards: React.FC = () => {
  const { id, slug } = useParams<{ id?: string; slug?: string }>();
  const navigate = useNavigate();
  const [awards, setAwards] = useState<AwardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tournament, setTournament] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        let tournamentId: number;
        let tournamentData: any;

        if (slug) {
          tournamentData = await api<any>(`/tournaments/by-slug/${slug}/`);
          tournamentId = tournamentData.id;
        } else if (id) {
          tournamentId = parseInt(id);
          tournamentData = await api<any>(`/tournaments/${tournamentId}/`);
        } else {
          throw new Error('Tournament ID or slug is required');
        }

        setTournament(tournamentData);

        // Fetch awards
        const awardsData = await api<AwardsData>(`/tournaments/${tournamentId}/awards/`);
        setAwards(awardsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load awards');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="btn-primary bg-yellow-500 hover:bg-yellow-600 text-black"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const hasAwards = awards && (
    awards.top_scorer ||
    awards.top_assister ||
    awards.clean_sheets_leader ||
    awards.mvp ||
    awards.winner ||
    awards.runner_up ||
    awards.third_place
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back to Tournament</span>
          </button>
          
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Tournament Awards</p>
            {tournament && (
              <p className="text-lg text-gray-400">{tournament.name}</p>
            )}
          </motion.div>
        </div>

        {!hasAwards ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-24 h-24 mx-auto mb-6 text-gray-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 22c5.16-1.26 9-6.45 9-12V7l-9-4.5L3 7v3c0 5.55 3.84 10.74 9 12z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-gray-400 text-lg">Awards will be announced after the tournament is completed.</p>
          </motion.div>
        ) : (
          <div className="space-y-12">
            {/* Champions Banner - Hero Section */}
            {awards.winner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="relative overflow-hidden"
              >
                {/* Gradient background with subtle sparkle effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/20 via-yellow-500/10 to-purple-600/20 rounded-2xl" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,215,0,0.1),transparent_70%)]" />
                
                {/* Glassmorphism card */}
                <div className="relative bg-zinc-900/60 backdrop-blur-sm border border-yellow-500/30 rounded-2xl p-12 md:p-16 text-center shadow-2xl shadow-yellow-500/10">
                  {/* Trophy Icon - Minimal SVG */}
                  <div className="mb-6 flex justify-center">
                    <div className="w-20 h-20 text-yellow-500">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full drop-shadow-lg">
                        <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 14h12" strokeLinecap="round"/>
                        <circle cx="12" cy="14" r="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  
                  {/* Typography */}
                  <p className="text-xs uppercase tracking-[0.2em] text-yellow-400/80 mb-3 font-medium">Tournament Champions</p>
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
                    CHAMPIONS
                  </h2>
                  <p className="text-2xl md:text-3xl font-semibold text-yellow-400/90">
                    {awards.winner.team.name}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Runner-Up Banner - Full Width Below Champions */}
            {awards.runner_up && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="relative overflow-hidden"
              >
                {/* Gradient background - more subtle than champions */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-600/15 via-gray-500/8 to-gray-600/15 rounded-2xl" />
                
                {/* Glassmorphism card */}
                <div className="relative bg-zinc-900/60 backdrop-blur-sm border border-gray-500/30 rounded-2xl p-12 md:p-16 text-center shadow-2xl shadow-gray-500/10">
                  {/* Medal Icon */}
                  <div className="mb-6 flex justify-center">
                    <div className="w-20 h-20 text-gray-400">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full drop-shadow-lg">
                        <circle cx="12" cy="8" r="6" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 14v6M8 18h8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  
                  {/* Typography */}
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400/80 mb-3 font-medium">Tournament Runner-Up</p>
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
                    RUNNER-UP
                  </h2>
                  <p className="text-2xl md:text-3xl font-semibold text-gray-300/90">
                    {awards.runner_up.team.name}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Awards Grid - Top Scorer, Top Assister, Clean Sheets Leader, MVP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {awards.top_scorer && (
                <AwardCard
                  type="top_scorer"
                  title="Top Scorer"
                  winner={awards.top_scorer}
                  stats={`${awards.top_scorer.goals} goals`}
                />
              )}

              {awards.top_assister && (
                <AwardCard
                  type="top_assister"
                  title="Top Assister"
                  winner={awards.top_assister}
                  stats={`${awards.top_assister.assists} assists`}
                />
              )}

              {awards.clean_sheets_leader && (
                <AwardCard
                  type="clean_sheets"
                  title="Clean Sheets Leader"
                  winner={awards.clean_sheets_leader}
                  stats={`${awards.clean_sheets_leader.clean_sheets} clean sheets`}
                />
              )}

              {awards.mvp && (
                <AwardCard
                  type="mvp"
                  title="Most Valuable Player"
                  winner={awards.mvp}
                  stats={`${awards.mvp.goals} goals, ${awards.mvp.assists} assists`}
                />
              )}
            </div>

            {/* Third Place */}
            {awards.third_place && (
              <div className="max-w-md mx-auto">
                <AwardCard
                  type="third_place"
                  title="Third Place"
                  winner={awards.third_place}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentAwards;

