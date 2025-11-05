import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface MobileStickyCTAProps {
  entryFee?: string;
  onRegisterClick?: () => void;
}

export default function MobileStickyCTA({
  entryFee = "R2500",
  onRegisterClick = () => {}
}: MobileStickyCTAProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 500);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: isVisible ? 0 : 100 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-zinc-900 via-black to-zinc-900 border-t border-yellow-500/30 p-4 z-40 md:hidden backdrop-blur-lg"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-gray-400 text-xs">Entry Fee</div>
          <div className="text-yellow-500 text-xl font-black">{entryFee}</div>
        </div>
        <Button
          onClick={onRegisterClick}
          className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold px-8"
        >
          Register Team
        </Button>
      </div>
    </motion.div>
  );
}

