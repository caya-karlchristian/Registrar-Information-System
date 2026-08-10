import { useState, useEffect } from "react";
import { XMarkIcon, EyeIcon, EyeSlashIcon, CheckIcon, ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../context/ThemeContext";

/**
 * LocalPasswordModal
 * ===================
 * Superadmin-only action: enable/rotate break-glass (local bcrypt
 * fallback) access for a Super Admin account, via the existing
 * POST /api/auth/local-password endpoint (LocalAuthController::setPassword).
 *
 * Intentionally NOT reachable for Admin-role targets — UserManagement.jsx
 * only renders the row action that opens this modal when
 * user.role_id === SystemUser.ROLE_SUPER_ADMIN, matching the backend
 * restriction in SetLocalPasswordRequest (defense in depth, not the
 * only guard).
 */

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

const LocalPasswordModal = ({ isOpen, onClose, onSubmit, user, submitting = false }) => {
  const { isDark } = useTheme();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setError("");
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const isLengthMet = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = isLengthMet && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!isPasswordValid) {
      setError("Password does not meet the minimum security requirements.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    onSubmit(password, confirmPassword);
  };

  return (
    <div className="fixed inset-0 z-10000 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/70' : 'bg-black/50'}`}
        onClick={onClose}
      />
      <div className={`relative rounded-2xl shadow-2xl w-full max-w-md mx-auto ${isDark ? 'bg-[#242526] border border-[#3e4042]' : 'bg-white'}`}>
        {/* Header */}
        <div className={`px-6 py-5 flex items-center justify-between rounded-t-2xl ${isDark ? 'bg-[#2a2a2f] border-b border-[#3e4042]' : 'bg-pup-dark-maroon text-white'}`}>
          <div className="flex items-center gap-2">
            <ShieldExclamationIcon className="w-5 h-5" />
            <div>
              <h2 className="font-bold text-lg uppercase tracking-wide">Enable Break-Glass Access</h2>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-[#b0b3b8]' : 'text-white/60'}`}>
                {user.email}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={`px-6 py-6 space-y-4 ${isDark ? 'text-[#e4e6eb]' : ''}`}>
            <p className={`text-xs rounded-lg px-3 py-2 border ${isDark ? 'bg-[#1f1f1f] border-[#3e4042] text-[#b0b3b8]' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
              This sets a local bcrypt password this account can use to sign in
              directly if the IdP is ever unreachable. Only Super Admin
              accounts are eligible, and every use of this login path
              notifies Super Admins immediately.
            </p>

            <div className="relative space-y-1.5">
              <div className="flex items-center justify-between">
                <label className={`block text-sm font-medium ${isDark ? 'text-[#e4e6eb]' : 'text-gray-600'}`}>
                  New Local Password <span className={isDark ? 'text-[#FFC72C] ml-1' : 'text-red-400 ml-1'}>*</span>
                </label>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const generated = generateSecurePassword();
                    setPassword(generated);
                    setConfirmPassword(generated);
                  }}
                  className="text-xs font-semibold hover:underline text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer"
                >
                  Generate password
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  placeholder="Enter new local password"
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

              {isPasswordFocused && (
                <div className={`absolute top-full left-0 right-0 mt-2 z-50 p-3.5 rounded-xl shadow-2xl border space-y-2 ${isDark ? 'bg-[#242526] border-[#3e4042] text-[#e4e6eb]' : 'bg-white border-gray-200 text-gray-700'}`}>
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
                        <span className={`flex items-center justify-center w-4 h-4 rounded-full transition-all duration-200 ${req.met ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-[#2d2d2d] dark:text-gray-500'}`}>
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

            <div className="space-y-1.5">
              <label className={`block text-sm font-medium ${isDark ? 'text-[#e4e6eb]' : 'text-gray-600'}`}>
                Confirm Password <span className={isDark ? 'text-[#FFC72C] ml-1' : 'text-red-400 ml-1'}>*</span>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                className={`w-full px-3 py-3 rounded-lg text-sm shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 ${isDark ? 'bg-[#1f1f1f] text-[#e4e6eb] placeholder:text-[#9a9a9a] focus:ring-[#FFD700] border border-[#3e4042]' : 'bg-white text-gray-700 placeholder:text-gray-400 focus:ring-[#FFC72C]'}`}
              />
            </div>

            {error && (
              <p className="text-xs font-medium text-red-500">{error}</p>
            )}
          </div>

          <div className={`px-6 pb-6 pt-2 flex items-center justify-end gap-3 border-t ${isDark ? 'border-[#3e4042]' : 'border-gray-100'}`}>
            <button type="button" onClick={onClose}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${isDark ? 'text-[#b0b3b8] hover:bg-[#2a2a2f]' : 'text-gray-600 hover:bg-gray-100'}`}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all shadow disabled:opacity-60 ${isDark ? 'bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539] border border-[#3e4042]' : 'bg-pup-dark-maroon text-white hover:bg-[#3a0303]'}`}>
              {submitting ? "Saving..." : "Enable Break-Glass Access"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LocalPasswordModal;