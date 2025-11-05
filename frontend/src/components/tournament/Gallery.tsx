import { motion } from "framer-motion";
import { useState } from "react";
import { X } from "lucide-react";

interface GalleryProps {
  galleryUrls?: string[];
}

const defaultGallery = [
  "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80",
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80",
  "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&q=80",
  "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&q=80",
  "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&q=80",
  "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=80"
];

export default function Gallery({ galleryUrls = defaultGallery }: GalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!galleryUrls || galleryUrls.length === 0) return null;

  return (
    <div className="container mx-auto px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="text-3xl font-black text-white mb-8">Gallery</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {galleryUrls.map((url, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05 }}
              onClick={() => setLightboxIndex(index)}
              className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group"
            >
              <img
                src={url}
                alt={`Gallery ${index + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setLightboxIndex(null)}
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 text-white hover:text-yellow-500 transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={galleryUrls[lightboxIndex]}
            alt={`Gallery ${lightboxIndex + 1}`}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </div>
  );
}
