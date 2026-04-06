import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/outline';
import useVoiceRecognition from '../utils/useVoiceRecognition.js';

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

    onChange(transcript.trim());
  }, [transcript, onChange]);

  const displayValue = isListening && interimTranscript
    ? `${value} ${interimTranscript}`.trim()
    : value;

  const handleChange = (e) => {
    if (isListening) reset();
    onChange(e.target.value);
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>

      <div className="relative">
        <textarea
          id={id}
          required={required}
          value={displayValue}
          onChange={handleChange}
          placeholder={isListening ? 'Listening...' : placeholder}
          className={`${minHeightClass} w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-3 text-sm text-gray-800 outline-none focus:border-gray-500 ${isSupported ? 'pr-10' : ''}`}
        />

        {isSupported && (
          <button
            type="button"
            onClick={toggle}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
            className={`absolute right-2.5 top-2.5 p-1 rounded-md transition-all duration-200 ${
              isListening
                ? 'text-[#800000] animate-pulse'
                : 'text-gray-400 hover:text-[#800000]'
            }`}
          >
            {isListening ? <StopIcon className="w-4 h-4" /> : <MicrophoneIcon className="w-4 h-4" />}
          </button>
        )}
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
