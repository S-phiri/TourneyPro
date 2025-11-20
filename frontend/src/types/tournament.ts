export interface Venue {
  id: number;
  name: string;
  city: string;
  address?: string;
  map_link?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface Tournament {
  id: number;
  slug?: string;  // NEW: URL-friendly identifier
  name: string;
  description?: string;
  city: string;
  start_date: string; // ISO date
  end_date: string;   // ISO date
  entry_fee: string | number;
  team_min: number;
  team_max: number;
  status: 'draft' | 'open' | 'closed' | 'completed';
  format?: 'knockout' | 'league' | 'combination' | 'challenge';
  hero_image?: string;
  venue?: Venue;       // read shape
  venue_id?: number;   // write shape
  organizer?: User;    // organizer information
  
  // New marketing/branding fields
  tagline?: string;
  logo_url?: string;
  banner_image?: string;
  gallery_urls?: string;
  sponsors?: string;
  rules_md?: string;
  prizes_md?: string;
  contact_email?: string;
  contact_phone?: string;
  whatsapp_url?: string;
  registration_deadline?: string;
  published?: boolean;
}
