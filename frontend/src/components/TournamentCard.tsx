import React from 'react';
import { Tournament } from '../types/tournament';
import { motion } from 'framer-motion';
import { MapPin, Calendar, DollarSign, Users } from 'lucide-react';

interface TournamentCardProps {
  tournament: Tournament;
  onClick?: () => void;
}

// Format currency helper
const formatCurrency = (amount: string | number): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `R${numAmount.toFixed(0)}`;
};

// Format date helper
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const TournamentCard: React.FC<TournamentCardProps> = ({ tournament, onClick }) => {
  const statusColors = {
    open: "bg-green-500",
    draft: "bg-gray-500",
    closed: "bg-red-500",
    completed: "bg-blue-500"
  };

  const statusLabels = {
    open: "Open",
    draft: "Draft",
    closed: "Closed",
    completed: "Completed"
  };

  const bannerImage = tournament.banner_image || tournament.hero_image || 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80';

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className="group cursor-pointer relative overflow-hidden rounded-2xl bg-gray-800 border border-yellow-500/20 hover:border-yellow-500/50 transition-all duration-300 h-full flex flex-col"
    >
      {/* Background Image with Overlay */}
      <div className="relative h-64 overflow-hidden flex-shrink-0">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
          style={{ backgroundImage: `url(${bannerImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        
        {/* Status Badge */}
        <div className="absolute top-4 left-4">
          <span className={`${statusColors[tournament.status as keyof typeof statusColors] || 'bg-gray-500'} px-3 py-1 rounded-full text-white text-xs font-bold uppercase tracking-wider shadow-lg`}>
            {statusLabels[tournament.status as keyof typeof statusLabels] || tournament.status}
          </span>
        </div>
      </div>
      
      {/* Card Content */}
      <div className="p-6 bg-gray-900 flex-1 flex flex-col">
        <h3 className="text-2xl font-black text-white mb-3 line-clamp-2 group-hover:text-yellow-500 transition-colors">
          {tournament.name}
        </h3>
        
        {tournament.tagline && (
          <p className="text-gray-400 text-sm italic mb-4 line-clamp-1">
            {tournament.tagline}
          </p>
        )}

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-gray-300">
            <MapPin className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <span className="text-sm">{tournament.city}</span>
            {tournament.venue?.name && (
              <span className="text-sm text-gray-500">• {tournament.venue.name}</span>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-gray-300">
            <Calendar className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <span className="text-sm">
              {formatDate(tournament.start_date)} → {formatDate(tournament.end_date)}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-gray-300">
            <DollarSign className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <span className="text-sm font-bold text-yellow-500">
              {formatCurrency(tournament.entry_fee)}
            </span>
          </div>
          
          {tournament.team_max && (
            <div className="flex items-center gap-2 text-gray-300">
              <Users className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              <span className="text-sm">
                Up to {tournament.team_max} teams
              </span>
            </div>
          )}
        </div>
        
        {/* CTA Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-3 rounded-xl shadow-lg shadow-yellow-500/30 transition-all mt-auto"
        >
          View Tournament
        </motion.button>
      </div>
        
      {/* Glow Effect */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-500/0 via-yellow-500/10 to-yellow-500/0 blur-xl" />
      </div>
    </motion.div>
  );
};

export default TournamentCard;
