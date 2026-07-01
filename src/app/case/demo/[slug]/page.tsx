"use client";

import AbsterChat from "../../../../components/abster-chat";
import LocalProvider from "../../../../components/LocalProvider";
import ErrorBoundary from "../../../../components/ErrorBoundary";
import { useEffect } from "react";

// Pre-built demo cases. These IDs must match the seeds in src/lib/demo-cases.ts.
const VALID_DEMOS = new Set(["breach", "domain", "person"]);

export default function DemoCasePage({ params }: { params: Promise<{ slug: string }> }) {
  useEffect(() => {
    // Mark intent to load a demo case on mount; LocalProvider / abster-chat will pick this up.
    (window as any).__absterDemoIntent = "demo";
  }, []);

  return (
    <ErrorBoundary>
      <LocalProvider>
        <main className="h-screen w-screen overflow-hidden">
          <AbsterChat />
        </main>
      </LocalProvider>
    </ErrorBoundary>
  );
}
