import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  fetchCurrentUser,
  logoutRequest,
  ssoCallbackRequest,
  localLoginRequest,
} from "../services/authService";
import { resetEcho } from "../services/echo";
import ErrorToast from "../components/ErrorToast";

const AuthContext = createContext();

// -------------------------------------------------------
// Role name constants — mirrors backend UserResource.
// -------------------------------------------------------
// eslint-disable-next-line react-refresh/only-export-components
export const ROLES = {
  STUDENT:     "student",
  ALUMNI:      "alumni",
  ADMIN:       "admin",
  SUPER_ADMIN: "super_admin",
};

// eslint-disable-next-line react-refresh/only-export-components
export const ROLE_HOME = {
  [ROLES.STUDENT]:     "/student",
  [ROLES.ALUMNI]:      "/alumni",
  [ROLES.ADMIN]:       "/staff",
  [ROLES.SUPER_ADMIN]: "/super-admin",
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeRoleOverride, setActiveRoleOverride] = useState(
    () => localStorage.getItem("activeRoleOverride")
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // idpOffline: true when the last login used the local fallback.
  // Post-login pages read this to show a non-blocking advisory banner.
  const [idpOffline, setIdpOffline] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(
    () => localStorage.getItem("hasAgreed") === "true"
  );

  // effectiveUser overlays the activeRoleOverride on top of the raw
  // user object so every consumer sees the switched role transparently.
  const effectiveUser = React.useMemo(() => {
    if (!user) return null;
    if (!activeRoleOverride) return user;

    let permissions = user.effective_permissions;
    if (user.role_name === 'super_admin' && activeRoleOverride === 'admin') {
      permissions = {
        dashboard: ['Access'],
        inbox: ['Access'],
        analytics: ['Access'],
        logbook: ['Access'],
        profile: ['Access'],
        access_requests: ['Access'],
        student_staff_switch: ['Access'],
      };
    }

    return {
      ...user,
      role_name: activeRoleOverride,
      effective_permissions: permissions
    };
  }, [user, activeRoleOverride]);

  const switchRoleOverride = (roleName) => {
    if (roleName) {
      localStorage.setItem("activeRoleOverride", roleName);
    } else {
      localStorage.removeItem("activeRoleOverride");
    }

    // Navigate FIRST so the old page's ProtectedRoute never sees
    // the role mismatch (which would flash /forbidden).
    const destRole = roleName || user?.role_name;
    const destination = ROLE_HOME[destRole] ?? "/";
    navigate(destination, { replace: true });

    // Update state on the next tick — by then the new route is mounted.
    setTimeout(() => setActiveRoleOverride(roleName), 0);
  };

  const agreeToTerms = () => {
    localStorage.setItem("hasAgreed", "true");
    setHasAgreed(true);
  };

  // -------------------------------------------------------
  // On app load — restore session from the HttpOnly cookie.
  // -------------------------------------------------------
  useEffect(() => {
    const initializeAuth = async () => {
      if (window.location.pathname === "/auth/callback") {
        setLoading(false);
        return;
      }
      try {
        const res      = await fetchCurrentUser();
        const userData = res.data.data;
        setUser(userData);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, []);

  // -------------------------------------------------------
  // login() — IDP-first with automatic local fallback.
  //
  // The backend POST /api/login tries the IDP first. If the IDP is
  // unreachable it falls back to local bcrypt and sets idp_offline: true
  // in the response body. We surface that flag here so post-login pages
  // can show a non-blocking advisory banner via the idpOffline context value.
  // -------------------------------------------------------
  const login = async (email, password) => {
    localStorage.removeItem("activeRoleOverride");
    setActiveRoleOverride(null);
    const { data } = await api.post("/login", { email, password });
    const userData = data.data ?? data.user;

    setUser(userData);
    setIdpOffline(!!data.idp_offline);

    // If this admin has the "Student Staff" policy,
    // redirect to the access-control page so they can pick a role.
    if (userData.role_name === 'admin' && userData.policy?.name === 'Student Staff') {
      navigate("/access-control", { replace: true });
      return;
    }

    const destination = ROLE_HOME[userData.role_name] ?? "/";
    navigate(destination, { replace: true });
  };

  // -------------------------------------------------------
  // localLogin() — always uses the local hash, bypasses IDP entirely.
  // Shown on the LandingPage when the user explicitly chooses it.
  // -------------------------------------------------------
  const localLogin = async (email, password) => {
    localStorage.removeItem("activeRoleOverride");
    setActiveRoleOverride(null);
    const { data } = await localLoginRequest(email, password);
    const userData = data.data ?? data.user;

    setUser(userData);
    setIdpOffline(true); // they explicitly chose local login

    // If this admin has the "Student Staff" policy,
    // redirect to the access-control page so they can pick a role.
    if (userData.role_name === 'admin' && userData.policy?.name === 'Student Staff') {
      navigate("/access-control", { replace: true });
      return;
    }

    const destination = ROLE_HOME[userData.role_name] ?? "/";
    navigate(destination, { replace: true });
  };

  // -------------------------------------------------------
  // Logout
  // -------------------------------------------------------
  const logout = async () => {
    setIsLoggingOut(true);
    setHasAgreed(false);
    setIdpOffline(false);
    localStorage.removeItem("hasAgreed");
    localStorage.removeItem("activeRoleOverride");
    setActiveRoleOverride(null);
    resetEcho();
    setUser(null);
    try {
      // logoutRequest() handles the redirect internally:
      //   · IDP session  → window.location.href = idp_logout_url
      //   · Local session → window.location.href = "/"
      // We still catch errors so the user is never stuck on a broken state.
      await logoutRequest();
    } catch (err) {
      console.error("Logout request failed:", err);
      // Fallback: navigate home via React Router so at least the UI resets.
      navigate("/", { replace: true });
    }
  };

  // -------------------------------------------------------
  // SSO callback — called by SsoCallbackPage after IdP redirect.
  // -------------------------------------------------------
  const ssoCallback = async (code) => {
    localStorage.removeItem("activeRoleOverride");
    setActiveRoleOverride(null);
    try {
      const { data } = await ssoCallbackRequest(code);
      const userData = data.data ?? data.user;

      setUser(userData);
      setIdpOffline(false);

      // If this admin has the "Student Staff" policy,
      // redirect to the access-control page so they can pick a role.
      if (userData.role_name === 'admin' && userData.policy?.name === 'Student Staff') {
        navigate("/access-control", { replace: true });
        return;
      }

      const destination = ROLE_HOME[userData.role_name] ?? "/";
      navigate(destination, { replace: true });
    } catch (err) {
      const status    = err.response?.status;
      const logoutUrl = err.response?.data?.logout_url;

      setUser(null);

      if (status === 403 && logoutUrl) {
        const rejection     = new Error("unregistered");
        rejection.logoutUrl = logoutUrl;
        throw rejection;
      }
      throw err;
    }
  };

  // -------------------------------------------------------
  // Role helpers
  // -------------------------------------------------------
  const hasRole = (roleName) => effectiveUser?.role_name === roleName;
  const isStaff = () => hasRole(ROLES.ADMIN) || hasRole(ROLES.SUPER_ADMIN);

  return (
    <AuthContext.Provider
      value={{
        user: effectiveUser,
        loading,
        error,
        login,
        localLogin,
        logout,
        ssoCallback,
        hasRole,
        isStaff,
        isLoggingOut,
        idpOffline,
        hasAgreed,
        setHasAgreed,
        agreeToTerms,
        switchRoleOverride,
        activeRoleOverride,
      }}
    >
      <ErrorToast message={error} onClose={() => setError(null)} />
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);