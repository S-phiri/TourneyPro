import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, publishTournament, generateFixtures } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import WizardLayout from '../../../components/wizard/WizardLayout';
import StepFormat from './StepFormat';
import StepBasics from './StepBasics';
import StepRules from './StepRules';
import StepStructure from './StepStructure';
import StepPrizes from './StepPrizes';
import StepReview from './StepReview';

export type Format = 'league' | 'knockout' | 'combination';

export interface WizardState {
  id?: number; // draft id if resuming
  slug?: string; // tournament slug for navigation
  format: Format;
  basics: {
    name: string;
    city: string;
    start_date: string;
    start_time?: string;
    end_date: string;
    end_time?: string;
    team_capacity: number;
    entry_fee: number;
    venue_name: string;
    venue_address?: string;
    map_link?: string;
    contact_phone?: string;
    contact_email?: string;
    whatsapp_url?: string;
  };
  rules: {
    win_pts: number;
    draw_pts: number;
    loss_pts: number;
    tiebreakers: string[];
    max_players?: number;
    duration_mins?: number;
    extra_time?: boolean;
    pens?: boolean;
  };
  structure: {
    rounds?: number; // league
    groups?: {
      teams_per_group: number;
      rounds_per_group: number;
      advance_per_group: number;
      seeding: 'random' | 'pots';
    };
    knockout?: {
      bracket_size: number;
      single_leg: boolean;
      third_place: boolean;
    };
  };
  marketing?: {
    tagline?: string;
    logo_url?: string;
    banner_image?: string;
    gallery_urls?: string;
    sponsors?: string;
  };
  prizes?: {
    first_prize?: number;
    second_prize?: number;
    third_prize?: number;
  };
}

const STEPS = ['format', 'basics', 'rules', 'structure', 'prizes', 'review'] as const;
type Step = typeof STEPS[number];

const defaultState: WizardState = {
  format: 'league',
  basics: {
    name: '',
    city: '',
    start_date: '',
    start_time: '00:00',
    end_date: '',
    end_time: '23:59',
    team_capacity: 8,
    entry_fee: 0,
    venue_name: '',
    venue_address: '',
    map_link: '',
  },
  rules: {
    win_pts: 3,
    draw_pts: 1,
    loss_pts: 0,
    tiebreakers: ['GD', 'GF', 'H2H'],
    max_players: 15,
    duration_mins: 20,
    extra_time: false,
    pens: false,
  },
  structure: {},
  marketing: {},
};

export default function TournamentWizard() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [state, setState] = useState<WizardState>(defaultState);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load draft if resuming
  useEffect(() => {
    if (id && !state.id) {
      loadDraft(parseInt(id));
    }
  }, [id]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const loadDraft = async (draftId: number) => {
    try {
      setLoading(true);
      const tournament = await api<any>(`/tournaments/${draftId}/`);
      
      // Reconstruct wizard state from tournament
      setState({
        id: tournament.id,
        slug: tournament.slug,
        format: tournament.format || 'league',
        basics: {
          name: tournament.name || '',
          city: tournament.city || '',
          start_date: tournament.start_date || '',
          start_time: tournament.start_time || '00:00',
          end_date: tournament.end_date || '',
          end_time: tournament.end_time || '23:59',
          team_capacity: tournament.team_max || 8,
          entry_fee: parseFloat(tournament.entry_fee || '0'),
          venue_name: tournament.venue?.name || '',
          venue_address: tournament.venue?.address || '',
          map_link: tournament.venue?.map_link || '',
        },
        rules: tournament.rules || defaultState.rules,
        structure: tournament.structure || {},
        marketing: {
          tagline: tournament.tagline || '',
          logo_url: tournament.logo_url || '',
          banner_image: tournament.banner_image || '',
          gallery_urls: tournament.gallery_urls || '',
          sponsors: tournament.sponsors || '',
        },
      });
    } catch (err) {
      setError('Failed to load draft');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const autosave = async (newState: WizardState): Promise<WizardState | null> => {
    if (!newState.basics.name) return null; // Don't save until basics are filled
    
    try {
      setSaving(true);
      const payload: any = {
        name: newState.basics.name || 'Draft Tournament',
        city: newState.basics.city || '',
        start_date: newState.basics.start_date || new Date().toISOString().split('T')[0],
        start_time: newState.basics.start_time || '00:00',
        end_date: newState.basics.end_date || new Date().toISOString().split('T')[0],
        end_time: newState.basics.end_time || '23:59',
        team_max: newState.basics.team_capacity,
        entry_fee: newState.basics.entry_fee,
        format: newState.format,
        status: 'draft',
        rules: newState.rules,
        structure: newState.structure,
        tagline: newState.marketing?.tagline || '',
        logo_url: newState.marketing?.logo_url || '',
        banner_image: newState.marketing?.banner_image || '',
        gallery_urls: newState.marketing?.gallery_urls || '',
        sponsors: newState.marketing?.sponsors || '',
        // Prize money
        first_prize: newState.prizes?.first_prize || 0,
        second_prize: newState.prizes?.second_prize || 0,
        third_prize: newState.prizes?.third_prize || 0,
        // Contact information
        contact_phone: newState.basics.contact_phone || '',
        contact_email: newState.basics.contact_email || '',
        whatsapp_url: newState.basics.whatsapp_url || '',
        // Venue handling for wizard
        venue_name: newState.basics.venue_name,
        venue_address: newState.basics.venue_address || '',
        venue_map_link: newState.basics.map_link || '',
      };

      if (newState.id) {
        // Update existing draft
        await api(`/tournaments/${newState.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        return null; // No state change needed
      } else {
        // Create new draft
        const created = await api<any>(`/tournaments/`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const updatedState = { ...newState, id: created.id, slug: created.slug };
        return updatedState; // Return updated state so caller can use it
      }
    } catch (err) {
      console.error('Autosave failed:', err);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateState = (updates: Partial<WizardState>) => {
    const newState = { ...state, ...updates };
    setState(newState);
  };

  // Autosave when state changes (debounced) - only after draft is created
  useEffect(() => {
    if (!state.id || !state.basics.name) return; // Don't autosave until basics filled and draft exists
    
    const timer = setTimeout(() => {
      autosave(state);
    }, 1500);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.id, state.basics.name, state.basics.city, state.format, state.rules, state.structure, state.prizes]);
  
  // Log format changes for debugging
  useEffect(() => {
    if (state.format) {
      console.log(`Tournament format: ${state.format}`);
    }
  }, [state.format]);

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      // Validate current step before proceeding
      if (validateStep(currentStep)) {
        // Ensure draft is saved before moving to next step
        if (currentStep === 1 && !state.id) {
          // First time entering basics - create draft
          const updated = await autosave(state);
          if (updated) {
            setState(updated);
          }
        } else if (state.id) {
          // Update existing draft - ensure format is saved
          await autosave(state);
        }
        
        // Special check: if coming from format step (step 0), ensure format is saved
        if (currentStep === 0 && state.format) {
          console.log(`Saving format ${state.format} before moving to next step`);
          await autosave(state);
        }
        
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // format
        return !!state.format;
      case 1: // basics
        return !!(
          state.basics.name &&
          state.basics.city &&
          state.basics.start_date &&
          state.basics.end_date &&
          state.basics.venue_name &&
          state.basics.team_capacity >= 4
        );
      case 2: // rules
        return true; // Rules have defaults
      case 3: // structure
        // Validate based on format
        if (state.format === 'league') {
          return !!(state.structure.rounds && state.structure.rounds > 0);
        } else if (state.format === 'knockout') {
          return !!(state.structure.knockout?.bracket_size);
        } else if (state.format === 'combination') {
          return !!(
            state.structure.groups?.teams_per_group &&
            state.structure.groups?.advance_per_group &&
            state.structure.knockout?.bracket_size
          );
        }
        return true;
      default:
        return true;
    }
  };

  const handleFinish = async () => {
    try {
      setLoading(true);
      setError(null);

      // Ensure draft exists
      let tournamentId = state.id;
      if (!tournamentId) {
        const updated = await autosave(state);
        if (updated && updated.id) {
          setState(updated);
          tournamentId = updated.id;
        } else {
          throw new Error('Failed to create tournament draft');
        }
      } else {
        // Final update with all data
        await autosave(state);
      }

      if (!tournamentId) {
        throw new Error('Failed to create tournament draft');
      }

      // Publish tournament
      await publishTournament(tournamentId);

      // Generate fixtures
      await generateFixtures(tournamentId);

      // Fetch tournament to get slug (slug is auto-generated on save)
      const tournament = await api<any>(`/tournaments/${tournamentId}/`);
      const tournamentSlug = tournament.slug || tournamentId;

      // Navigate to tournament detail using slug
      navigate(`/tournaments/${tournamentSlug}`, {
        state: { message: 'Competition created and fixtures generated!' }
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create competition');
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    const updated = await autosave(state);
    if (updated) {
      setState(updated);
      setError(null);
      // Show success message briefly
      setTimeout(() => {}, 2000);
    }
  };

  if (loading && !state.id) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  const stepComponent = () => {
    switch (STEPS[currentStep]) {
      case 'format':
        return <StepFormat state={state} updateState={updateState} />;
      case 'basics':
        return <StepBasics state={state} updateState={updateState} />;
      case 'rules':
        return <StepRules state={state} updateState={updateState} />;
      case 'structure':
        return <StepStructure state={state} updateState={updateState} />;
      case 'prizes':
        return <StepPrizes state={state} updateState={updateState} />;
      case 'review':
        return <StepReview state={state} updateState={updateState} onFinish={handleFinish} onSaveDraft={handleSaveDraft} />;
      default:
        return null;
    }
  };

  return (
    <WizardLayout
      currentStep={currentStep}
      steps={STEPS}
      onNext={handleNext}
      onBack={handleBack}
      canGoNext={validateStep(currentStep)}
      saving={saving}
      error={error}
    >
      {stepComponent()}
    </WizardLayout>
  );
}

