import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../context/ThemeContext';

const DropdownGroup = ({ label, name, value, onChange, options, required = false, labelColor = 'text-white' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (option) => {
    onChange({ target: { name, value: option } });
    setOpen(false);
  };

  const displayValue = value || null;

  return (
    <div className="w-full group" ref={ref}>
      {/* Label */}
      <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[#e4e6eb]' : labelColor}`}>
        {label}
        {required && <span className={isDark ? 'text-[#FFC72C] ml-1' : 'text-red-500 ml-1'} title="Required">*</span>}
      </label>

      {/* Trigger box */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`
            w-full flex items-center justify-between gap-2 px-3 py-3 rounded-lg text-sm font-medium shadow-sm focus:outline-none border
            ${open
              ? 'focus:ring-2 focus:ring-[#FFC72C]'
              : 'border-transparent hover:border-gray-200'
            }
            ${isDark ? 'bg-[#1f1f1f] text-[#e4e6eb] border-[#3e4042]' : 'bg-white text-gray-700 border-gray-200'}
          `}
        >
          <span className={displayValue ? (isDark ? 'text-[#e4e6eb] truncate font-medium' : 'text-gray-700 truncate font-medium') : (isDark ? 'text-[#b0b3b8] font-normal' : 'text-gray-400 font-normal')}>
            {displayValue || 'Please Select'}
          </span>
          <ChevronDownIcon
            className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'} ${open ? 'rotate-180 text-[#FFC72C]' : ''}`}
          />
        </button>

        {open && (
          <div
            className={`absolute z-50 mt-1.5 w-full rounded-xl overflow-hidden ${isDark ? 'bg-[#1f1f1f]' : 'bg-white'}`}
            style={{ boxShadow: '0 8px 32px -4px rgba(0,0,0,0.18), 0 2px 8px -2px rgba(0,0,0,0.10)', border: '1px solid #FFC72C' }}
          >
            {/* Scrollable list */}
            <ul className="max-h-56 overflow-y-auto py-1 dropdown-scroll">
              {options.map((option) => {
                const isSelected = value === option;
                return (
                  <li key={option}>
                    <button
                      type="button"
                      onClick={() => handleSelect(option)}
                      className={`
                        w-full flex items-center px-1 py-2.5 text-left text-sm transition-colors duration-100
                        ${isSelected
                          ? 'bg-[#800000] text-white font-bold'
                            : (isDark ? 'text-[#b0b3b8] hover:bg-[#3a3b3c] hover:text-[#e4e6eb]' : 'text-gray-700 hover:bg-amber-50 hover:text-[#800000]')
                        }
                      `}
                    >
                      <span className="truncate px-2">{option}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Gold bottom accent */}
            <div className="h-1 w-full bg-linear-to-r from-[#FFD700] via-[#FFC72C] to-[#FFD700]" />
          </div>
        )}
      </div>
    </div>
  );
};

DropdownGroup.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  required: PropTypes.bool,
  labelColor: PropTypes.string,
};

export default DropdownGroup;