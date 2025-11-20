import { motion } from 'framer-motion';

interface MotionSparksBackgroundProps {
  intensity?: number;
  color?: string;
}

export default function MotionSparksBackground({ 
  intensity = 20, 
  color = 'yellow-500' 
}: MotionSparksBackgroundProps) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {[...Array(intensity)].map((_, i) => {
        // Use index-based calculations for consistent positioning
        const baseX = (i * 5) % 100;
        const baseY = (i * 7) % 100;
        const duration = 2 + (i % 3);
        const delay = (i * 0.3) % 2;
        
        return (
          <motion.div
            key={i}
            className={`absolute w-1 h-1 bg-${color}/30 rounded-full`}
            initial={{
              x: `${baseX}%`,
              y: `${baseY}%`,
              opacity: 0.2,
            }}
            animate={{
              y: [`${baseY}%`, `${(baseY + 30) % 100}%`, `${baseY}%`],
              opacity: [0.2, 0.5, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: delay,
            }}
          />
        );
      })}
    </div>
  );
}

