import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { api, getTournamentStandings, getTournamentTopScorers, getTournamentTopAssists, generateFixtures, seedTestTeams, simulateRound, clearFixtures, debugKnockout } from '../lib/api';
import { Tournament } from '../types/tournament';
import { Match } from '../lib/matches';
import { Registration } from '../lib/registrations';
import { listRegistrations, addOneTestTeam, removeLastTeam } from '../lib/registrations';
import { listMatches } from '../lib/matches';
import { formatDate, formatCurrency, parseCSV, parseSponsors } from '../lib/helpers';
import { Trophy } from 'lucide-react';
import TournamentHero from '../components/tournament/TournamentHero';
import LiveTicker from '../components/tournament/LiveTicker';
import OverviewStats from '../components/tournament/OverviewStats';
import KeyInfoGrid from '../components/tournament/KeyInfoGrid';
import TournamentTabs from '../components/tournament/TournamentTabs';
import Gallery from '../components/tournament/Gallery';
import SponsorsMarquee from '../components/tournament/SponsorsMarquee';
import ContactBar from '../components/tournament/ContactBar';
import MobileStickyCTA from '../components/tournament/MobileStickyCTA';
import CapacityBar from '../components/tournament/CapacityBar';
import TournamentNav from '../components/tournament/TournamentNav';
import Markdown from '../lib/markdown';

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center min-h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
  </div>
);

// Error alert component
const ErrorAlert = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="max-w-md mx-auto mt-8">
    <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-4 backdrop-blur-sm">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-300">Error loading tournament</h3>
          <div className="mt-2 text-sm text-red-200">
            <p>{message}</p>
          </div>
          <div className="mt-4">
            <button
              onClick={onRetry}
              className="bg-red-800/50 text-red-100 px-3 py-1 rounded-md text-sm font-medium hover:bg-red-700/50 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const TournamentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // NEW: Pull auth state to gate manager registration
  const { isOrganizer, getTournamentRole, user, isAuthenticated, roleHint, isLoading: authLoading } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  // NEW: Format-based standings data
  const [standingsData, setStandingsData] = useState<any>(null);
  const [topScorers, setTopScorers] = useState<any[]>([]);
  const [topAssists, setTopAssists] = useState<any[]>([]); // NEW: Top assists
  const [tournamentRole, setTournamentRole] = useState<{ is_organiser: boolean; is_manager: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTournament = async () => {
    if (!id) {
      setError('Tournament ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch tournament details
      const tournamentData = await api<Tournament>(`/tournaments/${id}/`);
      setTournament(tournamentData);

      // Fetch related data in parallel
      const [registrationsData, matchesData, standingsData, scorersData, assistersData, roleData] = await Promise.all([
        listRegistrations(parseInt(id)),
        listMatches(parseInt(id)),
        getTournamentStandings(parseInt(id)).catch(() => []),
        getTournamentTopScorers(parseInt(id)).catch(() => []),
        getTournamentTopAssists(parseInt(id)).catch(() => []), // NEW: Fetch top assists
        getTournamentRole(parseInt(id)).catch(() => ({ is_organiser: false, is_manager: false }))
      ]);

      setRegistrations(registrationsData);
      setMatches(matchesData);
      
      // NEW: Handle format-based standings (league or groups)
      if (standingsData && typeof standingsData === 'object' && 'format' in standingsData) {
        setStandingsData(standingsData);
        // Legacy format for backward compatibility
        if (standingsData.format === 'league' && Array.isArray(standingsData.standings)) {
          setStandings(standingsData.standings);
        } else {
          setStandings([]);
        }
      } else {
        // Legacy: array format
        setStandings(Array.isArray(standingsData) ? standingsData : []);
        setStandingsData(null);
      }
      
      setTopScorers(Array.isArray(scorersData) ? scorersData : []);
      setTopAssists(Array.isArray(assistersData) ? assistersData : []); // NEW: Set top assists
      setTournamentRole(roleData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tournament');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for auth to finish loading before fetching tournament
    // This ensures we have valid auth state before checking roles
    if (!authLoading) {
    fetchTournament();
    }
  }, [id, authLoading]);

  // Safe helpers
  const toStr = (v: any) => (v == null ? "" : String(v));
  const arr = (v: any) => (Array.isArray(v) ? v : []);
  const money = (n: any) => (n == null || isNaN(Number(n)) ? "TBC" : `R${Number(n).toFixed(0)}`);
  const fmtDate = (s?: string) =>
    s ? new Date(s).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBC';

  const handleRegisterTeam = () => {
    if (!id) return;
    // NEW: Use slug if available, otherwise fall back to ID
    const tournamentSlug = tournament?.slug;
    const registrationPath = tournamentSlug 
      ? `/t/${tournamentSlug}/register`
      : `/tournaments/${id}/register`;

    // NEW: If manager already registered, show message instead of navigating
    if (tournamentRole?.is_manager) {
      // Find their team
      const managerTeam = arr(registrations).find((reg: any) => {
        const managerId = reg?.team?.manager_user?.id || reg?.team?.manager?.id;
        return managerId === user?.id;
      });
      
      if (managerTeam?.team?.id) {
        navigate(`/teams/${managerTeam.team.id}`);
        return;
      }
    }

    // NEW: Force managers to be signed in before registering
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

  const handleManageFixtures = () => {
    // NEW: Use slug if available
    const tournamentSlug = tournament?.slug;
    if (tournamentSlug) {
      navigate(`/t/${tournamentSlug}/fixtures`);
    } else {
      navigate(`/tournaments/${id}/fixtures`);
    }
  };

  // Show loading spinner while auth is loading or tournament is loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800">
      <div className="container py-8">
        <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
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
  const completedMatches = arr(matches).filter(match => match?.status === 'finished');
  const upcomingMatches = arr(matches).filter(match => match?.status === 'scheduled');
  const liveMatches = arr(matches).filter(match => match?.status === 'live');

  const teams = arr(registrations).map(reg => ({
    id: toStr(reg?.team?.id),
    name: toStr(reg?.team?.name),
    initials: toStr(reg?.team?.name).substring(0, 2).toUpperCase(),
    manager: toStr(reg?.team?.manager_name)
  }));

  const fixtures = arr(upcomingMatches)
    .map(match => ({
      id: toStr(match?.id),
      time: match?.kickoff_at ? new Date(match.kickoff_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : 'TBC',
      pitch: toStr(match?.pitch) || 'TBA',
      homeTeam: {
        id: toStr(match?.home_team?.id),
        name: toStr(match?.home_team?.name),
        initials: toStr(match?.home_team?.name).substring(0, 2).toUpperCase()
      },
      awayTeam: {
        id: toStr(match?.away_team?.id),
        name: toStr(match?.away_team?.name),
        initials: toStr(match?.away_team?.name).substring(0, 2).toUpperCase()
      },
      status: 'upcoming' as const,
      kickoff_at: match?.kickoff_at // Keep original date for sorting
    }))
    .sort((a, b) => {
      // Sort by date ascending (soonest first)
      const dateA = a.kickoff_at ? new Date(a.kickoff_at).getTime() : 0;
      const dateB = b.kickoff_at ? new Date(b.kickoff_at).getTime() : 0;
      return dateA - dateB;
    })
    .map(({ kickoff_at, ...match }) => match); // Remove kickoff_at from final object

  const liveMatchesData = arr(liveMatches).map(match => ({
    id: toStr(match?.id),
    time: match?.started_at ? new Date(match.started_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : 'LIVE',
    pitch: toStr(match?.pitch) || 'TBA',
    homeTeam: {
      id: toStr(match?.home_team?.id),
      name: toStr(match?.home_team?.name),
      initials: toStr(match?.home_team?.name).substring(0, 2).toUpperCase()
    },
    awayTeam: {
      id: toStr(match?.away_team?.id),
      name: toStr(match?.away_team?.name),
      initials: toStr(match?.away_team?.name).substring(0, 2).toUpperCase()
    },
      homeScore: match?.home_score ?? 0,
      awayScore: match?.away_score ?? 0,
      homePenalties: match?.home_penalties ?? null,
      awayPenalties: match?.away_penalties ?? null,
      status: 'live' as const,
      startedAt: match?.started_at,
      durationMinutes: match?.duration_minutes,
      scorers: match?.scorers || []
    }));

  const results = arr(completedMatches)
    .map(match => ({
    id: toStr(match?.id),
    time: match?.kickoff_at ? new Date(match.kickoff_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : 'TBC',
    pitch: toStr(match?.pitch) || 'TBA',
    homeTeam: {
      id: toStr(match?.home_team?.id),
      name: toStr(match?.home_team?.name),
      initials: toStr(match?.home_team?.name).substring(0, 2).toUpperCase()
    },
    awayTeam: {
      id: toStr(match?.away_team?.id),
      name: toStr(match?.away_team?.name),
      initials: toStr(match?.away_team?.name).substring(0, 2).toUpperCase()
    },
    homeScore: match?.home_score ?? 0,
    awayScore: match?.away_score ?? 0,
      homePenalties: match?.home_penalties ?? null,
      awayPenalties: match?.away_penalties ?? null,
    status: 'completed' as const,
    // NEW: Include scorer and assist data
      scorers: match?.scorers || [],
      kickoff_at: match?.kickoff_at // Keep original date for sorting
    }))
    .sort((a, b) => {
      // Sort by date descending (most recent first)
      const dateA = a.kickoff_at ? new Date(a.kickoff_at).getTime() : 0;
      const dateB = b.kickoff_at ? new Date(b.kickoff_at).getTime() : 0;
      return dateB - dateA;
    })
    .map(({ kickoff_at, ...match }) => match); // Remove kickoff_at from final object

  const formatDateRange = () => {
    const start = fmtDate(tournament.start_date);
    const end = fmtDate(tournament.end_date);
    return `${start} - ${end}`;
  };

  // Create ticker items
  const tickerItems = [
    tournament.registration_deadline && { icon: "calendar", label: `Registration closes ${fmtDate(tournament.registration_deadline)}` },
    { icon: "users", label: "Referees provided" },
    { icon: "trophy", label: "Trophies & medals" },
    { label: `${toStr(tournament.team_min)}-a-side` },
    tournament.venue && { icon: "map", label: toStr(tournament.venue?.name) }
  ].filter(Boolean) as Array<{ icon?: string; label: string }>;

  // Extract WhatsApp number from URL if present
  const whatsappNumber = tournament.whatsapp_url 
    ? tournament.whatsapp_url.match(/wa\.me\/(\d+)/)?.[1] || '27123456789'
    : '27123456789';

  // Calculate available slots for seeding
  const currentTeams = arr(registrations).length;
  const maxTeams = Number(tournament.team_max) || 0;
  const availableSlots = maxTeams - currentTeams;

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
      <TournamentNav tournamentId={tournament.id} />

      {/* Hero Section */}
      {/* Pending banner if redirected after registration */}
      {new URLSearchParams(location.search).get('registered') === '1' && (
        <div className="bg-zinc-800/40 text-gray-200 border border-zinc-600/40">
          <div className="container py-3 text-sm">Registration submitted — your team is pending. We'll confirm once payment is completed.</div>
        </div>
      )}

      <TournamentHero
        name={toStr(tournament.name)}
        tagline={toStr(tournament.tagline)}
        city={toStr(tournament.city)}
        startDate={toStr(tournament.start_date)}
        endDate={toStr(tournament.end_date)}
        entryFee={money(tournament.entry_fee)}
        bannerImage={bannerImage}
        logoUrl={toStr(tournament.logo_url)}
        status={tournamentStatus}
        venueName={toStr(tournament.venue?.name) || toStr(tournament.city)}
        mapLink={toStr(tournament.venue?.map_link)}
        onCTAClick={handleRegisterTeam}
        ctaDisabled={tournamentRole?.is_manager === true}
        ctaText={tournamentRole?.is_manager ? "View Your Team" : "Register Your Team"}
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
                {!tournamentRole.is_organiser && !tournamentRole.is_manager && user && (
                  <span className="px-4 py-2 bg-gradient-to-r from-gray-500/20 to-gray-600/20 border border-gray-500/50 rounded-full text-gray-400 font-semibold text-sm">
                    Viewer
                  </span>
                )}
              </div>

              {/* Tournament Format Display */}
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                  <span className="text-gray-400 text-sm">Format:</span>
                  <span className="text-white font-semibold capitalize">
                    {tournament.format === 'knockout' ? 'Knockout' : 
                     tournament.format === 'combination' ? 'Combination' : 
                     tournament.format === 'league' ? 'League (Round-Robin)' : 
                     tournament.format || 'Not Set'}
                  </span>
                  {tournament.format === 'league' && (
                    <span className="text-xs text-yellow-400">⚠️ All teams play each other</span>
                  )}
                </div>
              </div>

              {/* Organiser Actions */}
              {tournamentRole.is_organiser && (
                <div className="w-full">
                  {/* Main Actions */}
                  <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
                  <button
                    onClick={() => {
                      navigate(`/tournaments/${id}/edit`);
                    }}
                    className="px-4 sm:px-5 py-2 sm:py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-xl text-white text-xs sm:text-sm font-medium transition-all shadow-lg hover:shadow-zinc-800/20 hover:-translate-y-0.5"
                  >
                    Edit Tournament
                  </button>
                    {arr(registrations).length >= 2 && arr(matches).length === 0 && (
                      <button
                        onClick={async () => {
                          const format = tournament.format || 'league';
                          const formatName = format === 'knockout' ? 'Knockout' : format === 'combination' ? 'Combination' : 'League';
                          const numTeams = arr(registrations).length;
                          const maxTeams = Number(tournament.team_max) || 0;
                          const isFull = numTeams >= maxTeams;
                          
                          let expectedMatches = '';
                          if (format === 'knockout') {
                            const firstRound = numTeams % 2 === 0 ? numTeams / 2 : (numTeams - 1) / 2;
                            expectedMatches = `First round: ${firstRound} matches`;
                          } else if (format === 'league') {
                            const total = (numTeams * (numTeams - 1)) / 2;
                            expectedMatches = `Total: ${total} matches (everyone plays everyone)`;
                          } else if (format === 'combination') {
                            // Combination format: groups then knockout
                            const numGroups = numTeams < 16 ? 2 : 4;
                            expectedMatches = `Group stage: ${numGroups} groups, then knockout`;
                          }
                          
                          let confirmMsg = `Generate fixtures for ${formatName} tournament?\n\n` +
                            `Teams: ${numTeams}${maxTeams > 0 ? ` / ${maxTeams}` : ''}\n` +
                            `${expectedMatches}\n\n`;
                          
                          if (!isFull && maxTeams > 0) {
                            confirmMsg += `⚠️ Tournament is not full (${numTeams}/${maxTeams} teams).\n` +
                              `Fixtures will be generated with current teams only.\n` +
                              `You can regenerate fixtures later if more teams register.\n\n`;
                          }
                          
                          confirmMsg += (format === 'league' ? '⚠️ This will create a round-robin where every team plays every other team.\n' : '') +
                            `Continue?`;
                          
                          if (!window.confirm(confirmMsg)) {
                            return;
                          }
                          
                          try {
                            await generateFixtures(parseInt(id!));
                            alert('✓ Fixtures generated successfully!');
                            fetchTournament();
                          } catch (err: any) {
                            alert(`Failed to generate fixtures: ${err.message || 'Unknown error'}`);
                          }
                        }}
                        className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg shadow-yellow-500/20 hover:-translate-y-0.5"
                      >
                        Generate Fixtures
                      </button>
                    )}
                    <button
                      onClick={handleManageFixtures}
                      className="px-4 sm:px-5 py-2 sm:py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-xl text-white text-xs sm:text-sm font-medium transition-all shadow-lg hover:shadow-zinc-800/20 hover:-translate-y-0.5"
                    >
                      Manage Fixtures
                    </button>
                  </div>

                  {/* Tournament Status Display */}
                  <div className="w-full mt-6 pt-6 border-t-2 border-yellow-500/30 bg-zinc-900/30 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-bold text-yellow-400 mb-3">Tournament Status</h3>
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`px-4 py-2 rounded-lg font-bold text-sm ${
                        tournament.status === 'completed' 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                          : tournament.status === 'open'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                          : tournament.status === 'closed'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                      }`}>
                        {tournament.status === 'completed' ? '✓ Completed' : 
                         tournament.status === 'open' ? '● Open' : 
                         tournament.status === 'closed' ? '✗ Closed' : 
                         'Draft'}
                      </span>
                      {tournament.status !== 'completed' && isOrganizer && (
                        <button
                          onClick={async () => {
                            const allMatches = arr(matches);
                            const finishedMatches = allMatches.filter((m: any) => m?.status === 'finished');
                            const totalMatches = allMatches.length;
                            
                            if (totalMatches === 0) {
                              alert('No matches found. Cannot mark as completed.');
                              return;
                            }
                            
                            if (finishedMatches.length < totalMatches) {
                              const remaining = totalMatches - finishedMatches.length;
                              if (!window.confirm(`Not all matches are finished (${remaining} remaining). Mark tournament as completed anyway?`)) {
                                return;
                              }
                            }
                            
                            if (!window.confirm(`Mark tournament "${tournament.name}" as COMPLETED?\n\nThis will:\n- Show the Awards tab\n- Make awards visible to all users\n\nContinue?`)) {
                              return;
                            }
                            
                            try {
                              await api(`/tournaments/${id}/`, {
                                method: 'PATCH',
                                body: JSON.stringify({ status: 'completed' })
                              });
                              alert('✓ Tournament marked as completed!');
                              fetchTournament();
                            } catch (err: any) {
                              alert(`Failed to update status: ${err.message || 'Unknown error'}`);
                            }
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-yellow-500/20 hover:-translate-y-0.5"
                          title="Manually mark tournament as completed"
                        >
                          Mark as Completed
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      {tournament.status === 'completed' 
                        ? 'Tournament is completed. Awards tab is visible.' 
                        : `Status: ${tournament.status}. ${arr(matches).filter((m: any) => m?.status === 'finished').length} of ${arr(matches).length} matches finished.`}
                    </p>
                  </div>

                  {/* Testing & Simulation Tools - Always Visible Section */}
                  <div className="w-full mt-6 pt-6 border-t-2 border-yellow-500/30 bg-zinc-900/30 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2">
                      <span>🧪</span>
                      Testing & Simulation Tools
                    </h3>
                    
                    {/* Team Count Display */}
                    <div className="mb-4 px-3 py-2 bg-zinc-800/50 rounded-lg border border-yellow-500/20">
                      <p className="text-sm font-semibold text-yellow-400">
                        Teams: <span className="text-white">{currentTeams}</span> / <span className="text-gray-400">{maxTeams}</span>
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {/* Quick Team Management */}
                      <div className="flex flex-wrap gap-2 items-center border-r-0 sm:border-r border-zinc-700 pr-0 sm:pr-3 mr-0 sm:mr-2 pb-2 sm:pb-0 border-b sm:border-b-0 border-zinc-700 w-full sm:w-auto">
                        <button
                          onClick={async () => {
                            if (availableSlots === 0) {
                              alert(`Tournament is full (${currentTeams}/${maxTeams}). Cannot add more teams.`);
                              return;
                            }
                            try {
                              const result = await addOneTestTeam(parseInt(id!));
                              alert(`✓ Successfully added 1 test team!\n\nTeam: ${result.teams_created > 0 ? 'Created' : 'Added'}\nManager password: test1234`);
                              await new Promise(resolve => setTimeout(resolve, 500));
                              fetchTournament();
                            } catch (err: any) {
                              alert(err.message || 'Failed to add team');
                            }
                          }}
                          disabled={availableSlots === 0}
                          className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all shadow-lg shadow-cyan-500/20 hover:-translate-y-0.5 flex-1 sm:flex-none"
                          title={availableSlots === 0 ? 'Tournament is full' : 'Add 1 test team quickly'}
                        >
                          + Add 1 Team
                        </button>
                        <button
                          onClick={async () => {
                            if (currentTeams === 0) {
                              alert('No teams to remove.');
                              return;
                            }
                            if (!window.confirm(`Remove the most recently added team?\n\nThis will delete the team's registration.`)) {
                              return;
                            }
                            try {
                              const result = await removeLastTeam(parseInt(id!));
                              alert(`✓ Removed team "${result.team_removed}"\n\nRemaining teams: ${result.remaining_teams}`);
                              await new Promise(resolve => setTimeout(resolve, 500));
                              fetchTournament();
                            } catch (err: any) {
                              alert(err.message || 'Failed to remove team');
                            }
                          }}
                          disabled={currentTeams === 0}
                          className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all shadow-lg shadow-orange-500/20 hover:-translate-y-0.5 flex-1 sm:flex-none"
                          title={currentTeams === 0 ? 'No teams to remove' : 'Remove the most recently added team'}
                        >
                          - Remove Last
                        </button>
                      </div>
                      
                      {availableSlots > 0 && (
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Create ${availableSlots} test teams to fill tournament capacity (${currentTeams}/${maxTeams})? This will create managers with password "test1234".`)) {
                          return;
                        }
                        try {
                          const result = await seedTestTeams(parseInt(id!), { teams: availableSlots, paid: false, players: 0, simulate_games: false });
                          let message = `✓ Successfully created ${result.teams_created} test teams with ${result.players_created} players!\n\n`;
                          if (result.matches_created > 0) {
                            message += `✓ Generated ${result.matches_created} fixtures\n`;
                          }
                          message += `\nManager passwords: test1234`;
                          alert(message);
                              await new Promise(resolve => setTimeout(resolve, 500));
                          fetchTournament();
                        } catch (err: any) {
                          alert(err.message || 'Failed to seed test teams');
                        }
                      }}
                      className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg shadow-green-500/20 hover:-translate-y-0.5"
                    >
                      <span className="hidden sm:inline">Seed Test Teams ({availableSlots} slots)</span>
                      <span className="sm:hidden">Seed Teams ({availableSlots})</span>
                    </button>
                  )}
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Add 11-15 players to all teams that don't have players yet?`)) {
                          return;
                        }
                        try {
                          const result = await seedTestTeams(parseInt(id!), { teams: 0, paid: false, players: 0, simulate_games: false });
                          if (result.error) {
                            alert(result.error);
                          } else {
                            alert(`✓ Added ${result.players_created} players to existing teams!`);
                          }
                          fetchTournament();
                        } catch (err: any) {
                          alert(err.message || 'Failed to add players');
                        }
                      }}
                      className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg shadow-green-500/20 hover:-translate-y-0.5"
                      title="Add players to existing teams that don't have players"
                    >
                      <span className="hidden sm:inline">Add Players to Teams</span>
                      <span className="sm:hidden">Add Players</span>
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const result = await simulateRound(parseInt(id!));
                          if (result.round_number) {
                            const stage = result.is_league_stage ? 'League Stage' : 'Knockout Stage';
                            alert(`✓ ${result.message}\n\nRound ${result.round_number} (${stage}): ${result.matches_simulated} matches simulated`);
                          } else {
                            alert(result.message || 'No matches to simulate');
                          }
                          fetchTournament();
                        } catch (err: any) {
                          alert(err.message || 'Failed to simulate round');
                        }
                      }}
                      className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg shadow-blue-500/20 hover:-translate-y-0.5"
                    >
                        <span className="hidden sm:inline">Simulate Round ({upcomingMatches.length || arr(matches).filter((m: any) => m?.status === 'scheduled').length || 0} matches remaining)</span>
                        <span className="sm:hidden">Simulate ({upcomingMatches.length || arr(matches).filter((m: any) => m?.status === 'scheduled').length || 0})</span>
                      </button>
                      <button
                        onClick={async () => {
                          const matchCount = arr(matches).length;
                          if (matchCount === 0) {
                            alert('No fixtures to clear.');
                            return;
                          }
                          
                          const confirmMsg = `Delete all ${matchCount} fixtures/matches for this tournament?\n\n` +
                            `This will delete:\n` +
                            `- All scheduled matches\n` +
                            `- All completed matches\n` +
                            `- All match scores and stats\n` +
                            `- All scorer and assist records\n\n` +
                            `This action cannot be undone. Continue?`;
                          
                          if (!window.confirm(confirmMsg)) {
                            return;
                          }
                          
                          try {
                            const result = await clearFixtures(parseInt(id!));
                            alert(`✓ ${result.detail || `Successfully deleted ${result.matches_deleted || matchCount} fixtures`}`);
                            fetchTournament();
                          } catch (err: any) {
                            alert(`Failed to clear fixtures: ${err.message || 'Unknown error'}`);
                          }
                        }}
                        disabled={arr(matches).length === 0}
                        className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg shadow-red-500/20 hover:-translate-y-0.5"
                        title={arr(matches).length === 0 ? 'No fixtures to clear' : 'Delete all matches/fixtures'}
                      >
                        <span className="hidden sm:inline">Clear Fixtures ({arr(matches).length || 0})</span>
                        <span className="sm:hidden">Clear ({arr(matches).length || 0})</span>
                    </button>
                  <button
                        onClick={async () => {
                          try {
                            const result = await debugKnockout(parseInt(id!));
                            const roundsList = result.rounds ? Object.keys(result.rounds).join(', ') : 'None';
                            const generationResultStr = result.generation_result !== null && result.generation_result !== undefined
                              ? (typeof result.generation_result === 'object' 
                                  ? JSON.stringify(result.generation_result, null, 2) 
                                  : String(result.generation_result))
                              : 'N/A';
                            const message = `Debug Info:\n\n` +
                              `Tournament: ${result.tournament_name}\n` +
                              `Format: ${result.format}\n\n` +
                              `Rounds: ${roundsList}\n\n` +
                              `Semi-Finals:\n` +
                              `  - Exists: ${result.semi_finals_status.exists}\n` +
                              `  - Total: ${result.semi_finals_status.total_matches}\n` +
                              `  - Finished: ${result.semi_finals_status.finished_matches}\n` +
                              `  - All Finished: ${result.semi_finals_status.all_finished}\n\n` +
                              `Final:\n` +
                              `  - Exists: ${result.final_status.exists}\n` +
                              `  - Total: ${result.final_status.total_matches}\n\n` +
                              `Should Generate: ${result.should_generate_final}\n` +
                              `Generation Attempted: ${result.generation_attempted}\n` +
                              `Generation Result: ${generationResultStr}`;
                            alert(message);
                            fetchTournament();
                          } catch (err: any) {
                            alert(`Debug failed: ${err.message || 'Unknown error'}`);
                          }
                        }}
                        className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg shadow-purple-500/20 hover:-translate-y-0.5"
                        title="Debug knockout round generation state"
                      >
                        <span className="hidden sm:inline">Debug Knockout</span>
                        <span className="sm:hidden">Debug</span>
                  </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Manager Actions */}
              {tournamentRole.is_manager && !tournamentRole.is_organiser && (
                <button
                  onClick={() => {
                    // Find the team this manager manages
                    // Check both manager and manager_user for compatibility
                    const managerTeam = arr(registrations).find((reg: any) => {
                      const managerId = reg?.team?.manager?.id || reg?.team?.manager_user?.id;
                      return managerId === user?.id;
                    });
                    if (managerTeam?.team?.id) {
                      navigate(`/teams/${managerTeam.team.id}`);
                    }
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black rounded-xl text-sm font-bold transition-all shadow-lg shadow-yellow-500/20 hover:-translate-y-0.5"
                >
                  Manage Team
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Capacity Bar */}
      <section className="section py-4">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <CapacityBar 
              registered={arr(registrations).length} 
              maxCapacity={Number(tournament.team_max) || 0} 
            />
          </div>
        </div>
      </section>

      {/* Overview Stats */}
      <OverviewStats
        teamsCount={arr(registrations).length}
        matchesPlayed={arr(completedMatches).length}
        upcomingMatches={arr(upcomingMatches).length}
        entryFee={money(tournament.entry_fee)}
      />

      {/* Key Info Grid */}
      <KeyInfoGrid
        location={toStr(tournament.city)}
        venueName={toStr(tournament.venue?.name)}
        duration={formatDateRange()}
        teamCapacity={Number(tournament.team_max) || 0}
        entryFee={money(tournament.entry_fee)}
      />

      {/* Tournament Tabs */}
      <TournamentTabs
        teams={teams}
        registrations={arr(registrations).map((reg: any) => ({
          id: reg.id,
          team: {
            id: String(reg?.team?.id),
            name: toStr(reg?.team?.name),
            initials: toStr(reg?.team?.name).substring(0, 2).toUpperCase(),
            manager: toStr(reg?.team?.manager_name),
            crest: reg?.team?.crest
          },
          status: reg?.status || 'pending',
          paid_amount: reg?.paid_amount || 0
        }))}
        fixtures={fixtures}
        results={results}
        // NEW: Pass format-based standings data
        standingsData={standingsData}
        tournamentFormat={tournament.format as 'league' | 'knockout' | 'combination'}
        // Legacy: backward compatibility
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
        topAssists={topAssists.map((a: any) => ({ // NEW: Pass top assists
          name: a.name || 'Unknown',
          team: a.team || 'Unknown',
          assists: a.assists || 0,
          goals: a.goals || 0
        }))}
        isOrganiser={tournamentRole?.is_organiser || false}
        tournamentId={tournament?.id}
        tournament={tournament ? { id: tournament.id, status: tournament.status, slug: tournament.slug } : undefined}
        onAddTeam={handleRegisterTeam}
        onAddMatch={handleManageFixtures}
        onUpdateScore={() => {
          const tournamentSlug = tournament?.slug;
          if (tournamentSlug) {
            navigate(`/t/${tournamentSlug}/fixtures`);
          } else {
            navigate(`/tournaments/${id}/fixtures`);
          }
        }}
        onViewTeam={(teamId) => navigate(`/teams/${teamId}`)}
        onRegistrationUpdate={fetchTournament}
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
      {/* Prize Money */}
      {(Number(tournament.first_prize) > 0 || Number(tournament.second_prize) > 0 || Number(tournament.third_prize) > 0) && (
        <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-xl p-6 mb-8">
          <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Prize Money
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Number(tournament.first_prize) > 0 && (
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-1">1st Prize</p>
                <p className="text-2xl font-bold text-yellow-500">R{Number(tournament.first_prize).toFixed(2)}</p>
              </div>
            )}
            {Number(tournament.second_prize) > 0 && (
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-1">2nd Prize</p>
                <p className="text-2xl font-bold text-gray-300">R{Number(tournament.second_prize).toFixed(2)}</p>
              </div>
            )}
            {Number(tournament.third_prize) > 0 && (
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-1">3rd Prize</p>
                <p className="text-2xl font-bold text-orange-400">R{Number(tournament.third_prize).toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Mobile Sticky CTA - Only show if registration is open */}
      {tournament.status === 'open' && (!tournament.registration_deadline || new Date(tournament.registration_deadline) > new Date()) && (
        <MobileStickyCTA
          entryFee={formatCurrency(tournament.entry_fee)}
          onRegisterClick={handleRegisterTeam}
          disabled={tournamentRole?.is_manager === true}
          buttonText={tournamentRole?.is_manager ? "View Your Team" : "Register Team"}
        />
      )}
      </div>
    </div>
  );
};

export default TournamentDetail;
