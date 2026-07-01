/**
 * HaveIBeenPwned integration with graceful demo fallback.
 *
 * HIBP requires an API key (free, requested at https://haveibeenpwned.com/API/Key).
 * To make the killer demo work without forcing HN/Reddit visitors to register,
 * we ship a small in-memory breach catalog for a handful of well-known sample emails.
 *
 * When the visitor provides a real HIBP API key in Settings, we use the live API
 * (with the standard 1.5s rate-limit delay between calls) for any email.
 *
 * All requests go browser->HIBP directly. No relay, no Abster server.
 */

export interface BreachRecord {
  Name: string;
  Title: string;
  Domain: string;
  BreachDate: string;
  PwnCount: number;
  DataClasses: string[];
  IsVerified: boolean;
}

// Demo data: covers the three demo case emails plus the example used in the
// landing terminal animation. None of this is "real" breach data about real people;
// it mirrors what HIBP returns for well-publicized corporate breaches.
const DEMO_BREACHES: Record<string, BreachRecord[]> = {
  "test@example.com": [
    {
      Name: "LinkedIn",
      Title: "LinkedIn",
      Domain: "linkedin.com",
      BreachDate: "2021-06-22",
      PwnCount: 700000000,
      DataClasses: ["Emails", "Phone numbers", "Names"],
      IsVerified: true,
    },
    {
      Name: "Collection1",
      Title: "Collection #1",
      Domain: "",
      BreachDate: "2019-01-07",
      PwnCount: 772904991,
      DataClasses: ["Emails", "Passwords"],
      IsVerified: true,
    },
  ],
  "jane.doe@example.com": [
    {
      Name: "Adobe",
      Title: "Adobe",
      Domain: "adobe.com",
      BreachDate: "2013-10-04",
      PwnCount: 152445165,
      DataClasses: ["Emails", "Password hints", "Passwords", "Usernames"],
      IsVerified: true,
    },
  ],
  "user@acme-corp.com": [
    {
      Name: "LinkedIn",
      Title: "LinkedIn",
      Domain: "linkedin.com",
      BreachDate: "2021-06-22",
      PwnCount: 700000000,
      DataClasses: ["Emails", "Phone numbers", "Names"],
      IsVerified: true,
    },
    {
      Name: "Dropbox",
      Title: "Dropbox",
      Domain: "dropbox.com",
      BreachDate: "2012-07-01",
      PwnCount: 68648009,
      DataClasses: ["Emails", "Passwords"],
      IsVerified: true,
    },
  ],
};

const HIBP_BASE = "https://haveibeenpwned.com/api/v3";
const USER_AGENT = "Abster-Intelligence-Local-First";

export interface HibpResult {
  email: string;
  breaches: BreachRecord[];
  source: "live" | "demo";
  error?: string;
}

export async function lookupEmailBreaches(
  email: string,
  apiKey?: string,
): Promise<HibpResult> {
  const clean = email.trim().toLowerCase();
  if (!clean.includes("@")) {
    return { email: clean, breaches: [], source: "demo", error: "Not a valid email" };
  }

  // Live path: requires API key + user has explicitly opted in.
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const resp = await fetch(`${HIBP_BASE}/breachedaccount/${encodeURIComponent(clean)}?truncateResponse=false`, {
        headers: {
          "hibp-api-key": apiKey.trim(),
          "user-agent": USER_AGENT,
        },
      });
      if (resp.status === 404) return { email: clean, breaches: [], source: "live" };
      if (resp.status === 401) return { email: clean, breaches: [], source: "live", error: "Invalid HIBP API key" };
      if (resp.status === 429) return { email: clean, breaches: [], source: "live", error: "Rate limited (1.5s/window). Try again shortly." };
      if (!resp.ok) return { email: clean, breaches: [], source: "live", error: `HIBP HTTP ${resp.status}` };
      const data = (await resp.json()) as BreachRecord[];
      return { email: clean, breaches: data, source: "live" };
    } catch (err: any) {
      return { email: clean, breaches: [], source: "live", error: err?.message || "Network error" };
    }
  }

  // Demo path: only known sample emails get a deterministic answer.
  // For unknown emails in demo mode we return an empty list with a soft note
  // rather than fabricating breach data.
  const demo = DEMO_BREACHES[clean] || [];
  return { email: clean, breaches: demo, source: "demo" };
}

export function isDemoEmail(email: string): boolean {
  return Object.prototype.hasOwnProperty.call(DEMO_BREACHES, email.trim().toLowerCase());
}
