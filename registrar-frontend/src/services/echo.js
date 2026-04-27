// echo.js
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Must be assigned unconditionally at module load —
// Pusher reads window.Pusher synchronously when Echo is constructed.
window.Pusher = Pusher;

let echoInstance = null;

// Dev-time guard: VITE_REVERB_PORT must be the *nginx* port (443 for https,
// 80 for http), NOT Reverb's internal port (8080). The browser connects to
// nginx which terminates TLS and proxies /app/* → Reverb:8080.
if (import.meta.env.DEV) {
    const _scheme = import.meta.env.VITE_REVERB_SCHEME ?? 'https';
    const _port   = Number(import.meta.env.VITE_REVERB_PORT);
    if (_scheme === 'https' && _port === 8080) {
        console.warn(
            '[echo] VITE_REVERB_PORT=8080 with VITE_REVERB_SCHEME=https will ' +
            'break WebSocket connections. Set VITE_REVERB_PORT=443 (the nginx ' +
            'port) — Reverb internal port 8080 is not exposed to the browser.'
        );
    }
}

export const getEcho = () => {
    if (echoInstance) return echoInstance;

    const scheme = import.meta.env.VITE_REVERB_SCHEME ?? 'https';
    const forceTLS = scheme === 'https';

    echoInstance = new Echo({
        broadcaster: 'reverb',
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost: import.meta.env.VITE_REVERB_HOST,
        wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 80),
        wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 443),
        forceTLS,
        // Allow both secure and plain transports so local (ws) and
        // production (wss) both work without changing this file.
        enabledTransports: forceTLS ? ['wss'] : ['ws'],
        // Relative URL — avoids mixed-content blocks when page is served over HTTPS.
        // Frontend nginx proxies /api/ → backend, /app/ → reverb.
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