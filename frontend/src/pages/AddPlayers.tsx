import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createPlayer, addPlayerToTeam, getTeam, listTeamPlayers, getRegistrationStatus, api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import TournamentNav from '../components/tournament/TournamentNav';

type PlayerForm = {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  position?: string;
  number?: string;
};

export default function AddPlayers() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const onboard = searchParams.get('onboard') === '1';
  const { user, isLoading: authLoading } = useAuth();
  const teamId = Number(id);

  const [team, setTeam] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [tournamentId, setTournamentId] = useState<number | null>(null);
  const [f, setF] = useState<PlayerForm>({ first_name: '', last_name: '', email: '', phone: '', position: 'MID', number: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);
  const [registrationStatus, setRegistrationStatus] = useState<'pending' | 'paid' | 'cancelled' | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(true);
  
  // Check if current user is the team manager
  // TeamSerializer returns 'manager' (from manager_user field)
  // Check both formats for compatibility
  const managerId = team?.manager?.id || team?.manager_user?.id;
  const isManager = !!(user && team && managerId === user.id);
  
  // Managers can edit their team regardless of payment status
  // Payment check will only apply when actually paying
  const canEdit = isManager;

  async function refresh() {
    try {
      setTeamLoading(true);
      const t = await getTeam(teamId);
      setTeam(t);
      const memberships = await listTeamPlayers({ team: teamId });
      setPlayers(memberships);
      
      // Get tournament ID for navigation
      try {
        const registrationsData = await api<any[]>(`/registrations/?team=${teamId}`);
        if (registrationsData && registrationsData.length > 0 && registrationsData[0].tournament) {
          const tid = typeof registrationsData[0].tournament === 'number' 
            ? registrationsData[0].tournament 
            : registrationsData[0].tournament.id;
          setTournamentId(tid);
        }
      } catch (e) {
        // Ignore registration check errors for now
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load team');
    } finally {
      setTeamLoading(false);
      setCheckingPayment(false);
    }
  }

  useEffect(() => {
    if (!teamId) return;
    refresh();
  }, [teamId]); // Load team data when teamId changes

  // Re-fetch team when user becomes available (after auto-login)
  // This ensures we have the latest team data with manager_user linked
  useEffect(() => {
    if (!authLoading && user && teamId) {
      // User just became available, refresh team data to get updated manager_user
      // This is important after auto-login from registration
      const timer = setTimeout(() => {
        refresh();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [authLoading, user?.id, teamId]); // Re-check when auth finishes loading or user ID changes

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const p = await createPlayer({
        first_name: f.first_name.trim(),
        last_name: f.last_name.trim(),
        email: f.email?.trim() || '',
        phone: f.phone?.trim() || '',
        position: f.position || '',
      });
      await addPlayerToTeam({ team: teamId, player_id: p.id, number: f.number ? Number(f.number) : undefined });
      setF({ first_name: '', last_name: '', email: '', phone: '', position: 'MID', number: '' });
      await refresh();
    } catch (ex: any) {
      setErr(ex?.message ?? 'Failed to add player');
    } finally {
      setBusy(false);
    }
  }

  // Show loading state while auth or team is loading
  // Wait for auth to finish before checking permissions
  if (authLoading || (teamLoading && !team) || checkingPayment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  // Payment check removed - managers can edit team and add players before payment
  // Payment will be required when "Pay Now" is clicked, but not for roster management

  // Show read-only view if not manager (but only if we have both user and team data)
  if (!isManager && team && !authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container py-8">
          <button onClick={() => navigate(-1)} className="text-yellow-500 hover:text-yellow-600 font-medium mb-4">← Back</button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Roster</h1>
          <p className="text-gray-600 mb-6">Team: <span className="font-semibold">{team.name}</span></p>
          <div className="card p-6">
            <p className="text-gray-600 mb-4">You don't have permission to edit this team's roster.</p>
            {players.length === 0 ? (
              <p className="text-gray-500">No players in this team yet.</p>
            ) : (
              <ul className="space-y-2">
                {players.map((m:any)=> (
                  <li key={m.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
                    <span className="text-gray-900 font-medium">{m.player?.first_name} {m.player?.last_name}</span>
                    <span className="pill bg-yellow-100 text-yellow-800">{m.player?.position || '—'}</span>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={()=>navigate(`/teams/${teamId}`)} className="btn-outline mt-4 w-full">Back to Team</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 text-white">
      {/* Tournament Navigation */}
      <TournamentNav tournamentId={tournamentId || undefined} />

      <div className="container py-8 max-w-6xl mx-auto">
        <h1 className="text-4xl font-black text-yellow-500 mb-2">Add Players</h1>
        {team && (
          <p className="text-gray-400 text-lg mb-6">Team: <span className="font-semibold text-white">{team.name}</span></p>
        )}
        
        {onboard && (
          <div className="mb-6 p-4 bg-green-900/30 border border-green-500/50 rounded-xl">
            <p className="text-green-400 font-medium">✅ You're all set! Add your players below.</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">New Player</h2>
            {err && <div className="mb-3 text-sm text-red-400">{err}</div>}
            <form onSubmit={submit} className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <input 
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500" 
                  placeholder="First name" 
                  value={f.first_name} 
                  onChange={e=>setF({...f, first_name:e.target.value})} 
                  required 
                />
                <input 
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500" 
                  placeholder="Last name" 
                  value={f.last_name} 
                  onChange={e=>setF({...f, last_name:e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500" 
                  type="email" 
                  placeholder="Email" 
                  value={f.email} 
                  onChange={e=>setF({...f, email:e.target.value})} 
                />
                <input 
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500" 
                  placeholder="Phone" 
                  value={f.phone} 
                  onChange={e=>setF({...f, phone:e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select 
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-yellow-500" 
                  value={f.position} 
                  onChange={e=>setF({...f, position:e.target.value})}
                >
                  <option value="GK">GK</option>
                  <option value="DEF">DEF</option>
                  <option value="MID">MID</option>
                  <option value="FWD">FWD</option>
                </select>
                <input 
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500" 
                  placeholder="Jersey number" 
                  value={f.number} 
                  onChange={e=>setF({...f, number:e.target.value})} 
                />
              </div>
              <button 
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-3 rounded-xl shadow-lg shadow-yellow-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-50" 
                disabled={busy}
              >
                {busy ? 'Adding...' : 'Add Player'}
              </button>
            </form>
          </div>

          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Roster</h2>
            {players.length === 0 ? (
              <p className="text-gray-400">No players yet. Add your first player.</p>
            ) : (
              <ul className="space-y-2">
                {players.map((m:any)=> (
                  <li key={m.id} className="flex items-center justify-between bg-zinc-900/50 border border-zinc-700 rounded-lg px-4 py-3 hover:border-yellow-500/50 transition-all">
                    <span className="text-white font-medium">{m.player?.first_name} {m.player?.last_name}</span>
                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-semibold">{m.player?.position || '—'}</span>
                  </li>
                ))}
              </ul>
            )}
            <button 
              onClick={()=>navigate(`/teams/${teamId}`)} 
              className="w-full mt-4 px-4 py-2 border border-zinc-600 text-gray-300 rounded-xl hover:bg-zinc-800 transition-all"
            >
              Finish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


