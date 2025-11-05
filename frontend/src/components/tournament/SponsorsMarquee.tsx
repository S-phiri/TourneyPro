import { motion } from "framer-motion";

interface Sponsor {
  name: string;
  logoUrl: string;
}

interface SponsorsMarqueeProps {
  sponsors?: Sponsor[];
}

const defaultSponsors: Sponsor[] = [
  { name: "Nike", logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=nike" },
  { name: "Adidas", logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=adidas" },
  { name: "Puma", logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=puma" },
  { name: "Under Armour", logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=ua" },
  { name: "Reebok", logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=reebok" }
];

export default function SponsorsMarquee({ sponsors = defaultSponsors }: SponsorsMarqueeProps) {
  if (!sponsors || sponsors.length === 0) return null;

  const duplicatedSponsors = [...sponsors, ...sponsors];

  return (
    <div className="bg-gradient-to-r from-zinc-900 via-black to-zinc-900 border-y border-yellow-500/30 py-12 overflow-hidden">
      <div className="container mx-auto px-6 mb-8">
        <h2 className="text-3xl font-black text-white text-center">Our Sponsors</h2>
      </div>
      
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10" />
        
        <motion.div
          animate={{ x: [0, -50 * sponsors.length + "%"] }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear"
          }}
          className="flex gap-16 items-center"
        >
          {duplicatedSponsors.map((sponsor, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-32 h-32 bg-white/5 rounded-lg p-4 flex items-center justify-center backdrop-blur-sm border border-zinc-800 relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 to-yellow-500/0 group-hover:from-yellow-500/20 group-hover:to-yellow-500/10 rounded-lg transition-all" />
              <img
                src={sponsor.logoUrl}
                alt={sponsor.name}
                className="w-full h-full object-contain opacity-70 group-hover:opacity-100 transition-opacity"
              />
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
