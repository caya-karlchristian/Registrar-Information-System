import React, { useState, useRef, useEffect } from "react";
import { ChevronDownIcon, XMarkIcon, CheckIcon } from "@heroicons/react/24/solid";

const MultiSelectDropdown = ({
  name,
  label,
  options,
  selectedValues,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  return (
    <div className="relative w-full text-black" ref={dropdownRef}>
      <label className="block text-sm font-semibold mb-1 text-white">
        {label}
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full bg-white p-2.5 rounded border border-gray-300 cursor-pointer flex justify-between items-center min-h-[40px] focus:outline-none focus:ring-2 focus:ring-pup-yellow focus:border-pup-maroon text-left"
      >
        <div className="flex flex-wrap gap-1">
          {selectedValues.length === 0 ? (
            <span className="text-gray-400 text-sm">
              Select documents...
            </span>
          ) : (
            selectedValues.map((val) => (
              <span
                key={val}
                className="bg-pup-maroon text-white text-xs px-2 py-1 rounded flex items-center"
              >
                {val}
                <span
                  role="button"
                  aria-label={`Remove ${val}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(val);
                  }}
                  className="ml-1 hover:text-red-200 text-white/80 cursor-pointer flex items-center rounded"
                >
                  <XMarkIcon className="w-3 h-3" />
                </span>
              </span>
            ))
          )}
        </div>

        <ChevronDownIcon
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 mt-1 rounded shadow-xl max-h-60 overflow-y-auto flex flex-col">
          {options.map((option) => {
            const isSelected = selectedValues.includes(option);

            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleOption(option)}
                className={`flex items-center w-full p-3 text-left border-b border-gray-50 last:border-0 transition-colors focus:outline-none focus:bg-gray-100 ${
                  isSelected
                    ? "bg-red-50"
                    : "hover:bg-gray-100"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center mr-3 shrink-0 ${
                    isSelected
                      ? "bg-pup-maroon border-pup-maroon"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {isSelected && (
                    <CheckIcon className="w-3 h-3 text-white" />
                  )}
                </div>

                <span
                  className={`text-sm ${
                    isSelected
                      ? "font-semibold text-pup-maroon"
                      : "text-gray-700"
                  }`}
                >
                  {option}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
