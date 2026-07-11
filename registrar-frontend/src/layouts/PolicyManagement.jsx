/**
 * - Database storage to store system policies and assign them to admin users.
 * - API endpoints to fetch, create, edit, and delete custom policies (system-managed policies cannot be deleted).
 * - Middleware access checks to enforce authorized module scopes (Dashboard, Inbox, Analytics, Logbook, Profile) based on the user's policy.
 */
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../context/ThemeContext";
import { 
  PlusIcon, 
  XMarkIcon
} from "@heroicons/react/24/outline";
import { getSystemUsers } from "../services/api";
import MultiSelection from "../components/MultiSelection";
import SuccessToast from "../components/SuccessToast.jsx";
import ErrorToast from "../components/ErrorToast.jsx";
import ConfirmationModal from "../components/ConfirmationModal";

const DEFAULT_POLICIES = [
  {
    name: "Registrar Frontliner",
    permissions: "Dashboard, Inbox",
    rawPermissions: {
      dashboard: ["Access"],
      inbox: ["Access"],
      analytics: [],
      logbook: [],
      profile: []
    }
  },
  {
    name: "Certificate Reviewer",
    permissions: "Admin Analytics, Admin Logbook",
    rawPermissions: {
      dashboard: [],
      inbox: [],
      analytics: ["Access"],
      logbook: ["Access"],
      profile: []
    }
  }
];

const MODULE_OPTIONS = [
  "Dashboard",
  "Inbox",
  "Admin Analytics",
  "Admin Logbook",
  "Admin Profile"
];

const LABEL_TO_KEY = {
  "Dashboard": "dashboard",
  "Inbox": "inbox",
  "Admin Analytics": "analytics",
  "Admin Logbook": "logbook",
  "Admin Profile": "profile"
};

const KEY_TO_LABEL = {
  "dashboard": "Dashboard",
  "inbox": "Inbox",
  "analytics": "Admin Analytics",
  "logbook": "Admin Logbook",
  "profile": "Admin Profile"
};

const PolicyManagement = () => {
  const { isDark } = useTheme();
  const [search, setSearch] = useState("");
  
  const [policies, setPolicies] = useState(() => {
    try {
      const saved = localStorage.getItem("ris_system_policies");
      return saved ? JSON.parse(saved) : DEFAULT_POLICIES;
    } catch {
      return DEFAULT_POLICIES;
    }
  });

  const [users, setUsers] = useState([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg]       = useState("");

  // Table selection (multi-selection) & pagination state
  const [selectedPolicyIndices, setSelectedPolicyIndices] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 10;

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPolicyIndex, setEditingPolicyIndex] = useState(null);
  
  // Form fields
  const [policyName, setPolicyName] = useState("");
  const [selectedModuleValues, setSelectedModuleValues] = useState([]);

  // Admin list modal
  const [isAdminListOpen, setIsAdminListOpen] = useState(false);
  const [selectedPolicyForAdmins, setSelectedPolicyForAdmins] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch users to count assignments
  const fetchUsers = useCallback(async () => {
    try {
      const res = await getSystemUsers();
      setUsers(res.data.data || []);
    } catch (err) {
      console.warn("Failed to load users for policy assignment count:", err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset pagination/selections on filter change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedPolicyIndices([]);
  }, [search]);

  const getUserPolicy = useCallback((user) => {
    if (user.role_id === 4) return "Full access — no policy";
    try {
      const saved = localStorage.getItem("ris_user_policies");
      const userPolicies = saved ? JSON.parse(saved) : {};
      return userPolicies[user.user_id] || getDefaultPolicy(user);
    } catch {
      return getDefaultPolicy(user);
    }
  }, []);

  const getDefaultPolicy = (user) => {
    const email = user.email?.toLowerCase() || "";
    const profile = user.admin_profile;
    const fullName = profile
      ? [profile.first_name, profile.last_name].filter(Boolean).join(" ").toLowerCase()
      : "";
    if (fullName.includes("sigmund") || email.includes("sigmund")) return "Registrar Frontliner";
    if (fullName.includes("mhel") || email.includes("mhel")) return "Certificate Reviewer";
    return "Registrar Frontliner";
  };

  const getAssignedAdmins = useCallback((policyName) => {
    return users.filter(user => user.role_id === 3 && getUserPolicy(user) === policyName);
  }, [users, getUserPolicy]);

  const getPolicyType = (policy) => {
    return DEFAULT_POLICIES.some(p => p.name === policy.name) ? "System managed" : "Custom policy";
  };

  const savePoliciesToStorage = (updated) => {
    setPolicies(updated);
    localStorage.setItem("ris_system_policies", JSON.stringify(updated));
  };

  // Generate descriptive permissions string
  const formatPermissionsString = (raw) => {
    const parts = [];
    if (raw.dashboard && raw.dashboard.length > 0) parts.push("Dashboard");
    if (raw.inbox && raw.inbox.length > 0) parts.push("Inbox");
    if (raw.analytics && raw.analytics.length > 0) parts.push("Admin Analytics");
    if (raw.logbook && raw.logbook.length > 0) parts.push("Admin Logbook");
    if (raw.profile && raw.profile.length > 0) parts.push("Admin Profile");
    return parts.length > 0 ? parts.join(", ") : "No permissions assigned";
  };

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setPolicyName("");
    setSelectedModuleValues([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (index) => {
    setIsEditMode(true);
    setEditingPolicyIndex(index);
    const p = policies[index];
    setPolicyName(p.name);
    
    // Map rawPermissions object back to selectedModuleValues
    const labels = [];
    Object.entries(p.rawPermissions || {}).forEach(([key, val]) => {
      if (val && val.length > 0) {
        const label = KEY_TO_LABEL[key];
        if (label) labels.push(label);
      }
    });

    setSelectedModuleValues(labels);
    setIsModalOpen(true);
  };

  const handleToggleSelectRow = (index) => {
    if (selectedPolicyIndices.includes(index)) {
      setSelectedPolicyIndices(selectedPolicyIndices.filter(i => i !== index));
    } else {
      setSelectedPolicyIndices([...selectedPolicyIndices, index]);
    }
  };

  const handleDeleteClick = () => {
    if (selectedPolicyIndices.length === 0) return;

    const selectedPolicies = selectedPolicyIndices.map(idx => policies[idx]).filter(Boolean);
    const defaultSelected = selectedPolicies.filter(p => DEFAULT_POLICIES.some(dp => dp.name === p.name));
    const customSelected = selectedPolicies.filter(p => !DEFAULT_POLICIES.some(dp => dp.name === p.name));

    if (defaultSelected.length > 0 && customSelected.length === 0) {
      setErrorMsg("System-managed policies cannot be deleted.");
      return;
    }

    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    const selectedPolicies = selectedPolicyIndices.map(idx => policies[idx]).filter(Boolean);
    const defaultSelected = selectedPolicies.filter(p => DEFAULT_POLICIES.some(dp => dp.name === p.name));
    const customSelected = selectedPolicies.filter(p => !DEFAULT_POLICIES.some(dp => dp.name === p.name));

    const updated = policies.filter(p => !customSelected.some(cs => cs.name === p.name));
    savePoliciesToStorage(updated);
    setSelectedPolicyIndices([]);
    setShowDeleteConfirm(false);

    if (defaultSelected.length > 0) {
      setSuccessMsg(`Deleted ${customSelected.length} custom policy/policies. System-managed policies were preserved.`);
    } else {
      setSuccessMsg(`Successfully deleted ${customSelected.length} policy/policies.`);
    }
  };

  const handleSavePolicy = (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!policyName.trim()) {
      setErrorMsg("Policy name is required.");
      return;
    }

    if (selectedModuleValues.length === 0) {
      setErrorMsg("Please select at least one module.");
      return;
    }

    const rawPermissions = {
      dashboard: selectedModuleValues.includes("Dashboard") ? ["Access"] : [],
      inbox: selectedModuleValues.includes("Inbox") ? ["Access"] : [],
      analytics: selectedModuleValues.includes("Admin Analytics") ? ["Access"] : [],
      logbook: selectedModuleValues.includes("Admin Logbook") ? ["Access"] : [],
      profile: selectedModuleValues.includes("Admin Profile") ? ["Access"] : []
    };

    const permissionsStr = formatPermissionsString(rawPermissions);
    const newPolicy = {
      name: policyName.trim(),
      permissions: permissionsStr,
      rawPermissions
    };

    let updatedPolicies = [...policies];
    if (isEditMode) {
      updatedPolicies[editingPolicyIndex] = newPolicy;
      setSuccessMsg("Policy updated successfully.");
    } else {
      if (policies.some(p => p.name.toLowerCase() === policyName.trim().toLowerCase())) {
        setErrorMsg("A policy with this name already exists.");
        return;
      }
      updatedPolicies.push(newPolicy);
      setSuccessMsg("Policy created successfully.");
    }

    savePoliciesToStorage(updatedPolicies);
    setIsModalOpen(false);
  };

  const handleOpenAdminList = (policy) => {
    setSelectedPolicyForAdmins(policy);
    setIsAdminListOpen(true);
  };

  // Filter policies based on Search
  const filteredPolicies = policies.filter((p) => {
    return p.name.toLowerCase().includes(search.toLowerCase()) ||
           p.permissions.toLowerCase().includes(search.toLowerCase());
  });

  const totalPages = Math.max(1, Math.ceil(filteredPolicies.length / PER_PAGE));
  const safePage   = Math.min(currentPage, totalPages);
  const paginated  = filteredPolicies.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  return (
    <div className="w-full flex flex-col font-sans">
      
      {/* Title & Top button toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Admin Policies <span className={`text-sm font-semibold ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>({policies.length})</span>
            </h1>
          </div>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-455' : 'text-gray-500'}`}>
            A policy is an object that defines module permissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
          {/* Delete Action button */}
          <button
            disabled={selectedPolicyIndices.length === 0}
            onClick={handleDeleteClick}
            className={`px-4 py-2 border rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isDark ? 'border-gray-700 bg-[#2a2a2f] text-white hover:bg-white/10' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Delete
          </button>

          {/* Create policy Button */}
          <button
            onClick={handleOpenCreate}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold shadow transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              isDark ? 'bg-yellow-400 text-black hover:bg-yellow-500' : 'bg-pup-dark-maroon text-white hover:bg-[#3a0303]'
            }`}
          >
            Create policy
          </button>
        </div>
      </div>      {/* Main Container */}
      <div className={`rounded-xl overflow-hidden border mt-4 ${
        isDark ? 'bg-[#242526] border-[#3e4042]' : 'bg-white border-gray-200 shadow-sm'
      }`}>
        {/* Search & pagination bar inside container */}
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b ${
          isDark ? 'border-[#3e4042] bg-[#1a1a1c]/20' : 'border-gray-200 bg-gray-50/50'
        }`}>
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative w-full sm:max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className={`w-full pl-9 pr-4 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 ${
                  isDark 
                    ? 'bg-[#1f1f1f] border-[#3e4042] text-white placeholder-gray-550 focus:ring-[#FFD700]' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[#FFC72C]'
                }`}
              />
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-3 ml-auto sm:ml-0">
            <div className={`flex items-center text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 disabled:opacity-40 cursor-pointer font-bold"
              >
                &lt;
              </button>
              <span className="mx-2 font-semibold text-xs">{currentPage} of {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 disabled:opacity-40 cursor-pointer font-bold"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>

        {/* Table element inside container */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className={`border-b text-xs font-bold uppercase tracking-wider ${
                isDark ? 'border-[#3e4042] text-[#a09e9a]' : 'border-gray-200 text-gray-500'
              }`}>
                {/* Checkbox column header */}
                <th className="w-12 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={paginated.length > 0 && paginated.every((_, i) => {
                      const globalIdx = (safePage - 1) * PER_PAGE + i;
                      return selectedPolicyIndices.includes(globalIdx);
                    })}
                    onChange={(e) => {
                      const pageIndices = paginated.map((_, i) => (safePage - 1) * PER_PAGE + i);
                      if (e.target.checked) {
                        const newSelection = [...new Set([...selectedPolicyIndices, ...pageIndices])];
                        setSelectedPolicyIndices(newSelection);
                      } else {
                        setSelectedPolicyIndices(selectedPolicyIndices.filter(idx => !pageIndices.includes(idx)));
                      }
                    }}
                    className="accent-red-500 rounded cursor-pointer w-4 h-4"
                  />
                </th>
                <th className="w-10 px-2 py-3 text-center"></th>
                <th className="px-4 py-3 text-left">Policy name</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Used as</th>
                <th className="px-4 py-3 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    No policies found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((policy, idx) => {
                  const type = getPolicyType(policy);
                  const admins = getAssignedAdmins(policy.name);
                  const usedAsText = admins.length > 0 
                    ? `Permissions policy (${admins.length})` 
                    : "None";

                  const globalIdx = (safePage - 1) * PER_PAGE + idx;

                  return (
                    <tr 
                      key={idx}
                      className={`border-b last:border-0 transition-colors ${
                        isDark 
                          ? 'border-[#3e4042] hover:bg-[#2a2a2f]' 
                          : 'border-gray-100 hover:bg-gray-50'
                      } ${selectedPolicyIndices.includes(globalIdx) ? (isDark ? 'bg-yellow-400/5' : 'bg-[#800000]/5') : ''}`}
                    >
                      {/* Checkbox Select cell */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center">
                          <input 
                            type="checkbox"
                            checked={selectedPolicyIndices.includes(globalIdx)}
                            onChange={() => handleToggleSelectRow(globalIdx)}
                            className="accent-red-500 rounded cursor-pointer w-4 h-4"
                          />
                        </div>
                      </td>

                      {/* Cube Block symbol */}
                      <td className="px-2 py-3 text-center">
                        <div className="flex items-center justify-center">
                          <svg className="w-5 h-5 text-orange-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M11 17a1 1 0 001.447.894l5-2.5A1 1 0 0018 14.5V9.632a1 1 0 00-.553-.894l-5-2.5A1 1 0 0011 7.132V17zM9 17V7.132a1 1 0 00-1.447-.894l-5 2.5A1 1 0 002 9.632v4.868a1 1 0 00.553.894l5 2.5A1 1 0 009 17zM10 2a1 1 0 00-.553.168l-7 4.5a1 1 0 000 1.664l7 4.5a1 1 0 001.106 0l7-4.5a1 1 0 000-1.664l-7-4.5A1 1 0 0010 2z"/>
                          </svg>
                        </div>
                      </td>

                      {/* Policy name hyperlink */}
                      <td className="px-4 py-3 font-semibold">
                        <button
                          onClick={() => handleOpenEdit(globalIdx)}
                          className="text-blue-400 hover:text-blue-300 font-semibold hover:underline text-left text-sm cursor-pointer"
                        >
                          {policy.name}
                        </button>
                      </td>

                      {/* Type */}
                      <td className={`px-4 py-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {type}
                      </td>

                      {/* Assigned admins count link */}
                      <td className="px-4 py-3">
                        {admins.length > 0 ? (
                          <button
                            onClick={() => handleOpenAdminList(policy)}
                            className="text-blue-400 hover:text-blue-300 font-semibold hover:underline text-left text-sm cursor-pointer"
                          >
                            {usedAsText}
                          </button>
                        ) : (
                          <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                            {usedAsText}
                          </span>
                        )}
                      </td>

                      {/* Description */}
                      <td className={`px-4 py-3 max-w-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {policy.permissions}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Policy Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-20 modal-overlay-container flex items-center justify-center">
          <div 
            className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/70' : 'bg-black/50'}`} 
            onClick={() => setIsModalOpen(false)} 
          />
          <div className={`relative rounded-2xl shadow-2xl w-full max-w-2xl mx-4 ${isDark ? 'bg-[#242526] border border-[#3e4042]' : 'bg-white'}`}>
            
            {/* Header */}
            <div className={`px-6 py-5 flex items-center justify-between rounded-t-2xl ${isDark ? 'bg-[#2a2a2f] border-b border-[#3e4042]' : 'bg-pup-dark-maroon text-white'}`}>
              <div>
                <h2 className="text-white font-bold text-lg uppercase tracking-wide">
                  {isEditMode ? "Edit Policy" : "Create Policy"}
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-[#b0b3b8]' : 'text-white/60'}`}>
                  Define a reusable set of module permissions, then attach it to any admin
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="h-1 w-full bg-linear-to-r from-[#FFD700] via-[#FFC72C] to-[#FFD700]" />

            <form onSubmit={handleSavePolicy}>
              <div className="p-6 space-y-5 overflow-visible min-h-[460px]">
                {/* Policy Name */}
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-[#b0b3b8]' : 'text-gray-655'} mb-1.5`}>
                    Policy Name
                  </label>
                  <input
                    type="text"
                    required
                    value={policyName}
                    onChange={(e) => setPolicyName(e.target.value)}
                    placeholder="e.g. Registrar Frontliner"
                    className={`w-full px-4 py-2.5 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 ${
                      isDark 
                        ? 'bg-[#1f1f1f] text-[#e4e6eb] placeholder-[#9a9a9a] focus:ring-[#FFD700] border border-[#3e4042]' 
                        : 'bg-white text-gray-700 placeholder-gray-400 focus:ring-[#FFC72C] border border-gray-300'
                    }`}
                  />
                </div>

                {/* Single module selection card with MultiSelectDropdown */}
                <div className={`p-4 rounded-xl border flex flex-col relative overflow-visible ${
                  isDark ? 'bg-[#1f1f1f] border-[#3e4042]' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Select a module</span>
                  </div>

                  <div className="mt-1">
                    <MultiSelection
                      name="policy-modules"
                      label=""
                      options={MODULE_OPTIONS}
                      selectedValues={selectedModuleValues}
                      onChange={(e) => setSelectedModuleValues(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className={`px-6 pb-6 pt-4 flex items-center justify-end gap-3 border-t rounded-b-2xl ${isDark ? 'border-[#3e4042]' : 'border-gray-100'}`}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isDark ? 'text-[#b0b3b8] hover:bg-[#2a2a2f]' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all shadow ${
                    isDark 
                      ? 'bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539] border border-[#3e4042]' 
                      : 'bg-pup-dark-maroon text-white hover:bg-[#3a0303]'
                  }`}
                >
                  {isEditMode ? "Save Changes" : "Save Policy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Assignment Details Modal */}
      {isAdminListOpen && selectedPolicyForAdmins && (
        <div className="fixed inset-0 z-20 modal-overlay-container flex items-center justify-center">
          <div 
            className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/70' : 'bg-black/50'}`} 
            onClick={() => setIsAdminListOpen(false)} 
          />
          <div className={`relative rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden ${isDark ? 'bg-[#242526] border border-[#3e4042]' : 'bg-white'}`}>
            
            {/* Header */}
            <div className={`px-6 py-5 flex items-center justify-between ${isDark ? 'bg-[#2a2a2f] border-b border-[#3e4042]' : 'bg-pup-dark-maroon text-white'}`}>
              <div>
                <h2 className="text-white font-bold text-lg uppercase tracking-wide">
                  Assigned Admins
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-[#b0b3b8]' : 'text-white/60'}`}>
                  Admins attached to {selectedPolicyForAdmins.name}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAdminListOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="h-1 w-full bg-linear-to-r from-[#FFD700] via-[#FFC72C] to-[#FFD700]" />

            <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
              {getAssignedAdmins(selectedPolicyForAdmins.name).length === 0 ? (
                <div className={`text-center py-6 text-sm ${isDark ? 'text-gray-400' : 'text-gray-505'}`}>
                  No admins currently assigned to this policy.
                </div>
              ) : (
                <div className="space-y-3">
                  {getAssignedAdmins(selectedPolicyForAdmins.name).map((user) => {
                    const fullName = user.admin_profile
                      ? [user.admin_profile.first_name, user.admin_profile.last_name].filter(Boolean).join(" ")
                      : "Unnamed Admin";
                    return (
                      <div 
                        key={user.user_id}
                        className={`p-3 rounded-lg border flex flex-col ${
                          isDark ? 'bg-[#1f1f1f] border-[#3e4042]' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {fullName}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {user.email}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`px-6 pb-6 pt-4 flex items-center justify-end border-t ${isDark ? 'border-[#3e4042]' : 'border-gray-100'}`}>
              <button 
                type="button" 
                onClick={() => setIsAdminListOpen(false)}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all shadow ${
                  isDark ? 'bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539] border border-[#3e4042]' : 'bg-pup-dark-maroon text-white hover:bg-[#3a0303]'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <SuccessToast 
        message={successMsg} 
        onClose={() => setSuccessMsg("")} 
      />

      <ErrorToast 
        message={errorMsg} 
        onClose={() => setErrorMsg("")} 
      />

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Selected Policies?"
        message="Are you sure you want to delete the selected policy/policies? This action cannot be undone."
        type="danger"
      />
    </div>
  );
};

export default PolicyManagement;