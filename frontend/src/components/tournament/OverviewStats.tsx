import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface OverviewStatsProps {
  teamsCount: number;
  matchesPlayed: number;
  upcomingMatches: number;
  entryFee: string | number;
}

const OverviewStats: React.FC<OverviewStatsProps> = ({
  teamsCount,
  matchesPlayed,
  upcomingMatches,
  entryFee,
}) => {
  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `R${numAmount.toFixed(0)}`;
  };

  const Counter = ({ value }: { value: number }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      const duration = 1500;
      const steps = 60;
      const increment = value / steps;
      const stepDuration = duration / steps;

      let currentStep = 0;
      const timer = setInterval(() => {
        currentStep++;
        setCount(Math.min(Math.ceil(increment * currentStep), value));

        if (currentStep >= steps) {
          clearInterval(timer);
          setCount(value);
        }
      }, stepDuration);

      return () => clearInterval(timer);
    }, [value]);

    return <span className="text-4xl font-bold text-gray-900">{count}</span>;
  };

  const stats = [
    {
      icon: '👥',
      label: 'Teams Registered',
      value: teamsCount,
      component: <Counter value={teamsCount} />,
      color: 'from-blue-500/10 to-blue-600/20',
      borderColor: 'border-blue-500/30',
    },
    {
      icon: '⚽',
      label: 'Matches Played',
      value: matchesPlayed,
      component: <Counter value={matchesPlayed} />,
      color: 'from-green-500/10 to-green-600/20',
      borderColor: 'border-green-500/30',
    },
    {
      icon: '📅',
      label: 'Upcoming Matches',
      value: upcomingMatches,
      component: <Counter value={upcomingMatches} />,
      color: 'from-yellow-500/10 to-yellow-600/20',
      borderColor: 'border-yellow-500/30',
    },
    {
      icon: '💰',
      label: 'Entry Fee',
      value: entryFee,
      component: <span className="text-4xl font-bold text-green-600">{formatCurrency(entryFee)}</span>,
      color: 'from-purple-500/10 to-purple-600/20',
      borderColor: 'border-purple-500/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          className={`card border-2 ${stat.borderColor} bg-gradient-to-br ${stat.color} relative overflow-hidden`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.5 }}
          whileHover={{ scale: 1.05, y: -5 }}
        >
          {/* Glow effect on hover */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
            initial={{ x: '-100%' }}
            whileHover={{ x: '100%' }}
            transition={{ duration: 0.5 }}
          />
          
          <div className="relative z-10">
            <div className="text-4xl mb-3">{stat.icon}</div>
            <div className="mb-2">{stat.component}</div>
            <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default OverviewStats;

