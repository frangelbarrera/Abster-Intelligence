/**
 * Transform registry for the graph right-click context menu.
 *
 * Each transform maps to a `toolCategory` that opens the MaltegoSidebar
 * (external-tools catalog). The sidebar lists curated OSINT tools for that
 * category and lets the investigator launch them in a new tab.
 *
 * NOTE: This file previously contained a `runTransform` function that
 * prompted Gemini to "be realistic but creative" and invent OSINT entities
 * (social handles, emails, associates) from thin air. That code was
 * unreachable in practice (every transform has a toolCategory, so the
 * sidebar branch always fired) and posed a credibility risk — fabricated
 * entities would have been merged into the investigation graph as if they
 * were real evidence. It has been removed.
 *
 * If a future transform is added without a toolCategory, the
 * handleRunTransform in abster-graph-v4.tsx surfaces a console warning
 * rather than silently hallucinating data.
 */

export interface Transform {
  id: string;
  label: string;
  icon: string;
  description: string;
  toolCategory?: string; // Maps to CAT_LABELS keys in osint-tools.ts
}

export const TRANSFORMS: Record<string, Transform[]> = {
  person: [
    { id: 'p_social', label: 'Social Media Footprint', icon: '📱', description: 'Search for social media profiles and public activity.', toolCategory: 'social' },
    { id: 'p_associates', label: 'Find Associates', icon: '👥', description: 'Identify people frequently seen or linked with this individual.', toolCategory: 'social' },
    { id: 'p_assets', label: 'Asset Identification', icon: '💰', description: 'Search for properties, vehicles, or companies linked to this person.', toolCategory: 'search' },
  ],
  company: [
    { id: 'c_execs', label: 'Key Executives', icon: '👔', description: 'Identify board members and high-level management.', toolCategory: 'search' },
    { id: 'c_subsidiaries', label: 'Corporate Structure', icon: '🏢', description: 'Map out subsidiaries and parent companies.', toolCategory: 'search' },
    { id: 'c_domains', label: 'Digital Assets', icon: '🌐', description: 'Find domains and IP ranges registered to the company.', toolCategory: 'domain' },
  ],
  domain: [
    { id: 'd_whois', label: 'WHOIS Analysis', icon: '🔍', description: 'Extract registration details and contact information.', toolCategory: 'domain' },
    { id: 'd_subdomains', label: 'Subdomain Discovery', icon: '📂', description: 'Enumerate subdomains and hidden services.', toolCategory: 'domain' },
    { id: 'd_history', label: 'DNS History', icon: '📜', description: 'Review historical DNS records and IP changes.', toolCategory: 'domain' },
  ],
  phone: [
    { id: 'ph_owner', label: 'Reverse Lookup', icon: '👤', description: 'Identify the registered owner of the phone number.', toolCategory: 'email' },
    { id: 'ph_location', label: 'Carrier/Location', icon: '📍', description: 'Determine carrier info and approximate location.', toolCategory: 'email' },
  ],
  email: [
    { id: 'e_breaches', label: 'Data Breach Check', icon: '🔓', description: 'Check if the email appears in known data breaches.', toolCategory: 'breach' },
    { id: 'e_profiles', label: 'Linked Profiles', icon: '👤', description: 'Find accounts on various platforms linked to this email.', toolCategory: 'social' },
  ],
  crypto: [
    { id: 'cr_tx', label: 'Transaction History', icon: '⛓️', description: 'Trace incoming and outgoing transactions.', toolCategory: 'crypto' },
    { id: 'cr_wallets', label: 'Related Wallets', icon: '👛', description: 'Identify other wallets frequently interacting with this one.', toolCategory: 'crypto' },
  ]
};
