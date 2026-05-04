import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';

const SsoCallbackPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { ssoCallback } = useAuth();
  const hasFired = useRef(false);
  const [status, setStatus] = useState('Signing you in...');

  // Capture the code as a plain string immediately — before any async work.
  // useSearchParams returns a live object tied to the current Router location;
  // once ssoCallback() resolves and navigate() replaces the /auth/callback
  // entry, reading `params` in a subsequent microtask would access a stale
  // QueryParameters object and trigger Chromium's cross-document warning.
  const codeRef = useRef(null);
  if (codeRef.current === null) {
    codeRef.current = params.get('code') ?? '';
  }

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    const code = codeRef.current;
    if (!code) {
      navigate('/', { replace: true });
      return;
    }

    ssoCallback(code).catch(() => {
      setStatus('Login failed. Redirecting...');
      setTimeout(() => navigate('/', { replace: true }), 3000);
    });
  }, []);

  return (
    <div className="flex h-screen items-center justify-center flex-col gap-3">
      <div className="w-8 h-8 border-4 border-[#800000] border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-600 text-sm">{status}</p>
    </div>
  );
};

export default SsoCallbackPage;