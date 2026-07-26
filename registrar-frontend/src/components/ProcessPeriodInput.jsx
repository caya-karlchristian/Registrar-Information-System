import React from "react";
import PropTypes from "prop-types";
import { ClockIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../context/ThemeContext";

const parsePeriod = (periodStr) => {
  if (!periodStr) return { days: "", hours: "", minutes: "" };
  const normalized = periodStr.toLowerCase();

  let days = "";
  let hours = "";
  let minutes = "";

  const dayMatch = normalized.match(/([^\s,]+)\s*working\s*day/) || normalized.match(/([^\s,]+)\s*day/);
  if (dayMatch) {
    days = dayMatch[1];
  }

  const hourMatch = normalized.match(/([^\s,]+)\s*hour/) || normalized.match(/([^\s,]+)\s*hr/);
  if (hourMatch) {
    hours = hourMatch[1];
  }

  const minMatch = normalized.match(/([^\s,]+)\s*minute/) || normalized.match(/([^\s,]+)\s*min/);
  if (minMatch) {
    minutes = minMatch[1];
  }

  if (!days && !hours && !minutes && periodStr.trim()) {
    days = periodStr.trim();
  }

  return { days, hours, minutes };
};

const formatPeriod = ({ days, hours, minutes }) => {
  const parts = [];
  if (days !== "" && days !== undefined && days !== null) {
    parts.push(`${days} working day/s`);
  }
  if (hours !== "" && hours !== undefined && hours !== null && parseFloat(hours) !== 0) {
    parts.push(`${hours} hour/s`);
  }
  if (minutes !== "" && minutes !== undefined && minutes !== null && parseFloat(minutes) !== 0) {
    parts.push(`${minutes} minute/s`);
  }
  return parts.join(", ") || "";
};

const ProcessPeriodInput = ({
  label = "Process Period",
  name,
  value = "",
  onChange,
  required = false,
  labelColor = "text-white",
}) => {
  const { isDark } = useTheme();

  // Derive days, hours, and minutes directly from the single source of truth (value prop)
  const { days, hours, minutes } = parsePeriod(value);

  const triggerChange = (newDays, newHours, newMinutes) => {
    const formatted = formatPeriod({
      days: newDays,
      hours: newHours,
      minutes: newMinutes,
    });
    onChange({ target: { name, value: formatted } });
  };

  const handleDaysChange = (val) => {
    triggerChange(val, hours, minutes);
  };

  const handleHoursChange = (val) => {
    triggerChange(days, val, minutes);
  };

  const handleMinutesChange = (val) => {
    triggerChange(days, hours, val);
  };

  const currentFormatted = formatPeriod({ days, hours, minutes });

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Label and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
        <label className={`block text-sm font-medium ${isDark ? "text-[#e4e6eb]" : labelColor}`}>
          {label}
          {required && (
            <span className={isDark ? "text-[#FFC72C] ml-1" : "text-red-400 ml-1"}>*</span>
          )}
        </label>
      </div>

      {/* Responsive Wrapper Container */}
      <div className="flex flex-col 2xl:flex-row gap-3 items-stretch 2xl:items-end">
        {/* Input Steppers Row */}
        <div className="grid grid-cols-3 gap-3 flex-1 w-full min-w-[220px] shrink-0">
          {/* Days */}
          <div className="flex flex-col gap-1">
            <span className={`text-[10px] uppercase font-bold tracking-wider whitespace-nowrap ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Working Days
            </span>
            <input
              type="number"
              min="1"
              max="30"
              value={days || ""}
              onChange={(e) => handleDaysChange(e.target.value)}
              placeholder="0"
              className={`w-full px-3 py-2 rounded-lg text-sm font-medium shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#FFC72C] ${isDark
                ? "bg-[#1f1f1f] text-[#e4e6eb] border border-[#3e4042] placeholder:text-[#8f949d]"
                : "bg-white text-gray-700 border border-gray-200 placeholder:text-gray-400"
                }`}
            />
          </div>

          {/* Hours */}
          <div className="flex flex-col gap-1">
            <span className={`text-[10px] uppercase font-bold tracking-wider whitespace-nowrap ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Hours
            </span>
            <input
              type="number"
              min="0"
              max="23"
              value={hours || ""}
              onChange={(e) => handleHoursChange(e.target.value)}
              placeholder="0"
              className={`w-full px-3 py-2 rounded-lg text-sm font-medium shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#FFC72C] ${isDark
                ? "bg-[#1f1f1f] text-[#e4e6eb] border border-[#3e4042] placeholder:text-[#8f949d]"
                : "bg-white text-gray-700 border border-gray-200 placeholder:text-gray-400"
                }`}
            />
          </div>

          {/* Minutes */}
          <div className="flex flex-col gap-1">
            <span className={`text-[10px] uppercase font-bold tracking-wider whitespace-nowrap ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Minutes
            </span>
            <input
              type="number"
              min="0"
              max="59"
              value={minutes || ""}
              onChange={(e) => handleMinutesChange(e.target.value)}
              placeholder="0"
              className={`w-full px-3 py-2 rounded-lg text-sm font-medium shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#FFC72C] ${isDark
                ? "bg-[#1f1f1f] text-[#e4e6eb] border border-[#3e4042] placeholder:text-[#8f949d]"
                : "bg-white text-gray-700 border border-gray-200 placeholder:text-gray-400"
                }`}
            />
          </div>
        </div>

        <div
          className={`flex items-center gap-2 p-2 px-3 rounded-lg border text-xs font-semibold transition-all duration-300 w-full 2xl:w-auto min-h-[38px] py-1.5 min-w-0 ${currentFormatted
              ? isDark
                ? "bg-[#4a120e]/10 border-[#4a120e]/30 text-white"
                : "bg-[#4a120e]/5 border-[#4a120e]/20 text-[#4a120e]"
              : isDark
                ? "bg-[#1f1f1f]/50 border-dashed border-[#3e4042] text-gray-500"
                : "bg-gray-50/50 border-dashed border-gray-200 text-gray-400"
            }`}
        >
          <ClockIcon className="w-4 h-4 shrink-0 text-[#FFC72C]" />
          <span className="min-w-0 break-words flex-1">
            {currentFormatted ? (
              <>
                Format Preview: <span className="font-bold">{currentFormatted}</span>
              </>
            ) : (
              "Enter a processing period..."
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

ProcessPeriodInput.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  required: PropTypes.bool,
  labelColor: PropTypes.string,
};

export default ProcessPeriodInput;
