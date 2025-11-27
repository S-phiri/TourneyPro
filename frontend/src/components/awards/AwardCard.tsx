import React from 'react';
import { motion } from 'framer-motion';
import { Target, Share2, Shield, Star, Medal } from 'lucide-react';

interface AwardCardProps {
  type: 'top_scorer' | 'top_assister' | 'clean_sheets' | 'mvp' | 'winner' | 'runner_up' | 'third_place';
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
    clean_sheets?: number;
    mvp_score?: number;
  };
  stats?: string;
  crowned?: boolean;
}

const AwardCard: React.FC<AwardCardProps> = ({ type, title, winner, stats }) => {
  if (!winner) {
    return null;
  }

  // Minimal, line-based icons matching the premium aesthetic
  const getIcon = () => {
    const iconClass = "w-8 h-8";
    const baseColor = "text-yellow-400";
    
    switch (type) {
      case 'top_scorer':
        return <Target className={`${iconClass} ${baseColor}`} strokeWidth={1.5} />;
      case 'top_assister':
        return <Share2 className={`${iconClass} ${baseColor}`} strokeWidth={1.5} />;
      case 'clean_sheets':
        return <Shield className={`${iconClass} ${baseColor}`} strokeWidth={1.5} />;
      case 'mvp':
        return <Star className={`${iconClass} ${baseColor}`} strokeWidth={1.5} fill="currentColor" />;
      case 'runner_up':
        return <Medal className={`${iconClass} text-gray-400`} strokeWidth={1.5} />;
      case 'third_place':
        return <Medal className={`${iconClass} text-orange-400`} strokeWidth={1.5} />;
      default:
        return <Star className={`${iconClass} ${baseColor}`} strokeWidth={1.5} />;
    }
  };

  // Glassmorphism card styling with subtle accent colors
  const getCardStyle = () => {
    const baseStyle = "bg-zinc-900/60 backdrop-blur-sm border border-yellow-500/20";
    
    switch (type) {
      case 'top_scorer':
      case 'mvp':
        return `${baseStyle} hover:border-yellow-500/40`;
      case 'top_assister':
        return `${baseStyle.replace('yellow', 'blue')} hover:border-blue-500/40`;
      case 'clean_sheets':
        return `${baseStyle.replace('yellow', 'green')} hover:border-green-500/40`;
      case 'runner_up':
        return "bg-zinc-900/60 backdrop-blur-sm border border-gray-500/20 hover:border-gray-500/40";
      case 'third_place':
        return "bg-zinc-900/60 backdrop-blur-sm border border-orange-500/20 hover:border-orange-500/40";
      default:
        return baseStyle;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      className={`${getCardStyle()} rounded-2xl p-6 shadow-lg transition-all duration-300 h-full flex flex-col`}
    >
      <div className="flex flex-col items-center text-center space-y-4 flex-grow">
        {/* Icon */}
        <div className="flex items-center justify-center mb-2">
          {getIcon()}
        </div>
        
        {/* Award Type Label */}
        <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">
          {title}
        </p>
        
        {/* Player/Team Name - Main Focal Text */}
        {winner.player && (
          <div className="space-y-1 flex-grow">
            <p className="text-xl font-bold text-white leading-tight">
              {winner.player.full_name}
            </p>
            {winner.team && (
              <p className="text-sm text-gray-400 font-medium">
                {winner.team.name}
              </p>
            )}
          </div>
        )}
        
        {winner.team && !winner.player && (
          <div className="flex-grow">
            <p className="text-xl font-bold text-white leading-tight">
              {winner.team.name}
            </p>
          </div>
        )}
        
        {/* Stats - Small, muted line at bottom */}
        {stats && (
          <div className="mt-auto pt-2">
            <p className="text-xs text-gray-500 font-medium">
              {stats}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AwardCard;
