import React from 'react';
import { motion } from 'framer-motion';

interface Sponsor {
  logo: string;
  name: string;
}

interface SponsorsMarqueeProps {
  sponsors: Sponsor[];
}

const SponsorsMarquee: React.FC<SponsorsMarqueeProps> = ({ sponsors }) => {
  if (!sponsors || sponsors.length === 0) return null;

  const duplicatedSponsors = [...sponsors, ...sponsors];

  return (
    <section className="section bg-gradient-to-b from-white to-gray-50">
      <div className="container">
        <motion.h2
          className="section-title text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Our Sponsors
        </motion.h2>
        <div className="relative overflow-hidden">
          <motion.div
            className="flex items-center gap-12"
            animate={{
              x: [0, -50],
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 30,
                ease: "linear",
              },
            }}
          >
            {duplicatedSponsors.map((sponsor, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center justify-center space-y-3 min-w-[120px] group"
                whileHover={{ scale: 1.1 }}
              >
                {sponsor.logo && (
                  <div className="relative">
                    {/* Shimmer effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{
                        x: ['-100%', '100%'],
                      }}
                      transition={{
                        x: {
                          repeat: Infinity,
                          repeatType: "loop",
                          duration: 2.5,
                          ease: "easeInOut",
                        },
                      }}
                    />
                    <img
                      src={sponsor.logo}
                      alt={sponsor.name}
                      className="h-16 w-auto object-contain opacity-70 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                )}
                <span className="text-xs text-gray-600 font-medium">{sponsor.name}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SponsorsMarquee;

