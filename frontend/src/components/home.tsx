import Navbar from "./Navbar";
import HeroSection from "./HeroSection";
import HowItWorks from "./HowItWorks";
import Footer from "./Footer";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-black">
      <Navbar />
      <HeroSection />
      
      {/* Leagues Section */}
      <section id="leagues" className="py-20 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Upcoming <span className="text-yellow-500">Leagues</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
              Discover exciting tournaments happening near you. Register your team today!
            </p>
            <Button 
              size="lg" 
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-lg px-8 py-6"
              onClick={() => navigate('/leagues')}
            >
              View All Leagues
            </Button>
          </motion.div>
        </div>
      </section>
      
      <HowItWorks />
      <Footer />
    </div>
  );
}

export default Home;