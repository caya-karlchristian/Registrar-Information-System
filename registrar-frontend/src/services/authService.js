import api from "../services/api";

export const fetchCurrentUser = () => api.get("/me");

/**
 * switchRoleRequest — Step 3 of Multi-Role Assignments. Calls the
 * server-enforced POST /auth/switch-role endpoint, which validates the
 * caller actually holds an Active role_assignments row for role_id and
 * reissues the session's token stamped with it. Replaces the old
 * localStorage-only `activeRoleOverride` hack: the switch now really
 * changes what the backend will authorize for this session, not just
 * what the UI displays.
 */
export const switchRoleRequest = (roleId) =>
  api.post("/auth/switch-role", { role_id: roleId });

/**
 * fetchMyRoleAssignments — the roles this account currently holds an
 * Active (not expired/revoked) grant for. Drives the role-switcher
 * modal (Navigation.jsx) so it lists exactly what the server would
 * actually accept, instead of a hardcoded admin/student pair.
 */
export const fetchMyRoleAssignments = () => api.get("/role-assignments/mine");

export const ssoCallbackRequest = (code) => api.post("/auth/callback", { code });

/**
 * localLoginRequest — always authenticates against the local bcrypt hash.
 * Use this when the IDP is known to be down (user clicks "Use Local Login").
 */
export const localLoginRequest = (email, password) =>
  api.post("/auth/local-login", { email, password });

export const logoutRequest = async () => {
  // Defer navigation by one tick so the current React render cycle finishes.
  try {
    const response  = await api.post("/logout");
    const logoutUrl = response.data?.logout_url;

    setTimeout(() => {
      if (logoutUrl) {
        // IDP session — let the IdP clear its own cookies then redirect back.
        window.location.href = logoutUrl;
      } else {
        // Local-auth session — no IdP involved, go straight home.
        window.location.href = "/";
      }
    }, 0);
  } catch {
    // Backend unreachable — still navigate home so the user is never trapped.
    setTimeout(() => { window.location.href = "/"; }, 0);
  }
};