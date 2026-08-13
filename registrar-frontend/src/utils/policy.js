// -------------------------------------------------------
// Policy / module-access helpers — frontend mirror of the backend's
// Policy::MODULE_KEYS + SystemUser::hasModuleAccess().
//
// IMPORTANT: this is a UX layer only (hide nav items, redirect away
// from a page before the API even gets a chance to reject it). The
// real security boundary is the backend's EnsureModuleAccess
// middleware — this file must never be the only thing standing
// between an admin and a module they aren't supposed to see.
//
// We deliberately do NOT re-implement "no policy -> fall back to the
// default policy" here. That resolution lives in exactly one place —
// SystemUser::effectivePermissions() — and is sent down pre-resolved
// as `user.effective_permissions` (see UserResource). Duplicating the
// fallback logic here would risk it drifting out of sync with the
// backend and silently under- or over-restricting the UI.
// -------------------------------------------------------

export const MODULE_KEYS = {
  DASHBOARD: "dashboard",
  INBOX: "inbox",
  ANALYTICS: "analytics",
  LOGBOOK: "logbook",
  PROFILE: "profile",
  ACCESS_REQUESTS: "access_requests",
  BUSINESS_CALENDAR: "business_calendar",
};

/**
 * Can this user access the given module?
 *
 * - No user yet (still loading / logged out): false.
 * - super_admin: always true.
 * - Any role other than admin (student, alumni): true — the policy
 *   system only ever restricts admin accounts, so nothing here should
 *   ever hide a student/alumni page.
 * - admin: true only if `user.effective_permissions[module]` is a
 *   non-empty array, mirroring the backend's own `!empty(...)` check.
 */
export function hasModuleAccess(user, moduleKey) {
  if (!user) return false;
  if (user.role_name === "super_admin") return true;
  if (user.role_name !== "admin") return true;

  const granted = user.effective_permissions?.[moduleKey];
  return Array.isArray(granted) && granted.length > 0;
}