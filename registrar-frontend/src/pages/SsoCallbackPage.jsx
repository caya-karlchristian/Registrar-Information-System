import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const ROLE_ROUTES = {
  student:     '/student',
  alumni:      '/alumni',
  admin:       '/staff',
  super_admin: '/super-admin',
};

const SsoCallbackPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const hasFired = useRef(false);
  const [status, setStatus] = useState('Signing you in...');

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    const code = params.get('code');
    console.log('[SSO] code:', code?.substring(0, 10));

    if (!code) {
      navigate('/', { replace: true });
      return;
    }

    api.post('/auth/callback', { code })
      .then(({ data }) => {
        console.log('[SSO] success:', data);
        localStorage.setItem('token', data.token);
        const destination = ROLE_ROUTES[data.data?.role_name] ?? '/';
        navigate(destination, { replace: true });
        window.location.reload();
      })
      .catch(err => {
        console.error('[SSO] error:', err.response?.data ?? err.message);
        setStatus(`Error: ${err.response?.data?.message ?? 'Login failed'}`);
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