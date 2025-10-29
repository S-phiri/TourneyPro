import React from 'react';
import { motion } from 'framer-motion';

interface TeamChipProps {
  name: string;
  initials?: string;
  crest?: string;
  size?: 'sm' | 'md' | 'lg';
}

const TeamChip: React.FC<TeamChipProps> = ({ 
  name, 
  initials, 
  crest, 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  return (
    <motion.div 
      className="flex items-center space-x-2"
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <div className={`flex items-center justify-center rounded-full bg-yellow-100 border-2 border-yellow-500 ${sizeClasses[size]}`}>
        {crest ? (
          <img src={crest} alt={name} className="w-full h-full rounded-full object-cover" />
        ) : (
          <span className="font-bold text-yellow-700">
            {initials || name.substring(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <span className={`font-medium text-gray-900 ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'}`}>
        {name}
      </span>
    </motion.div>
  );
};

export default TeamChip;

