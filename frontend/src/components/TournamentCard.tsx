import React from 'react';
import { Tournament } from '../types/tournament';

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
  return (
    <div
      className="card cursor-pointer"
      onClick={onClick}
    >
      {/* Hero/Flyer Image */}
      {tournament.hero_image && (
        <div className="h-48 overflow-hidden">
          <img
            src={tournament.hero_image}
            alt={tournament.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {/* Card Content */}
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
          {tournament.name}
        </h3>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-gray-600">
            <svg className="w-4 h-4 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm">{tournament.city}</span>
          </div>
          
          <div className="flex items-center text-gray-600">
            <svg className="w-4 h-4 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm">
              {formatDate(tournament.start_date)} → {formatDate(tournament.end_date)}
            </span>
          </div>
          
          <div className="flex items-center text-gray-600">
            <svg className="w-4 h-4 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <span className="text-sm font-semibold text-green-600">
              {formatCurrency(tournament.entry_fee)}
            </span>
          </div>
          
            {tournament.venue?.name && (
              <div className="flex items-center text-gray-600">
                <svg className="w-4 h-4 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-sm">{tournament.venue.name}</span>
              </div>
            )}

            {tournament.organizer && (
              <div className="flex items-center text-gray-500">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-xs">Hosted by {tournament.organizer.username}</span>
              </div>
            )}
        </div>
        
        {/* Status Badge */}
        <div className="mb-4">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            tournament.status === 'open' 
              ? 'bg-green-100 text-green-800' 
              : tournament.status === 'draft'
              ? 'bg-gray-100 text-gray-800'
              : tournament.status === 'closed'
              ? 'bg-red-100 text-red-800'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {tournament.status}
          </span>
        </div>
        
        {/* View Details Button */}
        <button className="w-full btn-primary py-2">
          View Details
        </button>
      </div>
    </div>
  );
};

export default TournamentCard;
