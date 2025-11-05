import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, DollarSign } from "lucide-react";

interface TournamentHeroProps {
  name: string;
  tagline?: string;
  city: string;
  startDate: string;
  endDate: string;
  entryFee: string;
  bannerImage?: string;
  logoUrl?: string;
  status: "upcoming" | "live" | "completed";
  venueName: string;
  mapLink?: string;
  onCTAClick?: () => void;
  videoBackground?: string;
}

export default function TournamentHero({
  name = "Champions League Tournament",
  tagline = "Where legends are made",
  city = "Johannesburg",
  startDate = "2024-06-15",
  endDate = "2024-06-30",
  entryFee = "R2500",
  bannerImage = "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1920&q=80",
  logoUrl,
  status = "upcoming",
  venueName = "Soccer City Stadium",
  mapLink,
  onCTAClick = () => {},
  videoBackground
}: TournamentHeroProps) {
  const statusColors = {
    upcoming: "bg-blue-500",
    live: "bg-red-500 animate-pulse",
    completed: "bg-gray-500"
  };

  const statusLabels = {
    upcoming: "Upcoming",
    live: "Live Now",
    completed: "Completed"
  };

  const words = name.split(" ");

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {videoBackground ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={videoBackground} type="video/mp4" />
        </video>
      ) : (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bannerImage})` }}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/70 to-black" />
      
      {/* Particle effect overlay */}
      <div className="absolute inset-0 opacity-30">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-yellow-500 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: 0
            }}
            animate={{
              y: [null, Math.random() * window.innerHeight],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      <div className="relative h-full container mx-auto px-6 flex items-center">
        <div className="grid md:grid-cols-2 gap-12 items-center w-full">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-6"
            >
              <span className={`${statusColors[status]} px-4 py-1.5 rounded-full text-white text-sm font-bold uppercase tracking-wider`}>
                {statusLabels[status]}
              </span>
              <div className="flex items-center gap-2 text-yellow-500">
                <MapPin className="w-4 h-4" />
                <span className="font-semibold">{city}</span>
              </div>
            </motion.div>

            <motion.h1 className="text-5xl md:text-7xl font-black text-white mb-4 leading-tight">
              {words.map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="inline-block mr-4"
                  style={{
                    textShadow: "0 0 30px rgba(234, 179, 8, 0.5)"
                  }}
                >
                  {word}
                </motion.span>
              ))}
            </motion.h1>

            {tagline && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-xl text-gray-300 mb-8 italic"
              >
                {tagline}
              </motion.p>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap gap-3 mb-8"
            >
              <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-yellow-500/30">
                <Calendar className="w-4 h-4 text-yellow-500" />
                <span className="text-white font-medium">{startDate} - {endDate}</span>
              </div>
              <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-yellow-500/30">
                <DollarSign className="w-4 h-4 text-yellow-500" />
                <span className="text-white font-medium">{entryFee}</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                size="lg"
                onClick={onCTAClick}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold text-lg px-10 py-7 rounded-xl shadow-2xl shadow-yellow-500/50 transition-all hover:scale-105"
              >
                Register Your Team
              </Button>
            </motion.div>
          </div>

          {logoUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="hidden md:flex justify-center"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-500 rounded-full blur-3xl opacity-30 animate-pulse" />
                <img
                  src={logoUrl}
                  alt={name}
                  className="relative w-64 h-64 rounded-full object-cover border-4 border-yellow-500 shadow-2xl"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
