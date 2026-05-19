import { useState, useEffect, useCallback } from "react";
import {
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import DropDown from '../components/DropDown';
import VoiceSearchInput from "../components/VoiceSearchInput.jsx";
import UserModal from "../components/UserModal";
import ConfirmationModal from "../components/ConfirmationModal";
import { getSystemUsers, createSystemUser, updateSystemUser, deleteSystemUser } from "../services/api";
import SuccessToast from "../components/SuccessToast.jsx";
import ErrorToast from "../components/ErrorToast.jsx";
import { useTheme } from "../context/ThemeContext";

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

  return 'bg-red-50 text-pup-dark-maroon border-red-200';
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
  const [selected, setSelected]       = useState([]);

  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [editUser, setEditUser]       = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting]   = useState(false);

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

  const allSelected =
    paginated.length > 0 &&
    paginated.every((u) => selected.includes(u.user_id));

  const toggleAll = () =>
    allSelected
      ? setSelected((s) => s.filter((id) => !paginated.map((u) => u.user_id).includes(id)))
      : setSelected((s) => [...new Set([...s, ...paginated.map((u) => u.user_id)])]);

  const toggleOne = (id) =>
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

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
      setSelected((s) => s.filter((id) => id !== deleteTarget.user_id));
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

  return (
    <div className={`min-h-screen font-sans px-4 sm:px-6 ${isDark ? 'bg-[#18191a] text-[#e4e6eb]' : 'bg-[#F5F5F5]'}`}>

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

        <button
          onClick={() => { setEditUser(null); setIsModalOpen(true); }}
          className={`sm:ml-auto mt-4 sm:mt-6 w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 rounded-full text-sm font-semibold shadow transition-all ${isDark ? 'bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539] border border-[#3e4042]' : 'bg-pup-dark-maroon text-white hover:bg-[#3a0303]'}`}
        >
          Add User <PlusIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-[#242526] border border-[#3e4042] shadow-none' : 'bg-white shadow-sm border border-gray-100'}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-190 text-sm">
          <thead>
            <tr className={isDark ? 'border-b border-[#3e4042]' : 'border-b border-gray-100'}>
              <th className="px-4 py-3 text-left w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleAll}
                  className={`rounded accent-pup-dark-maroon ${isDark ? 'border-[#4e4f50] bg-[#1f1f1f]' : 'border-gray-300'}`} />
              </th>
              {["Name", "Email", "Role", "Joined Date", "Status", "Actions"].map((h) => (
                <th key={h} className={`px-4 py-3 text-center font-medium ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className={`text-center py-16 text-sm ${isDark ? 'text-[#9a9a9a]' : 'text-gray-400'}`}>Loading...</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={7} className={`text-center py-16 text-sm ${isDark ? 'text-[#9a9a9a]' : 'text-gray-400'}`}>No users found.</td></tr>
            ) : (
              paginated.map((user) => {
                const profile = user.admin_profile;
                const fullName = profile
                  ? [profile.first_name, profile.last_name].filter(Boolean).join(" ")
                  : "—";
                return (
                  <tr key={user.user_id} className={`border-b text-center transition-colors ${isDark ? 'border-[#3e4042] hover:bg-[#2a2a2f]' : 'border-gray-50 hover:bg-gray-50'}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.includes(user.user_id)}
                        onChange={() => toggleOne(user.user_id)}
                        className={`rounded accent-pup-dark-maroon ${isDark ? 'border-[#4e4f50] bg-[#1f1f1f]' : 'border-gray-300'}`} />
                    </td>
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-center">
                        <button onClick={() => { setEditUser(user); setIsModalOpen(true); }}
                          className={`p-1 transition-colors ${isDark ? 'text-[#9a9a9a] hover:text-white' : 'text-gray-400 hover:text-pup-dark-maroon'}`}>
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(user)}
                          className={`p-1 transition-colors ${isDark ? 'text-[#9a9a9a] hover:text-red-300' : 'text-gray-400 hover:text-red-600'}`}>
                          <TrashIcon className="w-4 h-4" />
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

      {selected.length > 0 && (
        <div className={`mt-3 text-xs ${isDark ? 'text-[#9a9a9a]' : 'text-gray-500'}`}>
          {selected.length} user{selected.length > 1 ? "s" : ""} selected
        </div>
      )}

      <UserModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditUser(null); }}
        onSubmit={handleSubmit}
        editData={editUser}
        submitting={submitting}
      />

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete User?"
        message={`This will permanently delete ${deleteTarget?.email}. This action cannot be undone.`}
        type="danger"
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