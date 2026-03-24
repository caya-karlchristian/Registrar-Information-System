import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { MicrophoneIcon, StopIcon } from "@heroicons/react/24/outline";
import useVoiceRecognition from "../utils/useVoiceRecognition.js";

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
  labelColor = "text-white",
  voiceEnabled = false,
  language = "en-US",
}) => {
  const { isListening, transcript, interimTranscript, isSupported, toggle, reset } = useVoiceRecognition({
    language,
    continuous: true,
    interimResults: true,
    silenceTimeout: 3000,
  });

  useEffect(() => {
    if (!voiceEnabled || !transcript) return;

    const cleaned = type === 'number' || pattern?.includes('\\d')
      ? transcript.replace(/\s+/g, '')
      : transcript;

    onChange({ target: { name, value: cleaned } });
  }, [transcript]);

  const displayValue = voiceEnabled && isListening && interimTranscript
    ? `${value} ${interimTranscript}`.trim()
    : value;

  const handleChange = (e) => {
    if (isListening) reset();
    onChange(e);
  };

  return (
    <div className="w-full">
      <label className={`block text-sm ${labelColor} mb-1.5`}>
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
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
          className={`w-full px-3 py-3 bg-white rounded-lg text-sm text-gray-700 shadow-sm
                     placeholder:text-gray-400
                     focus:outline-none focus:ring-2 focus:ring-[#FFC72C]
                     transition-all duration-200
                     ${voiceEnabled ? "pr-10" : ""}`}
        />

        {voiceEnabled && isSupported && (
          <button
            type="button"
            onClick={toggle}
            aria-label={isListening ? "Stop listening" : "Start voice input"}
            className={`absolute right-2.5 p-1 rounded-md transition-all duration-200 ${
              isListening
                ? "text-[#800000] animate-pulse"
                : "text-gray-400 hover:text-[#800000]"
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
  voiceEnabled: PropTypes.bool,
  language: PropTypes.string,
};

export default InputGroup;