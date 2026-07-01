"use client";

import AbsterChat from "../../../components/abster-chat";
import LocalProvider from "../../../components/LocalProvider";
import ErrorBoundary from "../../../components/ErrorBoundary";

/**
 * Receives a compressed case payload in the URL hash, decodes it, and seeds it
 * as a read-only investigation in the receiver's IndexedDB. The actual decode
 * + seed logic lives in LocalProvider (which already handles the /case/demo/*
 * path). This route just signals "shared case mode" by setting a flag that
 * LocalProvider reads on mount.
 */
export default function ShareCasePage() {
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
