import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Award, Medal } from 'lucide-react';

interface AwardCardProps {
  type: 'top_scorer' | 'mvp' | 'winner' | 'runner_up' | 'third_place';
  title: string;
  winner?: {
    player?: {
      id: number;
      first_name: string;
      last_name: string;
      full_name: string;
    };
    team?: {
      id: number;
      name: string;
    };
    goals?: number;
    assists?: number;
    mvp_score?: number;
  };
  stats?: string;
  crowned?: boolean;
}

const AwardCard: React.FC<AwardCardProps> = ({ type, title, winner, stats, crowned = false }) => {
  if (!winner) {
    return null;
  }

  const getIcon = () => {
    switch (type) {
      case 'top_scorer':
        return <Award className="w-12 h-12 text-yellow-500" />;
      case 'mvp':
        return <Star className="w-12 h-12 text-yellow-500" />;
      case 'winner':
        return <Trophy className="w-16 h-16 text-yellow-500" />;
      case 'runner_up':
        return <Medal className="w-10 h-10 text-gray-400" />;
      case 'third_place':
        return <Medal className="w-10 h-10 text-orange-600" />;
      default:
        return <Trophy className="w-12 h-12 text-yellow-500" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'top_scorer':
      case 'mvp':
      case 'winner':
        return 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/50';
      case 'runner_up':
        return 'bg-gradient-to-br from-gray-400/20 to-gray-500/10 border-gray-400/50';
      case 'third_place':
        return 'bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/50';
      default:
        return 'bg-zinc-800/50 border-zinc-700';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={`relative rounded-lg border-2 p-6 ${getBgColor()}`}
    >
      {crowned && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="text-4xl">👑</span>
        </div>
      )}
      
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="flex items-center justify-center">
          {getIcon()}
        </div>
        
        <h3 className="text-2xl font-bold text-white">{title}</h3>
        
        {winner.player && (
          <div className="space-y-2">
            <p className="text-xl font-semibold text-white">
              {winner.player.full_name}
            </p>
            {winner.team && (
              <p className="text-gray-300">{winner.team.name}</p>
            )}
          </div>
        )}
        
        {winner.team && !winner.player && (
          <div className="space-y-2">
            <p className="text-xl font-semibold text-white">{winner.team.name}</p>
          </div>
        )}
        
        {stats && (
          <div className="mt-2">
            <p className="text-sm text-gray-400">{stats}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AwardCard;

