// echo.js
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import api from './api';

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
        // Include both 'ws' and 'wss' — Pusher-js requires 'ws' to be present
        // in its internal transport registry even when forceTLS:true forces it
        // to use WSS. With only ['wss'], Pusher's transport manager finds no
        // valid transport and fails immediately without making any network
        // attempt (confirmed: raw WebSocket to wss://localhost works fine,
        // but Pusher goes disconnected→failed instantly with only ['wss']).
        enabledTransports: ['ws', 'wss'],
        // Custom authorizer — pusher-js's default XHR authorizer never sets
        // xhr.withCredentials, so the old `auth: { withCredentials: true }`
        // option below was silently ignored and the HttpOnly 'token' cookie
        // was never sent on cross-origin /broadcasting/auth requests (this
        // is invisible in production, where CloudFront makes frontend and
        // API same-origin — but breaks local dev, where they're on
        // different ports). Routing through the shared `api` axios
        // instance guarantees credentials are actually attached, and keeps
        // baseURL/interceptors in one place instead of duplicating them here.
        authorizer: (channel) => ({
            authorize: (socketId, callback) => {
                api.post('/broadcasting/auth', {
                    socket_id: socketId,
                    channel_name: channel.name,
                })
                    .then((response) => callback(null, response.data))
                    .catch((error) => callback(error, null));
            },
        }),
    });

    // Log any low-level Pusher/WebSocket errors globally.
    // These appear in the browser console as [Echo] error: {...}
    // and indicate problems at the WS transport layer (bad app key,
    // TLS cert mismatch, Reverb unreachable, nginx proxy misconfiguration).
    echoInstance.connector.pusher.connection.bind('error', (err) => {
        console.error('[Echo] connection error:', err);
    });

    // Expose on window so the live connection state can be inspected from
    // DevTools at any time, even if the console was opened after mount:
    //   window.__echo.connector.pusher.connection.state
    //   → "connected" | "connecting" | "disconnected" | "failed"
    window.__echo = echoInstance;

    return echoInstance;
};

export const resetEcho = () => {
    if (echoInstance) {
        echoInstance.disconnect();
        echoInstance = null;
    }
};