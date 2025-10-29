import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import TournamentHero from '../components/tournament/TournamentHero';
import LiveTicker from '../components/tournament/LiveTicker';
import OverviewStats from '../components/tournament/OverviewStats';
import Gallery from '../components/tournament/Gallery';
import SponsorsMarquee from '../components/tournament/SponsorsMarquee';
import TeamChip from '../components/tournament/TeamChip';

interface Team {
  id: number;
  name: string;
  manager_name: string;
  manager_email: string;
  phone?: string;
}

interface Registration {
  id: number;
  team: Team;
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
}

interface Match {
  id: number;
  home_team: Team;
  away_team: Team;
  kickoff_at: string;
  home_score: number;
  away_score: number;
  pitch?: string;
  status: 'scheduled' | 'finished';
}

interface TournamentShowcaseProps {
  // Tournament data (props if passed, otherwise will fetch)
  tournamentId?: number;
  name?: string;
  tagline?: string;
  city?: string;
  startDate?: string;
  endDate?: string;
  entryFee?: string | number;
  bannerImage?: string;
  logoUrl?: string;
  status?: string;
  venueName?: string;
  mapLink?: string;
  registrationDeadline?: string;
  rulesMd?: string;
  prizesMd?: string;
  contactEmail?: string;
  contactPhone?: string;
  whatsappUrl?: string;
  
  // Gallery & Sponsors
  galleryUrls?: string[];
  sponsors?: Array<{ logo: string; name: string }>;
  
  // Stats
  teamsCount?: number;
  matchesPlayed?: number;
  upcomingMatches?: number;
  
  // Live ticker items
  tickerItems?: Array<{ icon?: string; label: string }>;
  
  // Teams and matches
  registrations?: Registration[];
  upcomingFixtures?: Match[];
  recentResults?: Match[];
  
  // Callbacks
  onRegister?: () => void;
  onAddTeam?: () => void;
  onAddMatch?: () => void;
  onUpdateScore?: (matchId: number) => void;
}

const TournamentShowcase: React.FC<TournamentShowcaseProps> = (props) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const tournamentId = props.tournamentId || (id ? parseInt(id) : undefined);

  // Mock data for demonstration
  const mockTickerItems: Array<{ icon?: string; label: string }> = [
    { icon: '⏰', label: 'Registration closes in 12 days' },
    { icon: '👔', label: 'Referees provided' },
    { icon: '🏆', label: 'Trophies & medals' },
    { icon: '👥', label: '6-a-side format' },
    { icon: '🏃', label: 'Indoor pitch' },
  ];

  const [activeTab, setActiveTab] = useState<'registrations' | 'fixtures' | 'leaderboard'>('registrations');
  const [showConfetti, setShowConfetti] = useState(false);

  const handleRegister = () => {
    if (tournamentId) {
      navigate(`/tournaments/${tournamentId}/register`);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: props.name || 'Tournament',
          text: props.tagline || '',
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800">
      {/* Hero Section */}
      <TournamentHero
        name={props.name || '2025 Spring Championship'}
        tagline={props.tagline || 'Compete. Win. Glory.'}
        city={props.city || 'Johannesburg'}
        startDate={props.startDate || '2025-03-15'}
        endDate={props.endDate || '2025-03-22'}
        entryFee={props.entryFee || 500}
        bannerImage={props.bannerImage}
        logoUrl={props.logoUrl}
        status={props.status || 'open'}
        venueName={props.venueName || 'City Stadium'}
        mapLink={props.mapLink}
        onCTAClick={handleRegister}
      />

      {/* Live Ticker */}
      <LiveTicker items={props.tickerItems || mockTickerItems} />

      {/* Main Content */}
      <div className="container py-12">
        {/* Overview Stats */}
        <OverviewStats
          teamsCount={props.teamsCount || 24}
          matchesPlayed={props.matchesPlayed || 18}
          upcomingMatches={props.upcomingMatches || 12}
          entryFee={props.entryFee || 500}
        />

        {/* Key Info Grid */}
        <motion.div
          className="card mt-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title mb-6">Tournament Overview</h2>
          <div className="border-b-4 border-yellow-500 mb-6" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">📍 Location</h3>
                <p className="text-gray-600">{props.city || 'Johannesburg'}</p>
                {props.venueName && (
                  <p className="text-gray-600 font-medium">{props.venueName}</p>
                )}
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">📅 Duration</h3>
                <p className="text-gray-600">
                  {new Date(props.startDate || '2025-03-15').toLocaleDateString()}
                </p>
                <p className="text-gray-600">
                  to {new Date(props.endDate || '2025-03-22').toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">👥 Capacity</h3>
                <p className="text-gray-600">6 - 10 teams per tournament</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">💰 Entry Fee</h3>
                <p className="text-2xl font-bold text-green-600">
                  {typeof props.entryFee === 'number' 
                    ? `R${props.entryFee.toFixed(0)}` 
                    : props.entryFee || 'R500'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs Section */}
        <motion.div
          className="card mt-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Tab Navigation */}
          <div className="tabs mb-6">
            <button
              className={`tab ${activeTab === 'registrations' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('registrations')}
            >
              Registrations ({props.registrations?.length || 0})
            </button>
            <button
              className={`tab ${activeTab === 'fixtures' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('fixtures')}
            >
              Fixtures & Results
            </button>
            <button
              className={`tab ${activeTab === 'leaderboard' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('leaderboard')}
            >
              Leaderboard
            </button>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {/* Registrations Tab */}
            {activeTab === 'registrations' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Registered Teams</h3>
                  {props.onAddTeam && (
                    <button onClick={props.onAddTeam} className="btn-primary text-sm">
                      Add Team
                    </button>
                  )}
                </div>
                
                {(!props.registrations || props.registrations.length === 0) ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No teams registered yet.</p>
                    <button onClick={handleRegister} className="btn-primary mt-4">
                      Be the First to Register
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {props.registrations.map((reg) => (
                      <motion.div
                        key={reg.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-yellow-500 transition-colors"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <TeamChip name={reg.team.name} size="md" />
                          <span className={`pill ${
                            reg.status === 'paid' 
                              ? 'bg-green-100 text-green-800'
                              : reg.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {reg.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">Manager: {reg.team.manager_name}</p>
                        <p className="text-sm text-gray-500">{reg.team.manager_email}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Fixtures Tab */}
            {activeTab === 'fixtures' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* Upcoming Fixtures */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Upcoming Fixtures</h3>
                  {(!props.upcomingFixtures || props.upcomingFixtures.length === 0) ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No upcoming fixtures</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {props.upcomingFixtures.map((match) => (
                        <motion.div
                          key={match.id}
                          className="border border-gray-200 rounded-lg p-4"
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <TeamChip name={match.home_team.name} size="sm" />
                            <span className="text-yellow-600 font-bold">VS</span>
                            <TeamChip name={match.away_team.name} size="sm" />
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(match.kickoff_at).toLocaleString()}
                          </div>
                          {match.pitch && (
                            <div className="text-xs text-gray-500">Pitch: {match.pitch}</div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {props.onAddMatch && (
                    <button onClick={props.onAddMatch} className="btn-primary w-full mt-4">
                      Add Match
                    </button>
                  )}
                </div>

                {/* Recent Results */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Recent Results</h3>
                  {(!props.recentResults || props.recentResults.length === 0) ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No results yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {props.recentResults.map((match) => (
                        <motion.div
                          key={match.id}
                          className="border border-gray-200 rounded-lg p-4"
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <TeamChip name={match.home_team.name} size="sm" />
                            </div>
                            <div className="text-2xl font-bold text-gray-900 mx-4">
                              {match.home_score} - {match.away_score}
                            </div>
                            <div className="flex-1 text-right">
                              <TeamChip name={match.away_team.name} size="sm" />
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            {new Date(match.kickoff_at).toLocaleDateString()}
                          </div>
                          {props.onUpdateScore && (
                            <button 
                              onClick={() => props.onUpdateScore?.(match.id)}
                              className="text-xs text-yellow-600 hover:text-yellow-700 mt-2"
                            >
                              Update Score
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Leaderboard Tab */}
            {activeTab === 'leaderboard' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-lg font-semibold mb-4">Standings</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 font-semibold text-gray-900">Pos</th>
                        <th className="text-left p-3 font-semibold text-gray-900">Team</th>
                        <th className="text-center p-3 font-semibold text-gray-900">P</th>
                        <th className="text-center p-3 font-semibold text-gray-900">W</th>
                        <th className="text-center p-3 font-semibold text-gray-900">D</th>
                        <th className="text-center p-3 font-semibold text-gray-900">L</th>
                        <th className="text-center p-3 font-semibold text-gray-900">PTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Mock data */}
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="p-3">
                            <span className="pill bg-yellow-100 text-yellow-800 font-bold">
                              #{i}
                            </span>
                          </td>
                          <td className="p-3">
                            <TeamChip name={`Team ${i}`} size="sm" />
                          </td>
                          <td className="text-center p-3 text-gray-600">12</td>
                          <td className="text-center p-3 text-green-600 font-semibold">8</td>
                          <td className="text-center p-3 text-gray-600">3</td>
                          <td className="text-center p-3 text-red-600 font-semibold">1</td>
                          <td className="text-center p-3 font-bold text-yellow-600">27</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Top Scorers */}
                <div className="card mt-6">
                  <h4 className="text-lg font-semibold mb-4 flex items-center">
                    🥇 Top Scorers
                  </h4>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold text-sm">
                            {i}
                          </div>
                          <span className="font-medium">Player {i}</span>
                        </div>
                        <span className="font-bold text-yellow-600">{15 - i * 2} goals</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Gallery */}
      {props.galleryUrls && props.galleryUrls.length > 0 && (
        <Gallery images={props.galleryUrls} />
      )}

      {/* Sponsors */}
      {props.sponsors && props.sponsors.length > 0 && (
        <SponsorsMarquee sponsors={props.sponsors} />
      )}

      {/* Contact Bar */}
      <section className="section bg-gray-900 text-white">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {props.contactEmail && (
              <a
                href={`mailto:${props.contactEmail}`}
                className="flex items-center justify-center space-x-3 text-yellow-400 hover:text-yellow-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>{props.contactEmail}</span>
              </a>
            )}
            
            {props.contactPhone && (
              <a
                href={`tel:${props.contactPhone}`}
                className="flex items-center justify-center space-x-3 text-yellow-400 hover:text-yellow-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>{props.contactPhone}</span>
              </a>
            )}
            
            <button
              onClick={handleShare}
              className="btn-outline border-white text-white hover:bg-white hover:text-black"
            >
              Share Tournament
            </button>
          </div>
        </div>
      </section>

      {/* Mobile Sticky CTA */}
      <div className="sticky-cta">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">Entry Fee</div>
            <div className="font-bold text-green-600">
              {typeof props.entryFee === 'number' 
                ? `R${props.entryFee.toFixed(0)}` 
                : props.entryFee || 'R500'}
            </div>
          </div>
          <button onClick={handleRegister} className="btn-primary">
            Register Team
          </button>
        </div>
      </div>
    </div>
  );
};

export default TournamentShowcase;

