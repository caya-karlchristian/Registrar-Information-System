import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import { useTheme } from "../context/ThemeContext";
import risImage from "../assets/RIS1.png";
import {
  ShieldCheckIcon,
  ChevronRightIcon,
  BriefcaseIcon,
  UserIcon
} from "@heroicons/react/24/outline";

const AccessControlPage = () => {
  const navigate = useNavigate();
  const { user, switchRoleOverride, activeRoleOverride } = useAuth();
  const { isDark } = useTheme();

  // If there's no logged-in user, redirect to landing
  React.useEffect(() => {
    if (!user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const roles = [
    {
      id: "admin",
      label: "Admin",
      description: "Registrar Staff",
      icon: BriefcaseIcon,
      grad: "from-[#0052d4] to-[#4364f7]"
    },
    {
      id: "student",
      label: "Student",
      description: "Student Member",
      icon: UserIcon,
      grad: "from-[#11998e] to-[#38ef7d]"
    },
  ];

  const handleSelectRole = (roleId) => {
    switchRoleOverride(roleId);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans">
      {/* Background Image */}
      <img
        src={risImage}
        alt="PUP Campus"
        className="absolute inset-0 w-full h-full object-cover scale-105"
      />
      {/* Dynamic Overlay with Blur */}
      <div className={`absolute inset-0 transition-colors duration-300 ${isDark ? 'bg-black/75' : 'bg-[#800000]/65'
        } backdrop-blur-xs`} />

      {/* Switch Role Card Container */}
      <div className={`relative z-10 w-full max-w-lg mx-4 rounded-3xl shadow-2xl p-8 flex flex-col items-center animate-fadeIn border transition-all duration-300 ${isDark
          ? 'bg-[#242526] border-[#3e4042] text-[#e4e6eb]'
          : 'bg-white text-gray-900 border-gray-200'
        }`}>

        {/* Shield Icon Header */}
        <div className={`w-16 h-16 rounded-full border flex items-center justify-center mb-5 transition-colors ${isDark ? 'bg-red-950/40 border-red-500/30 text-amber-500' : 'bg-red-50 border-red-200 text-red-600'
          }`}>
          <ShieldCheckIcon className="w-9 h-9" />
        </div>

        <h1 className={`text-3xl font-extrabold tracking-wide mb-2 text-center transition-colors ${isDark ? 'text-[#FFC72C]' : 'text-pup-maroon'
          }`}>
          Switch Role
        </h1>
        <p className={`text-sm text-center max-w-sm leading-relaxed mb-8 transition-colors ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'
          }`}>
          Your account has multiple roles assigned. Please select the role context for your current session.
        </p>

        {/* Roles List */}
        <div className="w-full space-y-4">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = activeRoleOverride === role.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => handleSelectRole(role.id)}
                className={`w-full text-left flex items-center justify-between p-4 border rounded-2xl transition-all duration-200 group cursor-pointer active:scale-98 shadow-xs ${isSelected
                    ? (isDark
                      ? "bg-red-950/20 border-red-500/40 text-white font-bold"
                      : "bg-red-50 border-red-200 text-pup-maroon font-bold")
                    : (isDark
                      ? "bg-[#18191a] border-[#3e4042] hover:bg-[#2c2d30] hover:border-gray-500 text-[#e4e6eb]"
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300 text-gray-800")
                  }`}
              >
                <div className="flex items-center gap-4">
                  {/* Left Circle Icon */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-200 bg-linear-to-tr ${role.grad} text-white shrink-0`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  {/* Text labels */}
                  <div className="flex flex-col">
                    <span className={`font-bold text-base transition-colors ${isSelected
                        ? (isDark ? "text-red-400" : "text-pup-maroon")
                        : (isDark ? "text-white group-hover:text-amber-400" : "text-gray-900 group-hover:text-pup-maroon")
                      }`}>
                      {role.label}
                    </span>
                    <span className={`text-xs ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
                      {role.description}
                    </span>
                  </div>
                </div>
                {/* Right Area */}
                {isSelected ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-600 text-white border border-red-500">
                    Active
                  </span>
                ) : (
                  <ChevronRightIcon className={`w-5 h-5 transition-all duration-200 ${isDark ? 'text-gray-500 group-hover:text-white group-hover:translate-x-1' : 'text-gray-400 group-hover:text-pup-maroon group-hover:translate-x-1'
                    }`} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AccessControlPage;
