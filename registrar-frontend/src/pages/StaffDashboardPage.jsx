import React, { useState } from 'react';
import StaffDashboard from '../layouts/StaffDashboard.jsx';
import ClaimScannerModal from '../components/ClaimScannerModal.jsx';
import { useTheme } from '../context/ThemeContext';
import { QueueListIcon, ArchiveBoxIcon, QrCodeIcon } from '@heroicons/react/24/outline';

const StaffDashboardPage = () => {
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'archived'
  const [scannerOpen, setScannerOpen] = useState(false);
  const { isDark } = useTheme();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-8">
      <div className={`rounded-2xl p-6 shadow-sm border ${
        isDark ? 'bg-[#242526] border-[#3e4042] text-[#e4e6eb]' : 'bg-white border-gray-200 text-gray-900'
      }`}>
        {/* Tab Navigation */}
        <div className={`flex justify-between items-center border-b mb-6 ${isDark ? 'border-[#3e4042]' : 'border-gray-200'}`}>
          <div className="flex">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-6 py-3 font-semibold text-sm transition-all relative border-b-2 -mb-0.5 focus:outline-none flex items-center gap-2 ${
                activeTab === 'active'
                  ? isDark
                    ? 'text-white border-white font-bold'
                    : 'text-gray-950 border-gray-955 font-bold'
                  : isDark
                  ? 'text-[#b0b3b8] border-transparent hover:text-white'
                  : 'text-gray-500 border-transparent hover:text-gray-900'
              }`}
            >
              <QueueListIcon className="w-5 h-5" />
              <span>Active requests</span>
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`px-6 py-3 font-semibold text-sm transition-all relative border-b-2 -mb-0.5 focus:outline-none flex items-center gap-2 ${
                activeTab === 'archived'
                  ? isDark
                    ? 'text-white border-white font-bold'
                    : 'text-gray-950 border-gray-955 font-bold'
                  : isDark
                  ? 'text-[#b0b3b8] border-transparent hover:text-white'
                  : 'text-gray-500 border-transparent hover:text-gray-900'
              }`}
            >
              <ArchiveBoxIcon className="w-5 h-5" />
              <span>Archived records</span>
            </button>
          </div>

          {/* Scan to Claim — only meaningful for the active-requests view;
              archived requests are read-only (see archive/restore logic
              elsewhere) and are never claimable. */}
          {activeTab === 'active' && (
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 mb-2 rounded-lg bg-pup-maroon text-white text-sm font-bold hover:bg-pup-dark-maroon transition-colors shadow-sm"
            >
              <QrCodeIcon className="w-5 h-5" />
              <span>Scan to Claim</span>
            </button>
          )}
        </div>

        {/* Dashboard View */}
        <StaffDashboard viewMode={activeTab} isEmbedded={true} />
      </div>

      <ClaimScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} />
    </div>
  );
};

export default StaffDashboardPage;