import { motion } from "framer-motion";
import { MapPin, Calendar, Users, DollarSign } from "lucide-react";

interface KeyInfoGridProps {
  location?: string;
  venueName?: string;
  duration?: string;
  teamCapacity?: number;
  entryFee?: string;
}

export default function KeyInfoGrid({
  location = "Johannesburg, South Africa",
  venueName = "Soccer City Stadium",
  duration = "June 15 - June 30, 2024",
  teamCapacity = 16,
  entryFee = "R2500"
}: KeyInfoGridProps) {
  const infoItems = [
    { icon: MapPin, label: "Location", value: location },
    { icon: MapPin, label: "Venue", value: venueName },
    { icon: Calendar, label: "Duration", value: duration },
    { icon: Users, label: "Team Capacity", value: `${teamCapacity} teams` },
    { icon: DollarSign, label: "Entry Fee", value: entryFee }
  ];

  return (
    <div className="container mx-auto px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-gradient-to-br from-zinc-900 to-black border border-yellow-500/20 rounded-2xl p-8 overflow-hidden"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="h-1 w-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full" />
          <h2 className="text-3xl font-black text-white">Tournament Overview</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {infoItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-4 p-4 rounded-lg bg-zinc-800/30 border border-zinc-800 hover:border-yellow-500/30 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <div className="text-gray-400 text-sm mb-1">{item.label}</div>
                <div className="text-white font-semibold">{item.value}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

