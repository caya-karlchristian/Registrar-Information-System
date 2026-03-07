import { useState } from "react";
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

//REMOVE THIS LATER, JUST FOR DEMO PURPOSES
const ROLES = { 1: "Student", 2: "Alumni", 3: "Admin", 4: "Super Admin" };
const ROLE_FILTERS = ["All", "Student", "Alumni", "Admin", "Super Admin"];
const DATE_OPTIONS = ["Newest", "Oldest"];
const STATUS_FILTERS = ["All", "Activated", "Deactivated"];
const PER_PAGE = 10;

const MOCK_USERS = [
  { user_id: 1, email: "juan.delacruz@pup.edu.ph",   role_id: 1, created_at: "2024-01-12", status: "Activated" },
  { user_id: 2, email: "maria.santos@pup.edu.ph",    role_id: 2, created_at: "2023-05-03", status: "Activated" },
  { user_id: 3, email: "pedro.reyes@pup.edu.ph",     role_id: 3, created_at: "2022-08-15", status: "Deactivated" },
  { user_id: 4, email: "ana.gomez@pup.edu.ph",       role_id: 1, created_at: "2024-06-20", status: "Activated" },
  { user_id: 5, email: "carlos.bautista@pup.edu.ph", role_id: 2, created_at: "2021-09-01", status: "Deactivated" },
  { user_id: 6, email: "lisa.miranda@pup.edu.ph",    role_id: 1, created_at: "2024-02-18", status: "Activated" },
  { user_id: 7, email: "jose.cruz@pup.edu.ph",       role_id: 3, created_at: "2023-11-05", status: "Deactivated" },
  { user_id: 8, email: "nina.flores@pup.edu.ph",     role_id: 4, created_at: "2022-03-22", status: "Deactivated" },
  { user_id: 9, email: "mark.santos@pup.edu.ph",     role_id: 1, created_at: "2024-07-30", status: "Activated" },
  { user_id: 10, email: "grace.tan@pup.edu.ph",      role_id: 2, created_at: "2023-04-14", status: "Activated" },
];

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
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected]       = useState([]);
  const [statusFilter, setStatusFilter] = useState("Activated");
  const [editUser, setEditUser]       = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);


  const filtered = MOCK_USERS
    .filter((u) => {
      const roleName = ROLES[u.role_id] || "";
      const matchSearch =
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        roleName.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "All" || roleName === roleFilter;
      const matchStatus = statusFilter === "All" || u.status === statusFilter; 
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

  const pageNumbers = () => {
    if (totalPages <= 6) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [1, 2, 3];
    if (safePage > 4) pages.push("...");
    if (safePage > 3 && safePage < totalPages - 2) pages.push(safePage);
    pages.push("...", totalPages - 1, totalPages);
    return [...new Set(pages)];
  };

  return (
    <div className=" bg-[#F5F5F5] min-h-screen font-sans">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">

        {/* Search */}
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

        {/* Role Dropdown */}
        <div className="w-40">
          <DropDown
            label="Role"
            name="roleFilter"
            value={roleFilter === "All" ? "" : roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value || "All"); handleFilterChange(); }}
            options={ROLE_FILTERS}
            labelColor="text-gray-700"
          />
        </div>

        {/* Role Dropdown */}
        <div className="w-40">
          <DropDown
            label="Status"
            name="statusFilter"
            value={statusFilter === "All" ? "" : statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value || "All"); handleFilterChange(); }}
            options={STATUS_FILTERS}
            labelColor="text-gray-700"
          />
        </div>

        {/* Date Dropdown */}
        <div className="w-36">
          <DropDown
            label="Date"
            name="dateOrder"
            value={dateOrder}
            onChange={(e) => { setDateOrder(e.target.value); handleFilterChange(); }}
            options={DATE_OPTIONS}
            labelColor="text-gray-700"
          />
        </div>

        {/* Add User */}
        <button onClick={() => { setEditUser(null); setIsModalOpen(true); }} className="ml-auto mt-6 flex items-center gap-2 bg-pup-dark-maroon text-white px-5 py-2 rounded-full text-sm font-semibold shadow hover:bg-[#3a0303] transition-all">
          Add User <PlusIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 ">
              <th className="px-4 py-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-gray-300 accent-pup-dark-maroon"
                />
              </th>
              {["Email", "Role", "Joined Date", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-center text-gray-500 font-medium ">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-16 text-gray-400 text-sm">
                  No users found.
                </td>
              </tr>
            ) : (
              paginated.map((user) => (
                <tr key={user.user_id} className="border-b text-center border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(user.user_id)}
                      onChange={() => toggleOne(user.user_id)}
                      className="rounded border-gray-300 accent-pup-dark-maroon"
                    />
                  </td>
                  {/* <td className="px-4 py-3 text-gray-500 font-mono text-xs">{user.user_id}</td> */}
                  <td className="px-4 py-3 text-gray-800">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-50 text-pup-dark-maroon">
                      {ROLES[user.role_id] || `Role ${user.role_id}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3 text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.status === "Activated" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-center justify-center">
                      
                      <button onClick={() => { setEditUser(user); setIsModalOpen(true); }}
                        className="p-1 hover:text-pup-dark-maroon text-gray-400 transition-colors">
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button className="p-1 hover:text-red-600 text-gray-400 transition-colors">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-center gap-1 px-4 py-4 border-t border-gray-100">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 px-2 py-1 disabled:opacity-40"
          >
            <ChevronLeftIcon className="w-4 h-4" /> Previous
          </button>
          {pageNumbers().map((p, i) => (
            <button
              key={i}
              onClick={() => typeof p === "number" && setCurrentPage(p)}
              disabled={p === "..."}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors
                ${safePage === p ? "bg-yellow-400 text-white" : "text-gray-500 hover:bg-gray-100"}
                ${p === "..." ? "cursor-default pointer-events-none" : ""}`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 px-2 py-1 disabled:opacity-40"
          >
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
  onSubmit={(data, id) => console.log(id ? "Edit:" : "Add:", data)}
  editData={editUser}
/>
    </div>
  );
};

export default UserManagement;