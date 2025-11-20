import React from 'react';
import { motion } from 'framer-motion';

interface CapacityBarProps {
  registered: number;
  maxCapacity: number;
  label?: string;
}

export default function CapacityBar({ registered, maxCapacity, label = 'Teams' }: CapacityBarProps) {
  const percentage = maxCapacity > 0 ? Math.min((registered / maxCapacity) * 100, 100) : 0;
  const isFull = registered >= maxCapacity;
  const isNearlyFull = registered >= maxCapacity * 0.9;

  // Determine color based on capacity - Champions League gold theme
  const getBarColor = () => {
    if (isFull) return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
    if (isNearlyFull) return 'bg-gradient-to-r from-yellow-500/80 to-yellow-600/80';
    return 'bg-gradient-to-r from-yellow-500/60 to-yellow-600/60';
  };

  const getTextColor = () => {
    if (isFull) return 'text-yellow-400';
    if (isNearlyFull) return 'text-yellow-400';
    return 'text-yellow-500';
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-700 rounded-xl p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">{label} Capacity</h3>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${getTextColor()}`}>
            {registered}
          </span>
          <span className="text-gray-400 text-lg">/</span>
          <span className="text-gray-300 text-lg font-semibold">
            {maxCapacity}
          </span>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="relative w-full h-4 bg-zinc-800 rounded-full overflow-hidden shadow-inner">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`h-full ${getBarColor()} transition-colors duration-300 rounded-full shadow-lg`}
        />
      </div>

      {/* Status Message */}
      <div className="mt-3 text-center">
        {isFull ? (
          <p className="text-sm font-medium text-yellow-400">
            🎉 Tournament is full!
          </p>
        ) : isNearlyFull ? (
          <p className="text-sm font-medium text-yellow-400">
            ⚠️ Only {maxCapacity - registered} spot{maxCapacity - registered !== 1 ? 's' : ''} remaining
          </p>
        ) : (
          <p className="text-sm text-yellow-500/80">
            {maxCapacity - registered} spot{maxCapacity - registered !== 1 ? 's' : ''} available
          </p>
        )}
      </div>
    </div>
  );
}

