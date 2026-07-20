import { useState, useEffect } from "react";
import { XMarkIcon, EyeIcon, EyeSlashIcon, CheckIcon } from "@heroicons/react/24/outline";
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
  policy: "",
};

const generateSecurePassword = () => {
  const length = 12;
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const specials = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  
  const password = [
    uppercase[Math.floor(Math.random() * uppercase.length)],
    lowercase[Math.floor(Math.random() * lowercase.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    specials[Math.floor(Math.random() * specials.length)],
  ];
  
  const allChars = uppercase + lowercase + numbers + specials;
  for (let i = password.length; i < length; i++) {
    password.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }
  
  for (let i = password.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [password[i], password[j]] = [password[j], password[i]];
  }
  
  return password.join("");
};

const UserModal = ({ isOpen, onClose, onSubmit, editData = null, submitting = false, systemPolicies = [] }) => {
  const isEdit = !!editData;
  const { isDark } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [localError, setLocalError] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);

  const pwd = form.password;
  const isLengthMet = pwd.length >= 8;
  const hasUppercase = /[A-Z]/.test(pwd);
  const hasLowercase = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
  const isPasswordValid = isLengthMet && hasUppercase && hasLowercase && hasNumber && hasSpecial;

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
        // Editing an existing user's policy still goes through "Manage
        // Access" (PolicyModal) — this modal only sets it at creation time.
        policy: "",
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

  const hasChanges = () => {
    if (isEdit && editData) {
      const profile = editData.admin_profile || {};
      return (
        form.first_name !== (profile.first_name || "") ||
        form.middle_name !== (profile.middle_name || "") ||
        form.last_name !== (profile.last_name || "") ||
        form.suffix !== (profile.suffix || "") ||
        form.email !== (editData.email || "") ||
        form.role !== (ID_TO_ROLE[editData.role_id] || "Admin") ||
        form.status !== (editData.status || "Activated") ||
        form.password !== ""
      );
    }
    return (
      form.first_name !== "" ||
      form.middle_name !== "" ||
      form.last_name !== "" ||
      form.suffix !== "" ||
      form.email !== "" ||
      form.password !== "" ||
      form.role !== "Admin" ||
      form.status !== "Activated" ||
      form.policy !== ""
    );
  };

  const handleRequestClose = () => {
    if (hasChanges()) {
      setConfirmClose(true);
    } else {
      handleClose();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError("");

    const missingFields = [];
    if (!form.first_name.trim()) missingFields.push("First Name");
    if (!form.last_name.trim()) missingFields.push("Last Name");
    
    if (!isEdit) {
      if (!form.email.trim()) missingFields.push("Email");
      if (!form.password.trim()) {
        missingFields.push("Password");
      } else if (!isPasswordValid) {
        setLocalError("Password does not meet the minimum security requirements.");
        return;
      }
    }

    if (missingFields.length > 0) {
      setLocalError(`Please fill in all required fields: ${missingFields.join(", ")}.`);
      return;
    }

    if (isEdit && editData) {
      if (!hasChanges()) {
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

    // Policy attachment only applies to new admins (role_id 3) — super
    // admins always have full access, and editing an existing user's
    // policy goes through the separate "Manage Access" flow instead.
    if (!isEdit && form.role === "Admin" && form.policy) {
      const policy = systemPolicies.find((p) => p.name === form.policy);
      if (policy) payload.policy_id = policy.policy_id;
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
      <div className="fixed inset-0 z-9999 flex justify-center items-center p-4">
        <div className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/70' : 'bg-black/50'}`} onClick={handleRequestClose} />

        <div className={`relative rounded-2xl shadow-2xl w-full max-w-4xl max-h-[calc(100vh-32px)] overflow-hidden flex flex-col ${isDark ? 'bg-[#242526] border border-[#3e4042]' : 'bg-white'}`}>

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
            <button type="button" onClick={handleRequestClose}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="h-1 w-full bg-linear-to-r from-[#FFD700] via-[#FFC72C] to-[#FFD700]" />

          <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0">
            <div className={`px-6 py-6 space-y-4 flex-1 overflow-y-auto ${isDark ? 'text-[#e4e6eb]' : ''}`}>

              {/* Name Fields (First, Last, Middle, Suffix) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <InputGroup label="First Name" name="first_name" value={form.first_name}
                  onChange={handleChange} placeholder="e.g. Juan" required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
                <InputGroup label="Last Name" name="last_name" value={form.last_name}
                  onChange={handleChange} placeholder="e.g. dela Cruz" required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
                <InputGroup label="Middle Name" name="middle_name" value={form.middle_name}
                  onChange={handleChange} placeholder="e.g. Santos" labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
                <InputGroup label="Suffix" name="suffix" value={form.suffix}
                  onChange={handleChange} placeholder="e.g. Jr., Sr." labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
              </div>

              {/* Email & Password */}
              {!isEdit && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <InputGroup label="Email" name="email" type="email" value={form.email}
                    onChange={handleChange} placeholder="e.g. juan@pup.edu.ph" required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />

                  <div className="relative space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className={`block text-sm font-medium ${isDark ? 'text-[#e4e6eb]' : 'text-gray-600'}`}>
                        Password <span className={isDark ? 'text-[#FFC72C] ml-1' : 'text-red-400 ml-1'}>*</span>
                      </label>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setForm((prev) => ({ ...prev, password: generateSecurePassword() }))}
                        className="text-xs font-semibold hover:underline text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer"
                      >
                        Generate password
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        onFocus={() => setIsPasswordFocused(true)}
                        onBlur={() => setIsPasswordFocused(false)}
                        placeholder="Enter password"
                        required
                        className={`w-full px-3 py-3 rounded-lg text-sm shadow-sm transition-all duration-200 pr-10 focus:outline-none focus:ring-2 ${isDark ? 'bg-[#1f1f1f] text-[#e4e6eb] placeholder:text-[#9a9a9a] focus:ring-[#FFD700] border border-[#3e4042]' : 'bg-white text-gray-700 placeholder:text-gray-400 focus:ring-[#FFC72C]'}`}
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-[#9a9a9a] hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Floating Password Requirements Popover */}
                    {isPasswordFocused && (
                      <div className={`absolute top-full left-0 right-0 mt-2 z-50 p-3.5 rounded-xl shadow-2xl border space-y-2 transition-all duration-200 ${isDark ? 'bg-[#242526] border-[#3e4042] text-[#e4e6eb]' : 'bg-white border-gray-200 text-gray-700'}`}>
                        <p className={`text-xs font-semibold ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
                          Minimum requirements:
                        </p>
                        <ul className="space-y-1 text-xs">
                          {[
                            { label: "8 characters", met: isLengthMet },
                            { label: "1 uppercase letter", met: hasUppercase },
                            { label: "1 lowercase letter", met: hasLowercase },
                            { label: "1 number", met: hasNumber },
                            { label: "1 special character", met: hasSpecial },
                          ].map((req, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className={`flex items-center justify-center w-4 h-4 rounded-full transition-all duration-200 ${
                                req.met 
                                  ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' 
                                  : 'bg-gray-100 text-gray-400 dark:bg-[#2d2d2d] dark:text-gray-500'
                              }`}>
                                <CheckIcon className="w-3 h-3" strokeWidth={3} />
                              </span>
                              <span className={req.met ? 'text-green-600 dark:text-green-400 font-medium' : (isDark ? 'text-[#9a9a9a]' : 'text-gray-500')}>
                                {req.label}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Role & Status */}
              <div className="grid grid-cols-2 gap-3">
                <DropDown label="Role" name="role" value={form.role}
                  onChange={handleChange} options={ROLE_OPTIONS} required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
                <DropDown label="Status" name="status" value={form.status}
                  onChange={handleChange} options={STATUS_OPTIONS} required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
              </div>

              {/* Policy attachment — new admins only. Super admins have
                  full access by default, and existing admins already have
                  a dedicated "Manage Access" action for this. */}
              {!isEdit && form.role === "Admin" && (
                <div>
                  <DropDown
                    label="Attach Policy"
                    name="policy"
                    value={form.policy}
                    onChange={handleChange}
                    options={systemPolicies.map((p) => p.name)}
                    labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
                  />
                  <p className={`text-xs mt-1 ${isDark ? 'text-[#9a9a9a]' : 'text-gray-400'}`}>
                    Optional — determines which modules this admin can access. Leave blank to attach one later from Manage Access.
                  </p>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className={`px-6 pb-6 pt-2 flex items-center justify-end gap-3 border-t ${isDark ? 'border-[#3e4042]' : 'border-gray-100'}`}>
              <button type="button" onClick={handleRequestClose}
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