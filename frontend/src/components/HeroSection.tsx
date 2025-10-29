import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const heroImages = [
  "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1920&q=80",
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920&q=80",
  "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1920&q=80",
];

export default function HeroSection() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="home" className="relative h-screen w-full overflow-hidden">
      {heroImages.map((image, index) => (
        <motion.div
          key={image}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${image})` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: index === currentImageIndex ? 1 : 0 }}
          transition={{ duration: 1.5 }}
        />
      ))}
      
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />
      
      <div className="relative h-full flex items-center justify-center">
        <div className="container mx-auto px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-bold text-white mb-6"
          >
            Kick off your next{" "}
            <span className="text-yellow-500">tournament!</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-200 mb-10 max-w-2xl mx-auto"
          >
            Host and manage professional football tournaments with ease. 
            Connect teams, venues, and fans all in one place.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button 
              size="lg" 
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-lg px-8 py-6"
              onClick={() => navigate('/start-hosting')}
            >
              Start Hosting
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-white text-white hover:bg-white hover:text-black font-bold text-lg px-8 py-6"
              onClick={() => navigate('/leagues')}
            >
              Browse Leagues
            </Button>
          </motion.div>
        </div>
      </div>
      
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-white text-sm"
        >
          <div className="w-6 h-10 border-2 border-white rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-white rounded-full" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
