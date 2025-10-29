import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Tournament } from '../types/tournament';
import Markdown from '../lib/markdown';
import { parseCSV, parseSponsors, formatDate, formatCurrency, getDaysUntilDeadline, getDeadlineColor } from '../lib/helpers';

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center min-h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
  </div>
);

// Error alert component
const ErrorAlert = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="max-w-md mx-auto mt-8">
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">Error loading tournament</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{message}</p>
          </div>
          <div className="mt-4">
            <button
              onClick={onRetry}
              className="bg-red-100 text-red-800 px-3 py-1 rounded-md text-sm font-medium hover:bg-red-200 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const TournamentBySlug: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTournament = async () => {
    if (!slug) {
      setError('Tournament slug is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await api<Tournament>(`/tournaments/by-slug/${slug}/`);
      setTournament(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tournament');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournament();
  }, [slug]);

  const handleRegisterTeam = () => {
    navigate(`/tournaments/${tournament?.id}/register`);
  };

  const handleBackToLeagues = () => {
    navigate('/leagues');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: tournament?.name || 'Tournament',
          text: tournament?.tagline || tournament?.description || '',
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6">
            <button
              onClick={handleBackToLeagues}
              className="text-yellow-500 hover:text-yellow-600 font-medium"
            >
              ← Back to Tournaments
            </button>
          </div>
          <ErrorAlert message={error || 'Tournament not found'} onRetry={fetchTournament} />
        </div>
      </div>
    );
  }

  const bannerImage = tournament.banner_image || tournament.hero_image;
  const galleryImages = parseCSV(tournament.gallery_urls);
  const sponsors = parseSponsors(tournament.sponsors);
  const daysUntilDeadline = tournament.registration_deadline ? getDaysUntilDeadline(tournament.registration_deadline) : null;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Background Image */}
        {bannerImage ? (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bannerImage})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
        )}
        
        {/* Overlay */}
        <div className="hero-overlay" />
        
        {/* Content */}
        <div className="relative h-full flex items-center">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left: Tournament Info */}
              <div className="text-white">
                <div className="mb-4">
                  <button
                    onClick={handleBackToLeagues}
                    className="text-yellow-400 hover:text-yellow-300 font-medium mb-6"
                  >
                    ← Back to Tournaments
                  </button>
                </div>

                <h1 className="text-4xl md:text-6xl font-bold mb-4">
                  {tournament.name}
                </h1>
                
                {tournament.tagline && (
                  <p className="text-xl md:text-2xl text-yellow-300 mb-6">
                    {tournament.tagline}
                  </p>
                )}

                <div className="flex flex-wrap gap-3 mb-8">
                  <span className="pill bg-yellow-500 text-black">
                    📍 {tournament.city}
                  </span>
                  <span className="pill bg-white text-gray-900">
                    📅 {formatDate(tournament.start_date)}
                  </span>
                  <span className="pill bg-green-500 text-white">
                    💰 {formatCurrency(tournament.entry_fee)}
                  </span>
                </div>

                <button
                  onClick={handleRegisterTeam}
                  className="btn-primary text-lg px-8 py-4 mb-4"
                >
                  Register Your Team
                </button>

                {tournament.organizer && (
                  <p className="text-sm text-gray-300">
                    Hosted by <span className="text-yellow-400">{tournament.organizer.username}</span>
                  </p>
                )}
              </div>

              {/* Right: Logo */}
              {tournament.logo_url && (
                <div className="hidden lg:flex justify-center">
                  <div className="w-48 h-48 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center p-8">
                    <img 
                      src={tournament.logo_url} 
                      alt={`${tournament.name} logo`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="animate-bounce">
            <div className="w-6 h-10 border-2 border-white rounded-full flex items-start justify-center p-2">
              <div className="w-1 h-3 bg-white rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Key Info Bar */}
      <section className="bg-white border-b border-gray-200 sticky top-0 z-40 md:hidden">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <div className="font-semibold">{formatDate(tournament.start_date)}</div>
              <div className="text-gray-600">{tournament.venue?.name}</div>
            </div>
            {tournament.venue?.map_link && (
              <a 
                href={tournament.venue.map_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-600 text-sm font-medium"
              >
                View on Map
              </a>
            )}
          </div>
          {daysUntilDeadline !== null && (
            <div className="mt-2">
              <span className={`text-sm font-medium ${getDeadlineColor(tournament.registration_deadline!)}`}>
                Registration closes in {daysUntilDeadline} days
              </span>
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      {tournament.description && (
        <section className="section bg-gray-50">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="section-title text-center mb-8">About This Tournament</h2>
              <div className="card">
                <p className="text-gray-700 leading-relaxed">{tournament.description}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Rules & Format */}
      {tournament.rules_md && (
        <section className="section bg-white">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="section-title text-center mb-8">Rules & Format</h2>
              <div className="card">
                <Markdown content={tournament.rules_md} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Prizes */}
      {tournament.prizes_md && (
        <section className="section bg-yellow-50">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="section-title text-center mb-8">Prizes</h2>
              <div className="card">
                <Markdown content={tournament.prizes_md} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Gallery */}
      {galleryImages.length > 0 && (
        <section className="section bg-gray-50">
          <div className="container">
            <div className="max-w-6xl mx-auto">
              <h2 className="section-title text-center mb-8">Gallery</h2>
              <div className="gallery-grid">
                {galleryImages.map((url, index) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden">
                    <img 
                      src={url} 
                      alt={`Gallery image ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Sponsors */}
      {sponsors.length > 0 && (
        <section className="section bg-white">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="section-title text-center mb-8">Our Sponsors</h2>
              <div className="sponsor-strip">
                {sponsors.map((sponsor, index) => (
                  <div key={index} className="flex flex-col items-center">
                    {sponsor.logo && (
                      <img 
                        src={sponsor.logo} 
                        alt={sponsor.name}
                        className="sponsor-logo mb-2"
                      />
                    )}
                    <span className="text-sm text-gray-600">{sponsor.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Contact & Share */}
      <section className="section bg-gray-900 text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="section-title text-white mb-8">Contact & Share</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Contact Info */}
              <div className="space-y-4">
                {tournament.contact_email && (
                  <div className="flex items-center justify-center space-x-3">
                    <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <a href={`mailto:${tournament.contact_email}`} className="text-yellow-400 hover:text-yellow-300">
                      {tournament.contact_email}
                    </a>
                  </div>
                )}
                
                {tournament.contact_phone && (
                  <div className="flex items-center justify-center space-x-3">
                    <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a href={`tel:${tournament.contact_phone}`} className="text-yellow-400 hover:text-yellow-300">
                      {tournament.contact_phone}
                    </a>
                  </div>
                )}
              </div>

              {/* Share Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleShare}
                  className="btn-outline border-white text-white hover:bg-white hover:text-black"
                >
                  Share Tournament
                </button>
              </div>
            </div>

            {/* WhatsApp Button */}
            {tournament.whatsapp_url && (
              <div className="mb-8">
                <a 
                  href={tournament.whatsapp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary bg-green-500 hover:bg-green-600"
                >
                  💬 Contact on WhatsApp
                </a>
              </div>
            )}

            {/* Final CTA */}
            <div className="pt-8 border-t border-gray-700">
              <button
                onClick={handleRegisterTeam}
                className="btn-primary text-lg px-8 py-4"
              >
                Register Your Team Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Sticky CTA */}
      <div className="sticky-cta">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">Entry Fee</div>
            <div className="font-bold text-green-600">{formatCurrency(tournament.entry_fee)}</div>
          </div>
          <button
            onClick={handleRegisterTeam}
            className="btn-primary"
          >
            Register Team
          </button>
        </div>
      </div>
    </div>
  );
};

export default TournamentBySlug;