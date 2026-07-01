import type {NextConfig} from 'next';

// Security headers + CSP.
//
// We allowlist every external domain the app actually talks to so the
// CSP doesn't break functionality. The list is conservative: only the
// specific API hosts, font CDNs, and image hosts the app uses.
//
// Notes:
// - 'wss://localhost:*' and 'http://localhost:*' are for the Ollama local
//   provider and MCP servers running on the user's machine.
// - api.shodan.io, haveibeenpwned.com, rdap.org, dns.google, archive.org
//   are the OSINT slash-command backends. Some of them block CORS, but
//   the CSP still needs to allow the attempt so the browser can fail
//   gracefully with a CORS error (which the app surfaces as a network
//   error) rather than a CSP violation that looks like a bug.
// - connect-src includes 'https:' as a fallback because the LLM provider
//   list includes Azure OpenAI endpoints with arbitrary subdomains.
//   We narrow this in v1.2 by collecting actual user-configured endpoints.
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // 'unsafe-inline' is required because Next.js App Router inlines some
  // bootstrap scripts. 'unsafe-eval' is required for dev mode (HMR).
  // In production we could tighten this with nonces — deferred to v1.2.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https: http:",
  // Allow any https image (LLM responses sometimes embed remote images;
  // vault files are blob: URLs; placeholder images come from various CDNs).
  "connect-src 'self' https: http://localhost:* ws://localhost:* wss://localhost:*",
  // LLM providers + OSINT APIs all use https. localhost variants are for
  // Ollama and user-run MCP servers.
  "frame-ancestors 'none'",
  // Clickjacking protection — Abster must never be embedded in an iframe.
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // No Flash/Java/plugins — Abster is pure JS.
].join('; ');

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspDirectives,
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            // 'strict-origin-when-cross-origin' leaks the origin (but not
            // the path or query) to external APIs. This is important for
            // the shareable case URL flow: when a receiver opens a share
            // link, the hash fragment is never sent in the Referer header
            // anyway (browsers strip fragments from Referer), but we keep
            // the policy strict as defense-in-depth.
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            // Deny access to device capabilities Abster doesn't need.
            // Camera/microphone/geolocation are explicitly denied — the
            // GEOINT module uses leaflet maps, not the device GPS.
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            // HSTS: force HTTPS for 1 year, include subdomains, opt into
            // the browser preload list. Only meaningful when served over
            // HTTPS (Vercel does this automatically).
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
