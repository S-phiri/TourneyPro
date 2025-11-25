import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import AwardCard from '../components/awards/AwardCard';
import { Trophy, ArrowLeft } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Tournament
          </button>
          
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              Tournament Awards
            </h1>
            {tournament && (
              <p className="text-xl text-gray-400">{tournament.name}</p>
            )}
          </motion.div>
        </div>

        {!hasAwards ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Trophy className="w-24 h-24 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-xl">Awards will be announced after the tournament is completed.</p>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Winner - Large Display */}
            {awards.winner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="relative"
              >
                <div className="bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 border-4 border-yellow-500 rounded-2xl p-8 text-center">
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                    <span className="text-6xl">👑</span>
                  </div>
                  <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-white mb-2">CHAMPIONS</h2>
                  <p className="text-2xl font-semibold text-yellow-300">{awards.winner.team.name}</p>
                </div>
              </motion.div>
            )}

            {/* Top Scorer, Top Assister, Clean Sheets Leader, and MVP */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {awards.top_scorer && (
                <AwardCard
                  type="top_scorer"
                  title="Top Scorer"
                  winner={awards.top_scorer}
                  stats={`${awards.top_scorer.goals} goals`}
                  crowned={true}
                />
              )}

              {awards.top_assister && (
                <AwardCard
                  type="top_assister"
                  title="Top Assister"
                  winner={awards.top_assister}
                  stats={`${awards.top_assister.assists} assists`}
                  crowned={true}
                />
              )}

              {awards.clean_sheets_leader && (
                <AwardCard
                  type="clean_sheets"
                  title="Clean Sheets Leader"
                  winner={awards.clean_sheets_leader}
                  stats={`${awards.clean_sheets_leader.clean_sheets} clean sheets`}
                  crowned={true}
                />
              )}

              {awards.mvp && (
                <AwardCard
                  type="mvp"
                  title="Most Valuable Player"
                  winner={awards.mvp}
                  stats={`${awards.mvp.goals} goals, ${awards.mvp.assists} assists`}
                  crowned={true}
                />
              )}
            </div>

            {/* Runner-up and Third Place */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {awards.runner_up && (
                <AwardCard
                  type="runner_up"
                  title="Runner-Up"
                  winner={awards.runner_up}
                />
              )}

              {awards.third_place && (
                <AwardCard
                  type="third_place"
                  title="Third Place"
                  winner={awards.third_place}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentAwards;

