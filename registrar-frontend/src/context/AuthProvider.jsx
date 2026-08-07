import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  fetchCurrentUser,
  logoutRequest,
  ssoCallbackRequest,
  localLoginRequest,
  switchRoleRequest,
  fetchMyRoleAssignments,
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

// Mirrors SystemUser::ROLE_STUDENT / ROLE_ALUMNI / ROLE_ADMIN /
// ROLE_SUPER_ADMIN — role_assignments rows carry role_id (an int), not
// the role_name string UserResource returns, so the switcher needs both
// directions of this mapping.
// eslint-disable-next-line react-refresh/only-export-components
export const ROLE_ID = {
  STUDENT:     1,
  ALUMNI:      2,
  ADMIN:       3,
  SUPER_ADMIN: 4,
};

const ROLE_ID_TO_NAME = {
  [ROLE_ID.STUDENT]:     ROLES.STUDENT,
  [ROLE_ID.ALUMNI]:      ROLES.ALUMNI,
  [ROLE_ID.ADMIN]:       ROLES.ADMIN,
  [ROLE_ID.SUPER_ADMIN]: ROLES.SUPER_ADMIN,
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // idpOffline: true when the last login used the local fallback.
  // Post-login pages read this to show a non-blocking advisory banner.
  const [idpOffline, setIdpOffline] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(
    () => localStorage.getItem("hasAgreed") === "true"
  );

  // The roles this account currently holds an Active (not
  // expired/revoked) role_assignments grant for — e.g. a student-staff
  // account has two entries here: Student and a policy-restricted
  // Admin. Drives the Navigation.jsx switcher modal. Only meaningful
  // once `user` is loaded; empty for a signed-out session.
  const [roleAssignments, setRoleAssignments] = useState([]);
  const [roleAssignmentsLoading, setRoleAssignmentsLoading] = useState(false);

  const refreshRoleAssignments = useCallback(async () => {
    setRoleAssignmentsLoading(true);
    try {
      const res = await fetchMyRoleAssignments();
      setRoleAssignments(res.data?.data ?? []);
    } catch {
      // Non-fatal — the switcher just won't show extra roles this time.
      setRoleAssignments([]);
    } finally {
      setRoleAssignmentsLoading(false);
    }
  }, []);

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
        refreshRoleAssignments();
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------
  // Shared post-login routing: send a "Student Staff" policy admin to
  // the access-control page to pick a role context first; everyone else
  // goes straight to their role's home.
  // -------------------------------------------------------
  const routeAfterAuth = (userData) => {
    if (userData.role_name === ROLES.ADMIN && userData.policy?.name === 'Student Staff') {
      navigate("/access-control", { replace: true });
      return;
    }
    const destination = ROLE_HOME[userData.role_name] ?? "/";
    navigate(destination, { replace: true });
  };

  // -------------------------------------------------------
  // login() — IDP-first with automatic local fallback.
  //
  // The backend POST /api/login tries the IDP first. If the IDP is
  // unreachable it falls back to local bcrypt and sets idp_offline: true
  // in the response body. We surface that flag here so post-login pages
  // can show a non-blocking advisory banner via the idpOffline context value.
  // -------------------------------------------------------
  const login = async (email, password) => {
    const { data } = await api.post("/login", { email, password });
    const userData = data.data ?? data.user;

    setUser(userData);
    setIdpOffline(!!data.idp_offline);
    refreshRoleAssignments();
    routeAfterAuth(userData);
  };

  // -------------------------------------------------------
  // localLogin() — always uses the local hash, bypasses IDP entirely.
  // Shown on the LandingPage when the user explicitly chooses it.
  // -------------------------------------------------------
  const localLogin = async (email, password) => {
    const { data } = await localLoginRequest(email, password);
    const userData = data.data ?? data.user;

    setUser(userData);
    setIdpOffline(true); // they explicitly chose local login
    refreshRoleAssignments();
    routeAfterAuth(userData);
  };

  // -------------------------------------------------------
  // Logout
  // -------------------------------------------------------
  const logout = async () => {
    setIsLoggingOut(true);
    setHasAgreed(false);
    setIdpOffline(false);
    localStorage.removeItem("hasAgreed");
    resetEcho();
    setUser(null);
    setRoleAssignments([]);
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
    try {
      const { data } = await ssoCallbackRequest(code);
      const userData = data.data ?? data.user;

      setUser(userData);
      setIdpOffline(false);
      refreshRoleAssignments();
      routeAfterAuth(userData);
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
  // switchRole() — Step 3/4 of Multi-Role Assignments.
  //
  // Server-enforced: POST /auth/switch-role validates the caller holds
  // an Active role_assignments row for roleId and reissues the session's
  // token stamped with it (see RoleAssignmentService::switchTo()). This
  // replaces the old client-only `activeRoleOverride` localStorage hack
  // — a session can no longer "switch" to a role it doesn't actually
  // hold, and the backend's own gates (RoleMiddleware, EnsureModuleAccess)
  // now honor the switch too, not just the UI.
  //
  // Accepts a numeric role_id (matching role_assignments.role_id /
  // SystemUser::ROLE_* — see ROLE_ID above), since that's what the
  // /role-assignments/mine list and the API both key off.
  // -------------------------------------------------------
  const switchRole = async (roleId) => {
    const { data } = await switchRoleRequest(roleId);
    const userData = data.data ?? data.user;

    setUser(userData);
    // The set of roles held doesn't change when switching (only which
    // one is currently assumed does) — no need to refetch, but doing so
    // keeps this resilient if a grant/revoke happened concurrently.
    refreshRoleAssignments();

    const destination = ROLE_HOME[userData.role_name] ?? "/";
    navigate(destination, { replace: true });
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
        // Multi-role switching (Step 3/4)
        roleAssignments,
        roleAssignmentsLoading,
        refreshRoleAssignments,
        switchRole,
        ROLE_ID_TO_NAME,
      }}
    >
      <ErrorToast message={error} onClose={() => setError(null)} />
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);