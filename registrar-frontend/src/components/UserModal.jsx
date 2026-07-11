import { useState, useEffect } from "react";
import { XMarkIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import DropDown from "../components/DropDown";
import InputGroup from "../components/InputGroup";
import ErrorToast from "./ErrorToast";
import ConfirmationModal from "./ConfirmationModal";
import { useTheme } from "../context/ThemeContext";

// Only admin-level roles — Super Admin cannot create students/alumni
const ROLE_OPTIONS = ["Admin", "Super Admin"];
const STATUS_OPTIONS = ["Activated", "Deactivated"];

const ROLE_TO_ID = { "Admin": 3, "Super Admin": 4 };
const ID_TO_ROLE = { 3: "Admin", 4: "Super Admin" };

const EMPTY_FORM = {
  first_name: "",
  middle_name: "",
  last_name: "",
  suffix: "",
  email: "",
  password: "",
  role: "Admin",
  status: "Activated",
};

const UserModal = ({ isOpen, onClose, onSubmit, editData = null, submitting = false }) => {
  const isEdit = !!editData;
  const { isDark } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [localError, setLocalError] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    if (isEdit && editData) {
      const profile = editData.admin_profile || {};
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        first_name: profile.first_name || "",
        middle_name: profile.middle_name || "",
        last_name: profile.last_name || "",
        suffix: profile.suffix || "",
        email: editData.email || "",
        password: "",
        role: ID_TO_ROLE[editData.role_id] || "Admin",
        status: editData.status || "Activated",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setShowPassword(false);
  }, [editData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError("");

    if (isEdit && editData) {
      const profile = editData.admin_profile || {};
      const noChanges =
        form.first_name === (profile.first_name || "") &&
        form.middle_name === (profile.middle_name || "") &&
        form.last_name === (profile.last_name || "") &&
        form.suffix === (profile.suffix || "") &&
        form.email === (editData.email || "") &&
        form.role === (ID_TO_ROLE[editData.role_id] || "Admin") &&
        form.status === (editData.status || "Activated") &&
        !form.password;

      if (noChanges) {
        setLocalError("No changes were made.");
        return;
      }
    }
    // Build payload — map role name back to role_id for the API
    const payload = {
      email: form.email,
      role_id: ROLE_TO_ID[form.role],
      status: form.status,
      first_name: form.first_name,
      middle_name: form.middle_name || undefined,
      last_name: form.last_name,
      suffix: form.suffix || undefined,
    };

    // Only include password if it was filled in
    if (form.password) {
      payload.password = form.password;
    }

    onSubmit?.(payload, editData?.user_id);
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setShowPassword(false);
    setLocalError("");
    setConfirmClose(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[10000] modal-overlay-container flex justify-center items-center p-4">
        <div className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/70' : 'bg-black/50'}`} onClick={() => setConfirmClose(true)} />

        <div className={`relative rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100vh-32px)] overflow-hidden flex flex-col ${isDark ? 'bg-[#242526] border border-[#3e4042]' : 'bg-white'}`}>

          {/* Header */}
          <div className={`px-6 py-5 flex items-center justify-between ${isDark ? 'bg-[#2a2a2f] border-b border-[#3e4042]' : 'bg-pup-dark-maroon'}`}>
            <div>
              <h2 className="text-white font-bold text-lg uppercase tracking-wide">
                {isEdit ? "Edit User" : "Add New User"}
              </h2>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-[#b0b3b8]' : 'text-white/60'}`}>
                {isEdit ? "Update the user details below" : "Fill in the details below"}
              </p>
            </div>
            <button type="button" onClick={() => setConfirmClose(true)}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="h-1 w-full bg-linear-to-r from-[#FFD700] via-[#FFC72C] to-[#FFD700]" />

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className={`px-6 py-6 space-y-4 flex-1 overflow-y-auto ${isDark ? 'text-[#e4e6eb]' : ''}`}>

              {/* First & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <InputGroup label="First Name" name="first_name" value={form.first_name}
                  onChange={handleChange} placeholder="e.g. Juan" required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
                <InputGroup label="Last Name" name="last_name" value={form.last_name}
                  onChange={handleChange} placeholder="e.g. dela Cruz" required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
              </div>

              {/* Middle Name & Suffix */}
              <div className="grid grid-cols-2 gap-3">
                <InputGroup label="Middle Name" name="middle_name" value={form.middle_name}
                  onChange={handleChange} placeholder="e.g. Santos" labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
                <InputGroup label="Suffix" name="suffix" value={form.suffix}
                  onChange={handleChange} placeholder="e.g. Jr., Sr." labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
              </div>

              {/* Email */}
              <InputGroup label="Email" name="email" type="email" value={form.email}
                onChange={handleChange} placeholder="e.g. juan@pup.edu.ph" required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />

              {/* Password */}
              <div>
                <label className={`block text-sm mb-1.5 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}`}>
                  Password {!isEdit && <span className="text-red-400 ml-1">*</span>}
                  {isEdit && <span className={`text-xs ml-1 ${isDark ? 'text-[#9a9a9a]' : 'text-gray-400'}`}>(leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder={isEdit ? "Leave blank to keep current" : "Enter password"}
                    required={!isEdit}
                    className={`w-full px-3 py-3 rounded-lg text-sm shadow-sm transition-all duration-200 pr-10 focus:outline-none focus:ring-2 ${isDark ? 'bg-[#1f1f1f] text-[#e4e6eb] placeholder:text-[#9a9a9a] focus:ring-[#FFD700] border border-[#3e4042]' : 'bg-white text-gray-700 placeholder:text-gray-400 focus:ring-[#FFC72C]'}`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-[#9a9a9a] hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                    {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Role & Status */}
              <div className="grid grid-cols-2 gap-3">
                <DropDown label="Role" name="role" value={form.role}
                  onChange={handleChange} options={ROLE_OPTIONS} required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
                <DropDown label="Status" name="status" value={form.status}
                  onChange={handleChange} options={STATUS_OPTIONS} required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
              </div>

            </div>

            {/* Footer */}
            <div className={`px-6 pb-6 pt-2 flex items-center justify-end gap-3 border-t ${isDark ? 'border-[#3e4042]' : 'border-gray-100'}`}>
              <button type="button" onClick={() => setConfirmClose(true)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${isDark ? 'text-[#b0b3b8] hover:bg-[#2a2a2f]' : 'text-gray-600 hover:bg-gray-100'}`}>
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all shadow disabled:opacity-60 ${isDark ? 'bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539] border border-[#3e4042]' : 'bg-pup-dark-maroon text-white hover:bg-[#3a0303]'}`}>
                {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add User"}
              </button>
            </div>
          </form>
        </div>
        <ConfirmationModal
          isOpen={confirmClose}
          onClose={() => setConfirmClose(false)}
          onConfirm={handleClose}
          title="Discard Changes?"
          message="Are you sure you want to close? Any unsaved changes will be lost."
          type="confirm"
        />
      </div>
      <ErrorToast message={localError} onClose={() => setLocalError("")} />
    </>
  );
};

export default UserModal;