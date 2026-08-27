import React from 'react';

// -------------------------------------------------------
// ErrorBoundary
//
// BUG FIX (QA #6 — "Blank Screen on Initial Login")
//
// Root cause: this app had zero React error boundaries anywhere in the
// tree (checked main.jsx and every provider/route file — none existed).
// In React, an uncaught error thrown during render — a null-dereference
// on a freshly-provisioned user object, a field the SSO payload doesn't
// populate yet on a brand-new account, a context provider hiccup, etc.
// — unmounts the ENTIRE component tree with no fallback UI and no
// visible error. That is indistinguishable from a "blank screen" to
// anyone without devtools open, and "initial login" is precisely the
// moment the app is rendering the most not-yet-fully-populated state
// (a `user` object that just came back from SSO, role assignments still
// loading, reference data still loading) — i.e. exactly the conditions
// most likely to trip an unguarded assumption somewhere in the tree.
//
// This does not replace fixing whatever specific null-reference caused
// any one instance of the blank screen — it's the safety net industry
// practice calls for regardless: React itself recommends every app have
// at least one top-level error boundary (https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary).
// Without one, *any* future render bug — not just this one — will keep
// producing the same silent blank-page failure with no diagnostic trail.
//
// Two boundaries are wired in:
//   1. main.jsx — wraps the whole app, including the context providers
//      above <App />. If a provider itself throws during setup, the user
//      still sees a real error screen instead of white.
//   2. App.jsx — wraps <Routes> and is keyed on the current pathname, so
//      if a single page's render throws, navigating away (e.g. clicking
//      "Back to Login" below) actually recovers instead of the app
//      staying stuck on the fallback forever.
//
// Class component is required here — React does not yet support error
// boundaries via hooks.
// -------------------------------------------------------
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Surfaced to whatever error-monitoring is already wired up (Sentry,
    // LogRocket, etc.) if/when one is added — for now, at minimum this
    // guarantees the failure leaves a console trail instead of vanishing
    // silently, which is what made this bug so hard to reproduce/diagnose
    // in the first place.
    console.error('[ErrorBoundary] Uncaught render error:', error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    // Auto-recover when the boundary's resetKey changes (App.jsx passes
    // the current route pathname) — so navigating to a different page
    // doesn't require a full document reload to escape the fallback.
    if (
      this.state.hasError &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-white px-6 text-center">
            <p className="text-lg font-semibold text-[#800000]">
              Something went wrong.
            </p>
            <p className="max-w-md text-sm text-gray-600">
              We hit an unexpected error loading this page. Please try
              reloading — if the problem keeps happening, let the
              Registrar team know.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="rounded-md bg-[#800000] px-4 py-2 text-sm font-medium text-white hover:bg-[#660000]"
              >
                Reload Page
              </button>
              <button
                onClick={() => window.location.assign('/')}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back to Login
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
