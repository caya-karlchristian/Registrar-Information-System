import api from "../services/api";

export const fetchCurrentUser = () => api.get("/me");

export const ssoCallbackRequest = (code) => api.post("/auth/callback", { code });

export const logoutRequest = async () => {
  // Defer navigation by one tick so the current React render cycle
  // (Router cleanup effects, etc.) finishes before the document is replaced.
  // Without this, Chromium logs:
  //   "Prevented <url> from accessing QueryParameters"
  // because the Router's location subscription still holds a reference to
  // the old document when window.location.href is set synchronously.
  //
  // We wrap the entire call in try/catch so navigation is *always* guaranteed —
  // even when the backend is unreachable or returns 5xx. Without this the user
  // would be stuck on a broken half-logged-out screen.
  try {
    const response  = await api.post("/logout");
    const logoutUrl = response.data?.logout_url;
    setTimeout(() => { window.location.href = logoutUrl || "/"; }, 0);
  } catch {
    // Backend unreachable or returned an error.
    // Still navigate home — a failed logout call should never trap the user.
    setTimeout(() => { window.location.href = "/"; }, 0);
  }
};