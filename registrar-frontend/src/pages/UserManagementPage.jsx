import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import UserManagement from "../layouts/UserManagement";
import PolicyManagement from "../layouts/PolicyManagement";
import AccessRequestsQueue from "../layouts/AccessRequestsQueue";

const UserManagementPage = () => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState("accounts"); // "accounts" | "policies" | "access-requests"

  const tabs = [
    { key: "accounts", label: "Accounts" },
    { key: "policies", label: "Policy Management" },
    { key: "access-requests", label: "Access Requests" },
  ];

  return (
    <div className={`font-sans ${isDark ? 'text-[#e4e6eb]' : ''}`}>

      {/* Tab Switcher Navigation (Outside the container card) */}
      <div className="flex justify-center mx-4 sm:mx-6 mb-5">
        <div className={`inline-flex px-8 py-3.5 rounded-full transition-all duration-300 hover:-translate-y-0.5 ${isDark
          ? 'bg-[#242526] border border-[#3e4042] shadow-[0_2px_8px_rgba(0,0,0,0.2)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.35)]'
          : 'bg-white border border-gray-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]'
          } gap-8 items-center`}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`text-sm relative rounded-full flex items-center justify-center shrink-0 font-semibold transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap ${activeTab === tab.key
                ? isDark
                  ? "text-yellow-400 font-bold"
                  : "text-pup-dark-maroon font-black"
                : isDark
                  ? "text-[#b0b3b8] hover:text-white"
                  : "text-gray-500 hover:text-gray-900"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Container for Subviews */}
      <div className={`rounded-2xl p-4 sm:p-6 ${isDark ? 'bg-[#242526] text-[#e4e6eb] border border-[#3e4042]' : 'bg-white text-gray-900 shadow-md border border-gray-200/80'
        }`}>
        {activeTab === "accounts" && <UserManagement />}
        {activeTab === "policies" && <PolicyManagement />}
        {activeTab === "access-requests" && <AccessRequestsQueue />}
      </div>

    </div>
  );
};

export default UserManagementPage;