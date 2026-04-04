import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';

const SsoCallbackPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { ssoCallback } = useAuth();
  const hasFired = useRef(false);
  const [status, setStatus] = useState('Signing you in...');

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    const code = params.get('code');
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