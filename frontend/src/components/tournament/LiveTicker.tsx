import { motion } from "framer-motion";
import { Trophy, Users, Calendar, MapPin } from "lucide-react";

interface TickerItem {
  icon?: string;
  label: string;
}

interface LiveTickerProps {
  items?: TickerItem[];
}

const defaultItems: TickerItem[] = [
  { icon: "calendar", label: "Registration closes in 12 days" },
  { icon: "users", label: "Referees provided" },
  { icon: "trophy", label: "Trophies & medals" },
  { label: "6-a-side" },
  { icon: "map", label: "Indoor pitch" }
];

const iconMap: Record<string, any> = {
  calendar: Calendar,
  users: Users,
  trophy: Trophy,
  map: MapPin
};

export default function LiveTicker({ items = defaultItems }: LiveTickerProps) {
  const duplicatedItems = [...items, ...items];

  return (
    <div className="relative bg-gradient-to-r from-zinc-950 via-black to-zinc-950 border-y border-yellow-500/30 py-4 overflow-hidden">
      {/* Motion Sparks Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => {
          // Use index-based calculations for consistent positioning
          const baseX = (i * 5) % 100;
          const baseY = (i * 7) % 100;
          const duration = 2 + (i % 3);
          const delay = (i * 0.3) % 2;
          
          return (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-yellow-500/30 rounded-full"
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
      
      <motion.div
        animate={{ x: [0, -50 * items.length + "%"] }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="flex gap-8 whitespace-nowrap relative z-10"
      >
        {duplicatedItems.map((item, index) => {
          const Icon = item.icon ? iconMap[item.icon] : null;
          return (
            <div key={index} className="flex items-center gap-2 text-white">
              {Icon && <Icon className="w-4 h-4 text-yellow-500" />}
              <span className="font-medium">{item.label}</span>
              <span className="text-yellow-500 mx-4">•</span>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
