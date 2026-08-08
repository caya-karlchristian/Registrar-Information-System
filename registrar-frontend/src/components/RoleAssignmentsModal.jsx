import { useState, useEffect, useCallback } from "react";
import { XMarkIcon, IdentificationIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../context/ThemeContext";
import DropDown from "./DropDown";
import { getRoleAssignments, grantRoleAssignment, revokeRoleAssignment } from "../services/api";

/**
 * RoleAssignmentsModal — User Management: "Roles" tab
 * -----------------------------------------------------
 * Super-Admin-only view of one user's full role_assignments history
 * (GET /role-assignments?user_id=), plus the actions to grant a new,
 * concurrent role (POST /role-assignments) or revoke an existing Active
 * one (POST /role-assignments/{id}/revoke — reason required).
 *
 * This is the "student staff" onboarding/offboarding surface: a person
 * can hold more than one Active assignment at once (e.g. Student +
 * a restricted Admin), and revoking one leaves the others untouched —
 * see RoleAssignmentService::grant()/revoke() on the backend.
 *
 * Deliberately its own modal rather than a literal in-page tab: this
 * page is a paginated table of many users, so "manage this one user's
 * roles" fits the same per-row-modal pattern already used for Manage
 * Access (PolicyModal) and break-glass (LocalPasswordModal), rather
 * than restructuring the whole page around tabs.
 */

// Mirrors SystemUser::ROLE_* — includes Student/Alumni (not just the
// Admin/Super Admin pair UserManagement.jsx's table itself lists),
// since a role_assignments grant can target any of the four roles.
const ROLE_NAME_MAP = { 1: "Student", 2: "Alumni", 3: "Admin", 4: "Super Admin" };
const ROLE_ID_BY_NAME = { Student: 1, Alumni: 2, Admin: 3, "Super Admin": 4 };
const GRANTABLE_ROLE_NAMES = ["Student", "Alumni", "Admin", "Super Admin"];
const ADMIN_ROLE_ID = 3;

const formatDateTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
};

const getStatusBadgeClasses = (status, isDark) => {
  if (status === "Active") {
    return isDark
      ? "bg-green-900/20 text-green-400 border-green-600"
      : "bg-green-100 text-green-700 border-green-200";
  }
  if (status === "Expired") {
    return isDark
      ? "bg-amber-900/20 text-amber-400 border-amber-600"
      : "bg-amber-100 text-amber-700 border-amber-200";
  }
  // Revoked and anything unrecognized
  return isDark
    ? "bg-red-950/30 text-red-400 border-red-700"
    : "bg-red-100 text-red-700 border-red-200";
};

const EMPTY_GRANT_FORM = { role: "Student", policy: "", expires_at: "" };

const RoleAssignmentsModal = ({
  isOpen,
  onClose,
  user,
  systemPolicies = [],
  onSuccess = () => {},
  onError = () => {},
}) => {
  const { isDark } = useTheme();

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  const [showGrantForm, setShowGrantForm] = useState(false);
  const [grantForm, setGrantForm] = useState(EMPTY_GRANT_FORM);
  const [granting, setGranting] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revoking, setRevoking] = useState(false);

  // user.full_name comes from GrantableUserResource when this modal is
  // opened via GrantRoleUserPicker; the admin_profile shape is what
  // UserManagement.jsx's own table rows already carry. Checking
  // full_name first keeps both entry points working unchanged.
  const fullName = user
    ? user.full_name
      || [user.admin_profile?.first_name, user.admin_profile?.last_name].filter(Boolean).join(" ")
      || user.email
    : "";

  const fetchAssignments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLocalError("");
    try {
      const res = await getRoleAssignments({ user_id: user.user_id });
      setAssignments(res.data?.data || []);
    } catch (err) {
      setLocalError(err.response?.data?.message || "Failed to load role assignments.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      fetchAssignments();
      setShowGrantForm(false);
      setGrantForm(EMPTY_GRANT_FORM);
      setRevokeTarget(null);
      setRevokeReason("");
    }
  }, [isOpen, user, fetchAssignments]);

  if (!isOpen || !user) return null;

  const isAdminRoleSelected = grantForm.role === "Admin";

  const handleGrant = async () => {
    setLocalError("");

    const roleId = ROLE_ID_BY_NAME[grantForm.role];
    if (isAdminRoleSelected && !grantForm.policy) {
      setLocalError("A policy is required when granting the Admin role.");
      return;
    }

    setGranting(true);
    try {
      const policy = systemPolicies.find((p) => p.name === grantForm.policy);
      await grantRoleAssignment({
        user_id: user.user_id,
        role_id: roleId,
        policy_id: roleId === ADMIN_ROLE_ID ? (policy ? policy.policy_id : null) : null,
        // Omitted (not sent as null) when left blank, so the backend's
        // "explicit choice, no silent default" validation
        // (StoreRoleAssignmentRequest) treats it as "not provided"
        // rather than an intentional null. sending `undefined` here
        // means axios/JSON.stringify drops the key entirely.
        expires_at: grantForm.expires_at ? new Date(grantForm.expires_at).toISOString() : undefined,
      });

      onSuccess(`${ROLE_NAME_MAP[roleId]} role granted to ${fullName}.`);
      setShowGrantForm(false);
      setGrantForm(EMPTY_GRANT_FORM);
      await fetchAssignments();
    } catch (err) {
      const message = err.response?.data?.message
        || err.response?.data?.errors?.role_id?.[0]
        || err.response?.data?.errors?.policy_id?.[0]
        || "Failed to grant role.";
      setLocalError(message);
    } finally {
      setGranting(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokeTarget) return;
    if (!revokeReason.trim()) {
      setLocalError("Please provide a reason for revoking this role.");
      return;
    }

    setLocalError("");
    setRevoking(true);
    try {
      await revokeRoleAssignment(revokeTarget.id, revokeReason.trim());
      onSuccess(`${ROLE_NAME_MAP[revokeTarget.role_id] || "Role"} assignment revoked for ${fullName}.`);
      setRevokeTarget(null);
      setRevokeReason("");
      await fetchAssignments();
    } catch (err) {
      setLocalError(err.response?.data?.message || "Failed to revoke role assignment.");
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-10000 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 backdrop-blur-sm ${isDark ? "bg-black/70" : "bg-black/50"}`}
        onClick={onClose}
      />
      <div
        className={`relative rounded-2xl shadow-2xl w-full max-w-2xl mx-auto max-h-[85vh] flex flex-col overflow-hidden ${
          isDark ? "bg-[#242526] border border-[#3e4042]" : "bg-white"
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-5 flex items-center justify-between shrink-0 ${
            isDark ? "bg-[#2a2a2f] border-b border-[#3e4042]" : "bg-pup-dark-maroon text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <IdentificationIcon className="w-5 h-5 shrink-0" />
            <div>
              <h2 className="font-bold text-lg uppercase tracking-wide">Manage Roles</h2>
              <p className={`text-xs mt-0.5 ${isDark ? "text-[#b0b3b8]" : "text-white/60"}`}>
                {fullName} · {user.email}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="h-1 w-full bg-linear-to-r from-[#FFD700] via-[#FFC72C] to-[#FFD700] shrink-0" />

        <div className={`flex-1 overflow-y-auto px-6 py-5 space-y-4 ${isDark ? "text-[#e4e6eb]" : ""}`}>
          {localError && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-xs font-semibold">
              {localError}
            </div>
          )}

          {/* Existing assignments */}
          {loading ? (
            <p className={`text-sm text-center py-6 ${isDark ? "text-[#9a9a9a]" : "text-gray-400"}`}>
              Loading role assignments...
            </p>
          ) : assignments.length === 0 ? (
            <p className={`text-sm text-center py-6 ${isDark ? "text-[#9a9a9a]" : "text-gray-400"}`}>
              This user has no role assignment history yet.
            </p>
          ) : (
            <div className="space-y-2">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className={`rounded-xl p-3.5 border ${isDark ? "border-[#3e4042] bg-[#1c1c1e]" : "border-gray-200 bg-gray-50"}`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          {ROLE_NAME_MAP[assignment.role_id] || `Role ${assignment.role_id}`}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${getStatusBadgeClasses(assignment.status, isDark)}`}>
                          {assignment.status}
                        </span>
                        {assignment.policy?.name && (
                          <span className={`text-xs ${isDark ? "text-[#9a9a9a]" : "text-gray-500"}`}>
                            · {assignment.policy.name}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${isDark ? "text-[#9a9a9a]" : "text-gray-500"}`}>
                        Granted {formatDateTime(assignment.granted_at)}
                        {assignment.granted_by?.email ? ` by ${assignment.granted_by.email}` : ""}
                        {assignment.expires_at ? ` · expires ${formatDateTime(assignment.expires_at)}` : " · indefinite"}
                      </p>
                      {assignment.status === "Revoked" && assignment.revocation_reason && (
                        <p className={`text-xs mt-1 italic ${isDark ? "text-red-400" : "text-red-600"}`}>
                          Revoked {formatDateTime(assignment.revoked_at)}
                          {assignment.revoked_by?.email ? ` by ${assignment.revoked_by.email}` : ""}: {assignment.revocation_reason}
                        </p>
                      )}
                    </div>

                    {assignment.status === "Active" && (
                      <button
                        type="button"
                        onClick={() => { setRevokeTarget(assignment); setRevokeReason(""); setLocalError(""); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                          isDark ? "bg-red-950/30 text-red-400 hover:bg-red-950/50" : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Grant a new role */}
          {showGrantForm ? (
            <div className={`rounded-xl p-4 border space-y-4 ${isDark ? "border-[#3e4042] bg-[#1c1c1e]" : "border-gray-200 bg-gray-50"}`}>
              <p className="text-sm font-semibold">Grant a new role</p>

              <DropDown
                label="Role"
                name="role"
                value={grantForm.role}
                onChange={(e) => setGrantForm((f) => ({ ...f, role: e.target.value, policy: "" }))}
                options={GRANTABLE_ROLE_NAMES}
                labelColor={isDark ? "text-[#b0b3b8]" : "text-gray-600"}
              />

              {isAdminRoleSelected && (
                <DropDown
                  label="Policy"
                  name="policy"
                  value={grantForm.policy}
                  onChange={(e) => setGrantForm((f) => ({ ...f, policy: e.target.value }))}
                  options={systemPolicies.map((p) => p.name)}
                  required
                  labelColor={isDark ? "text-[#b0b3b8]" : "text-gray-600"}
                />
              )}

              <div className="space-y-1.5">
                <label className={`block text-sm font-medium ${isDark ? "text-[#e4e6eb]" : "text-gray-600"}`}>
                  Expires on <span className={isDark ? "text-[#9a9a9a]" : "text-gray-400"}>(optional — leave blank for indefinite)</span>
                </label>
                <input
                  type="date"
                  value={grantForm.expires_at}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setGrantForm((f) => ({ ...f, expires_at: e.target.value }))}
                  className={`w-full px-3 py-2.5 rounded-lg text-sm shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 border ${
                    isDark ? "bg-[#1f1f1f] text-[#e4e6eb] border-[#3e4042] focus:ring-[#FFD700]" : "bg-white text-gray-700 border-gray-300 focus:ring-[#FFC72C]"
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowGrantForm(false); setGrantForm(EMPTY_GRANT_FORM); setLocalError(""); }}
                  className={`px-4 py-2 text-sm font-semibold transition-colors ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800"}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGrant}
                  disabled={granting}
                  className={`px-5 py-2 rounded-full text-sm font-bold transition-all shadow disabled:opacity-60 ${
                    isDark ? "bg-yellow-400 text-black hover:bg-yellow-500" : "bg-pup-dark-maroon text-white hover:bg-[#3a0303]"
                  }`}
                >
                  {granting ? "Granting..." : "Grant Role"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setShowGrantForm(true); setLocalError(""); }}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-dashed transition-colors ${
                isDark ? "border-[#3e4042] text-[#b0b3b8] hover:bg-[#2a2a2f] hover:text-[#e4e6eb]" : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <PlusIcon className="w-4 h-4" /> Grant a role
            </button>
          )}

          {/* Inline revoke confirmation — matches the reject-reason
              pattern used elsewhere (e.g. AccessRequestsQueue's reject
              panel): a reason is required, not optional, both for the
              audit trail and so a future Super Admin reviewing the
              roster understands why access was pulled. */}
          {revokeTarget && (
            <div className={`rounded-xl p-4 border space-y-3 ${isDark ? "border-red-900/40 bg-red-950/10" : "border-red-200 bg-red-50"}`}>
              <p className="text-sm font-semibold">
                Revoke {ROLE_NAME_MAP[revokeTarget.role_id] || "this"} role for {fullName}?
              </p>
              <p className={`text-xs ${isDark ? "text-[#b0b3b8]" : "text-gray-600"}`}>
                This immediately signs the account out of every active session. Their other role
                assignments, if any, are not affected.
              </p>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                rows={3}
                placeholder="Reason for revoking this role..."
                autoFocus
                className={`w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-2 ${
                  isDark ? "bg-[#1c1c1e] border-[#3e4042] text-[#e4e6eb] focus:ring-red-500/40" : "bg-white border-gray-300 text-gray-900 focus:ring-red-300"
                }`}
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setRevokeTarget(null); setRevokeReason(""); setLocalError(""); }}
                  className={`px-4 py-2 text-sm font-semibold transition-colors ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800"}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRevoke}
                  disabled={revoking || !revokeReason.trim()}
                  className="px-5 py-2 rounded-full text-sm font-bold text-white shadow transition-all disabled:opacity-60 bg-red-600 hover:bg-red-700"
                >
                  {revoking ? "Revoking..." : "Revoke Role"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 flex items-center justify-end border-t shrink-0 ${isDark ? "border-[#3e4042]" : "border-gray-100"}`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2 text-sm font-semibold transition-colors ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800"}`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleAssignmentsModal;