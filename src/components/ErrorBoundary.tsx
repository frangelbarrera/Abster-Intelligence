"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorDetails = null;
      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.operationType) {
            errorDetails = parsed;
          }
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="h-screen w-screen bg-black flex items-center justify-center text-red-500 font-mono p-8">
          <div className="border border-red-900 bg-red-950/20 p-6 rounded-lg max-w-2xl w-full">
            <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="text-3xl">⚠️</span> SYSTEM FAILURE
            </h1>
            <p className="mb-4 text-red-400">An unexpected error occurred in the Abster OS.</p>
            
            {errorDetails ? (
              <div className="bg-black/50 p-4 rounded border border-red-900/50 text-sm overflow-auto">
                <p className="font-bold text-red-300 mb-2">Application Error — Please refresh the page or clear local data.</p>
                <p><strong>Operation:</strong> {errorDetails.operationType}</p>
                <p><strong>Path:</strong> {errorDetails.path}</p>
                <p><strong>Message:</strong> {errorDetails.error}</p>
              </div>
            ) : (
              <pre className="bg-black/50 p-4 rounded border border-red-900/50 text-sm overflow-auto whitespace-pre-wrap">
                {this.state.error?.message || "Unknown error"}
              </pre>
            )}
            
            <button
              className="mt-6 px-4 py-2 bg-red-900 text-white rounded hover:bg-red-800 transition-colors"
              onClick={() => window.location.reload()}
            >
              REBOOT SYSTEM
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
