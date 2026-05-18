import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { MicrophoneIcon, StopIcon, XMarkIcon } from '@heroicons/react/24/outline';
import useVoiceRecognition from '../utils/useVoiceRecognition.js';
import { useTheme } from '../context/ThemeContext';

const VoiceTextareaInput = ({
  id,
  label,
  value,
  onChange,
  placeholder = 'Type your message...',
  language = 'en-US',
  minHeightClass = 'min-h-64',
  required = false,
}) => {
  const { isDark } = useTheme();
  const [manualEntryLocked, setManualEntryLocked] = useState(false);

  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    toggle,
    reset,
  } = useVoiceRecognition({
    language,
    continuous: true,
    interimResults: true,
    silenceTimeout: 3000,
  });

  useEffect(() => {
    if (!transcript) return;

    const normalized = transcript.trim().toLowerCase();

    if (normalized === 'clear' || normalized === 'clear search') {
      reset();
      setManualEntryLocked(false);
      onChange('');
      return;
    }

    setManualEntryLocked(false);
    onChange(transcript.trim());
  }, [transcript, onChange, reset]);

  const displayValue = isListening && interimTranscript
    ? `${value} ${interimTranscript}`.trim()
    : value;

  const handleReset = () => {
    reset();
    setManualEntryLocked(false);
    onChange('');
  };

  const handleChange = (e) => {
    const nextValue = e.target.value;

    if (isListening) reset();

    // Manual edits must clear the speech buffer so next dictation starts fresh.
    if (!isListening && transcript) {
      reset();
    }

    // Manual typing locks voice input until the field is cleared again.
    setManualEntryLocked(nextValue.trim().length > 0);

    onChange(nextValue);
  };

  const isVoiceStartBlocked = manualEntryLocked && !isListening;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>

      <div className={`relative flex items-start rounded-lg shadow-sm border transition-all duration-200 focus-within:ring-2 focus-within:ring-[#FFC72C] ${isDark ? 'bg-[#1f1f1f] border-[#3e4042]' : 'bg-white border-gray-200'}`}>
        <textarea
          id={id}
          required={required}
          value={displayValue}
          onChange={handleChange}
          placeholder={isListening ? 'Listening...' : placeholder}
          className={`${minHeightClass} w-full resize-y rounded-lg bg-transparent px-3 py-3 text-sm outline-none placeholder:font-normal ${isDark ? 'text-[#e4e6eb] placeholder:text-[#9a9a9a]' : 'text-gray-700 placeholder:text-gray-400'} ${isSupported ? 'pr-10' : ''}`}
        />

        <div className="flex items-center pr-2 pt-2 pb-2 gap-1 shrink-0">
          {value && !isListening && (
            <>
              <div className={`w-px h-5 mx-1 ${isDark ? 'bg-[#3e4042]' : 'bg-gray-200'}`} />
              <button
                type="button"
                onClick={handleReset}
                className={`p-1.5 rounded-md transition-all ${isDark ? 'text-[#9a9a9a] hover:text-white hover:bg-[#2a2a2f]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                aria-label="Clear"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </>
          )}

          {isSupported && (!isVoiceStartBlocked || isListening) && (
            <button
              type="button"
              onClick={() => {
                if (isVoiceStartBlocked) return;
                toggle();
              }}
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}
              className={`p-1 rounded-md transition-all duration-200 shrink-0 ${
                isListening
                  ? isDark
                    ? 'text-white animate-pulse'
                    : 'text-[#800000] animate-pulse'
                  : isDark
                    ? 'text-[#9a9a9a] hover:text-white'
                    : 'text-gray-400 hover:text-[#800000]'
              }`}
            >
              {isListening ? <StopIcon className="w-4 h-4" /> : <MicrophoneIcon className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

VoiceTextareaInput.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  language: PropTypes.string,
  minHeightClass: PropTypes.string,
  required: PropTypes.bool,
};

VoiceTextareaInput.defaultProps = {
  label: 'Message',
};

export default VoiceTextareaInput;
