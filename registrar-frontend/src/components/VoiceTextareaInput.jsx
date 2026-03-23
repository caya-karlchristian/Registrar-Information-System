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
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>
        {isSupported && (
          <button
            type="button"
            onClick={toggle}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold transition-all duration-200 ${
              isListening
                ? 'border-[#800000] text-[#800000] animate-pulse'
                : 'border-gray-300 text-gray-500 hover:text-[#800000] hover:border-[#800000]'
            }`}
          >
            {isListening ? <StopIcon className="h-3.5 w-3.5" /> : <MicrophoneIcon className="h-3.5 w-3.5" />}
            {isListening ? 'Listening' : 'Voice'}
          </button>
        )}
      </div>

      <textarea
        id={id}
        value={displayValue}
        onChange={handleChange}
        placeholder={isListening ? 'Listening...' : placeholder}
        className={`${minHeightClass} w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-3 text-sm text-gray-800 outline-none focus:border-gray-500`}
      />
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
};

VoiceTextareaInput.defaultProps = {
  label: 'Message',
};

export default VoiceTextareaInput;
