// echo.js
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Must be assigned unconditionally at module load —
// Pusher reads window.Pusher synchronously when Echo is constructed.
window.Pusher = Pusher;

let echoInstance = null;

export const getEcho = () => {
    if (echoInstance) return echoInstance;

    const scheme   = import.meta.env.VITE_REVERB_SCHEME ?? 'https';
    const host     = import.meta.env.VITE_REVERB_HOST;
    const appKey   = import.meta.env.VITE_REVERB_APP_KEY;
    const port     = Number(import.meta.env.VITE_REVERB_PORT ?? (scheme === 'https' ? 443 : 80));
    const forceTLS = scheme === 'https';

    if (!host || !appKey) {
        // Do NOT cache a stub — return null so callers can guard and retry.
        // This happens only when env vars are missing from the build; fix
        // vite.config.js and the Dockerfile ARG→.env.production pipeline.
        console.error(
            '[echo] Cannot create Echo instance — VITE_REVERB_HOST or ' +
            'VITE_REVERB_APP_KEY is missing. ' +
            `host="${host}" key="${appKey}"`
        );
        return null;
    }

    echoInstance = new Echo({
        broadcaster: 'reverb',
        key: appKey,
        wsHost: host,
        wsPort: port,
        wssPort: port,
        forceTLS,
        // Use wss for https, ws for http — matches VITE_REVERB_SCHEME.
        // nginx terminates TLS and proxies /app/ → reverb:8080 internally,
        // so the browser always connects on the public port (443 or 80).
        enabledTransports: forceTLS ? ['wss'] : ['ws'],
        // Relative auth endpoint — avoids mixed-content blocks.
        // nginx proxies /api/ → backend:8000.
        authEndpoint: '/api/broadcasting/auth',
        auth: {
            headers: {
                get Authorization() {
                    return `Bearer ${localStorage.getItem('token')}`;
                },
                Accept: 'application/json',
            },
        },
    });

    return echoInstance;
};

export const resetEcho = () => {
    if (echoInstance) {
        echoInstance.disconnect();
        echoInstance = null;
    }
};
