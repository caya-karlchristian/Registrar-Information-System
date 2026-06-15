import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import DropDown from '../components/DropDown';
import VoiceSearchInput from "../components/VoiceSearchInput.jsx";
import UserModal from "../components/UserModal";
import ConfirmationModal from "../components/ConfirmationModal";
import { getSystemUsers } from "../services/api";
import SuccessToast from "../components/SuccessToast.jsx";
import ErrorToast from "../components/ErrorToast.jsx";
import { useTheme } from "../context/ThemeContext";
import { UserTableSkeleton } from '../components/LoadingSkeleton';

const ROLE_MAP     = { 3: "Admin", 4: "Super Admin" };
const ROLE_FILTERS = ["All", "Admin", "Super Admin"];
const DATE_OPTIONS = ["Newest", "Oldest"];
const STATUS_FILTERS = ["All", "Activated", "Deactivated"];
const PER_PAGE = 10;

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
};

const getRoleBadgeClasses = (roleName, isDark) => {
  if (isDark) {
    return 'bg-[#3a2b2b]/20 text-[#ffb3b3] border-[#7a4b4b]';
  }
    return 'bg-red-50 text-red-400/60 border-red-200';
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

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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

  return (
    <div className={`font-sans items-center flex justify-center ${isDark ? 'bg-[#18191a] text-[#e4e6eb]' : 'bg-[#F5F5F5]'}`}>
      <div className="w-full max-w-6xl flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 mb-6">

        <div className="mt-4 sm:mt-6 flex-1 min-w-0 sm:min-w-45 sm:max-w-xs">
          <VoiceSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              handleFilterChange();
            }}
            placeholder="Search email or role..."
          />
        </div>

        <div className="w-full sm:w-40">
          <DropDown label="Role" name="roleFilter"
            value={roleFilter === "All" ? "" : roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value || "All"); handleFilterChange(); }}
            options={ROLE_FILTERS} labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-700'}
          />
        </div>

        <div className="w-full sm:w-40">
          <DropDown label="Status" name="statusFilter"
            value={statusFilter === "All" ? "" : statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value || "All"); handleFilterChange(); }}
            options={STATUS_FILTERS} labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-700'}
          />
        </div>

        <div className="w-full sm:w-36">
          <DropDown label="Date" name="dateOrder"
            value={dateOrder}
            onChange={(e) => { setDateOrder(e.target.value); handleFilterChange(); }}
            options={DATE_OPTIONS} labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-700'}
          />
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-[#242526] border border-[#3e4042] shadow-none' : 'bg-white shadow-sm border border-gray-100'}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-190 text-sm">
          <thead>
            <tr className={isDark ? 'border-b border-[#3e4042]' : 'border-b border-gray-100'}>
                {["Name", "Email", "Role", "Joined Date", "Status"].map((h) => (
                <th key={h} className={`px-4 py-3 text-center font-medium ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <UserTableSkeleton isDark={isDark} count={10} />            
            ) : paginated.length === 0 ? (
            <tr>
                <td colSpan={5} className="py-24">
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
                return (
                  <tr key={user.user_id} className={`border-b text-center transition-colors ${isDark ? 'border-[#3e4042] hover:bg-[#2a2a2f]' : 'border-gray-50 hover:bg-gray-50'}`}>
                    <td className={`px-4 py-3 ${isDark ? 'text-[#e4e6eb]' : 'text-gray-800'}`}>{fullName}</td>
                    <td className={`px-4 py-3 ${isDark ? 'text-[#e4e6eb]' : 'text-gray-800'}`}>{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${getRoleBadgeClasses(ROLE_MAP[user.role_id] || `Role ${user.role_id}`, isDark)}`}>
                        {ROLE_MAP[user.role_id] || `Role ${user.role_id}`}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${getStatusBadgeClasses(user.status, isDark)}`}>
                        {user.status}
                      </span>
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

      <SuccessToast 
        message={successMsg} 
        onClose={() => setSuccessMsg("")} 
      />

      <ErrorToast 
        message={errorMsg} 
        onClose={() => setErrorMsg("")} 
      />
    </div>
    </div>
  );
};

export default UserManagement;