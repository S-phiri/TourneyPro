import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { api, getTournamentStandings, getTournamentTopScorers, getTournamentRole, generateFixtures } from '../lib/api';
import { Tournament } from '../types/tournament';
import { listRegistrations } from '../lib/registrations';
import { listMatches } from '../lib/matches';
import Markdown from '../lib/markdown';
import { parseCSV, parseSponsors, formatDate, formatCurrency } from '../lib/helpers';
import TournamentHero from '../components/tournament/TournamentHero';
import LiveTicker from '../components/tournament/LiveTicker';
import OverviewStats from '../components/tournament/OverviewStats';
import KeyInfoGrid from '../components/tournament/KeyInfoGrid';
import TournamentTabs from '../components/tournament/TournamentTabs';
import Gallery from '../components/tournament/Gallery';
import SponsorsMarquee from '../components/tournament/SponsorsMarquee';
import ContactBar from '../components/tournament/ContactBar';
import MobileStickyCTA from '../components/tournament/MobileStickyCTA';
import TournamentNav from '../components/tournament/TournamentNav';
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
  // NEW: Pull auth state to gate manager registration
  const { isOrganizer, getTournamentRole, user, isAuthenticated, roleHint } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [topScorers, setTopScorers] = useState<any[]>([]);
  const [tournamentRole, setTournamentRole] = useState<{ is_organiser: boolean; is_manager: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Safe helpers
  const toStr = (v: any) => (v == null ? "" : String(v));
  const arr = (v: any) => (Array.isArray(v) ? v : []);

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

      // Fetch related data
      if (data.id) {
        try {
          const [registrationsData, matchesData, standingsData, scorersData, roleData] = await Promise.all([
            listRegistrations(data.id),
            listMatches(data.id),
            getTournamentStandings(data.id).catch(() => []),
            getTournamentTopScorers(data.id).catch(() => []),
            getTournamentRole(data.id).catch(() => ({ is_organiser: false, is_manager: false }))
          ]);
          setRegistrations(registrationsData);
          setMatches(matchesData);
          setStandings(Array.isArray(standingsData) ? standingsData : []);
          setTopScorers(Array.isArray(scorersData) ? scorersData : []);
          setTournamentRole(roleData);
        } catch (err) {
          // Silently fail if data not available
          console.error('Failed to fetch related data:', err);
        }
      }
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
    if (!tournament?.id) return;
    const registrationPath = `/tournaments/${tournament.id}/register`;

    // NEW: Require manager authentication before registration
    if (!isAuthenticated) {
      navigate('/manager/login', {
        state: {
          from: { pathname: registrationPath },
          message: 'Sign in as a manager to register your team.',
        },
      });
      return;
    }

    if (roleHint !== 'manager') {
      navigate(`/manager/signup?redirect=${encodeURIComponent(registrationPath)}`, {
        state: {
          from: { pathname: registrationPath },
          message: 'Create a manager account before registering a team.',
        },
      });
      return;
    }

    navigate(registrationPath);
  };

  const handleBackToLeagues = () => {
    navigate('/leagues');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
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

  const bannerImage = tournament.banner_image || tournament.hero_image || 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1920&q=80';
  const galleryImages = parseCSV(tournament.gallery_urls);
  const sponsors = parseSponsors(tournament.sponsors);
  
  // Determine status
  const tournamentStatus: "upcoming" | "live" | "completed" = 
    tournament.status === 'completed' ? 'completed' :
    tournament.status === 'open' ? 'upcoming' : 'upcoming';

  // Transform data for components
  const completedMatches = matches.filter(match => match.status === 'finished');
  const upcomingMatches = matches.filter(match => match.status === 'scheduled');

  const teams = registrations.map(reg => ({
    id: reg.team.id.toString(),
    name: reg.team.name,
    initials: reg.team.name.substring(0, 2).toUpperCase(),
    manager: reg.team.manager_name
  }));

  const fixtures = upcomingMatches.map(match => ({
    id: match.id.toString(),
    time: new Date(match.kickoff_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
    pitch: match.pitch || 'TBA',
    homeTeam: {
      id: match.home_team.id.toString(),
      name: match.home_team.name,
      initials: match.home_team.name.substring(0, 2).toUpperCase()
    },
    awayTeam: {
      id: match.away_team.id.toString(),
      name: match.away_team.name,
      initials: match.away_team.name.substring(0, 2).toUpperCase()
    },
    status: 'upcoming' as const
  }));

  const results = completedMatches.map(match => ({
    id: match.id.toString(),
    time: new Date(match.kickoff_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
    pitch: match.pitch || 'TBA',
    homeTeam: {
      id: match.home_team.id.toString(),
      name: match.home_team.name,
      initials: match.home_team.name.substring(0, 2).toUpperCase()
    },
    awayTeam: {
      id: match.away_team.id.toString(),
      name: match.away_team.name,
      initials: match.away_team.name.substring(0, 2).toUpperCase()
    },
    homeScore: match.home_score,
    awayScore: match.away_score,
    status: 'completed' as const
  }));

  const formatDateRange = () => {
    const start = formatDate(tournament.start_date);
    const end = formatDate(tournament.end_date);
    return `${start} - ${end}`;
  };

  // Create ticker items
  const tickerItems = [
    tournament.registration_deadline && { icon: "calendar", label: `Registration closes ${formatDate(tournament.registration_deadline)}` },
    { icon: "users", label: "Referees provided" },
    { icon: "trophy", label: "Trophies & medals" },
    { label: `${tournament.team_min}-a-side` },
    tournament.venue && { icon: "map", label: tournament.venue.name }
  ].filter(Boolean) as Array<{ icon?: string; label: string }>;

  // Extract WhatsApp number from URL if present
  const whatsappNumber = tournament.whatsapp_url 
    ? tournament.whatsapp_url.match(/wa\.me\/(\d+)/)?.[1] || '27123456789'
    : '27123456789';

  return (
    <div className="min-h-screen relative">
      {/* Background Gradient - Lighter black */}
      <div className="fixed inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-900 -z-10" />
      
      {/* Subtle Football Field Lines Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[1] opacity-10">
        <svg className="absolute inset-0 w-full h-full" style={{ mixBlendMode: 'overlay' }}>
          {/* Center circle */}
          <circle cx="50%" cy="50%" r="15%" fill="none" stroke="rgba(234, 179, 8, 0.3)" strokeWidth="1" />
          {/* Center line */}
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(234, 179, 8, 0.2)" strokeWidth="1" />
          {/* Penalty boxes */}
          <rect x="0" y="30%" width="20%" height="40%" fill="none" stroke="rgba(234, 179, 8, 0.2)" strokeWidth="1" />
          <rect x="80%" y="30%" width="20%" height="40%" fill="none" stroke="rgba(234, 179, 8, 0.2)" strokeWidth="1" />
          {/* Goal boxes */}
          <rect x="0" y="40%" width="8%" height="20%" fill="none" stroke="rgba(234, 179, 8, 0.2)" strokeWidth="1" />
          <rect x="92%" y="40%" width="8%" height="20%" fill="none" stroke="rgba(234, 179, 8, 0.2)" strokeWidth="1" />
        </svg>
      </div>
      
      {/* Subtle Faint Lights */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[1]">
        {[...Array(30)].map((_, i) => {
          const baseX = (i * 6) % 100;
          const baseY = (i * 8) % 100;
          const size = 2 + (i % 2); // 2-3px - much smaller
          const duration = 4 + (i % 3);
          const delay = (i * 0.2) % 2;
          
          return (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${baseX}%`,
                top: `${baseY}%`,
                width: `${size}px`,
                height: `${size}px`,
                background: 'rgba(234, 179, 8, 0.3)',
                boxShadow: '0 0 4px rgba(234, 179, 8, 0.4)',
              }}
              initial={{
                opacity: 0.2,
              }}
              animate={{
                opacity: [0.2, 0.4, 0.2],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: delay,
              }}
            />
          );
        })}
      </div>
      <div className="relative z-10">
      {/* Tournament Navigation */}
      <TournamentNav tournamentSlug={slug} />

      {/* Hero Section */}
      <TournamentHero
        name={tournament.name}
        tagline={tournament.tagline}
        city={tournament.city}
        startDate={tournament.start_date}
        endDate={tournament.end_date}
        entryFee={formatCurrency(tournament.entry_fee)}
        bannerImage={bannerImage}
        logoUrl={tournament.logo_url}
        status={tournamentStatus}
        venueName={tournament.venue?.name || tournament.city}
        mapLink={tournament.venue?.map_link}
        onCTAClick={handleRegisterTeam}
      />

      {/* Live Ticker */}
      <LiveTicker items={tickerItems} />

      {/* Role Pill and Organiser/Manager Actions */}
      {(tournamentRole?.is_organiser || tournamentRole?.is_manager) && (
        <section className="section py-6">
          <div className="container">
            <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4">
              {/* Role Pill */}
              <div className="flex items-center gap-3">
                {tournamentRole.is_organiser && (
                  <span className="px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/50 rounded-full text-yellow-400 font-semibold text-sm">
                    Organiser
                  </span>
                )}
                    {tournamentRole.is_manager && !tournamentRole.is_organiser && (
                      <span className="px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/50 rounded-full text-yellow-400 font-semibold text-sm">
                        Manager
                      </span>
                    )}
              </div>

              {/* Organiser Actions */}
              {tournamentRole.is_organiser && tournament?.id && (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate(`/tournaments/${tournament.id}/edit`)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-white text-sm font-medium transition-colors"
                  >
                    Edit Tournament
                  </button>
                  {arr(registrations).length >= (Number(tournament.team_max) || 0) && (
                    <button
                      onClick={async () => {
                        try {
                          await generateFixtures(tournament.id);
                          alert('Fixtures generation triggered!');
                          fetchTournament();
                        } catch (err) {
                          alert('Failed to generate fixtures');
                        }
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black rounded-lg text-sm font-bold transition-colors"
                    >
                      Generate Fixtures
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/tournaments/${tournament.id}/fixtures`)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-white text-sm font-medium transition-colors"
                  >
                    Manage Fixtures
                  </button>
                </div>
              )}

              {/* Manager Actions */}
              {tournamentRole.is_manager && !tournamentRole.is_organiser && tournament?.id && (
                <button
                  onClick={() => {
                    // Find the team this manager manages
                    const managerTeam = arr(registrations).find((reg: any) => {
                      const managerId = reg?.team?.manager?.id || reg?.team?.manager_user?.id;
                      return managerId === user?.id;
                    });
                    if (managerTeam?.team?.id) {
                      navigate(`/teams/${managerTeam.team.id}`);
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black rounded-lg text-sm font-bold transition-all shadow-lg shadow-yellow-500/20"
                >
                  Manage Team
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Overview Stats */}
      <OverviewStats
        teamsCount={registrations.length}
        matchesPlayed={completedMatches.length}
        upcomingMatches={upcomingMatches.length}
        entryFee={formatCurrency(tournament.entry_fee)}
      />

      {/* Key Info Grid */}
      <KeyInfoGrid
        location={tournament.city}
        venueName={tournament.venue?.name}
        duration={formatDateRange()}
        teamCapacity={tournament.team_max}
        entryFee={formatCurrency(tournament.entry_fee)}
      />

      {/* Tournament Tabs */}
      <TournamentTabs
        teams={teams}
        fixtures={fixtures}
        results={results}
        leaderboard={standings.map((s: any) => ({
          position: s.position,
          team: {
            id: String(s.team.id),
            name: s.team.name || 'Unknown',
            initials: (s.team.name || 'UN').substring(0, 2).toUpperCase()
          },
          played: s.played || 0,
          won: s.won || 0,
          drawn: s.drawn || 0,
          lost: s.lost || 0,
          points: s.points || 0
        }))}
        topScorers={topScorers.map((s: any) => ({
          name: s.name || 'Unknown',
          team: s.team || 'Unknown',
          goals: s.goals || 0
        }))}
        isOrganiser={false}
        onAddTeam={handleRegisterTeam}
        onAddMatch={() => navigate(`/tournaments/${tournament.id}/fixtures`)}
        onUpdateScore={() => navigate(`/tournaments/${tournament.id}/fixtures`)}
        onViewTeam={(teamId) => navigate(`/teams/${teamId}`)}
      />

      {/* About Section */}
      {tournament.description && (
        <section className="section bg-gradient-to-b from-gray-800 to-gray-900">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="section-title text-center mb-8 text-white">About This Tournament</h2>
              <div className="card bg-gray-800 border-gray-700">
                <p className="text-gray-300 leading-relaxed">{tournament.description}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Rules & Format */}
      {tournament.rules_md && (
        <section className="section bg-gray-900">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="section-title text-center mb-8 text-white">Rules & Format</h2>
              <div className="card bg-gray-800 border-gray-700">
                <Markdown content={tournament.rules_md} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Prizes */}
      {tournament.prizes_md && (
        <section className="section bg-gray-800">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="section-title text-center mb-8 text-white">Prizes</h2>
              <div className="card bg-gray-900 border-yellow-500/20">
                <Markdown content={tournament.prizes_md} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Gallery */}
      {galleryImages.length > 0 && (
        <Gallery galleryUrls={galleryImages} />
      )}

      {/* Sponsors */}
      {sponsors.length > 0 && (
        <SponsorsMarquee 
          sponsors={sponsors.map(s => ({ name: s.name, logoUrl: s.logo }))} 
        />
      )}

      {/* Contact Bar */}
      <ContactBar
        email={tournament.contact_email}
        phone={tournament.contact_phone}
        whatsappNumber={whatsappNumber}
      />

      {/* Mobile Sticky CTA */}
      <MobileStickyCTA
        entryFee={formatCurrency(tournament.entry_fee)}
        onRegisterClick={handleRegisterTeam}
      />
      </div>
    </div>
  );
};

export default TournamentBySlug;
