#!/usr/bin/env python3
"""
fix_sso_callback.py
====================
Fixes the SSO unregistered-account bug where:
  1. First failed login shows no error — silent redirect back to IdP.
  2. Second failed login shows the toast but immediately auto-redirects.
  3. A legitimate login after a failed one inherits the stale error toast.

Root cause: error state was stored in sessionStorage and checked globally
in AuthProvider on every app boot, making it shared across users and
vulnerable to race conditions with the IdP redirect cycle.

Fix: move error ownership entirely into SsoCallbackPage. The callback page
shows the "not registered" UI inline and only redirects to the IdP when
the user explicitly clicks the button. AuthProvider becomes stateless with
respect to SSO errors.

Files modified
--------------
  registrar-frontend/src/pages/SsoCallbackPage.jsx   — owns error display
  registrar-frontend/src/context/AuthProvider.jsx    — removes SSO error state
  registrar-frontend/src/components/SSOErrorToast.jsx — repurposed as
                                                         CallbackErrorScreen
                                                         (renamed, not deleted)

Usage
-----
  Drop this file in the project root (Registrar-Information-System/) and run:
      python3 fix_sso_callback.py

  A timestamped .bak file is created beside each modified file before any
  change is written, so you can always revert:
      cp registrar-frontend/src/pages/SsoCallbackPage.jsx.bak_<ts> \\
         registrar-frontend/src/pages/SsoCallbackPage.jsx
"""

from __future__ import annotations

import shutil
import sys
from datetime import datetime
from pathlib import Path


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def backup(path: Path) -> Path:
    """Copy *path* to *path*.bak_<timestamp> and return the backup path."""
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    dest = path.with_suffix(f"{path.suffix}.bak_{ts}")
    shutil.copy2(path, dest)
    return dest


def write(path: Path, content: str) -> None:
    """Back up *path*, then overwrite it with *content*."""
    if not path.exists():
        raise FileNotFoundError(f"Expected file not found: {path}")
    bak = backup(path)
    path.write_text(content, encoding="utf-8")
    print(f"  ✔  {path.relative_to(ROOT)}  (backup → {bak.name})")


def abort(msg: str) -> None:
    print(f"\n✖  {msg}", file=sys.stderr)
    sys.exit(1)


# ---------------------------------------------------------------------------
# Locate project root
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parent
FRONTEND = ROOT / "registrar-frontend" / "src"

for required in [
    FRONTEND / "pages"      / "SsoCallbackPage.jsx",
    FRONTEND / "context"    / "AuthProvider.jsx",
    FRONTEND / "components" / "SSOErrorToast.jsx",
]:
    if not required.exists():
        abort(
            f"Cannot find {required.relative_to(ROOT)}.\n"
            "Make sure you run this script from the project root "
            "(Registrar-Information-System/)."
        )


# ---------------------------------------------------------------------------
# 1. SsoCallbackPage.jsx
#    - Adds local `blockedLogoutUrl` state to own the "not registered" UI.
#    - ssoCallback() now re-throws with err.logoutUrl attached on 403.
#    - Renders the CallbackErrorScreen inline; no auto-redirect on error.
#    - All sessionStorage flag logic removed.
# ---------------------------------------------------------------------------

SSO_CALLBACK_PAGE = """\
import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import CallbackErrorScreen from '../components/CallbackErrorScreen';

const SsoCallbackPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { ssoCallback } = useAuth();
  const hasFired = useRef(false);
  const [status, setStatus] = useState('Signing you in...');

  // When the backend returns 403 (unregistered account) ssoCallback re-throws
  // with err.logoutUrl set.  We store it here so this page — and only this
  // page — owns the error display.  Nothing is written to sessionStorage.
  const [blockedLogoutUrl, setBlockedLogoutUrl] = useState(null);

  // Capture the code as a plain string immediately — before any async work.
  // useSearchParams returns a live object tied to the current Router location;
  // once ssoCallback() resolves and navigate() replaces the /auth/callback
  // entry, reading `params` in a subsequent microtask would access a stale
  // QueryParameters object and trigger Chromium's cross-document warning.
  const codeRef = useRef(null);
  if (codeRef.current === null) {
    // Primary source: React Router's useSearchParams().
    // Fallback: read directly from window.location.search in case the router
    // hasn't finished parsing the URL yet (React 18 concurrent rendering can
    // cause the component to mount before the router has processed the query
    // string, returning null from params.get()).
    const routerCode = params.get('code');
    codeRef.current =
      routerCode ??
      new URLSearchParams(window.location.search).get('code') ??
      '';
  }

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    const code = codeRef.current;
    // Log the first 8 chars so you can confirm a non-empty code arrives
    // without exposing the full token in the console.
    console.log(
      '[SSO] callback code:',
      code ? `${code.slice(0, 8)}\\u2026` : 'EMPTY \\u2014 check IdP redirect URL',
    );

    if (!code) {
      navigate('/', { replace: true });
      return;
    }

    ssoCallback(code).catch((err) => {
      if (err?.logoutUrl) {
        // Unregistered account — show the error screen and let the user
        // decide when to click "Back to Login".  No auto-redirect here.
        setBlockedLogoutUrl(err.logoutUrl);
      } else {
        // Unexpected failure (network, 5xx, etc.).
        setStatus('Login failed. Redirecting\\u2026');
        setTimeout(() => navigate('/', { replace: true }), 3000);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Unregistered-account error screen ──────────────────────────────────
  // Rendered inline so the page is stable — no flicker, no race with
  // whatever loads at '/'.  The user controls when to leave.
  if (blockedLogoutUrl) {
    return (
      <CallbackErrorScreen
        onBack={() => {
          window.location.href = blockedLogoutUrl;
        }}
      />
    );
  }

  // ── Normal loading spinner ──────────────────────────────────────────────
  return (
    <div className="flex h-screen items-center justify-center flex-col gap-3">
      <div className="w-8 h-8 border-4 border-[#800000] border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-600 text-sm">{status}</p>
    </div>
  );
};

export default SsoCallbackPage;
"""

# ---------------------------------------------------------------------------
# 2. AuthProvider.jsx
#    - Removes showSSOSetupScreen state and SSOErrorToast rendering.
#    - Removes sessionStorage 'sso_role_error' flag from initializeAuth.
#    - ssoCallback re-throws on 403 with err.logoutUrl so SsoCallbackPage
#      can own the display.
#    - Removes redundant localStorage user writes (user state is in React).
#    - Removes unused `location` import and SSOErrorToast import.
# ---------------------------------------------------------------------------

AUTH_PROVIDER = """\
import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCurrentUser, logoutRequest, ssoCallbackRequest } from "../services/authService";
import { resetEcho } from "../services/echo";
import ErrorToast from "../components/ErrorToast";

const AuthContext = createContext();

// -------------------------------------------------------
// Role name constants — mirrors backend UserResource.
// Use these throughout the frontend instead of role_id numbers.
// e.g. user.role_name === ROLES.SUPER_ADMIN
// -------------------------------------------------------
// eslint-disable-next-line react-refresh/only-export-components
export const ROLES = {
  STUDENT:     "student",
  ALUMNI:      "alumni",
  ADMIN:       "admin",
  SUPER_ADMIN: "super_admin",
};

// -------------------------------------------------------
// Role-based redirect map.
// When a user logs in, they are sent to their home route.
// Add new roles here — no other file needs to change.
// -------------------------------------------------------
const ROLE_HOME = {
  [ROLES.STUDENT]:     "/student",
  [ROLES.ALUMNI]:      "/alumni",
  [ROLES.ADMIN]:       "/staff",
  [ROLES.SUPER_ADMIN]: "/super-admin",
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser]       = useState(null);
  // Session is carried by an HttpOnly cookie — no token in React state.
  // Use the `user` object to determine auth state; call /me on reload.
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(
    () => localStorage.getItem("hasAgreed") === "true"
  );

  const agreeToTerms = () => {
    localStorage.setItem("hasAgreed", "true");
    setHasAgreed(true);
  };

  // -------------------------------------------------------
  // On app load — restore session from the HttpOnly cookie.
  // A 401 from /me means the cookie is absent or expired.
  // -------------------------------------------------------
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const res      = await fetchCurrentUser();
        const userData = res.data.data;
        setUser(userData);
      } catch {
        // Cookie absent or expired — treat as logged-out.
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // -------------------------------------------------------
  // Logout
  // -------------------------------------------------------
  const logout = async () => {
    // State cleanup runs regardless of whether the logoutRequest succeeds.
    // Navigation is owned entirely by logoutRequest() in authService.js —
    // it always calls window.location.href (IdP redirect or '/') so we must
    // NOT also call navigate() here; that would race with window.location and
    // cause a visible flash or broken history entry.
    setIsLoggingOut(true);
    setHasAgreed(false);
    localStorage.removeItem("hasAgreed");
    resetEcho(); // disconnect WebSocket so Reverb drops the stale connection
    setUser(null);

    try {
      await logoutRequest(); // owns all navigation — no navigate() call needed here
    } catch (err) {
      console.error("Logout request failed:", err);
      navigate("/", { replace: true });
    }
  };

  // -------------------------------------------------------
  // SSO callback — called by SsoCallbackPage after IdP redirect.
  //
  // On success: sets user state and navigates to the role home route.
  //
  // On 403 (unregistered account): re-throws with err.logoutUrl attached
  // so SsoCallbackPage — not this context — owns the error display.
  // This keeps AuthProvider stateless with respect to SSO errors and
  // prevents stale error state from bleeding across users or page loads.
  //
  // On any other error: re-throws as-is for the caller to handle.
  // -------------------------------------------------------
  const ssoCallback = async (code) => {
    try {
      // ssoCallbackRequest sets the HttpOnly cookie; user data is in the body.
      const { data } = await ssoCallbackRequest(code);
      // Use the user returned by the callback directly — avoids a redundant
      // /me round-trip on every login.
      const userData = data.data ?? data.user;

      setUser(userData);

      const destination = ROLE_HOME[userData.role_name] ?? "/";
      navigate(destination, { replace: true });
    } catch (err) {
      const status    = err.response?.status;
      const logoutUrl = err.response?.data?.logout_url;

      setUser(null);

      if (status === 403 && logoutUrl) {
        // Re-throw with the IdP logout URL attached so SsoCallbackPage can
        // show the "not registered" screen and let the user decide when to
        // navigate away.  No sessionStorage flag — no cross-user pollution.
        const rejection = new Error("unregistered");
        rejection.logoutUrl = logoutUrl;
        throw rejection;
      }

      // Unexpected error (network, 5xx, etc.) — re-throw for the caller.
      throw err;
    }
  };

  // -------------------------------------------------------
  // Role helpers
  // -------------------------------------------------------
  const hasRole = (roleName) => user?.role_name === roleName;
  const isStaff = () => hasRole(ROLES.ADMIN) || hasRole(ROLES.SUPER_ADMIN);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        logout,
        ssoCallback,
        hasRole,
        isStaff,
        isLoggingOut,
        hasAgreed,
        setHasAgreed,
        agreeToTerms,
      }}
    >
      <ErrorToast message={error} onClose={() => setError(null)} />
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
"""

# ---------------------------------------------------------------------------
# 3. CallbackErrorScreen.jsx  (new file, replaces SSOErrorToast role)
#    SSOErrorToast.jsx is NOT deleted — it may be imported elsewhere.
#    The new component is purpose-built for the callback page: it accepts
#    an `onBack` prop that the parent controls, keeping navigation logic
#    out of the presentational layer.
# ---------------------------------------------------------------------------

CALLBACK_ERROR_SCREEN = """\
import React from 'react';
import { ExclamationCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';

/**
 * CallbackErrorScreen
 *
 * Shown by SsoCallbackPage when the backend returns a 403 — meaning the
 * user authenticated successfully with the IdP but has no role in RIS.
 *
 * Props
 * -----
 * onBack  () => void   Called when the user clicks "Back to Login".
 *                      The parent decides the navigation target (typically
 *                      window.location.href = idpLogoutUrl) so this
 *                      component stays purely presentational.
 */
const STEPS = [
  {
    number: 1,
    title: 'Return to Login',
    description: 'Click the button below to go back to the login page.',
  },
  {
    number: 2,
    title: 'Register Your Account',
    description: 'Click "Register" and fill in your details to request access.',
  },
  {
    number: 3,
    title: 'Sign In',
    description: 'Once registered, return to the login page and sign in.',
  },
];

const CallbackErrorScreen = ({ onBack }) => (
  <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
    <div className="w-full max-w-xl overflow-hidden rounded-lg border border-white/20 bg-[#800000] text-white shadow-xl">

      {/* Header */}
      <div className="flex items-center px-4 py-3 bg-pup-maroon border-b border-white/15">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-pup-maroon shrink-0">
          <ExclamationCircleIcon className="h-8 w-6" strokeWidth={2.5} />
        </div>
        <div className="ml-3 min-w-0">
          <p className="text-lg sm:text-xl font-semibold leading-snug text-white">
            Oops! Hang tight — your account is not set up yet.
          </p>
          <p className="mt-1 text-sm leading-snug text-white/85">
            You&apos;ve signed in successfully, but your account hasn&apos;t
            been added to the system.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
          What to do?
        </h2>

        <div className="mt-3 space-y-2">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="flex gap-3 rounded-md border border-white/15 bg-white/5 px-3 py-3"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-pup-maroon text-xs font-bold">
                {step.number}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                <p className="mt-0.5 text-sm leading-5 text-white/75">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Action */}
        <div className="mt-4 flex items-center border-t border-white/15 pt-4">
          <button
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Login
          </button>
        </div>
      </div>

    </div>
  </div>
);

export default CallbackErrorScreen;
"""


# ---------------------------------------------------------------------------
# Apply all changes
# ---------------------------------------------------------------------------

def main() -> None:
    print("\nSSO callback fix — applying changes\n")

    # 1. SsoCallbackPage
    write(
        FRONTEND / "pages" / "SsoCallbackPage.jsx",
        SSO_CALLBACK_PAGE,
    )

    # 2. AuthProvider
    write(
        FRONTEND / "context" / "AuthProvider.jsx",
        AUTH_PROVIDER,
    )

    # 3. CallbackErrorScreen (new file — no backup needed, just write)
    dest = FRONTEND / "components" / "CallbackErrorScreen.jsx"
    dest.write_text(CALLBACK_ERROR_SCREEN, encoding="utf-8")
    print(f"  ✔  {dest.relative_to(ROOT)}  (new file)")

    print(
        "\nDone. Three files changed:\n"
        "  • SsoCallbackPage.jsx  — owns error display, no sessionStorage\n"
        "  • AuthProvider.jsx     — removed SSO error state & stale flag logic\n"
        "  • CallbackErrorScreen.jsx — new presentational component\n"
        "\nSSOErrorToast.jsx was NOT deleted (may still be imported elsewhere).\n"
        "\nNext step: rebuild the frontend container:\n"
        "  docker compose up --build -d frontend\n"
    )


if __name__ == "__main__":
    main()
