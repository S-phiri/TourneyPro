import { motion } from "framer-motion";
import { Mail, Phone, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContactBarProps {
  email?: string;
  phone?: string;
  whatsappNumber?: string;
}

export default function ContactBar({
  email = "info@tournament.com",
  phone = "+27 123 456 789",
  whatsappNumber = "27123456789"
}: ContactBarProps) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Tournament",
          text: "Check out this tournament!",
          url: window.location.href
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    }
  };

  return (
    <div className="bg-gradient-to-r from-zinc-900 via-black to-zinc-900 border-t border-yellow-500/30 py-8">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-6">
            <motion.a
              href={`mailto:${email}`}
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 text-white hover:text-yellow-500 transition-colors"
            >
              <Mail className="w-5 h-5" />
              <span className="font-medium">{email}</span>
            </motion.a>

            <motion.a
              href={`tel:${phone}`}
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 text-white hover:text-yellow-500 transition-colors"
            >
              <Phone className="w-5 h-5" />
              <span className="font-medium">{phone}</span>
            </motion.a>

            <motion.a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
            >
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            </motion.a>
          </div>

          <motion.div whileHover={{ scale: 1.05 }}>
            <Button
              onClick={handleShare}
              variant="outline"
              className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

