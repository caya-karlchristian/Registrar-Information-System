import { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import DropDown from '../components/DropDown';
import UserModal from "../components/UserModal";
import ConfirmationModal from "../components/ConfirmationModal";
import { getSystemUsers, createSystemUser, updateSystemUser, deleteSystemUser } from "../services/API";

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

const UserManagement = () => {
  const [search, setSearch]           = useState("");
  const [roleFilter, setRoleFilter]   = useState("All");
  const [dateOrder, setDateOrder]     = useState("Newest");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected]       = useState([]);

  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);

  const [editUser, setEditUser]       = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting]   = useState(false);

  // -------------------------------------------------------
  // Fetch users
  // -------------------------------------------------------
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSystemUsers();
      setUsers(res.data.data);
    } catch {
      setError("Failed to load users.");
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
      } else {
        await createSystemUser(formData);
      }
      await fetchUsers();
      setIsModalOpen(false);
      setEditUser(null);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save user.";
      alert(msg);
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
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to delete user.";
      alert(msg);
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
    <div className="bg-[#F5F5F5] min-h-screen font-sans">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">

        <div className="flex items-center gap-4 mt-6 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm flex-1 min-w-[180px] max-w-xs">
          <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search email or role..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
            className="outline-none bg-transparent text-sm text-gray-700 w-full placeholder-gray-400"
          />
        </div>

        <div className="w-40">
          <DropDown label="Role" name="roleFilter"
            value={roleFilter === "All" ? "" : roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value || "All"); handleFilterChange(); }}
            options={ROLE_FILTERS} labelColor="text-gray-700"
          />
        </div>

        <div className="w-40">
          <DropDown label="Status" name="statusFilter"
            value={statusFilter === "All" ? "" : statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value || "All"); handleFilterChange(); }}
            options={STATUS_FILTERS} labelColor="text-gray-700"
          />
        </div>

        <div className="w-36">
          <DropDown label="Date" name="dateOrder"
            value={dateOrder}
            onChange={(e) => { setDateOrder(e.target.value); handleFilterChange(); }}
            options={DATE_OPTIONS} labelColor="text-gray-700"
          />
        </div>

        <button
          onClick={() => { setEditUser(null); setIsModalOpen(true); }}
          className="ml-auto mt-6 flex items-center gap-2 bg-pup-dark-maroon text-white px-5 py-2 rounded-full text-sm font-semibold shadow hover:bg-[#3a0303] transition-all"
        >
          Add User <PlusIcon className="w-4 h-4" />
        </button>
      </div>

      {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 text-left w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleAll}
                  className="rounded border-gray-300 accent-pup-dark-maroon" />
              </th>
              {["Name", "Email", "Role", "Joined Date", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-center text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm">Loading...</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm">No users found.</td></tr>
            ) : (
              paginated.map((user) => {
                const profile = user.admin_profile;
                const fullName = profile
                  ? [profile.first_name, profile.last_name].filter(Boolean).join(" ")
                  : "—";
                return (
                  <tr key={user.user_id} className="border-b text-center border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.includes(user.user_id)}
                        onChange={() => toggleOne(user.user_id)}
                        className="rounded border-gray-300 accent-pup-dark-maroon" />
                    </td>
                    <td className="px-4 py-3 text-gray-800">{fullName}</td>
                    <td className="px-4 py-3 text-gray-800">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-50 text-pup-dark-maroon">
                        {ROLE_MAP[user.role_id] || `Role ${user.role_id}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold
                        ${user.status === "Activated" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-center">
                        <button onClick={() => { setEditUser(user); setIsModalOpen(true); }}
                          className="p-1 hover:text-pup-dark-maroon text-gray-400 transition-colors">
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(user)}
                          className="p-1 hover:text-red-600 text-gray-400 transition-colors">
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

        {/* Pagination */}
        <div className="flex items-center justify-center gap-1 px-4 py-4 border-t border-gray-100">
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 px-2 py-1 disabled:opacity-40">
            <ChevronLeftIcon className="w-4 h-4" /> Previous
          </button>
          {pageNumbers().map((p, i) => (
            <button key={i} onClick={() => typeof p === "number" && setCurrentPage(p)} disabled={p === "..."}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors
                ${safePage === p ? "bg-yellow-400 text-white" : "text-gray-500 hover:bg-gray-100"}
                ${p === "..." ? "cursor-default pointer-events-none" : ""}`}>
              {p}
            </button>
          ))}
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 px-2 py-1 disabled:opacity-40">
            Next <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="mt-3 text-xs text-gray-500">
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
    </div>
  );
};

export default UserManagement;