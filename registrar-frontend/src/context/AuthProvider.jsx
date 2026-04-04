import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCurrentUser, logoutRequest, ssoCallbackRequest } from "../services/authService";
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
  const [token, setToken]     = useState(localStorage.getItem("token") ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null); // replaces alert()
  const [isLoggingOut, setIsLoggingOut] = useState(false); 
  const [hasAgreed, setHasAgreed] = useState(
    () => localStorage.getItem("hasAgreed") === "true"
  );

  const agreeToTerms = () => {
    localStorage.setItem("hasAgreed", "true");
    setHasAgreed(true);
  };

  // -------------------------------------------------------
  // On app load — restore session from stored token.
  // Calls /me to verify token is still valid.
  // -------------------------------------------------------
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem("token");

      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res  = await fetchCurrentUser();
        const userData = res.data.data;
        setUser(userData);
      } catch {
        // Token is invalid or expired — clear everything
        setIsLoggingOut(true);
        setHasAgreed(false);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        document.cookie.split(";").forEach(c => document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"));
        setUser(null);
        setToken(null);
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
  try {
    await logoutRequest(); // backend revokes Sanctum token + calls IDP via cURL
  } catch (err) {
    console.error("Logout request failed:", err);
  } finally {
    setIsLoggingOut(true);
    setHasAgreed(false);
    localStorage.removeItem("hasAgreed");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    document.cookie.split(";").forEach(c =>
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
    );
    setUser(null);
    setToken(null);
    navigate("/", { replace: true }); // stay in your own app
  }
};

  const ssoCallback = async (code) => {  // ← was 'token'
  try {
    const res = await ssoCallbackRequest(code);  // ← passes code
    const sanctumToken = res.data.token;
    localStorage.setItem('token', sanctumToken);
    setToken(sanctumToken);

    const userRes = await fetchCurrentUser();
    const userData = userRes.data.data;
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);

    const destination = ROLE_HOME[userData.role_name] ?? '/';
    navigate(destination, { replace: true });
  } catch (err) {
    console.error('[SSO] failed:', err.response?.data ?? err.message);
    setError('SSO login failed. Please try again.');
  }
};

  // -------------------------------------------------------
  // Helper — check if current user has a given role.
  // Usage: hasRole(ROLES.SUPER_ADMIN)
  // -------------------------------------------------------
  const hasRole = (roleName) => user?.role_name === roleName;

  // -------------------------------------------------------
  // Helper — check if user is staff level (admin or super admin).
  // Usage: isStaff() → true for admin and super_admin
  // -------------------------------------------------------
  const isStaff = () =>
    hasRole(ROLES.ADMIN) || hasRole(ROLES.SUPER_ADMIN);

  return (
    <AuthContext.Provider value={{ user, loading, token, error, logout, ssoCallback, hasRole, isStaff, isLoggingOut, hasAgreed, setHasAgreed, agreeToTerms }}>
      <ErrorToast              
        message={error}
        onClose={() => setError(null)}
      />
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => useContext(AuthContext);