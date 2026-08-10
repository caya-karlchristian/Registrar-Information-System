import { useState, useEffect, useRef } from "react";
import { XMarkIcon, MagnifyingGlassIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../context/ThemeContext";
import { searchGrantableUsers } from "../services/api";

/**
 * GrantRoleUserPicker — search-as-you-type lookup across ALL roles
 * (Student/Alumni/Admin/Super Admin), used as the entry point into
 * RoleAssignmentsModal's existing grant form.
 *
 * Deliberately its own small modal rather than widening
 * UserManagement.jsx's table: that table is a paginated roster of
 * admin/super-admin accounts (SystemUserController::index() explicitly
 * excludes students/alumni — see its docblock), built for dozens of
 * accounts, not a directory of every student in the school. This talks
 * to GET /role-assignments/search-users instead, a narrow, capped,
 * indexed typeahead — same pattern as "add a reviewer" / "assign to"
 * pickers elsewhere.
 */

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

const useDebounce = (value, delay) => {
  const [debounced, setDebounced] = useState(value);
  const timeoutRef = useRef(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeoutRef.current);
  }, [value, delay]);

  return debounced;
};

const GrantRoleUserPicker = ({ isOpen, onClose, onSelect }) => {
  const { isDark } = useTheme();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setError("");
      setHasSearched(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const term = debouncedQuery.trim();

    if (term.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setError("");
      setHasSearched(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    searchGrantableUsers(term)
      .then((res) => {
        if (cancelled) return;
        setResults(res.data?.data || []);
        setHasSearched(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.message || "Search failed. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-10000 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 backdrop-blur-sm ${isDark ? "bg-black/70" : "bg-black/50"}`}
        onClick={onClose}
      />
      <div
        className={`relative rounded-2xl shadow-2xl w-full max-w-lg mx-auto max-h-[80vh] flex flex-col overflow-hidden ${
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
            <UserPlusIcon className="w-5 h-5 shrink-0" />
            <div>
              <h2 className="font-bold text-lg uppercase tracking-wide">Grant a Role</h2>
              <p className={`text-xs mt-0.5 ${isDark ? "text-[#b0b3b8]" : "text-white/60"}`}>
                Find any student, alumni, or admin account
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="h-1 w-full bg-linear-to-r from-[#FFD700] via-[#FFC72C] to-[#FFD700] shrink-0" />

        <div className="px-6 py-4 shrink-0">
          <div className="relative">
            <MagnifyingGlassIcon
              className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? "text-[#9a9a9a]" : "text-gray-400"}`}
            />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email..."
              className={`w-full pl-9 pr-3 py-2.5 rounded-lg text-sm border outline-none focus:ring-2 ${
                isDark
                  ? "bg-[#1f1f1f] text-[#e4e6eb] border-[#3e4042] focus:ring-[#FFD700]"
                  : "bg-white text-gray-700 border-gray-300 focus:ring-[#FFC72C]"
              }`}
            />
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto px-6 pb-5 space-y-2 ${isDark ? "text-[#e4e6eb]" : ""}`}>
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-xs font-semibold">
              {error}
            </div>
          )}

          {query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH && (
            <p className={`text-sm text-center py-6 ${isDark ? "text-[#9a9a9a]" : "text-gray-400"}`}>
              Keep typing — at least {MIN_QUERY_LENGTH} characters.
            </p>
          )}

          {loading && (
            <p className={`text-sm text-center py-6 ${isDark ? "text-[#9a9a9a]" : "text-gray-400"}`}>
              Searching...
            </p>
          )}

          {!loading && hasSearched && results.length === 0 && (
            <p className={`text-sm text-center py-6 ${isDark ? "text-[#9a9a9a]" : "text-gray-400"}`}>
              No matching accounts found.
            </p>
          )}

          {!loading && results.map((u) => (
            <button
              key={u.user_id}
              type="button"
              onClick={() => onSelect(u)}
              className={`w-full text-left rounded-xl p-3.5 border transition-colors ${
                isDark
                  ? "border-[#3e4042] bg-[#1c1c1e] hover:bg-[#2a2a2f]"
                  : "border-gray-200 bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{u.full_name}</p>
                  <p className={`text-xs ${isDark ? "text-[#9a9a9a]" : "text-gray-500"}`}>{u.email}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                      isDark
                        ? "bg-[#2a2a2f] text-[#b0b3b8] border-[#3e4042]"
                        : "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  >
                    {u.role_name}
                  </span>
                  {(u.active_role_ids || []).includes(3) && u.role_id !== 3 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap bg-amber-100 text-amber-700 border-amber-200">
                      Already Admin
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GrantRoleUserPicker;
