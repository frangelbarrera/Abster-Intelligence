"use client";

import AbsterChat from "../components/abster-chat";
import LocalProvider from "../components/LocalProvider";
import ErrorBoundary from "../components/ErrorBoundary";

export default function Home() {
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
