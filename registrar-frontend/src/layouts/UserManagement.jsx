import { useState, useEffect, useCallback, useRef } from "react";
import {
  PencilSquareIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  KeyIcon,
  IdentificationIcon,
  UserPlusIcon
} from "@heroicons/react/24/outline";
import DropDown from '../components/DropDown';
import VoiceSearchInput from "../components/VoiceSearchInput.jsx";
import UserModal from "../components/UserModal";
import ConfirmationModal from "../components/ConfirmationModal";
import LocalPasswordModal from "../components/LocalPasswordModal";
import RoleAssignmentsModal from "../components/RoleAssignmentsModal";
import GrantRoleUserPicker from "../components/GrantRoleUserPicker";
import {
  getSystemUsers,
  createSystemUser,
  updateSystemUser,
  deleteSystemUser,
  getPolicies,
  setLocalPassword
} from "../services/api";
import SuccessToast from "../components/SuccessToast.jsx";
import ErrorToast from "../components/ErrorToast.jsx";
import { useTheme } from "../context/ThemeContext";
import { UserTableSkeleton } from '../components/LoadingSkeleton';
import DashboardDropdown from "../components/DashboardDropdown.jsx";
import { formatName } from "../utils/formatters";

/**
 * UserManagement — Admin Accounts
 * -----------------------------------------------------
 * Work Item #2 — Admin Management Consolidation: role_assignments is
 * the single source of truth for an admin's role + policy.
 * users.policy_id (shown read-only in the "Policy attached" column) is
 * a live read path for the common case of a session that never
 * switched roles — see RoleAssignmentService::editPolicy()'s docblock
 * on the backend for why that column still matters — but it is no
 * longer directly editable from here. The "Manage Access" modal
 * (PolicyModal / PATCH /system-users/{id}/policy) has been removed
 * entirely; granting, revoking, and now editing a policy in place all
 * happen through "Manage Roles" (RoleAssignmentsModal).
 *
 * Work Item #3 — Admin Accounts / Student Staff Visibility: this table
 * now also lists accounts whose BASE identity (users.role_id) is
 * Student/Alumni but who hold an active Admin-tier role_assignments
 * grant on top of it — a "student staff" account. Every row therefore
 * carries two distinct role concepts, both shown explicitly so a
 * student-staff row is legible at a glance rather than looking like a
 * data error:
 *   - base identity   (user.base_role_id / base_role_name)  — who they
 *     fundamentally are: a Student, Alumnus, Admin, or Super Admin.
 *   - administrative role granted (user.admin_grant)         — the
 *     Admin/Super Admin access they hold RIGHT NOW, which may be their
 *     base identity itself (a classic admin) or a secondary grant on
 *     top of a Student/Alumni base identity (admin_grant.is_secondary).
 * See UserResource::resolveAdminGrant() on the backend for exactly how
 * admin_grant is derived — it intentionally does NOT reuse
 * user.policy_id, which is meaningless for a secondary grant.
 *
 * Only ACTIVE grants are ever included in this list at all (an expired
 * or revoked-only administrative grant simply drops the row) — see
 * SystemUserController::index()'s docblock for that design choice.
 */
const ROLE_MAP     = { 3: "Admin", 4: "Super Admin" };
// Work Item #3: "Student Staff" filters on admin_grant.is_secondary
// (a Student/Alumni base identity holding an administrative grant),
// kept as its own category distinct from "Admin"/"Super Admin" (which
// now match only accounts whose administrative grant IS their base
// identity — i.e. the classic, non-student-staff case) so the three
// options stay mutually exclusive and each means one specific thing.
const ROLE_FILTERS = ["All", "Admin", "Super Admin", "Student Staff"];
const DATE_OPTIONS = ["Newest", "Oldest"];
const STATUS_FILTERS = ["All", "Activated", "Deactivated", "Pending Activation", "Expired"];
const PER_PAGE = 7;

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
};

const getRoleBadgeClasses = (roleName, isDark) => {
  const role = String(roleName || "").trim().toLowerCase();

  if (role.includes("super")) { // Super Admin - PUP Yellow
    if (isDark) {
      return 'bg-red-950/40 text-red-400 border-red-800/50';
    }
    return 'bg-red-50 text-[#8B0000]/70 border-red-200';
  }

  if (isDark) {
    return 'bg-[#8B0000]/20 text-[#ffb3b3] border-[#8B0000]/30';
  }
  return 'bg-[#8B0000]/10 text-[#8B0000] border-[#8B0000]/20';
};

// Work Item #3 — a neutral, deliberately different palette from
// getRoleBadgeClasses() above: the Identity badge shows who someone
// fundamentally IS (Student/Alumni/Admin/Super Admin), while the
// Admin Role badge (still using getRoleBadgeClasses) shows the
// administrative access they've been granted — these are visually
// distinct so a "Student" identity badge next to an "Admin" role badge
// reads as a student-staff account, not a data inconsistency.
const getIdentityBadgeClasses = (isDark) => (
  isDark
    ? 'bg-[#2f3336] text-[#c7cad1] border-[#4a4d51]'
    : 'bg-slate-100 text-slate-600 border-slate-200'
);

const getStatusBadgeClasses = (status, isDark) => {
  const normalized = String(status ?? "").trim().toLowerCase();

  if (normalized === 'activated') {
    return isDark
      ? 'bg-green-900/20 text-green-400 border-green-600'
      : 'bg-green-100 text-green-700 border-green-200';
  }

  if (normalized === 'pending activation') {
    return isDark
      ? 'bg-amber-900/20 text-amber-400 border-amber-600'
      : 'bg-amber-100 text-amber-700 border-amber-200';
  }

  if (normalized === 'expired') {
    return isDark
      ? 'bg-red-950/30 text-red-400 border-red-700'
      : 'bg-red-100 text-red-700 border-red-200';
  }

  // 'deactivated' and any unrecognized status
  return isDark
    ? 'bg-gray-700/20 text-gray-300 border-gray-400'
    : 'bg-gray-100 text-gray-700 border-gray-200';
};

const UserManagement = () => {
  const { isDark } = useTheme();
  const [search, setSearch]           = useState("");
  const [roleFilter, setRoleFilter]   = useState("All");
  const [dateOrder, setDateOrder]     = useState("Newest");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [editUser, setEditUser]       = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting]   = useState(false);

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const roleDropdownRef = useRef(null);
  const statusDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target)) {
        setRoleDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Break-Glass (local auth) access states — Super Admin targets only,
  // enforced again server-side by SetLocalPasswordRequest.
  const [isLocalPasswordModalOpen, setIsLocalPasswordModalOpen] = useState(false);
  const [selectedUserForLocalAuth, setSelectedUserForLocalAuth] = useState(null);
  const [localAuthSubmitting, setLocalAuthSubmitting] = useState(false);

  // Roles tab (Multi-Role Assignments) — per-user grant/revoke history,
  // rendered via RoleAssignmentsModal. Server-driven; no local state
  // beyond "which user's modal is open" lives here, the modal owns its
  // own fetch/grant/revoke lifecycle.
  const [selectedUserForRoles, setSelectedUserForRoles] = useState(null);
  const [isGrantPickerOpen, setIsGrantPickerOpen] = useState(false);
  const [openedFromPicker, setOpenedFromPicker] = useState(false);

  // Policies come from the backend now (policies table via GET /policies).
  const [systemPolicies, setSystemPolicies] = useState([]);

  // -------------------------------------------------------
  // Policy resolver — Work Item #3: reads the policy that actually
  // applies to this account's ADMINISTRATIVE access (user.admin_grant),
  // not user.policy/user.policy_id — those reflect users.policy_id,
  // which is never set for a student-staff account's secondary grant
  // and would incorrectly show "No policy attached" for one. See
  // UserResource::resolveAdminGrant() on the backend.
  // -------------------------------------------------------
  const getUserPolicy = useCallback((user) => {
    if (user.admin_grant?.role_id === 4) return "Full Access";
    return user.admin_grant?.policy?.name || "No policy attached";
  }, []);

  // -------------------------------------------------------
  // Fetch users
  // -------------------------------------------------------
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await getSystemUsers();
      setUsers(res.data.data);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPolicies = useCallback(async () => {
    try {
      const res = await getPolicies();
      setSystemPolicies(res.data.data || []);
    } catch (err) {
      console.warn("Failed to load policies:", err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchPolicies();
  }, [fetchUsers, fetchPolicies]);

  // -------------------------------------------------------
  // Filter + sort (client-side — small dataset)
  // -------------------------------------------------------
  const filtered = users
    .filter((u) => {
      // Work Item #3: admin_grant.role_name drives both the badge and
      // filtering now, not the raw (base-identity) role_id — for a
      // student-staff row those are two different roles entirely.
      const grantRoleName = ROLE_MAP[u.admin_grant?.role_id] || "";
      const isSecondaryGrant = !!u.admin_grant?.is_secondary && u.admin_grant?.role_id !== 4;
      const identityName = u.base_role_name || "";
      const fullName = formatName(u) || "";
      const matchSearch =
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        grantRoleName.toLowerCase().includes(search.toLowerCase()) ||
        identityName.toLowerCase().includes(search.toLowerCase()) ||
        fullName.toLowerCase().includes(search.toLowerCase());
      const matchRole =
        roleFilter === "All" ||
        (roleFilter === "Student Staff" ? isSecondaryGrant : (grantRoleName === roleFilter && !isSecondaryGrant));
      const matchStatus = statusFilter === "All" || u.status  === statusFilter;
      return matchSearch && matchRole && matchStatus;
    })
    .sort((a, b) => {
      const da = new Date(a.created_at);
      const db = new Date(b.created_at);
      return dateOrder === "Newest" ? db - da : da - db;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(currentPage, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const handleFilterChange = () => setCurrentPage(1);

  // -------------------------------------------------------
  // Create / Update
  // -------------------------------------------------------
  const handleSubmit = async (formData, userId) => {
    setSubmitting(true);
    try {
      if (userId) {
        await updateSystemUser(userId, formData);
        setSuccessMsg("User details updated successfully!");
      } else {
        await createSystemUser(formData);
        setSuccessMsg("New user has been created!");
      }
      await fetchUsers();
      setIsModalOpen(false);
      setEditUser(null);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------
  // Delete
  // -------------------------------------------------------
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSystemUser(deleteTarget.user_id);
      await fetchUsers();
      setSuccessMsg(`User ${deleteTarget.email} has been deleted.`);
    } catch (err) {
      setErrorMsg(err.response?.data?.message ||"Failed to delete user.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const pageNumbers = () => {
    if (totalPages <= 6) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [1, 2, 3];
    if (safePage > 4) pages.push("...");
    if (safePage > 3 && safePage < totalPages - 2) pages.push(safePage);
    pages.push("...", totalPages - 1, totalPages);
    return [...new Set(pages)];
  };

  // -------------------------------------------------------
  // Break-Glass (local auth) action handlers
  // -------------------------------------------------------
  const handleOpenLocalAuth = (user) => {
    setSelectedUserForLocalAuth(user);
    setIsLocalPasswordModalOpen(true);
  };

  const handleSaveLocalPassword = async (password, passwordConfirmation) => {
    if (!selectedUserForLocalAuth) return;
    setLocalAuthSubmitting(true);
    setErrorMsg("");
    try {
      await setLocalPassword(selectedUserForLocalAuth.user_id, password, passwordConfirmation);
      setSuccessMsg(`Break-glass access enabled for ${selectedUserForLocalAuth.email}.`);
      setIsLocalPasswordModalOpen(false);
      setSelectedUserForLocalAuth(null);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to enable break-glass access.");
    } finally {
      setLocalAuthSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Admin Accounts
            </h1>
          </div>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-455' : 'text-gray-500'}`}>
            Create and manage system user accounts, assign roles, configure access policies, and set local passwords.          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
          {(roleFilter !== 'All' || statusFilter !== 'All' || dateOrder !== 'Newest' || search.trim() !== '') && (
            <button
              type="button"
              onClick={() => {
                setRoleFilter('All');
                setStatusFilter('All');
                setDateOrder('Newest');
                setSearch('');
              }}
              className={`px-4 py-2 border rounded-lg text-sm font-semibold transition-all cursor-pointer ${isDark ? 'border-gray-700 bg-[#2a2a2f] text-white hover:bg-white/10' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Clear
            </button>
          )}

          <button
            onClick={() => setIsGrantPickerOpen(true)}
            className={`px-4 py-2 border rounded-lg text-sm font-semibold transition-all cursor-pointer ${isDark ? 'border-gray-700 bg-[#2a2a2f] text-white hover:bg-white/10' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            Grant a Role <UserPlusIcon className="w-4 h-4 inline-block ml-1" />
          </button>

          <button
            onClick={() => { setEditUser(null); setIsModalOpen(true); }}
            className={`px-5 py-2 rounded-lg text-sm font-bold shadow transition-all cursor-pointer ${isDark ? 'bg-yellow-400 text-black hover:bg-yellow-500' : 'bg-pup-dark-maroon text-white hover:bg-[#3a0303]'}`}
          >
            Add User <PlusIcon className="w-4 h-4 inline-block ml-1" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-xl overflow-hidden border ${isDark ? 'bg-[#242526] border-[#3e4042]' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b ${isDark ? 'border-[#3e4042] bg-[#1a1a1c]/20' : 'border-gray-200 bg-gray-50/50'}`}>
          <div className="w-full sm:max-w-md">
            <VoiceSearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                handleFilterChange();
              }}
              placeholder="Search"
            />
          </div>
          <div className="flex items-center justify-end gap-3 ml-auto">
            <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{safePage} of {totalPages}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-190 text-sm">
            <thead>
              <tr className={isDark ? 'border-b border-[#3e4042]' : 'border-b border-gray-100'}>
                <th className={`px-4 py-3 text-center font-medium ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>Name</th>
                <th className={`px-4 py-3 text-center font-medium ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>Email</th>

                {/* Work Item #3: base identity — who this account fundamentally
                  is, separate from the administrative role granted below. */}
                <th className={`px-4 py-3 text-center font-medium ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>Identity</th>

                {/* Role Filter dropdown — filters on the administrative role
                  GRANTED (admin_grant), not base identity. See ROLE_FILTERS. */}
                <th className="px-4 py-3 text-center">
                  <DashboardDropdown
                    isOpen={roleDropdownOpen}
                    setIsOpen={setRoleDropdownOpen}
                    dropdownRef={roleDropdownRef}
                    align="center"
                    trigger={
                      <span className={roleFilter !== 'All' ? (isDark ? 'text-yellow-400' : 'text-[#8b0000]') : (isDark ? 'text-[#b0b3b8]' : 'text-gray-500')}>
                        Admin Role
                      </span>
                    }
                    sections={[
                      {
                        title: 'Filter by Admin Role',
                        items: ROLE_FILTERS.map(option => ({
                          label: option,
                          isSelected: roleFilter === option,
                          onClick: () => {
                            setRoleFilter(option);
                            handleFilterChange();
                          }
                        }))
                      }
                    ]}
                  />
                </th>

                <th className={`px-4 py-3 text-center font-medium ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>Policy attached</th>

                {/* Joined Date Sort header */}
                <th className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setDateOrder(prev => prev === 'Newest' ? 'Oldest' : 'Newest');
                      handleFilterChange();
                    }}
                    className={`flex items-center justify-center gap-1 mx-auto text-xs uppercase font-bold hover:text-[#800000] dark:hover:text-[#FFC72C] transition-colors focus:outline-none cursor-pointer ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}
                  >
                    <span>Joined Date</span>
                    {dateOrder === 'Newest' ? (
                      <ChevronDownIcon className="w-3.5 h-3.5 text-blue-500" />
                    ) : (
                      <ChevronUpIcon className="w-3.5 h-3.5 text-blue-500" />
                    )}
                  </button>
                </th>

                {/* Account Status Filter dropdown — Work Item #3: labeled
                  "Account Status" (not just "Status") to be explicit this is
                  the account's login-eligibility status (Activated/
                  Deactivated/...), distinct from the administrative grant's
                  own Active/Expired/Revoked status shown on the Admin Role
                  badge below. */}
                <th className="px-4 py-3 text-center">
                  <DashboardDropdown
                    isOpen={statusDropdownOpen}
                    setIsOpen={setStatusDropdownOpen}
                    dropdownRef={statusDropdownRef}
                    align="center"
                    trigger={
                      <span className={statusFilter !== 'All' ? (isDark ? 'text-yellow-400' : 'text-[#8b0000]') : (isDark ? 'text-[#b0b3b8]' : 'text-gray-500')}>
                        Account Status
                      </span>
                    }
                    sections={[
                      {
                        title: 'Filter by Status',
                        items: STATUS_FILTERS.map(option => ({
                          label: option,
                          isSelected: statusFilter === option,
                          onClick: () => {
                            setStatusFilter(option);
                            handleFilterChange();
                          }
                        }))
                      }
                    ]}
                  />
                </th>
                <th className={`px-4 py-3 text-center font-medium ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <UserTableSkeleton isDark={isDark} count={7} />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-24">
                    <div className="flex flex-col items-center justify-center">
                      <div className={`w-20 h-20 mb-4 flex items-center justify-center rounded-full ${isDark ? 'bg-[#3a3b3c]/40' : 'bg-gray-100'}`}>
                        <MagnifyingGlassIcon className={`w-10 h-10 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'}`} />
                      </div>
                      <h3 className={`text-base font-bold mb-1 ${isDark ? 'text-[#e4e6eb]' : 'text-gray-800'}`}>
                        No Records Found
                      </h3>
                      <p className={`text-xs text-center max-w-xs ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
                        No data matches your current search or filter criteria.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((user) => {
                  // Work Item #3: formatName(user) resolves across
                  // admin_profile / student_profile / alumni_profile
                  // automatically (see utils/formatters.js) — needed now
                  // that rows can be a Student or Alumni base identity,
                  // not just an Admin.
                  const fullName = formatName(user) || "—";
                  // Break-glass eligibility is tied to the account's own,
                  // PRIMARY Super Admin identity — mirrors
                  // SetLocalPasswordRequest's server-side check on the
                  // target's raw role_id, not any secondary grant.
                  const isBaseSuperAdmin = user.base_role_id === 4;
                  const grantRoleName = ROLE_MAP[user.admin_grant?.role_id] || `Role ${user.admin_grant?.role_id ?? "—"}`;
                  const policy = getUserPolicy(user);

                  return (
                    <tr key={user.user_id} className={`border-b text-center transition-colors ${isDark ? 'border-[#3e4042] hover:bg-[#2a2a2f]' : 'border-gray-50 hover:bg-gray-50'}`}>
                      <td className={`px-4 py-3 ${isDark ? 'text-[#e4e6eb]' : 'text-gray-800'}`}>
                        {fullName}
                      </td>
                      <td className={`px-4 py-3 ${isDark ? 'text-[#e4e6eb]' : 'text-gray-800'}`}>
                        {user.email}
                      </td>
                      {/* Base identity badge — who this account fundamentally
                        is (Student/Alumni/Admin/Super Admin). */}
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap capitalize ${getIdentityBadgeClasses(isDark)}`}>
                          {user.base_role_name || `Role ${user.base_role_id}`}
                        </span>
                      </td>
                      {/* Administrative role granted */}
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${getRoleBadgeClasses(grantRoleName, isDark)}`}>
                          {grantRoleName}
                        </span>
                      </td>
                      {/* Policy in effect for the administrative grant above —
                        NOT the same as base identity, see getUserPolicy(). */}
                      <td className="px-6 py-4 text-center">
                        {user.admin_grant?.role_id === 4 ? (
                          <span className={`text-[13px] font-semibold ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                            Full Access
                          </span>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${user.admin_grant?.policy
                              ? (isDark ? 'bg-[#0f213d] text-[#5c93e6] border-[#1e3a66]' : 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]')
                              : (isDark ? 'bg-[#3a3b3c] text-[#b0b3b8] border-[#4e4f50]' : 'bg-gray-100 text-gray-500 border-gray-200')
                            }`}>
                            {policy}
                          </span>
                        )}
                      </td>
                      {/* Joined Date */}
                      <td className={`px-4 py-3 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
                        {formatDate(user.created_at)}
                      </td>
                      {/* Account status — login-eligibility (Activated/
                        Deactivated/...), intentionally separate from the
                        Admin Role badge's own grant status above. */}
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${getStatusBadgeClasses(user.status, isDark)}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-center">
                          {isBaseSuperAdmin && (
                            <button
                              onClick={() => handleOpenLocalAuth(user)}
                              title="Enable break-glass access"
                              className={`p-1 transition-colors ${isDark ? 'text-[#9a9a9a] hover:text-white' : 'text-gray-400 hover:text-pup-dark-maroon'}`}>
                              <KeyIcon className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedUserForRoles(user);
                              setOpenedFromPicker(false);
                            }}
                            title="Manage roles"
                            className={`p-1 transition-colors ${isDark ? 'text-[#9a9a9a] hover:text-white' : 'text-gray-400 hover:text-pup-dark-maroon'}`}>
                            <IdentificationIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setEditUser(user); setIsModalOpen(true); }}
                            className={`p-1 transition-colors ${isDark ? 'text-[#9a9a9a] hover:text-white' : 'text-gray-400 hover:text-pup-dark-maroon'}`}>
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={`flex items-center justify-center gap-1 px-4 py-4 border-t ${isDark ? 'border-[#3e4042]' : 'border-gray-100'}`}>
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
            className={`flex items-center gap-1 text-sm px-2 py-1 disabled:opacity-40 ${isDark ? 'text-[#b0b3b8] hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>
            <ChevronLeftIcon className="w-4 h-4" /> Previous
          </button>
          {pageNumbers().map((p, i) => (
            <button key={i} onClick={() => typeof p === "number" && setCurrentPage(p)} disabled={p === "..."}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors
                ${safePage === p
                  ? (isDark ? 'bg-yellow-400 text-gray-900 font-bold' : 'bg-pup-dark-maroon text-white font-bold')
                  : (isDark ? 'text-[#b0b3b8] hover:bg-[#2a2a2f]' : 'text-gray-500 hover:bg-gray-100')}
                ${p === "..." ? "cursor-default pointer-events-none" : ""}`}>
              {p}
            </button>
          ))}
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
            className={`flex items-center gap-1 text-sm px-2 py-1 disabled:opacity-40 ${isDark ? 'text-[#b0b3b8] hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>
            Next <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>


      <UserModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditUser(null); }}
        onSubmit={handleSubmit}
        editData={editUser}
        submitting={submitting}
        systemPolicies={systemPolicies}
      />

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete User?"
        message={`This will permanently delete ${deleteTarget?.email}. This action cannot be undone.`}
        type="danger"
      />

      <LocalPasswordModal
        isOpen={isLocalPasswordModalOpen}
        onClose={() => { setIsLocalPasswordModalOpen(false); setSelectedUserForLocalAuth(null); }}
        onSubmit={handleSaveLocalPassword}
        user={selectedUserForLocalAuth}
        submitting={localAuthSubmitting}
      />

      <RoleAssignmentsModal
        isOpen={!!selectedUserForRoles}
        onClose={() => {
          setSelectedUserForRoles(null);
          setOpenedFromPicker(false);
        }}
        onBack={
          openedFromPicker
            ? () => {
              setSelectedUserForRoles(null);
              setIsGrantPickerOpen(true);
            }
            : undefined
        }
        user={selectedUserForRoles}
        systemPolicies={systemPolicies}
        onSuccess={setSuccessMsg}
        onError={setErrorMsg}
      />

      <GrantRoleUserPicker
        isOpen={isGrantPickerOpen}
        onClose={() => setIsGrantPickerOpen(false)}
        onSelect={(pickedUser) => {
          setIsGrantPickerOpen(false);
          setSelectedUserForRoles(pickedUser);
          setOpenedFromPicker(true);
        }}
      />

      <SuccessToast
        message={successMsg}
        onClose={() => setSuccessMsg("")}
      />

      <ErrorToast
        message={errorMsg}
        onClose={() => setErrorMsg("")}
      />
    </div>
  );
};

export default UserManagement;