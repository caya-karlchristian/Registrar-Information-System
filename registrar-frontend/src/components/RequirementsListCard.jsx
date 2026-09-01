import React from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

const RequirementsListCard = ({
  requirementsList,
  isChecklistOpen,
  onToggle,
  isDark,
}) => {
  if (!requirementsList || requirementsList.length === 0) return null;

  return (
    <div className={`rounded-lg border px-4 py-4 ${isDark ? 'border-[#3e4042] bg-[#242526]' : 'border-gray-200 bg-white'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
      >
        <div>
          <p className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-pup-yellow' : 'text-[#800000]'}`}>
            Requirements List
          </p>
          <p className={`text-xs mt-1 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
            Please prepare the following for each item in your request before visiting the Registrar's Office.
          </p>
        </div>
        {isChecklistOpen ? (
          <ChevronUpIcon className={`w-5 h-5 shrink-0 transition-transform ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`} />
        ) : (
          <ChevronDownIcon className={`w-5 h-5 shrink-0 transition-transform ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`} />
        )}
      </button>

      {isChecklistOpen && (
        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 mt-4 pt-3 border-t border-gray-100 dark:border-[#3e4042]/60">
          {requirementsList.map((req, idx) => (
            <div key={idx} className={`rounded-md border px-3.5 py-3 ${isDark ? 'border-[#3e4042] bg-[#1a1b1e]' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className={`text-sm font-semibold ${isDark ? 'text-[#e4e6eb]' : 'text-gray-900'}`}>{req.item}</p>
                <div className="flex gap-2 shrink-0">
                  {req.copies > 1 && (
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDark ? 'bg-[#3a3b3c] text-[#e4e6eb]' : 'bg-gray-200 text-gray-700'}`}>
                      {req.copies}x copies
                    </span>
                  )}
                  {req.process_days && (
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDark ? 'bg-[#3a3b3c] text-pup-yellow' : 'bg-blue-100 text-blue-700'}`}>
                      {req.process_days}
                    </span>
                  )}
                </div>
              </div>
              {req.requirements && (
                <p className={`text-xs leading-relaxed whitespace-pre-line ${isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}`}>
                  {req.requirements}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RequirementsListCard;
