"use client";

import AbsterChat from "../../../components/abster-chat";
import LocalProvider from "../../../components/LocalProvider";
import ErrorBoundary from "../../../components/ErrorBoundary";

export default function CasePage({ params }: { params: Promise<{ id: string }> }) {
  // The actual case lookup happens client-side via IndexedDB by case id.
  // This route exists so investigation URLs are deep-linkable and shareable.
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
