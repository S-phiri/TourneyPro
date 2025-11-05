import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { Users, Trophy, Calendar, DollarSign } from "lucide-react";
import { useEffect, useRef } from "react";

interface OverviewStatsProps {
  teamsCount?: number;
  matchesPlayed?: number;
  upcomingMatches?: number;
  entryFee?: string;
}

function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { duration: 2000 });
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [isInView, value, motionValue]);

  useEffect(() => {
    springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = Math.floor(latest).toString();
      }
    });
  }, [springValue]);

  return <span ref={ref}>0</span>;
}

export default function OverviewStats({
  teamsCount = 16,
  matchesPlayed = 24,
  upcomingMatches = 8,
  entryFee = "R2500"
}: OverviewStatsProps) {
  const stats = [
    { icon: Users, label: "Teams Registered", value: teamsCount, isNumber: true },
    { icon: Trophy, label: "Matches Played", value: matchesPlayed, isNumber: true },
    { icon: Calendar, label: "Upcoming Matches", value: upcomingMatches, isNumber: true },
    { icon: DollarSign, label: "Entry Fee", value: entryFee, isNumber: false }
  ];

  return (
    <div className="container mx-auto px-6 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5, scale: 1.02 }}
            className="bg-gradient-to-br from-zinc-900 to-black border border-yellow-500/20 rounded-xl p-6 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 to-yellow-500/0 group-hover:from-yellow-500/10 group-hover:to-yellow-500/5 transition-all duration-300" />
            
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <stat.icon className="w-8 h-8 text-yellow-500" />
                <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
              
              <div className="text-4xl font-black text-white mb-2">
                {stat.isNumber ? <AnimatedNumber value={stat.value as number} /> : stat.value}
              </div>
              
              <div className="text-gray-400 font-medium">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
