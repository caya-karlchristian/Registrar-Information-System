import { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../context/ThemeContext";
import DropDown from "./DropDown";

const PolicyModal = ({
  isOpen,
  onClose,
  onSave,
  user,
  systemPolicies = [],
  currentPolicy = "",
  submitting = false,
}) => {
  const { isDark } = useTheme();
  const [selectedPolicy, setSelectedPolicy] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Find matches or fallback to the first system policy
      const initialPolicy = systemPolicies.some(p => p.name === currentPolicy)
        ? currentPolicy
        : (systemPolicies[0]?.name || "");
      setSelectedPolicy(initialPolicy);
    }
  }, [isOpen, currentPolicy, systemPolicies]);

  if (!isOpen || !user) return null;

  const fullName = [user.admin_profile?.first_name, user.admin_profile?.last_name]
    .filter(Boolean)
    .join(" ") || user.email;

  const handleSave = () => {
    onSave(selectedPolicy);
  };

  return (
    <div className="fixed inset-0 z-10000 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/70' : 'bg-black/50'}`}
        onClick={onClose}
      />
      <div
        className={`relative rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-visible ${
          isDark ? 'bg-[#242526] border border-[#3e4042]' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div
            className={`px-6 py-5 flex items-center justify-between rounded-t-2xl ${
            isDark ? 'bg-[#2a2a2f] border-b border-[#3e4042]' : 'bg-pup-dark-maroon text-white'
          }`}
        >
          <div>
            <h2 className="font-bold text-lg uppercase tracking-wide">
              Attach policy
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-[#b0b3b8]' : 'text-white/60'}`}>
              Choose which policy to attach to {fullName}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="h-1 w-full bg-linear-to-r from-[#FFD700] via-[#FFC72C] to-[#FFD700]" />

        <div className="p-6 space-y-4">
          {/* Select policy dropdown */}
          <DropDown
            label="Select policy to attach"
            name="policy"
            value={selectedPolicy}
            onChange={(e) => setSelectedPolicy(e.target.value)}
            options={systemPolicies.map((pol) => pol.name)}
            labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
          />
        </div>

        {/* Footer */}
        <div
          className={`px-6 pb-6 pt-4 flex items-center justify-end gap-3 border-t ${
            isDark ? 'border-[#3e4042]' : 'border-gray-100'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2 text-sm font-semibold transition-colors cursor-pointer ${
              isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow disabled:opacity-60 cursor-pointer ${
              isDark
                ? 'bg-yellow-400 text-black hover:bg-yellow-500'
                : 'bg-pup-dark-maroon text-white hover:bg-[#3a0303]'
            }`}
          >
            {submitting ? "Attaching..." : "Attach Policy"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PolicyModal;
