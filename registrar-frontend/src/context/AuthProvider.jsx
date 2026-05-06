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
