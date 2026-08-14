import React, { useState, useRef, useEffect } from "react";
import { ChevronDownIcon, XMarkIcon, CheckIcon } from "@heroicons/react/24/solid";
import { useTheme } from "../context/ThemeContext";

const MultiSelectDropdown = ({
  name,
  label,
  options,
  selectedValues,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const { isDark } = useTheme();

  /* Close dropdown when clicking outside */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* Clear search term when dropdown closes */
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    } else {
      // Focus search input when dropdown opens
      // Need a tiny timeout to ensure the element is painted and focusable
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const toggleOption = (option) => {
    let newValues;

    if (selectedValues.includes(option)) {
      newValues = selectedValues.filter((item) => item !== option);
    } else {
      newValues = [...selectedValues, option];
    }

    onChange({
      target: {
        name,
        value: newValues,
      },
    });
  };

  const filteredOptions = searchTerm === ""
    ? options
    : options.filter((option) =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
      );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-[#e4e6eb]' : 'text-white'}`}>
        {label}
      </label>

      {/* Trigger Container */}
      <div
        onClick={() => {
          setIsOpen(true);
          searchInputRef.current?.focus();
        }}
        className={`w-full p-2.5 rounded border cursor-text flex justify-between items-center min-h-10 focus-within:ring-2 focus-within:ring-[#FFC72C] focus-within:border-transparent text-left transition-all ${
          isOpen ? 'ring-2 ring-[#FFC72C] border-transparent' : ''
        } ${isDark ? 'bg-[#1f1f1f] border-[#3e4042] text-[#e4e6eb]' : 'bg-white border-gray-300 text-gray-700'}`}
      >
        <div className="flex flex-wrap gap-1 items-center flex-1 pr-2">
          {selectedValues.map((val) => (
            <span
              key={val}
              className={`text-xs px-2 py-1 rounded flex items-center ${isDark ? 'bg-pup-yellow text-pup-maroon font-bold' : 'bg-pup-maroon text-white font-bold'}`}
            >
              {val}
              <button
                type="button"
                aria-label={`Remove ${val}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOption(val);
                  searchInputRef.current?.focus();
                }}
                className="ml-1 hover:text-red-200 text-white/80 cursor-pointer flex items-center rounded focus:outline-none"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </span>
          ))}

          <input
            ref={searchInputRef}
            type="text"
            placeholder={selectedValues.length === 0 ? "Select documents..." : ""}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className={`flex-grow bg-transparent border-0 outline-none p-0 text-sm min-w-[80px] focus:ring-0 ${
              isDark ? 'text-[#e4e6eb] placeholder-gray-500' : 'text-gray-700 placeholder-gray-400'
            }`}
          />
        </div>

        <span
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className="cursor-pointer pr-1 shrink-0"
        >
          <ChevronDownIcon
            className={`w-5 h-5 transition-transform duration-200 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'} ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </span>
      </div>

      {/* Dropdown Options */}
      {isOpen && (
        <div 
          className={`absolute z-50 w-full border mt-1 rounded-xl shadow-xl flex flex-col overflow-hidden ${
            isDark ? 'bg-[#1f1f1f] border-[#3e4042]' : 'bg-white border-gray-200'
          }`}
          style={isDark ? {} : { boxShadow: '0 8px 32px -4px rgba(0,0,0,0.18), 0 2px 8px -2px rgba(0,0,0,0.10)', border: '1px solid #FFC72C' }}
        >

          {/* Options List Container */}
          <div className="max-h-52 overflow-y-auto flex flex-col">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option);

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleOption(option)}
                    className={`flex items-center w-full p-3 text-left border-b border-gray-50 last:border-0 transition-colors focus:outline-none ${
                      isSelected
                        ? (isDark ? 'bg-[#3a3b3c]' : 'bg-amber-50/50')
                        : (isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100')
                    } ${isDark ? 'focus:bg-[#3a3b3c]' : 'focus:bg-gray-100'}`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center mr-3 shrink-0 ${
                        isSelected
                          ? isDark
                            ? "bg-pup-yellow border-pup-yellow"
                            : "bg-pup-maroon border-pup-maroon"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {isSelected && (
                        <CheckIcon className={`w-3 h-3 ${isDark ? 'text-pup-maroon' : 'text-white'}`} />
                      )}
                    </div>

                    <span
                      className={`text-sm ${
                        isSelected
                          ? isDark
                            ? "font-semibold text-pup-yellow"
                            : "font-semibold text-pup-maroon"
                          : (isDark ? 'text-[#e4e6eb]' : 'text-gray-700')
                      }`}
                    >
                      {option}
                    </span>
                  </button>
                );
              })
            ) : (
              <span className={`p-4 text-sm text-center italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                No options found
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
