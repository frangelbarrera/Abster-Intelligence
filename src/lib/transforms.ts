import { GoogleGenAI } from "@google/genai";

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

export async function runTransform(
  node: { id: string; label: string; type: string; properties?: Record<string, any> },
  transformId: string
) {
  let apiKey: string | undefined = undefined;
  
  try {
    const { db } = await import('./db');
    const settings = await db.settings.get('current_user_settings');
    if (settings && settings.providers) {
      const geminiProvider = settings.providers.find((p: any) => p.type === 'gemini');
      if (geminiProvider && geminiProvider.apiKey) {
        try { 
          apiKey = atob(geminiProvider.apiKey); 
        } catch(e) { 
          apiKey = geminiProvider.apiKey; 
        }
      }
    }
  } catch (err) {
    console.warn("Could not retrieve local API key", err);
  }

  if (!apiKey) {
    console.warn("API Key not found. AI transforms will not work.");
    throw new Error("API Key not configured. Please configure an AI provider in your Chat settings.");
  }

  const genAI = new GoogleGenAI({ apiKey });

  const transform = Object.values(TRANSFORMS).flat().find(t => t.id === transformId);
  
  const prompt = `
    You are an OSINT (Open Source Intelligence) transform engine.
    Target Entity:
    - Name/Label: ${node.label}
    - Type: ${node.type}
    - Properties: ${JSON.stringify(node.properties || {})}
    
    Action: Run Transform "${transform?.label}" (${transform?.description})
    
    Generate a JSON response containing new entities (nodes) and relationships (edges) discovered through this transform.
    Be realistic but creative. If it's a person, find social handles, emails, or associates. If it's a domain, find IPs, subdomains, or WHOIS info.
    
    Return ONLY a JSON object with this structure:
    {
      "nodes": [
        { "id": "unique_id", "label": "Name", "type": "person|company|email|phone|location|domain|document|vehicle|crypto|event", "properties": {}, "notes": "Reason for discovery" }
      ],
      "edges": [
        { "source": "${node.id}", "target": "unique_id", "label": "knows|works_at|family_of|owns|communicates_with|located_at|registered_to|transaction_with|related_to|custom", "strength": 1-10 }
      ]
    }
    
    Limit to 3-6 new nodes.
  `;

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });
    const text = result.text || "";
    const jsonStr = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Transform failed:", error);
    throw error;
  }
}
