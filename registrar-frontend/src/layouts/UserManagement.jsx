import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from "@heroicons/react/24/outline";
import DropDown from '../components/DropDown';
import VoiceSearchInput from "../components/VoiceSearchInput.jsx";
import UserModal from "../components/UserModal";
import ConfirmationModal from "../components/ConfirmationModal";
import { getSystemUsers, getPolicies, attachUserPolicy } from "../services/api";
import SuccessToast from "../components/SuccessToast.jsx";
import ErrorToast from "../components/ErrorToast.jsx";
import { useTheme } from "../context/ThemeContext";
import { UserTableSkeleton } from '../components/LoadingSkeleton';
import PolicyModal from "../components/PolicyModal";
import DashboardDropdown from "../components/DashboardDropdown.jsx";

/**
 * UserManagement — User Management: Policy Attachment
 * -----------------------------------------------------
 * "Policy attached" and "Access" columns show each admin's real,
 * server-persisted policy (users.policy_id — see PolicyService and
 * SystemUserController::attachPolicy()). The "Attach policy" modal
 * (PolicyModal) now saves through PATCH /system-users/{id}/policy
 * instead of localStorage.
 */
const ROLE_MAP     = { 3: "Admin", 4: "Super Admin" };
const ROLE_FILTERS = ["All", "Admin", "Super Admin"];
const DATE_OPTIONS = ["Newest", "Oldest"];
const STATUS_FILTERS = ["All", "Activated", "Deactivated"];
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

const getStatusBadgeClasses = (status, isDark) => {
  const normalized = String(status ?? "").trim().toLowerCase();

  if (isDark) {
    return normalized === 'activated'
      ? 'bg-green-900/20 text-green-400 border-green-600'
      : 'bg-gray-700/20 text-gray-300 border-gray-400';
  }

  return normalized === 'activated'
    ? 'bg-green-100 text-green-700 border-green-200'
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

  // Manage Access states
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [selectedUserForAccess, setSelectedUserForAccess] = useState(null);
  const [accessSubmitting, setAccessSubmitting] = useState(false);

  // Policies come from the backend now (policies table via GET /policies).
  const [systemPolicies, setSystemPolicies] = useState([]);

  // -------------------------------------------------------
  // Policy resolver — reads the real attachment straight off the
  // user record (user.policy / user.policy_id), no more guessing.
  // -------------------------------------------------------
  const getUserPolicy = useCallback((user) => {
    if (user.role_id === 4) return "Full Access";
    return user.policy?.name || "No policy attached";
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
      const roleName = ROLE_MAP[u.role_id] || "";
      const fullName = [u.admin_profile?.first_name, u.admin_profile?.last_name].filter(Boolean).join(" ");
      const matchSearch =
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        roleName.toLowerCase().includes(search.toLowerCase()) ||
        fullName.toLowerCase().includes(search.toLowerCase());
      const matchRole   = roleFilter   === "All" || roleName  === roleFilter;
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

  const pageNumbers = () => {
    if (totalPages <= 6) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [1, 2, 3];
    if (safePage > 4) pages.push("...");
    if (safePage > 3 && safePage < totalPages - 2) pages.push(safePage);
    pages.push("...", totalPages - 1, totalPages);
    return [...new Set(pages)];
  };

  // -------------------------------------------------------
  // Manage Access action handlers
  // -------------------------------------------------------
  const handleOpenAccess = (user) => {
    setSelectedUserForAccess(user);
    fetchPolicies();
    setIsAccessModalOpen(true);
  };

  const handleSaveAccess = async (selectedPolicyName) => {
    if (!selectedUserForAccess) return;
    setAccessSubmitting(true);
    setErrorMsg("");
    try {
      const policy = systemPolicies.find(p => p.name === selectedPolicyName);
      const { data: updatedUser } = await attachUserPolicy(
        selectedUserForAccess.user_id,
        policy ? policy.policy_id : null
      );

      // Reflect the server response immediately without a full refetch.
      setUsers(prev => prev.map(u => u.user_id === updatedUser.user_id ? updatedUser : u));

      setSuccessMsg("Policy attached successfully.");
      setIsAccessModalOpen(false);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to attach policy.");
    } finally {
      setAccessSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col font-sans">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex-1 min-w-0 sm:max-w-xs">
          <VoiceSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              handleFilterChange();
            }}
            placeholder="Search"
          />
        </div>

        {/* Clear Filters button */}
        {(roleFilter !== 'All' || statusFilter !== 'All' || dateOrder !== 'Newest' || search.trim() !== '') && (
          <button
            type="button"
            onClick={() => {
              setRoleFilter('All');
              setStatusFilter('All');
              setDateOrder('Newest');
              setSearch('');
            }}
            className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold transition-colors border shadow-sm flex items-center justify-center shrink-0
              ${isDark
                ? 'bg-[#1f1f1f] text-[#b0b3b8] border-[#3e4042] hover:bg-[#2a2a2f] hover:text-[#e4e6eb]'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
              }`}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-[#242526] border border-[#3e4042] shadow-none' : 'bg-white shadow-sm border border-gray-100'}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-190 text-sm">
          <thead>
            <tr className={isDark ? 'border-b border-[#3e4042]' : 'border-b border-gray-100'}>
              <th className={`px-4 py-3 text-center font-medium ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>Name</th>
              <th className={`px-4 py-3 text-center font-medium ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>Email</th>
              
              {/* Role Filter dropdown */}
              <th className="px-4 py-3 text-center">
                <DashboardDropdown
                  isOpen={roleDropdownOpen}
                  setIsOpen={setRoleDropdownOpen}
                  dropdownRef={roleDropdownRef}
                  align="center"
                  trigger={
                    <span className={roleFilter !== 'All' ? (isDark ? 'text-yellow-400' : 'text-[#8b0000]') : (isDark ? 'text-[#b0b3b8]' : 'text-gray-500')}>
                      Role
                    </span>
                  }
                  sections={[
                    {
                      title: 'Filter by Role',
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

              {/* Status Filter dropdown */}
              <th className="px-4 py-3 text-center">
                <DashboardDropdown
                  isOpen={statusDropdownOpen}
                  setIsOpen={setStatusDropdownOpen}
                  dropdownRef={statusDropdownRef}
                  align="center"
                  trigger={
                    <span className={statusFilter !== 'All' ? (isDark ? 'text-yellow-400' : 'text-[#8b0000]') : (isDark ? 'text-[#b0b3b8]' : 'text-gray-500')}>
                      Status
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
              <th className={`px-4 py-3 text-center font-medium ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>Access</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <UserTableSkeleton isDark={isDark} count={10} />            
            ) : paginated.length === 0 ? (
            <tr>
                <td colSpan={7} className="py-24">
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
                const profile = user.admin_profile;
                const fullName = profile
                  ? [profile.first_name, profile.last_name].filter(Boolean).join(" ")
                  : "—";
                const isSuperAdmin = user.role_id === 4;
                const policy = getUserPolicy(user);

                return (
                  <tr key={user.user_id} className={`border-b text-center transition-colors ${isDark ? 'border-[#3e4042] hover:bg-[#2a2a2f]' : 'border-gray-50 hover:bg-gray-50'}`}>
                    <td className={`px-4 py-3 ${isDark ? 'text-[#e4e6eb]' : 'text-gray-800'}`}>
                      {fullName}
                    </td>
                    <td className={`px-4 py-3 ${isDark ? 'text-[#e4e6eb]' : 'text-gray-800'}`}>
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${getRoleBadgeClasses(ROLE_MAP[user.role_id] || `Role ${user.role_id}`, isDark)}`}>
                        {ROLE_MAP[user.role_id] || `Role ${user.role_id}`}
                      </span>
                    </td>
                    {/* Policy attached badge */}
                    <td className="px-6 py-4 text-center">
                      {isSuperAdmin ? (
                        <span className={`text-[13px] font-semibold ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                          Full Access
                        </span>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                          user.policy_id
                            ? (isDark ? 'bg-[#0f213d] text-[#5c93e6]' : 'bg-[#e0f2fe] text-[#0369a1]')
                            : (isDark ? 'bg-[#3a3b3c] text-[#b0b3b8]' : 'bg-gray-100 text-gray-500')
                          }`}>
                            {policy}
                       </span>
                      )}
                    </td>
                    {/* Joined Date */}
                    <td className={`px-4 py-3 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
                      {formatDate(user.created_at)}
                    </td>
                    {/* Status */}
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${getStatusBadgeClasses(user.status, isDark)}`}>
                        {user.status}
                      </span>
                    </td>
                  {/* Access Column */}
                    <td className="px-6 py-4 text-center">
                      {isSuperAdmin ? (
                        <span className={`text-xs font-semibold ${isDark ? 'text-[#8c8a85]' : 'text-gray-400'}`}>
                          Not editable
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenAccess(user)}
                          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer whitespace-nowrap ${
                            isDark 
                              ? 'border-gray-600 hover:bg-white/10 text-white' 
                              : 'border-gray-350 hover:bg-gray-50 bg-gray-100 text-gray-700'
                          }`}
                        >
                          Manage Access
                        </button>
                      )}
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
                ${safePage === p ? 'bg-yellow-400 text-white' : (isDark ? 'text-[#b0b3b8] hover:bg-[#2a2a2f]' : 'text-gray-500 hover:bg-gray-100')}
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

      <PolicyModal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        onSave={handleSaveAccess}
        user={selectedUserForAccess}
        systemPolicies={systemPolicies}
        currentPolicy={selectedUserForAccess ? getUserPolicy(selectedUserForAccess) : ""}
        submitting={accessSubmitting}
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