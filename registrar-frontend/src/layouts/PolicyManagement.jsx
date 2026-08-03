/**
 * PolicyManagement — Admin Permission Policies
 * -----------------------------------------------------
 * Policies come straight from the backend (policies table) — see
 * PolicyController and PolicyResource. "is_system" (returned per
 * policy) drives which rows can be deleted; system-managed policies
 * are rejected by the backend (422) and filtered out client-side
 * before the delete request is sent. Bulk delete goes through a
 * confirmation modal before calling deletePolicy() for each
 * selected custom policy.
 */
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../context/ThemeContext";
import { 
  PlusIcon, 
  XMarkIcon
} from "@heroicons/react/24/outline";
import { getSystemUsers, getPolicies, createPolicy, updatePolicy, deletePolicy } from "../services/api";
import MultiSelection from "../components/MultiSelection";
import SuccessToast from "../components/SuccessToast.jsx";
import ErrorToast from "../components/ErrorToast.jsx";
import ConfirmationModal from "../components/ConfirmationModal";
import { PolicyTableSkeleton } from "../components/LoadingSkeleton";
import VoiceSearchInput from "../components/VoiceSearchInput.jsx";

const MODULE_OPTIONS = [
  "Dashboard",
  "Inbox",
  "Admin Analytics",
  "Admin Logbook",
  "Admin Profile",
  "Access Requests"
];

const LABEL_TO_KEY = {
  "Dashboard": "dashboard",
  "Inbox": "inbox",
  "Admin Analytics": "analytics",
  "Admin Logbook": "logbook",
  "Admin Profile": "profile",
  "Access Requests": "access_requests"
};

const KEY_TO_LABEL = {
  "dashboard": "Dashboard",
  "inbox": "Inbox",
  "analytics": "Admin Analytics",
  "logbook": "Admin Logbook",
  "profile": "Admin Profile",
  "access_requests": "Access Requests"
};

const PolicyManagement = () => {
  const { isDark } = useTheme();
  const [search, setSearch] = useState("");

  // Policies now come straight from the backend (policies table) —
  // shape per row: { policy_id, name, is_system, type, permissions,
  // permissions_label, admins_count, created_at, updated_at }.
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);

  const [users, setUsers] = useState([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg]       = useState("");

  // Table selection (multi-selection) & pagination state
  const [selectedPolicyIndices, setSelectedPolicyIndices] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 5;

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPolicyIndex, setEditingPolicyIndex] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [policyName, setPolicyName] = useState("");
  const [selectedModuleValues, setSelectedModuleValues] = useState([]);

  // Admin list modal
  const [isAdminListOpen, setIsAdminListOpen] = useState(false);
  const [selectedPolicyForAdmins, setSelectedPolicyForAdmins] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch policies from the backend
  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPolicies();
      setPolicies(res.data.data || []);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load policies.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch users so we can show real "attached admins" per policy
  const fetchUsers = useCallback(async () => {
    try {
      const res = await getSystemUsers();
      setUsers(res.data.data || []);
    } catch (err) {
      console.warn("Failed to load users for policy assignment count:", err);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
    fetchUsers();
  }, [fetchPolicies, fetchUsers]);

  // Reset pagination/selections on filter change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedPolicyIndices([]);
  }, [search]);

  // A policy is "attached" to an admin when user.policy_id matches —
  // this is the real, server-persisted attachment (see users.policy_id
  // and SystemUserController::attachPolicy()), not a name-based guess.
  const getAssignedAdmins = useCallback((policy) => {
    return users.filter(user => user.role_id === 3 && user.policy_id === policy.policy_id);
  }, [users]);

  // Generate rawPermissions object from selected module labels
  const buildPermissions = (selectedLabels) => {
    const raw = {};
    Object.entries(LABEL_TO_KEY).forEach(([label, key]) => {
      raw[key] = selectedLabels.includes(label) ? ["Access"] : [];
    });
    return raw;
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

    // Map permissions object back to selectedModuleValues
    const labels = [];
    Object.entries(p.permissions || {}).forEach(([key, val]) => {
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

  const handleDeleteSelected = () => {
    if (selectedPolicyIndices.length === 0) return;

    const selectedPolicies = selectedPolicyIndices.map(idx => policies[idx]).filter(Boolean);
    const customSelected = selectedPolicies.filter(p => !p.is_system);

    if (customSelected.length === 0) {
      setErrorMsg("System-managed policies cannot be deleted.");
      return;
    }

    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    const selectedPolicies = selectedPolicyIndices.map(idx => policies[idx]).filter(Boolean);
    const systemSelected = selectedPolicies.filter(p => p.is_system);
    const customSelected = selectedPolicies.filter(p => !p.is_system);

    try {
      // The backend rejects deletion of is_system policies (422), so only
      // custom ones are sent — matches the guard already shown in the UI.
      await Promise.all(customSelected.map(p => deletePolicy(p.policy_id)));

      if (systemSelected.length > 0) {
        setSuccessMsg(`Deleted ${customSelected.length} custom policy/policies. System-managed policies were preserved.`);
      } else {
        setSuccessMsg(`Successfully deleted ${customSelected.length} policy/policies.`);
      }

      setSelectedPolicyIndices([]);
      await fetchPolicies();
      await fetchUsers();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to delete policy/policies.");
    }
  };

  const handleSavePolicy = async (e) => {
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

    const permissions = buildPermissions(selectedModuleValues);
    setSubmitting(true);

    try {
      if (isEditMode) {
        const policyId = policies[editingPolicyIndex].policy_id;
        await updatePolicy(policyId, { name: policyName.trim(), permissions });
        setSuccessMsg("Policy updated successfully.");
      } else {
        await createPolicy({ name: policyName.trim(), permissions });
        setSuccessMsg("Policy created successfully.");
      }

      setIsModalOpen(false);
      await fetchPolicies();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to save policy.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAdminList = (policy) => {
    setSelectedPolicyForAdmins(policy);
    setIsAdminListOpen(true);
  };

  // Filter policies based on Search
  const filteredPolicies = policies.filter((p) => {
    return p.name.toLowerCase().includes(search.toLowerCase()) ||
           (p.permissions_label || "").toLowerCase().includes(search.toLowerCase());
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
            onClick={handleDeleteSelected}
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
            <div className="w-full sm:max-w-md">
              <VoiceSearchInput
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setCurrentPage(1);
                }}
                placeholder="Search"
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
          <table className="w-full min-w-200 text-sm">
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
              {loading ? (
                <PolicyTableSkeleton isDark={isDark} count={PER_PAGE} />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    No policies found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((policy, idx) => {
                  const admins = getAssignedAdmins(policy);
                  const usedAsText = admins.length > 0 
                    ? `Permissions policy (${admins.length})` 
                    : "None";

                  const globalIdx = (safePage - 1) * PER_PAGE + idx;

                  return (
                    <tr 
                      key={policy.policy_id}
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
                        {policy.type}
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
                        {policy.permissions_label}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/70' : 'bg-black/50'}`} 
            onClick={() => setIsModalOpen(false)} 
          />
          <div className={`relative rounded-2xl shadow-2xl w-full max-w-2xl mx-auto flex flex-col overflow-visible ${isDark ? 'bg-[#242526] border border-[#3e4042]' : 'bg-white'}`}>
            
            {/* Header */}
            <div className={`px-6 py-5 flex items-center justify-between rounded-t-2xl shrink-0 ${isDark ? 'bg-[#2a2a2f] border-b border-[#3e4042]' : 'bg-pup-dark-maroon text-white'}`}>
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
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="h-1 w-full shrink-0 bg-linear-to-r from-[#FFD700] via-[#FFC72C] to-[#FFD700]" />

            <form onSubmit={handleSavePolicy} noValidate className="flex flex-col overflow-visible">
              <div className="p-6 space-y-5 overflow-visible">
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

                  <div className="mt-1 relative overflow-visible">
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
              <div className={`px-6 pb-6 pt-4 flex items-center justify-end gap-3 border-t shrink-0 rounded-b-2xl ${isDark ? 'border-[#3e4042]' : 'border-gray-100'}`}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                    isDark ? 'text-[#b0b3b8] hover:bg-[#2a2a2f]' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all shadow disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                    isDark 
                      ? 'bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539] border border-[#3e4042]' 
                      : 'bg-pup-dark-maroon text-white hover:bg-[#3a0303]'
                  }`}
                >
                  {submitting ? "Saving..." : (isEditMode ? "Save Changes" : "Save Policy")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Assignment Details Modal */}
      {isAdminListOpen && selectedPolicyForAdmins && (
        <div className="fixed inset-0 z-10000 modal-overlay-container flex items-center justify-center p-4">
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
              {getAssignedAdmins(selectedPolicyForAdmins).length === 0 ? (
                <div className={`text-center py-6 text-sm ${isDark ? 'text-gray-400' : 'text-gray-505'}`}>
                  No admins currently assigned to this policy.
                </div>
              ) : (
                <div className="space-y-3">
                  {getAssignedAdmins(selectedPolicyForAdmins).map((user) => {
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