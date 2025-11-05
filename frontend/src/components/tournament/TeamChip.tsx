import { motion } from "framer-motion";

interface TeamChipProps {
  name: string;
  crest?: string;
  initials?: string;
  size?: "sm" | "md" | "lg";
}

export default function TeamChip({ 
  name = "Team Name", 
  crest, 
  initials = "TN",
  size = "md" 
}: TeamChipProps) {
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base"
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-full px-3 py-1.5 backdrop-blur-sm"
    >
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center font-bold text-black overflow-hidden`}>
        {crest ? (
          <img src={crest} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      <span className="text-white font-medium text-sm">{name}</span>
    </motion.div>
  );
}
