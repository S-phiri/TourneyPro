import React from 'react';
import { WizardState } from './TournamentWizard';

interface StepBasicsProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
}

export default function StepBasics({ state, updateState }: StepBasicsProps) {
  const handleChange = (field: string, value: any) => {
    updateState({
      basics: {
        ...state.basics,
        [field]: value,
      },
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Basic Information</h2>
        <p className="text-gray-400">Set up the fundamental details of your tournament</p>
      </div>

      <div className="card bg-zinc-900/50 border border-zinc-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tournament Name */}
          <div className="md:col-span-2">
            <label className="form-label text-white">
              Tournament Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={state.basics.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="form-input bg-zinc-800 border-zinc-600 text-white"
              placeholder="e.g., Summer League 2025"
              required
            />
          </div>

          {/* City */}
          <div>
            <label className="form-label text-white">
              City <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={state.basics.city}
              onChange={(e) => handleChange('city', e.target.value)}
              className="form-input bg-zinc-800 border-zinc-600 text-white"
              placeholder="e.g., East London"
              required
            />
          </div>

          {/* Team Capacity */}
          <div>
            <label className="form-label text-white">
              Team Capacity <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={state.basics.team_capacity}
              onChange={(e) => handleChange('team_capacity', parseInt(e.target.value) || 8)}
              className="form-input bg-zinc-800 border-zinc-600 text-white"
              min="4"
              required
            />
            <p className="text-xs text-gray-400 mt-1">Minimum 4 teams required</p>
          </div>

          {/* Start Date */}
          <div>
            <label className="form-label text-white">
              Start Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={state.basics.start_date}
              onChange={(e) => handleChange('start_date', e.target.value)}
              className="form-input bg-zinc-800 border-zinc-600 text-white"
              required
            />
          </div>

          {/* End Date */}
          <div>
            <label className="form-label text-white">
              End Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={state.basics.end_date}
              onChange={(e) => handleChange('end_date', e.target.value)}
              className="form-input bg-zinc-800 border-zinc-600 text-white"
              min={state.basics.start_date}
              required
            />
          </div>

          {/* Entry Fee */}
          <div>
            <label className="form-label text-white">Entry Fee (R)</label>
            <input
              type="number"
              value={state.basics.entry_fee}
              onChange={(e) => handleChange('entry_fee', parseFloat(e.target.value) || 0)}
              className="form-input bg-zinc-800 border-zinc-600 text-white"
              min="0"
              step="0.01"
            />
          </div>

          {/* Venue Name */}
          <div>
            <label className="form-label text-white">
              Venue Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={state.basics.venue_name}
              onChange={(e) => handleChange('venue_name', e.target.value)}
              className="form-input bg-zinc-800 border-zinc-600 text-white"
              placeholder="e.g., Fantasy Indoor - Cambridge"
              required
            />
          </div>

          {/* Venue Address */}
          <div className="md:col-span-2">
            <label className="form-label text-white">Venue Address</label>
            <input
              type="text"
              value={state.basics.venue_address || ''}
              onChange={(e) => handleChange('venue_address', e.target.value)}
              className="form-input bg-zinc-800 border-zinc-600 text-white"
              placeholder="Full address"
            />
          </div>

          {/* Map Link */}
          <div className="md:col-span-2">
            <label className="form-label text-white">Map Link (Google Maps URL)</label>
            <input
              type="url"
              value={state.basics.map_link || ''}
              onChange={(e) => handleChange('map_link', e.target.value)}
              className="form-input bg-zinc-800 border-zinc-600 text-white"
              placeholder="https://maps.google.com/..."
            />
          </div>
        </div>

        {/* Marketing Section */}
        <div className="mt-8 pt-8 border-t border-zinc-700">
          <h3 className="text-xl font-bold text-white mb-4">Marketing & Branding (Optional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="form-label text-white">Tagline</label>
              <input
                type="text"
                value={state.marketing?.tagline || ''}
                onChange={(e) =>
                  updateState({
                    marketing: { ...state.marketing, tagline: e.target.value },
                  })
                }
                className="form-input bg-zinc-800 border-zinc-600 text-white"
                placeholder="Catchy phrase for your tournament"
                maxLength={180}
              />
            </div>

            <div>
              <label className="form-label text-white">Logo URL</label>
              <input
                type="url"
                value={state.marketing?.logo_url || ''}
                onChange={(e) =>
                  updateState({
                    marketing: { ...state.marketing, logo_url: e.target.value },
                  })
                }
                className="form-input bg-zinc-800 border-zinc-600 text-white"
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div>
              <label className="form-label text-white">Banner Image URL</label>
              <input
                type="url"
                value={state.marketing?.banner_image || ''}
                onChange={(e) =>
                  updateState({
                    marketing: { ...state.marketing, banner_image: e.target.value },
                  })
                }
                className="form-input bg-zinc-800 border-zinc-600 text-white"
                placeholder="https://example.com/banner.jpg"
              />
            </div>

            <div className="md:col-span-2">
              <label className="form-label text-white">Gallery Images (comma-separated URLs)</label>
              <textarea
                value={state.marketing?.gallery_urls || ''}
                onChange={(e) =>
                  updateState({
                    marketing: { ...state.marketing, gallery_urls: e.target.value },
                  })
                }
                className="form-input bg-zinc-800 border-zinc-600 text-white"
                rows={3}
                placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg"
              />
            </div>

            <div className="md:col-span-2">
              <label className="form-label text-white">Sponsors (Format: LogoURL|Brand Name, comma-separated)</label>
              <textarea
                value={state.marketing?.sponsors || ''}
                onChange={(e) =>
                  updateState({
                    marketing: { ...state.marketing, sponsors: e.target.value },
                  })
                }
                className="form-input bg-zinc-800 border-zinc-600 text-white"
                rows={2}
                placeholder="https://example.com/logo1.png|Brand 1, https://example.com/logo2.png|Brand 2"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

