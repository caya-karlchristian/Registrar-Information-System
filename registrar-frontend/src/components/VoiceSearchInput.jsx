import React, { useEffect } from 'react';
import { MicrophoneIcon, StopIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import useVoiceRecognition from '../utils/useVoiceRecognition.js';

const VoiceSearchInput = ({
  value,
  onChange,
  placeholder = 'Search',
  language = 'en-US',
}) => {
  const { isListening, transcript, interimTranscript, isSupported, toggle, reset } = useVoiceRecognition({
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
      onChange('');
      return;
    }

    onChange(transcript.trim());
  }, [transcript]);

  const handleReset = () => {
    reset();
    onChange('');
  };

  const displayValue = isListening && interimTranscript
    ? `${value} ${interimTranscript}`.trim()
    : value;

  return (
    <div className="relative flex items-center bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-200 focus-within:ring-2 focus-within:ring-[#FFC72C]">

      <div className="pl-3 pr-2 pointer-events-none">
        <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
      </div>

      <div className="flex w-full">
        <input 
          type="text"
          placeholder={isListening ? 'Listening...' : placeholder}
          className={`w-full py-3 bg-transparent outline-none text-sm font-medium placeholder:font-normal placeholder:text-gray-400 ${
            isListening ? 'text-[#800000]' : 'text-gray-700'
          }`}
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>

      {value && !isListening && (
        <>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button
            onClick={handleReset}
            className="p-1.5 mr-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            aria-label="Clear"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </>
      )}

      {isSupported && (
        <button
          onClick={toggle}
          aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          className={`mr-2 p-1 rounded-md transition-all duration-200 shrink-0 ${
            isListening
              ? 'text-[#800000] animate-pulse'
              : 'text-gray-400 hover:text-[#800000]'
          }`}
        >
          {isListening
            ? <StopIcon className="w-4 h-4" />
            : <MicrophoneIcon className="w-4 h-4" />
          }
        </button>
      )}
    </div>
  );
};

export default VoiceSearchInput;