import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { MicrophoneIcon, StopIcon, XMarkIcon } from "@heroicons/react/24/outline";
import useVoiceRecognition from "../utils/useVoiceRecognition.js";
import { useTheme } from "../context/ThemeContext";

const InputGroup = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  pattern,
  title,
  required = false,
  min,
  max,
  labelColor = "text-white",
  voiceEnabled = true,
  language = "en-US",
}) => {
  const [manualEntryLocked, setManualEntryLocked] = useState(false);
  const { isDark } = useTheme();

  const { isListening, transcript, interimTranscript, isSupported, toggle, reset } = useVoiceRecognition({
    language,
    continuous: true,
    interimResults: true,
    silenceTimeout: 3000,
  });

  useEffect(() => {
    if (!voiceEnabled || !transcript) return;

    const normalized = transcript.trim().toLowerCase();
    if (normalized === "clear" || normalized === "clear search") {
      reset();
      setManualEntryLocked(false);
      onChange({ target: { name, value: "" } });
      return;
    }

    const cleaned = type === 'number' || pattern?.includes('\\d')
      ? transcript.replace(/\s+/g, '')
      : transcript;

    setManualEntryLocked(false);
    onChange({ target: { name, value: cleaned } });
  }, [voiceEnabled, transcript, type, pattern, onChange, name, reset]);

  const displayValue = voiceEnabled && isListening && interimTranscript
    ? `${value} ${interimTranscript}`.trim()
    : value;

  const handleChange = (e) => {
    if (isListening) reset();

    if (!isListening && transcript) {
      reset();
    }

    setManualEntryLocked(e.target.value.trim().length > 0);
    onChange(e);
  };

  const handleReset = () => {
    reset();
    setManualEntryLocked(false);
    onChange({ target: { name, value: "" } });
  };

  const isVoiceStartBlocked = manualEntryLocked && !isListening;

  return (
    <div className="w-full">
      <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[#e4e6eb]' : labelColor}`}>
        {label}
        {required && <span className={isDark ? 'text-[#FFC72C] ml-1' : 'text-red-400 ml-1'}>*</span>}
      </label>

      <div className="relative flex items-center">
        <input
          type={type}
          name={name}
          value={displayValue}
          onChange={handleChange}
          placeholder={voiceEnabled && isListening ? "Listening..." : placeholder}
          required={required}
          pattern={pattern}
          title={title}
          min={min}
          max={max}
          className={`w-full px-3 py-3 rounded-lg text-sm font-medium shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#FFC72C] ${isDark ? 'bg-[#1f1f1f] text-[#e4e6eb] border border-[#3e4042] placeholder:text-[#8f949d]' : 'bg-white text-gray-700 border border-gray-200 placeholder:text-gray-400'} ${voiceEnabled ? "pr-20" : ""}`}
        />

        <div className="absolute right-2 flex items-center gap-1">
          {String(value ?? "").trim().length > 0 && !isListening && (
            <button
              type="button"
              onClick={handleReset}
              className={`p-1 rounded-md transition-all ${isDark ? 'text-[#b0b3b8] hover:text-[#e4e6eb] hover:bg-[#3a3b3c]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
              aria-label="Clear"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}

          {voiceEnabled && isSupported && (!isVoiceStartBlocked || isListening) && (
            <button
              type="button"
              onClick={() => {
                if (isVoiceStartBlocked) return;
                toggle();
              }}
              aria-label={isListening ? "Stop listening" : "Start voice input"}
              className={`p-1 rounded-md transition-all duration-200 ${
                isListening
                  ? (isDark ? "text-[#FFC72C] animate-pulse" : "text-[#800000] animate-pulse")
                  : (isDark ? "text-[#b0b3b8] hover:text-[#e4e6eb]" : "text-gray-400 hover:text-[#800000]")
              }`}
            >
              {isListening
                ? <StopIcon className="w-4 h-4" />
                : <MicrophoneIcon className="w-4 h-4" />
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

InputGroup.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  type: PropTypes.string,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  pattern: PropTypes.string,
  title: PropTypes.string,
  labelColor: PropTypes.string,
  min: PropTypes.string,
  max: PropTypes.string,
  voiceEnabled: PropTypes.bool,
  language: PropTypes.string,
};

export default InputGroup;