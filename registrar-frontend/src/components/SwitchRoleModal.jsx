import React from 'react';
import { ShieldCheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

const SwitchRoleModal = ({
  isOpen,
  onClose,
  switchableRoles = [],
  currentRoleId,
  isSwitching = false,
  onSwitchRole,
  userEmail = '',
  isDark = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-99999 flex items-center justify-center p-4">
      <div className={`relative rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden ${
        isDark ? 'bg-[#242526] border border-[#3e4042] text-[#e4e6eb]' : 'bg-white text-gray-900 border border-gray-200'
      }`}>
        <div className={`px-6 py-5 flex items-center justify-between rounded-t-2xl shrink-0 ${
          isDark ? 'bg-[#2a2a2f] border-b border-[#3e4042] text-[#e4e6eb]' : 'bg-pup-dark-maroon text-white'
        }`}>
          <div className="flex items-center gap-2 text-left">
            <ShieldCheckIcon className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <h2 className="font-bold text-base uppercase tracking-wide">Switch Role</h2>
              <p className={`text-[10px] ${isDark ? 'text-[#b0b3b8]' : 'text-white/60'}`}>
                {userEmail}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer ${
              isDark ? 'text-gray-400 hover:text-white' : 'text-white/80 hover:text-white'
            }`}
            aria-label="Close modal"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-4">
          <p className={`text-xs ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'} leading-relaxed`}>
            Your account has multiple roles assigned. Please select the role context for your current session.
          </p>

          <div className="w-full space-y-3">
            {switchableRoles.map((roleOption) => {
              const isSelected = currentRoleId === roleOption.role_id;
              const RoleIcon = roleOption.icon;
              return (
                <button
                  key={roleOption.role_id}
                  type="button"
                  disabled={isSwitching}
                  onClick={() => onSwitchRole(roleOption.role_id)}
                  className={`w-full text-left flex items-center justify-between p-3.5 border rounded-xl transition-all duration-200 group cursor-pointer active:scale-98 shadow-xs disabled:opacity-60 disabled:cursor-wait ${
                    isSelected
                      ? (isDark
                        ? "bg-red-955/20 border-red-500/40 text-white font-bold"
                        : "bg-red-50 border-red-200 text-pup-maroon font-bold")
                      : (isDark
                        ? "bg-[#18191a] border-[#3e4042] hover:bg-[#2c2d30] hover:border-gray-500 text-[#e4e6eb]"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300 text-gray-800")
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-200 bg-linear-to-tr ${roleOption.grad} text-white shrink-0`}>
                      <RoleIcon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className={`font-bold text-sm transition-colors ${
                        isSelected
                          ? (isDark ? "text-red-400" : "text-pup-maroon")
                          : (isDark ? "text-white group-hover:text-amber-400" : "text-gray-900 group-hover:text-pup-maroon")
                      }`}>
                        {roleOption.label}
                      </span>
                      <span className={`text-[11px] ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
                        {roleOption.description}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-red-600 text-white border border-red-500">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="w-full pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`w-full px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                isDark
                  ? 'text-[#e4e6eb] bg-[#3a3b3c] hover:bg-[#4e4f50] border border-[#4e4f50]'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwitchRoleModal;
