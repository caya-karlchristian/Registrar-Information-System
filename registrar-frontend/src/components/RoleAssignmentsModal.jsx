import { useState, useEffect, useCallback } from "react";
import { XMarkIcon, IdentificationIcon, PlusIcon, EllipsisVerticalIcon, NoSymbolIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../context/ThemeContext";
import DropDown from "./DropDown";
import ErrorToast from "./ErrorToast";
import SuccessToast from "./SuccessToast";
import {
  getRoleAssignments,
  grantRoleAssignment,
  revokeRoleAssignment,
  editRoleAssignmentPolicy,
} from "../services/api";

/**
 * RoleAssignmentsModal — User Management: "Manage Roles"
 * -----------------------------------------------------
 * Super-Admin-only view of one user's full role_assignments history
 * (GET /role-assignments?user_id=), plus the actions to grant a new,
 * concurrent role (POST /role-assignments), revoke an existing Active
 * one (POST /role-assignments/{id}/revoke — reason required), and — as
 * of Work Item #2 — Admin Management Consolidation — edit the policy on
 * an Active Admin-role assignment in place (PATCH
 * /role-assignments/{id}/policy), without a revoke/regrant cycle.
 *
 * This is now the ONE place an admin's role + policy is managed from
 * the UI. The old "Manage Access" modal (PolicyModal, PATCH
 * /system-users/{id}/policy) has been removed entirely — role_assignments
 * is the single source of truth, and this modal is its single editing
 * surface.
 *
 * This is also the "student staff" onboarding/offboarding surface: a
 * person can hold more than one Active assignment at once (e.g. Student
 * + a restricted Admin), and revoking one leaves the others untouched —
 * see RoleAssignmentService::grant()/revoke()/editPolicy() on the
 * backend.
 *
 * Deliberately its own modal rather than a literal in-page tab: this
 * page is a paginated table of many users, so "manage this one user's
 * roles" fits the same per-row-modal pattern already used for
 * break-glass (LocalPasswordModal), rather than restructuring the
 * whole page around tabs.
 */

// Mirrors SystemUser::ROLE_* — includes Student/Alumni (not just the
// Admin/Super Admin pair UserManagement.jsx's table itself lists),
// since a role_assignments grant can target any of the four roles.
const ROLE_NAME_MAP = { 1: "Student", 2: "Alumni", 3: "Admin", 4: "Super Admin" };
const ROLE_ID_BY_NAME = { Student: 1, Alumni: 2, Admin: 3, "Super Admin": 4 };
const GRANTABLE_ROLE_NAMES = ["Student", "Alumni", "Admin", "Super Admin"];
const ADMIN_ROLE_ID = 3;

// The DropDown component only deals in plain strings, so "detach the
// policy" (send policy_id: null — see EditRoleAssignmentPolicyRequest,
// nullable by design) needs an explicit, selectable option rather than
// an empty/blank value.
const NO_POLICY_LABEL = "No Policy";

const formatDateTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
};

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
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

const calculateFutureDate = (days = 0, months = 0, years = 0) => {
  const d = new Date();
  if (days) d.setDate(d.getDate() + days);
  if (months) d.setMonth(d.getMonth() + months);
  if (years) d.setFullYear(d.getFullYear() + years);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const QUICK_EXPIRATION_PRESETS = [
  { label: "1 week", getTargetDate: () => calculateFutureDate(7, 0, 0) },
  { label: "1 month", getTargetDate: () => calculateFutureDate(0, 1, 0) },
  { label: "1 year", getTargetDate: () => calculateFutureDate(0, 0, 1) },
];

const RoleAssignmentsModal = ({
  isOpen,
  onClose,
  onBack,
  user,
  systemPolicies = [],
  onSuccess = () => {},
  onError = () => {},
}) => {
  const { isDark } = useTheme();

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [localSuccess, setLocalSuccess] = useState("");

  const [showGrantForm, setShowGrantForm] = useState(false);
  const [grantForm, setGrantForm] = useState(EMPTY_GRANT_FORM);
  const [granting, setGranting] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revoking, setRevoking] = useState(false);

  // In-place policy edit (Work Item #2) — only ever targets an
  // Active, Admin-role assignment (see ADMIN_ROLE_ID gating below and
  // RoleAssignmentService::editPolicy()'s own server-side guard).
  const [editPolicyTarget, setEditPolicyTarget] = useState(null);
  const [editPolicyValue, setEditPolicyValue] = useState("");
  const [editingPolicy, setEditingPolicy] = useState(false);

  const [activeTab, setActiveTab] = useState("active"); // "active" | "revoked"
  const [activeMenuId, setActiveMenuId] = useState(null);

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
      setActiveTab("active");
      setShowGrantForm(false);
      setGrantForm(EMPTY_GRANT_FORM);
      setRevokeTarget(null);
      setRevokeReason("");
      setEditPolicyTarget(null);
      setEditPolicyValue("");
      setLocalSuccess("");
      setActiveMenuId(null);
    }
  }, [isOpen, user, fetchAssignments]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (activeMenuId && !e.target.closest(".action-menu-container")) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [activeMenuId]);

  if (!isOpen || !user) return null;

  const activeAssignments = assignments.filter((a) => a.status === "Active");
  const revokedAssignments = assignments.filter((a) => a.status !== "Active");
  const currentAssignments = activeTab === "active" ? activeAssignments : revokedAssignments;

  const isAdminRoleSelected = grantForm.role === "Admin";

  const handleGrant = async () => {
    setLocalError("");
    setLocalSuccess("");

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

      const msg = `${ROLE_NAME_MAP[roleId]} role granted to ${fullName}.`;
      setLocalSuccess(msg);
      onSuccess(msg);
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
    setLocalSuccess("");
    setRevoking(true);
    try {
      await revokeRoleAssignment(revokeTarget.id, revokeReason.trim());
      const msg = `${ROLE_NAME_MAP[revokeTarget.role_id] || "Role"} assignment revoked for ${fullName}.`;
      setLocalSuccess(msg);
      onSuccess(msg);
      setRevokeTarget(null);
      setRevokeReason("");
      await fetchAssignments();
    } catch (err) {
      setLocalError(err.response?.data?.message || "Failed to revoke role assignment.");
    } finally {
      setRevoking(false);
    }
  };

  const handleOpenEditPolicy = (assignment) => {
    setEditPolicyTarget(assignment);
    setEditPolicyValue(assignment.policy?.name || NO_POLICY_LABEL);
    setRevokeTarget(null);
    setShowGrantForm(false);
    setLocalError("");
    setLocalSuccess("");
  };

  const handleConfirmEditPolicy = async () => {
    if (!editPolicyTarget) return;

    setLocalError("");
    setLocalSuccess("");
    setEditingPolicy(true);
    try {
      const policy = systemPolicies.find((p) => p.name === editPolicyValue);
      // NO_POLICY_LABEL (or anything that doesn't match a real policy)
      // maps to null — an explicit detach, not "leave unchanged"; see
      // EditRoleAssignmentPolicyRequest's nullable rule on the backend.
      await editRoleAssignmentPolicy(editPolicyTarget.id, policy ? policy.policy_id : null);

      const msg = policy
        ? `Policy updated to "${policy.name}" for ${fullName}.`
        : `Policy detached for ${fullName}.`;
      setLocalSuccess(msg);
      onSuccess(msg);
      setEditPolicyTarget(null);
      setEditPolicyValue("");
      await fetchAssignments();
    } catch (err) {
      const message = err.response?.data?.message
        || err.response?.data?.errors?.policy_id?.[0]
        || err.response?.data?.errors?.role_id?.[0]
        || "Failed to update policy.";
      setLocalError(message);
    } finally {
      setEditingPolicy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 backdrop-blur-sm ${isDark ? "bg-black/70" : "bg-black/50"}`}
        onClick={onClose}
      />
      <div
        className={`relative rounded-2xl shadow-2xl w-full max-w-xl mx-auto max-h-[85vh] flex flex-col overflow-hidden ${
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
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back"
                title="Back to search"
                className="p-1.5 -ml-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer mr-1"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
            )}
            <IdentificationIcon className="w-5 h-5 shrink-0" />
            <div>
              <h2 className="font-bold text-lg uppercase tracking-wide">Manage Roles</h2>
              <p className={`text-xs mt-0.5 ${isDark ? "text-[#b0b3b8]" : "text-white/60"}`}>
                {fullName} · {user.email}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="h-1 w-full bg-linear-to-r from-[#FFD700] via-[#FFC72C] to-[#FFD700] shrink-0" />

        {/* Tab Switcher */}
        <div className="px-6 pt-5 shrink-0">
          <div className={`flex items-center p-1 rounded-xl border ${isDark ? "bg-[#1c1c1e] border-[#3e4042]" : "bg-gray-100/90 border-gray-200"}`}>
            <button
              type="button"
              onClick={() => {
                setActiveTab("active");
                setShowGrantForm(false);
                setRevokeTarget(null);
                setEditPolicyTarget(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "active"
                  ? isDark
                    ? "bg-[#2a2a2f] text-yellow-400 shadow-xs border border-[#3e4042]"
                    : "bg-white text-pup-dark-maroon shadow-xs"
                  : isDark
                    ? "text-[#b0b3b8] hover:text-white"
                    : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <span>Active Roles</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "active"
                    ? isDark
                      ? "bg-green-900/40 text-green-400 border border-green-700/50"
                      : "bg-green-100 text-green-700 border border-green-200"
                    : isDark
                      ? "bg-[#2a2a2f] text-[#b0b3b8]"
                      : "bg-gray-200 text-gray-600"
                }`}
              >
                {activeAssignments.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("revoked");
                setShowGrantForm(false);
                setRevokeTarget(null);
                setEditPolicyTarget(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "revoked"
                  ? isDark
                    ? "bg-[#2a2a2f] text-yellow-400 shadow-xs border border-[#3e4042]"
                    : "bg-white text-pup-dark-maroon shadow-xs"
                  : isDark
                    ? "text-[#b0b3b8] hover:text-white"
                    : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <span>Revoked History</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "revoked"
                    ? isDark
                      ? "bg-red-950/50 text-red-400 border border-red-800/50"
                      : "bg-red-100 text-red-700 border border-red-200"
                    : isDark
                      ? "bg-[#2a2a2f] text-[#b0b3b8]"
                      : "bg-gray-200 text-gray-600"
                }`}
              >
                {revokedAssignments.length}
              </span>
            </button>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto px-6 py-4 space-y-4 ${isDark ? "text-[#e4e6eb]" : ""}`}>

          {/* Existing assignments */}
          {loading ? (
            <p className={`text-sm text-center py-6 ${isDark ? "text-[#9a9a9a]" : "text-gray-400"}`}>
              Loading role assignments...
            </p>
          ) : currentAssignments.length === 0 ? (
            <div className={`text-center py-8 px-4 rounded-xl border border-dashed ${isDark ? "border-[#3e4042] bg-[#1c1c1e]/40" : "border-gray-200 bg-gray-50/50"}`}>
              <p className={`text-sm font-medium ${isDark ? "text-[#9a9a9a]" : "text-gray-500"}`}>
                {activeTab === "active"
                  ? "No active role assignments for this user."
                  : "No revoked or expired role assignments in history."}
              </p>
            </div>
          ) : (
            <div className="relative">
              <div className={`border rounded-xl divide-y ${isDark ? "border-[#3e4042] bg-[#1c1c1e] divide-[#3e4042]" : "border-gray-200 bg-white divide-gray-200"}`}>
                {currentAssignments.map((assignment) => {
                  const isStudentStaff = (assignment.role_id === 3 || assignment.role_id === 4) && (user.base_role_id === 1 || user.base_role_id === 2);
                  return (
                    <div
                      key={assignment.id}
                      className="p-4 flex items-center justify-between gap-4 first:rounded-t-xl last:rounded-b-xl bg-white dark:bg-[#1c1c1e]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold text-base ${isDark ? "text-white" : "text-gray-900"}`}>
                            {ROLE_NAME_MAP[assignment.role_id] || `Role ${assignment.role_id}`}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${getStatusBadgeClasses(assignment.status, isDark)}`}>
                            {assignment.status}
                          </span>
                          {isStudentStaff && (
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                              isDark ? "bg-blue-950/40 text-blue-400 border-blue-900/50" : "bg-blue-50 text-blue-700 border-blue-100"
                            }`}>
                              Student staff
                            </span>
                          )}
                          {assignment.policy?.name && (
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                              isDark ? "bg-[#0f213d] text-[#5c93e6] border-blue-900/50" : "bg-[#e0f2fe] text-[#0369a1] border-blue-200"
                            }`}>
                              {assignment.policy.name}
                            </span>
                          )}
                        </div>
                        {assignment.status === "Revoked" ? (
                          <div className="mt-1 text-xs space-y-0.5 w-full">
                            <p className={`break-words ${isDark ? "text-[#9a9a9a]" : "text-gray-500"}`}>
                              Granted {formatDate(assignment.granted_at)}{assignment.granted_by?.email ? ` by ${assignment.granted_by.email}` : ""}
                            </p>
                            <div className={`border-t border-dashed my-2 w-full ${isDark ? "border-[#3e4042]" : "border-gray-200"}`} />
                            <div className="flex items-start gap-2">
                              <NoSymbolIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <p className={`break-words ${isDark ? "text-[#e4e6eb]" : "text-gray-800"}`}>
                                  Revoked {formatDate(assignment.revoked_at)}{assignment.revoked_by?.email ? ` by ${assignment.revoked_by.email}` : ""}
                                </p>
                                {assignment.revocation_reason && (
                                  <p className={`mt-0.5 break-words [overflow-wrap:anywhere] ${isDark ? "text-[#9a9a9a]" : "text-gray-500"}`}>
                                    Reason: {assignment.revocation_reason}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className={`text-xs mt-1 truncate max-w-70 sm:max-w-md ${isDark ? "text-[#9a9a9a]" : "text-gray-500"}`}>
                            {formatDate(assignment.granted_at)} · {assignment.expires_at ? `expires ${formatDate(assignment.expires_at)}` : (assignment.granted_by?.email || "indefinite")}
                          </p>
                        )}
                      </div>

                      {assignment.status === "Active" && (
                        <div className="relative action-menu-container shrink-0">
                          <button
                            type="button"
                            onClick={() => setActiveMenuId(activeMenuId === assignment.id ? null : assignment.id)}
                            className={`p-2 rounded-xl border transition-colors ${
                              isDark ? "border-[#3e4042] bg-[#1c1c1e] hover:bg-[#242526] text-gray-400" : "border-gray-200 bg-white hover:bg-gray-50 text-gray-500"
                            }`}
                          >
                            <EllipsisVerticalIcon className="w-5 h-5" />
                          </button>
                          {activeMenuId === assignment.id && (
                            <div className={`absolute right-0 top-full mt-1 w-36 rounded-lg shadow-lg border z-50 py-1 ${
                              isDark ? "bg-[#242526] border-[#3e4042] text-[#e4e6eb]" : "bg-white border-gray-200 text-gray-800"
                            }`}>
                              {assignment.role_id === ADMIN_ROLE_ID && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenEditPolicy(assignment);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-[#2a2a2f] transition-colors"
                                >
                                  Edit Policy
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setRevokeTarget(assignment);
                                  setRevokeReason("");
                                  setEditPolicyTarget(null);
                                  setShowGrantForm(false);
                                  setLocalError("");
                                  setLocalSuccess("");
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                              >
                                Revoke
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grant a new role */}
          {showGrantForm ? (
            <div className={`rounded-xl p-4 border space-y-4 ${isDark ? "border-[#3e4042] bg-[#1c1c1e]" : "border-gray-200 bg-gray-50"}`}>
              <p className="text-sm font-semibold">Grant a new role</p>

              <div className={`grid ${isAdminRoleSelected ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"} gap-4`}>
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
              </div>

              <div className="space-y-2">
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

                {/* Quick Access Presets */}
                <div className="flex items-center gap-2 flex-wrap">
                  {QUICK_EXPIRATION_PRESETS.map((preset) => {
                    const presetDate = preset.getTargetDate();
                    const isSelected = grantForm.expires_at === presetDate;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setGrantForm((f) => ({
                            ...f,
                            expires_at: isSelected ? "" : presetDate,
                          }));
                        }}
                        className={`px-3.5 py-1 text-xs rounded-full border transition-all cursor-pointer ${
                          isSelected
                            ? isDark
                              ? "bg-white text-black border-white font-semibold shadow-xs"
                              : "bg-pup-dark-maroon text-white border-pup-dark-maroon font-semibold shadow-xs"
                            : isDark
                            ? "bg-[#1c1c1e] text-gray-300 border-[#3e4042] hover:bg-[#2a2a2f] hover:text-white"
                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowGrantForm(false); setGrantForm(EMPTY_GRANT_FORM); setLocalError(""); setLocalSuccess(""); }}
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
              onClick={() => { setShowGrantForm(true); setRevokeTarget(null); setEditPolicyTarget(null); setLocalError(""); setLocalSuccess(""); }}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-dashed transition-colors ${
                isDark ? "border-[#3e4042] text-[#b0b3b8] hover:bg-[#2a2a2f] hover:text-[#e4e6eb]" : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <PlusIcon className="w-4 h-4" /> Grant a role
            </button>
          )}

          {/* Inline edit-policy panel — Work Item #2. In-place swap on
              an already-Active Admin grant; no revoke/regrant cycle, so
              no forced re-login (see RoleAssignmentService::editPolicy()
              on the backend for why that distinction matters). */}
          {editPolicyTarget && (
            <div className={`rounded-xl p-4 border space-y-4 ${isDark ? "border-[#3e4042] bg-[#1c1c1e]" : "border-gray-200 bg-gray-50"}`}>
              <div>
                <p className="text-sm font-semibold">Edit policy for {fullName}</p>
                <p className={`text-xs mt-1 ${isDark ? "text-[#9a9a9a]" : "text-gray-500"}`}>
                  Takes effect immediately — no re-login required.
                </p>
              </div>

              <DropDown
                label="Policy"
                name="editPolicy"
                value={editPolicyValue}
                onChange={(e) => setEditPolicyValue(e.target.value)}
                options={[NO_POLICY_LABEL, ...systemPolicies.map((p) => p.name)]}
                required
                labelColor={isDark ? "text-[#b0b3b8]" : "text-gray-600"}
              />

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setEditPolicyTarget(null); setEditPolicyValue(""); setLocalError(""); setLocalSuccess(""); }}
                  className={`px-4 py-2 text-sm font-semibold transition-colors ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800"}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEditPolicy}
                  disabled={editingPolicy}
                  className={`px-5 py-2 rounded-full text-sm font-bold transition-all shadow disabled:opacity-60 ${
                    isDark ? "bg-yellow-400 text-black hover:bg-yellow-500" : "bg-pup-dark-maroon text-white hover:bg-[#3a0303]"
                  }`}
                >
                  {editingPolicy ? "Saving..." : "Save Policy"}
                </button>
              </div>
            </div>
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
                  onClick={() => { setRevokeTarget(null); setRevokeReason(""); setLocalError(""); setLocalSuccess(""); }}
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
        <div className={`px-6 py-4 flex items-center justify-between border-t shrink-0 ${isDark ? "border-[#3e4042]" : "border-gray-100"}`}>
          <div>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border transition-colors cursor-pointer ${
                  isDark
                    ? "border-[#3e4042] text-[#b0b3b8] hover:bg-[#2a2a2f] hover:text-white"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <ArrowLeftIcon className="w-4 h-4" /> Back
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2 text-sm font-semibold transition-colors cursor-pointer ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800"}`}
          >
            Close
          </button>
        </div>
      </div>
      </div>
      <SuccessToast message={localSuccess} onClose={() => setLocalSuccess("")} />
      <ErrorToast message={localError} onClose={() => setLocalError("")} />
    </>
  );
};

export default RoleAssignmentsModal;