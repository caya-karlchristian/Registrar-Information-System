import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const LogbookDateRangeModal = ({
  isOpen,
  onClose,
  onConfirm,
  initialDateFrom = '',
  initialDateTo = '',
  initialActivePreset = '',
  isDark
}) => {
  const [start, setStart] = useState(initialDateFrom);
  const [end, setEnd] = useState(initialDateTo);
  const [activePreset, setActivePreset] = useState(initialActivePreset);
  const [errorMsg, setErrorMsg] = useState('');
  const pad2 = (val) => String(val).padStart(2, '0');
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;

  // Sync state with props when modal opens/reopens
  useEffect(() => {
    if (isOpen) {
      setStart(initialDateFrom);
      setEnd(initialDateTo);
      setActivePreset(initialActivePreset);
      setErrorMsg('');
    }
  }, [isOpen, initialDateFrom, initialDateTo, initialActivePreset]);

  if (!isOpen) return null;

  const applyPreset = (preset) => {
    const now = new Date();
    if (preset === 'annual') {
      const from = new Date(now);
      from.setFullYear(from.getFullYear() - 1);
      setStart(from.toISOString().slice(0, 10));
      setEnd(now.toISOString().slice(0, 10));
    } else if (preset === 'semi') {
      const from = new Date(now);
      from.setMonth(from.getMonth() - 6);
      setStart(from.toISOString().slice(0, 10));
      setEnd(now.toISOString().slice(0, 10));
    } else if (preset === 'month') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const m = String(month + 1).padStart(2, '0');
      setStart(`${year}-${m}-01`);
      const lastDay = String(new Date(year, month + 1, 0).getDate()).padStart(2, '0');
      setEnd(`${year}-${m}-${lastDay}`);
    } else {
      setStart('');
      setEnd('');
    }
    setActivePreset(preset);
  };

  const handleConfirm = () => {
    setErrorMsg('');
    if (start && end && start > end) {
      setErrorMsg('Start date cannot be after end date.');
      return;
    }
    if ((start && start > todayStr) || (end && end > todayStr)) {
      setErrorMsg('Selected dates cannot be in the future.');
      return;
    }
    onConfirm(start, end, activePreset);
  };

  const handleClear = () => {
    setStart('');
    setEnd('');
    setActivePreset('');
  };

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
        <div className={`relative z-50 w-full max-w-xl my-4 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] 
            overflow-y-auto border flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200 
            ${isDark ? 'bg-[#242526] border-[#3e4042] text-[#e4e6eb]' 
            : 'bg-white border-[#800000]/20 text-gray-900'}`}>        
        <div className={`px-6 py-5 border-b-4 shrink-0 ${isDark ? 'bg-[#1f1f1f] border-[#b98b00]' : 'bg-[#800000] border-[#FFD700]'}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-xl text-white font-black uppercase tracking-tighter">Filter by Date</h3>
            <button onClick={onClose} className="p-2 rounded hover:opacity-90 shrink-0">
              <XMarkIcon className={`w-6 h-6 ${isDark ? 'text-[#e4e6eb]' : 'text-white'}`} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className={`flex-1 overflow-y-auto px-6 py-6 space-y-6 ${isDark ? 'text-[#e4e6eb]' : 'text-[#4a0000]'}`}>
          {errorMsg && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <label className={`text-[10px] font-semibold uppercase tracking-widest ${isDark ? 'text-[#6b6c6e]' : 'text-gray-400'}`}>From</label>
              <input
                type="date"
                value={start}
                onChange={(e) => { setStart(e.target.value); setActivePreset(''); }}
                className={`text-xs px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-colors w-full ${isDark ? 'bg-[#2d2e30] border-[#4e4f50] text-[#e4e6eb] focus:ring-[#800000]/50' : 'bg-white border-gray-300 text-gray-700 focus:ring-[#800000]/30'}`}
                max={todayStr}
             />
            </div>
            <span className={`mb-2 text-xs font-medium ${isDark ? 'text-[#6b6c6e]' : 'text-gray-400'}`}>→</span>
            <div className="flex flex-col gap-1 flex-1">
              <label className={`text-[10px] font-semibold uppercase tracking-widest ${isDark ? 'text-[#6b6c6e]' : 'text-gray-400'}`}>To</label>
              <input
                type="date"
                value={end}
                onChange={(e) => { setEnd(e.target.value); setActivePreset(''); }}
                min={start || undefined}
                className={`text-xs px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-colors w-full ${isDark ? 'bg-[#2d2e30] border-[#4e4f50] text-[#e4e6eb] focus:ring-[#800000]/50' : 'bg-white border-gray-300 text-gray-700 focus:ring-[#800000]/30'}`}
                max={todayStr}
              />
            </div>
          </div>

          {/* Quick-select presets */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className={`text-[10px] font-semibold uppercase tracking-widest mr-1 ${isDark ? 'text-[#6b6c6e]' : 'text-gray-400'}`}>
              Quick Range:
            </span>

            {[
              { label: 'Annual', sublabel: '1 yr', preset: 'annual' },
              { label: 'Semi-Annual', sublabel: '6 mo', preset: 'semi' },
              { label: 'This Month', sublabel: '1 mo', preset: 'month' },
              { label: 'All Time', sublabel: '∞', preset: 'all' },
            ].map(({ label, sublabel, preset }) => {
              const isActive = activePreset === preset;
              return (
                <button
                  key={preset}
                  onClick={() => applyPreset(preset)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 border cursor-pointer
                    ${isActive
                      ? (isDark
                        ? 'bg-[#800000] border-[#9a0000] text-[#FFD700] shadow-sm'
                        : 'bg-[#800000] border-[#800000] text-[#FFD700] shadow-sm')
                      : (isDark
                        ? 'bg-[#2d2e30] border-[#3e4042] text-[#b0b3b8] hover:border-[#6b6c6e] hover:text-[#e4e6eb]'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-800')
                    }`}
                >
                  {label}
                  <span className={`text-[9px] font-normal px-1 py-0.5 rounded
                    ${isActive
                      ? 'bg-white/20 text-current'
                      : (isDark ? 'bg-[#3e4042] text-[#6b6c6e]' : 'bg-gray-100 text-gray-400')
                    }`}>
                    {sublabel}
                  </span>
                </button>
              );
            })}

            {/* Clear dates */}
            {(start || end) && (
              <button
                onClick={handleClear}
                className={`ml-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors border cursor-pointer
                  ${isDark
                    ? 'border-[#3e4042] text-[#6b6c6e] hover:text-[#b0b3b8] hover:border-[#6b6c6e]'
                    : 'border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'}`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t-2 shrink-0 flex justify-end gap-3 ${isDark ? 'bg-[#1f1f1f] border-[#3e4042]' : 'bg-gray-50 border-gray-200'}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded transition-colors duration-150 ${isDark ? 'text-[#f5c542] hover:bg-[#2a2a2a]' : 'text-[#800000] hover:bg-gray-200'}`}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`px-5 py-2 rounded-md font-bold text-xs uppercase tracking-widest transition-colors duration-150 shadow-sm ${isDark ? 'bg-[#3a3b3c] hover:bg-[#4e4f50] text-[#e4e6eb] border border-[#4e4f50]' : 'bg-[#800000] hover:bg-[#4a0000] text-[#FFD700]'}`}
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogbookDateRangeModal;
