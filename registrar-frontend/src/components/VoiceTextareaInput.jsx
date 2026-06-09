import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { MicrophoneIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
  const lastProcessedRef = useRef('');

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

    if (transcript === lastProcessedRef.current) return;
    lastProcessedRef.current = transcript;

    // Normalize transcript and clean punctuation
    const normalized = transcript.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "").trim();

    if (normalized === 'clear' || normalized === 'clear search' || normalized === 'reset') {
      reset();
      lastProcessedRef.current = '';
      onChange('');
      return;
    }

    onChange(transcript.trim());
  }, [transcript, onChange, reset]);

  const displayValue = isListening
    ? (transcript + (interimTranscript ? ' ' + interimTranscript : '')).trim()
    : value;

  const handleReset = () => {
    reset();
    lastProcessedRef.current = '';
    onChange('');
  };

  const handleChange = (e) => {
    const nextValue = e.target.value;

    // If user types while voice is active, stop it immediately and reset speech buffer.
    if (isListening) {
      reset();
    } else if (transcript) {
      reset();
    }
    lastProcessedRef.current = '';

    onChange(nextValue);
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>

      <div className={`relative flex items-start rounded-lg shadow-sm border transition-all duration-200 focus-within:ring-2 focus-within:ring-[#FFC72C] ${isDark ? 'bg-[#1f1f1f] border-[#3e4042]' : 'bg-white border-gray-200'}`}>
        
        {/* Screen Reader Announcements */}
        <div className="sr-only" aria-live="polite">
          {isListening ? 'Voice input active. Speak now.' : 'Voice input inactive.'}
        </div>

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
                aria-label="Clear input"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </>
          )}

          {isSupported && (
            <button
              type="button"
              onClick={() => toggle(value)}
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}
              className={`p-1.5 rounded-md transition-all duration-200 shrink-0 ${
                isListening
                  ? isDark
                    ? 'text-white bg-white/10 animate-pulse'
                    : 'text-[#800000] bg-red-50 animate-pulse'
                  : isDark
                    ? 'text-[#9a9a9a] hover:text-white hover:bg-[#2a2a2f]'
                    : 'text-gray-400 hover:text-[#800000] hover:bg-gray-100'
              }`}
            >
              <MicrophoneIcon className="w-4 h-4" />
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
