import React from 'react';
import { motion } from 'framer-motion';
import TeamChip from './TeamChip';

interface TournamentHeroProps {
  name: string;
  tagline?: string;
  city: string;
  startDate: string;
  endDate: string;
  entryFee: string | number;
  bannerImage?: string;
  logoUrl?: string;
  status: string;
  venueName?: string;
  mapLink?: string;
  onCTAClick: () => void;
}

const TournamentHero: React.FC<TournamentHeroProps> = ({
  name,
  tagline,
  city,
  startDate,
  endDate,
  entryFee,
  bannerImage,
  logoUrl,
  status,
  venueName,
  mapLink,
  onCTAClick,
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
      },
    },
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `R${numAmount.toFixed(0)}`;
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background Image */}
      {bannerImage ? (
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bannerImage})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black" />
      )}
      
      {/* Animated Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/80" />
      
      {/* Subtle particles effect */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-yellow-400 rounded-full opacity-30"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative h-full flex items-center">
        <div className="container">
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Left: Tournament Info */}
            <div className="text-white">
              {/* Status Pill */}
              <motion.div variants={itemVariants}>
                <span className={`pill px-4 py-2 text-sm ${
                  status === 'open' 
                    ? 'bg-green-500/20 text-green-300 border border-green-500/50' 
                    : status === 'draft'
                    ? 'bg-gray-500/20 text-gray-300 border border-gray-500/50'
                    : 'bg-red-500/20 text-red-300 border border-red-500/50'
                }`}>
                  {status.toUpperCase()}
                </span>
              </motion.div>

              {/* Title */}
              <motion.h1 
                className="text-5xl md:text-7xl font-bold mb-4 mt-6"
                variants={itemVariants}
              >
                {name.split(' ').map((word, i) => (
                  <motion.span
                    key={i}
                    className="inline-block mr-2"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                  >
                    {word}
                  </motion.span>
                ))}
              </motion.h1>
              
              {tagline && (
                <motion.p 
                  className="text-xl md:text-2xl text-yellow-300 mb-6"
                  variants={itemVariants}
                >
                  {tagline}
                </motion.p>
              )}

              {/* Info Chips */}
              <motion.div 
                className="flex flex-wrap gap-3 mb-8"
                variants={itemVariants}
              >
                <span className="pill bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 backdrop-blur-sm">
                  📍 {city}
                </span>
                <span className="pill bg-white/10 text-white border border-white/20 backdrop-blur-sm">
                  📅 {formatDate(startDate)}
                </span>
                <span className="pill bg-green-500/20 text-green-300 border border-green-500/50 backdrop-blur-sm">
                  💰 {formatCurrency(entryFee)}
                </span>
              </motion.div>

              {/* CTA Button */}
              <motion.button
                onClick={onCTAClick}
                className="btn-primary text-lg px-8 py-4 relative overflow-hidden group"
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="relative z-10">Register Your Team</span>
                <motion.div
                  className="absolute inset-0 bg-yellow-600"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.button>

              {/* Venue Info */}
              {venueName && (
                <motion.div className="mt-6 text-sm text-gray-300" variants={itemVariants}>
                  {mapLink ? (
                    <a href={mapLink} target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400">
                      🏟️ {venueName}
                    </a>
                  ) : (
                    <span>🏟️ {venueName}</span>
                  )}
                </motion.div>
              )}
            </div>

            {/* Right: Logo */}
            {logoUrl && (
              <motion.div 
                className="hidden lg:flex justify-center"
                variants={itemVariants}
              >
                <motion.div
                  className="relative"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-yellow-500 rounded-full blur-3xl opacity-30 animate-pulse" />
                  <div className="w-48 h-48 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center p-8 relative z-10 border-4 border-yellow-500/50">
                    <img 
                      src={logoUrl} 
                      alt={`${name} logo`}
                      className="w-full h-full object-contain drop-shadow-2xl"
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.6 }}
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="cursor-pointer"
        >
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
            <motion.div 
              className="w-1 h-3 bg-white rounded-full"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default TournamentHero;

