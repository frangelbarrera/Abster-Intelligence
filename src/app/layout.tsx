import type {Metadata} from 'next';
import './globals.css';

// metadataBase resolves relative OG image URLs to absolute URLs.
// Vercel auto-sets NEXT_PUBLIC_VERCEL_URL; fall back to the canonical
// production URL for local dev and other hosts.
const siteUrl =
  process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL || 'https://abster-intelligence.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Abster Intelligence — Local-first OSINT Workspace',
  description:
    'Privacy-first investigation workspace for OSINT, GEOINT, and cyber research. ' +
    'Map entities in a live relationship graph, run native OSINT tool lookups (/shodan, /whois, /dns, /wayback, /hibp), ' +
    'bring your own LLM keys (10 providers), and share cases via URL — all without sending your investigations to a central database.',
  keywords: [
    'OSINT', 'open source intelligence', 'investigation', 'cybersecurity',
    'threat intelligence', 'graph', 'BYOK', 'LLM', 'D3.js', 'Next.js',
    'local-first', 'privacy', 'Maltego alternative', 'SpiderFoot alternative',
  ],
  authors: [{ name: 'Frangel Barrera', url: 'https://github.com/frangelbarrera' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    title: 'Abster Intelligence — Local-first OSINT Workspace',
    description:
      'Privacy-first investigation workspace for OSINT, GEOINT, and cyber research. ' +
      'Graph, GEOINT, BYOK LLM, native OSINT tools, shareable case URLs — all local-first.',
    siteName: 'Abster Intelligence',
    images: [
      {
        url: '/images/1.png',
        width: 1302,
        height: 595,
        alt: 'Abster Intelligence graph engine — entities and relations visualized in real time',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Abster Intelligence — Local-first OSINT Workspace',
    description:
      'Privacy-first investigation workspace for OSINT, GEOINT, and cyber research. ' +
      'Graph, GEOINT, BYOK LLM, native OSINT tools, shareable case URLs.',
    images: ['/images/1.png'],
    creator: '@frangelbarrera',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700;900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-[#18181F] text-foreground">
        {children}
      </body>
    </html>
  );
}
