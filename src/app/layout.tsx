import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Abster Intel - Intelligence Analysis Platform',
  description: 'Advanced OSINT and contextual intelligence operations.',
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
