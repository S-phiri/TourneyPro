import React, { useState } from 'react';
import { Tournament, Venue } from '../types/tournament';

interface TournamentFormProps {
  initial?: Partial<Tournament>;
  venues?: Venue[];
  submitLabel: string;
  onSubmit: (payload: Partial<Tournament>) => Promise<void>;
}

interface FormErrors {
  name?: string;
  city?: string;
  start_date?: string;
  end_date?: string;
  venue_id?: string;
}

const TournamentForm: React.FC<TournamentFormProps> = ({ 
  initial = {}, 
  venues = [], 
  submitLabel, 
  onSubmit 
}) => {
  const [formData, setFormData] = useState({
    name: initial.name || '',
    description: initial.description || '',
    city: initial.city || '',
    start_date: initial.start_date || '',
    end_date: initial.end_date || '',
    entry_fee: initial.entry_fee || '',
    team_min: initial.team_min || 2,
    team_max: initial.team_max || 16,
    status: initial.status || 'draft',
    format: (initial as any).format || 'league',
    venue_id: initial.venue_id || (initial.venue as any)?.id || '',
    hero_image: initial.hero_image || '',
    // Marketing fields
    tagline: initial.tagline || '',
    logo_url: initial.logo_url || '',
    banner_image: initial.banner_image || '',
    gallery_urls: initial.gallery_urls || '',
    sponsors: initial.sponsors || '',
    rules_md: initial.rules_md || '',
    prizes_md: initial.prizes_md || '',
    contact_email: initial.contact_email || '',
    contact_phone: initial.contact_phone || '',
    whatsapp_url: initial.whatsapp_url || '',
    registration_deadline: initial.registration_deadline || '',
    published: initial.published !== undefined ? initial.published : true,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tournament name is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }

    if (!formData.venue_id || formData.venue_id === '') {
      newErrors.venue_id = 'Venue is required';
    }

    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      // Allow same date (times can be different), only error if end date is before start date
      if (endDate < startDate) {
        newErrors.end_date = 'End date cannot be before start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert venue_id to integer and prepare payload
      const payload = {
        ...formData,
        venue_id: parseInt(formData.venue_id),
        team_min: parseInt(formData.team_min.toString()),
        team_max: parseInt(formData.team_max.toString()),
        entry_fee: parseFloat(formData.entry_fee.toString()) || 0,
        // Handle empty strings for optional fields
        tagline: formData.tagline || '',
        logo_url: formData.logo_url || '',
        banner_image: formData.banner_image || '',
        gallery_urls: formData.gallery_urls || '',
        sponsors: formData.sponsors || '',
        rules_md: formData.rules_md || '',
        prizes_md: formData.prizes_md || '',
        contact_email: formData.contact_email || '',
        contact_phone: formData.contact_phone || '',
        whatsapp_url: formData.whatsapp_url || '',
        registration_deadline: formData.registration_deadline || null,
        published: formData.published,
      };
      
      await onSubmit(payload);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <div className="card">
        <h2 className="section-title">Tournament Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tournament Name */}
          <div className="md:col-span-2">
            <label htmlFor="name" className="form-label">
              Tournament Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`form-input ${
                errors.name ? 'border-red-500' : ''
              }`}
              placeholder="Enter tournament name"
            />
            {errors.name && (
              <p className="error-text">{errors.name}</p>
            )}
          </div>

          {/* City */}
          <div>
            <label htmlFor="city" className="form-label">
              City *
            </label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className={`form-input ${
                errors.city ? 'border-red-500' : ''
              }`}
              placeholder="Enter city"
            />
            {errors.city && (
              <p className="error-text">{errors.city}</p>
            )}
          </div>

          {/* Venue */}
          <div>
            <label htmlFor="venue_id" className="form-label">
              Venue *
            </label>
            <select
              id="venue_id"
              name="venue_id"
              value={formData.venue_id}
              onChange={handleChange}
              className={`form-input ${
                errors.venue_id ? 'border-red-500' : ''
              }`}
            >
              <option value="">Select a venue</option>
              {venues.map(venue => (
                <option key={venue.id} value={venue.id}>
                  {venue.name} - {venue.city}
                </option>
              ))}
            </select>
            {errors.venue_id && (
              <p className="error-text">{errors.venue_id}</p>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label htmlFor="start_date" className="form-label">
              Start Date *
            </label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              className={`form-input ${
                errors.start_date ? 'border-red-500' : ''
              }`}
            />
            {errors.start_date && (
              <p className="error-text">{errors.start_date}</p>
            )}
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="end_date" className="form-label">
              End Date *
            </label>
            <input
              type="date"
              id="end_date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              className={`form-input ${
                errors.end_date ? 'border-red-500' : ''
              }`}
            />
            {errors.end_date && (
              <p className="error-text">{errors.end_date}</p>
            )}
          </div>

          {/* Entry Fee */}
          <div>
            <label htmlFor="entry_fee" className="form-label">
              Entry Fee (R)
            </label>
            <input
              type="number"
              id="entry_fee"
              name="entry_fee"
              value={formData.entry_fee}
              onChange={handleChange}
              className="form-input"
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="form-label">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="form-input"
            >
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Format */}
          <div>
            <label htmlFor="format" className="form-label">
              Tournament Format
            </label>
            <select
              id="format"
              name="format"
              value={formData.format}
              onChange={handleChange}
              className="form-input"
              disabled={initial.id && (initial as any).matches?.some((m: any) => m.status === 'finished')}
            >
              <option value="league">League / Round Robin</option>
              <option value="knockout">Knock-out</option>
              <option value="combination">Combination</option>
              <option value="challenge">Challenge</option>
            </select>
            {initial.id && (initial as any).matches?.some((m: any) => m.status === 'finished') && (
              <p className="text-sm text-gray-500 mt-1">
                Format cannot be changed after matches have been played.
              </p>
            )}
          </div>

          {/* Team Min */}
          <div>
            <label htmlFor="team_min" className="form-label">
              Minimum Teams
            </label>
            <input
              type="number"
              id="team_min"
              name="team_min"
              value={formData.team_min}
              onChange={handleChange}
              className="form-input"
              min="2"
            />
          </div>

          {/* Team Max */}
          <div>
            <label htmlFor="team_max" className="form-label">
              Maximum Teams
            </label>
            <input
              type="number"
              id="team_max"
              name="team_max"
              value={formData.team_max}
              onChange={handleChange}
              className="form-input"
              min="2"
            />
          </div>

          {/* Hero Image URL */}
          <div className="md:col-span-2">
            <label htmlFor="hero_image" className="form-label">
              Hero Image URL
            </label>
            <input
              type="url"
              id="hero_image"
              name="hero_image"
              value={formData.hero_image}
              onChange={handleChange}
              className="form-input"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="form-input"
              placeholder="Enter tournament description..."
            />
          </div>
        </div>

        {/* Marketing & Branding Section */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="section-title mb-6">Marketing & Branding</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tagline */}
            <div className="md:col-span-2">
              <label htmlFor="tagline" className="form-label">
                Tagline
              </label>
              <input
                type="text"
                id="tagline"
                name="tagline"
                value={formData.tagline}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., The Ultimate Football Experience"
                maxLength={180}
              />
              <p className="text-sm text-gray-500 mt-1">Short, catchy phrase for your tournament</p>
            </div>

            {/* Logo URL */}
            <div>
              <label htmlFor="logo_url" className="form-label">
                Logo URL
              </label>
              <input
                type="url"
                id="logo_url"
                name="logo_url"
                value={formData.logo_url}
                onChange={handleChange}
                className="form-input"
                placeholder="https://example.com/logo.png"
              />
              <p className="text-sm text-gray-500 mt-1">Square logo image (recommended: 200x200px)</p>
            </div>

            {/* Banner Image */}
            <div>
              <label htmlFor="banner_image" className="form-label">
                Banner/Hero Image URL
              </label>
              <input
                type="url"
                id="banner_image"
                name="banner_image"
                value={formData.banner_image}
                onChange={handleChange}
                className="form-input"
                placeholder="https://example.com/banner.jpg"
              />
              <p className="text-sm text-gray-500 mt-1">Wide banner image (recommended: 1200x400px)</p>
            </div>

            {/* Gallery URLs */}
            <div className="md:col-span-2">
              <label htmlFor="gallery_urls" className="form-label">
                Gallery Images
              </label>
              <textarea
                id="gallery_urls"
                name="gallery_urls"
                value={formData.gallery_urls}
                onChange={handleChange}
                rows={3}
                className="form-input"
                placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
              />
              <p className="text-sm text-gray-500 mt-1">Comma-separated image URLs</p>
            </div>

            {/* Sponsors */}
            <div className="md:col-span-2">
              <label htmlFor="sponsors" className="form-label">
                Sponsors
              </label>
              <textarea
                id="sponsors"
                name="sponsors"
                value={formData.sponsors}
                onChange={handleChange}
                rows={3}
                className="form-input"
                placeholder="https://example.com/logo1.png|Brand Name, https://example.com/logo2.png|Another Brand"
              />
              <p className="text-sm text-gray-500 mt-1">Format: LogoURL|Brand Name (comma-separated)</p>
            </div>

            {/* Rules */}
            <div className="md:col-span-2">
              <label htmlFor="rules_md" className="form-label">
                Rules & Format (Markdown)
              </label>
              <textarea
                id="rules_md"
                name="rules_md"
                value={formData.rules_md}
                onChange={handleChange}
                rows={6}
                className="form-input"
                placeholder="**Tournament Format:**&#10;&#10;* 6-a-side football&#10;* 20-minute halves&#10;* No offside rule"
              />
              <p className="text-sm text-gray-500 mt-1">Supports basic markdown formatting (**, *, line breaks)</p>
            </div>

            {/* Prizes */}
            <div className="md:col-span-2">
              <label htmlFor="prizes_md" className="form-label">
                Prizes (Markdown)
              </label>
              <textarea
                id="prizes_md"
                name="prizes_md"
                value={formData.prizes_md}
                onChange={handleChange}
                rows={6}
                className="form-input"
                placeholder="**Prize Pool:**&#10;&#10;* 1st Place: R5,000&#10;* 2nd Place: R3,000&#10;* 3rd Place: R1,000"
              />
              <p className="text-sm text-gray-500 mt-1">Supports basic markdown formatting (**, *, line breaks)</p>
            </div>
          </div>
        </div>

        {/* Contact & Additional Info Section */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="section-title mb-6">Contact & Additional Info</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Email */}
            <div>
              <label htmlFor="contact_email" className="form-label">
                Contact Email
              </label>
              <input
                type="email"
                id="contact_email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleChange}
                className="form-input"
                placeholder="contact@example.com"
              />
            </div>

            {/* Contact Phone */}
            <div>
              <label htmlFor="contact_phone" className="form-label">
                Contact Phone
              </label>
              <input
                type="tel"
                id="contact_phone"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
                className="form-input"
                placeholder="+27 12 345 6789"
              />
            </div>

            {/* WhatsApp URL */}
            <div>
              <label htmlFor="whatsapp_url" className="form-label">
                WhatsApp Link
              </label>
              <input
                type="url"
                id="whatsapp_url"
                name="whatsapp_url"
                value={formData.whatsapp_url}
                onChange={handleChange}
                className="form-input"
                placeholder="https://wa.me/27123456789"
              />
              <p className="text-sm text-gray-500 mt-1">WhatsApp link for quick contact</p>
            </div>

            {/* Registration Deadline */}
            <div>
              <label htmlFor="registration_deadline" className="form-label">
                Registration Deadline
              </label>
              <input
                type="date"
                id="registration_deadline"
                name="registration_deadline"
                value={formData.registration_deadline}
                onChange={handleChange}
                className="form-input"
              />
              <p className="text-sm text-gray-500 mt-1">When registration closes (optional)</p>
            </div>

            {/* Published Status */}
            <div className="md:col-span-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="published"
                  name="published"
                  checked={formData.published}
                  onChange={(e) => setFormData(prev => ({ ...prev, published: e.target.checked }))}
                  className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                />
                <label htmlFor="published" className="ml-2 block text-sm text-gray-700">
                  Publish tournament (make it visible to the public)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`${
              isSubmitting
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                : 'btn-primary'
            } px-6 py-3`}
          >
            {isSubmitting ? 'Saving...' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
};

export default TournamentForm;
