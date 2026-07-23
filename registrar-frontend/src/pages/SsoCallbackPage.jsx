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
    // without exposing the full token in the console. DEV-only — never
    // logged in a production build.
    if (import.meta.env.DEV) {
      console.log(
        '[SSO] callback code:',
        code ? `${code.slice(0, 8)}\u2026` : 'EMPTY \u2014 initiating OAuth flow',
      );
    }

    if (!code) {
      // No code means the One Portal linked directly to /auth/callback without
      // going through an OAuth flow first (it uses this URL as a plain href).
      // Fix: kick off the OAuth authorize redirect ourselves. The IDP already
      // has the user's active portal session, so it will skip its own login
      // prompt and immediately redirect back here with ?code=... attached.
      window.location.replace(import.meta.env.VITE_SSO_LOGIN_URL);
      return;
    }

    ssoCallback(code).catch((err) => {
      if (err?.logoutUrl) {
        // Unregistered account — show the error screen and let the user
        // decide when to click "Back to Login".  No auto-redirect here.
        setBlockedLogoutUrl(err.logoutUrl);
      } else {
        // Unexpected failure (network, 5xx, etc.).
        setStatus('Login failed. Redirecting\u2026');
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