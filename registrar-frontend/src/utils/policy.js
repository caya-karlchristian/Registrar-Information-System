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
  CASHIER_OVERRIDES: "cashier_overrides",
};

/**
 * Work Item #1 — Granular Per-Action Permissions.
 *
 * Mirrors the backend's App\Models\Policy::MODULE_ACTIONS — the two
 * modules that grant a SUBSET of named actions instead of the default
 * single "Access" token. Keep this in sync with the backend constant;
 * it drives both hasModuleAction() below and PolicyManagement.jsx's
 * per-action checkbox groups.
 */
export const MODULE_ACTIONS = {
  dashboard: ["View", "Process", "Complete"],
  logbook: ["View", "Export"],
};

/**
 * Can this user access the given module at all?
 *
 * - No user yet (still loading / logged out): false.
 * - super_admin: always true.
 * - Any role other than admin (student, alumni): true — the policy
 *   system only ever restricts admin accounts, so nothing here should
 *   ever hide a student/alumni page.
 * - admin: true only if `user.effective_permissions[module]` is a
 *   non-empty array, mirroring the backend's own `!empty(...)` check —
 *   this does NOT check which specific action(s) are granted, only
 *   that at least one is. Use hasModuleAction() below when a specific
 *   action (e.g. "Process") needs to be checked.
 */
export function hasModuleAccess(user, moduleKey) {
  if (!user) return false;
  if (user.role_name === "super_admin") return true;
  if (user.role_name !== "admin") return true;

  const granted = user.effective_permissions?.[moduleKey];
  return Array.isArray(granted) && granted.length > 0;
}

/**
 * Can this user perform a SPECIFIC action on the given module (e.g.
 * hasModuleAction(user, "dashboard", "Process"))?
 *
 * This is a UX layer only, same caveat as hasModuleAccess() above —
 * the real security boundary is the backend's fine-grained check in
 * DocumentRequestService::updateRequest() (and the coarse
 * EnsureModuleAccess middleware ahead of it). This function exists so
 * the UI can hide a button the backend would reject anyway (e.g. a
 * Student Staff account never sees a "Ready to claim" button it can't
 * actually use), never as the only thing standing between an admin and
 * an action they aren't supposed to take.
 *
 * - No user yet / super_admin / non-admin: same short-circuits as
 *   hasModuleAccess() — non-admins and super admins are never gated.
 * - admin: true only if `action` is present in
 *   `user.effective_permissions[module]`.
 */
export function hasModuleAction(user, moduleKey, action) {
  if (!user) return false;
  if (user.role_name === "super_admin") return true;
  if (user.role_name !== "admin") return true;

  const granted = user.effective_permissions?.[moduleKey];
  return Array.isArray(granted) && granted.includes(action);
}