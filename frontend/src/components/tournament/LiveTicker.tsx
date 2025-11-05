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
    <div className="bg-gradient-to-r from-zinc-900 via-black to-zinc-900 border-y border-yellow-500/30 py-4 overflow-hidden">
      <motion.div
        animate={{ x: [0, -50 * items.length + "%"] }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="flex gap-8 whitespace-nowrap"
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
