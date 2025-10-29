import React from 'react';
import { motion } from 'framer-motion';

interface TickerItem {
  icon?: string;
  label: string;
}

interface LiveTickerProps {
  items: TickerItem[];
}

const LiveTicker: React.FC<LiveTickerProps> = ({ items }) => {
  // Duplicate items for seamless loop
  const duplicatedItems = [...items, ...items];

  return (
    <div className="relative overflow-hidden bg-black/20 backdrop-blur-sm py-3 border-y border-yellow-500/30">
      <motion.div
        className="flex items-center space-x-12"
        animate={{
          x: [0, -50],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 20,
            ease: "linear",
          },
        }}
      >
        {duplicatedItems.map((item, index) => (
          <div
            key={index}
            className="flex items-center space-x-3 text-white text-sm whitespace-nowrap"
          >
            {item.icon && <span className="text-yellow-500">{item.icon}</span>}
            <span className="font-medium">{item.label}</span>
            {index < duplicatedItems.length - 1 && (
              <span className="text-yellow-500/50">•</span>
            )}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default LiveTicker;

