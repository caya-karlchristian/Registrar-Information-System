import React from 'react';
import PropTypes from 'prop-types';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../context/ThemeContext';

const DashboardDropdown = ({
  isOpen,
  setIsOpen,
  dropdownRef,
  trigger,
  align = 'center',
  isIconButton = false,
  sections = [],
}) => {
  const { isDark } = useTheme();

  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (dropdownRef && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen, dropdownRef]);

  const alignClasses = {
    left: 'left-0 mt-2',
    right: 'right-0 mt-2',
    center: 'right-1/2 translate-x-1/2 mt-2',
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {isIconButton ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`p-2.5 rounded-lg border transition-all flex items-center justify-center focus:outline-none h-11 w-11 ${
            isOpen
              ? isDark
                ? 'bg-[#2a2a2f] border-[#ffc72c] text-[#ffc72c]'
                : 'bg-gray-100 border-[#800000] text-[#800000]'
              : isDark
              ? 'bg-[#1f1f1f] text-[#b0b3b8] border-[#3e4042] hover:bg-[#2a2a2f]'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
          title="Sort requests"
        >
          {trigger}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center gap-1 mx-auto text-xs uppercase font-bold hover:text-[#800000] dark:hover:text-[#FFC72C] transition-colors focus:outline-none"
        >
          {trigger}
          <ChevronDownIcon
            className={`w-3.5 h-3.5 transition-transform duration-200 
              ${isOpen ? 'rotate-180 text-[#FFC72C]' : 'text-gray-400'}
            `}
          />
        </button>
      )}

      {isOpen && (
        <div
          className={`absolute ${alignClasses[align]} w-48 rounded-xl shadow-lg border z-50 overflow-hidden text-left ${
            isDark ? 'bg-[#1f1f1f] text-[#e4e6eb]' : 'bg-white text-gray-700'
          }`}
          style={{
            boxShadow: '0 8px 32px -4px rgba(0,0,0,0.18), 0 2px 8px -2px rgba(0,0,0,0.10)',
            border: '1px solid #FFC72C',
          }}
        >
          <div className="py-1.5">
            {sections.map((section, secIdx) => (
              <React.Fragment key={secIdx}>
                {secIdx > 0 && (
                  <div className={`border-t my-1.5 ${isDark ? 'border-[#3e4042]' : 'border-gray-100'}`} />
                )}

                {section.title && (
                  <div
                    className={`text-[10px] uppercase font-bold tracking-wider px-4 pt-1.5 pb-1 ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    {section.title}
                  </div>
                )}

                <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto dropdown-scroll">
                  {section.items.map((item, itemIdx) => {
                    const Icon = item.icon;
                    if (Icon) {
                      return (
                        <div className="px-2 py-0.5" key={itemIdx}>
                          <button
                            type="button"
                            onClick={() => {
                              item.onClick();
                              setIsOpen(false);
                            }}
                            className={`
                              w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-all duration-100 rounded-lg border
                              ${item.isSelected
                                ? isDark
                                  ? 'border-[#FFC72C] bg-[#FFC72C]/10 text-[#FFC72C] font-bold'
                                  : 'border-[#800000] bg-red-50 text-[#800000] font-bold'
                                : isDark
                                ? 'border-transparent text-[#b0b3b8] hover:bg-[#2a2a2f]'
                                : 'border-transparent text-gray-700 hover:bg-gray-100'
                              }
                            `}
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${item.isSelected ? (isDark ? 'text-[#FFC72C]' : 'text-[#800000]') : 'text-gray-400 dark:text-[#808080]'}`} />
                            <span className="truncate flex-1">{item.label}</span>
                          </button>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={itemIdx}
                        type="button"
                        onClick={() => {
                          item.onClick();
                          setIsOpen(false);
                        }}
                        className={`
                          w-full flex items-center gap-3 px-4 py-2 text-left text-xs transition-colors duration-100
                          ${isDark ? 'text-[#e4e6eb] hover:bg-[#2a2a2f]' : 'text-gray-700 hover:bg-gray-50'}
                        `}
                      >
                        {item.isSelected ? (
                          <span className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-[#800000] dark:border-[#FFC72C] shrink-0">
                            <span className="w-2 h-2 rounded-full bg-[#800000] dark:bg-[#FFC72C]"></span>
                          </span>
                        ) : (
                          <span className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 shrink-0"></span>
                        )}
                        <span className={item.isSelected ? 'font-bold text-[#800000] dark:text-[#FFC72C]' : ''}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Gold bottom accent */}
          <div className="h-1 w-full bg-gradient-to-r from-[#FFD700] via-[#FFC72C] to-[#FFD700]" />
        </div>
      )}
    </div>
  );
};

DashboardDropdown.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  setIsOpen: PropTypes.func.isRequired,
  dropdownRef: PropTypes.object.isRequired,
  trigger: PropTypes.node.isRequired,
  align: PropTypes.oneOf(['left', 'right', 'center']),
  isIconButton: PropTypes.bool,
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string,
      items: PropTypes.arrayOf(
        PropTypes.shape({
          label: PropTypes.string.isRequired,
          isSelected: PropTypes.bool.isRequired,
          onClick: PropTypes.func.isRequired,
          icon: PropTypes.elementType,
        })
      ).isRequired,
    })
  ).isRequired,
};

export default DashboardDropdown;
