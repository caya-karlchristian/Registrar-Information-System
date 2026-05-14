import React, { useEffect, useState } from 'react';
import { MicrophoneIcon, StopIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import useVoiceRecognition from '../utils/useVoiceRecognition.js';
import { useTheme } from '../context/ThemeContext';

const VoiceSearchInput = ({
  value,
  onChange,
  placeholder = 'Search',
  language = 'en-US',
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
  }, [transcript]);

  const handleReset = () => {
    reset();
    setManualEntryLocked(false);
    onChange('');
  };

  const handleInputChange = (e) => {
    const nextValue = e.target.value;

    // Manual edits must clear the speech buffer so next dictation starts fresh.
    if (!isListening && transcript) {
      reset();
    }

    // When user types, block voice start until input is erased.
    setManualEntryLocked(nextValue.trim().length > 0);

    onChange(nextValue);
  };

  const isVoiceStartBlocked = manualEntryLocked && !isListening;

  const displayValue = isListening && interimTranscript
    ? `${value} ${interimTranscript}`.trim()
    : value;

  return (
    <div className={`relative flex items-center rounded-lg shadow-sm border transition-all duration-200 focus-within:ring-2 focus-within:ring-[#FFC72C] ${isDark ? 'bg-[#1f1f1f] border-[#3e4042]' : 'bg-white border-gray-200'}`}>

      <div className="pl-3 pr-2 pointer-events-none">
        <MagnifyingGlassIcon className={`w-4 h-4 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'}`} />
      </div>

      <div className="flex w-full">
        <input 
          type="text"
          placeholder={isListening ? 'Listening...' : placeholder}
          className={`w-full py-3 bg-transparent outline-none text-sm font-medium placeholder:font-normal placeholder:text-gray-400 ${
            isDark
              ? (isListening ? 'text-[#e4e6eb] placeholder:text-[#8f949d]' : 'text-[#e4e6eb] placeholder:text-[#8f949d]')
              : (isListening ? 'text-[#800000]' : 'text-gray-700')
          }`}
          value={displayValue}
          onChange={handleInputChange}
        />
      </div>

      {value && !isListening && (
        <>
          <div className={`w-px h-5 mx-1 ${isDark ? 'bg-[#3e4042]' : 'bg-gray-200'}`} />
          <button
            onClick={handleReset}
            className={`p-1.5 mr-1 rounded-md transition-all ${isDark ? 'text-[#b0b3b8] hover:text-[#e4e6eb] hover:bg-[#3a3b3c]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            aria-label="Clear"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </>
      )}

      {isSupported && (!isVoiceStartBlocked || isListening) && (
        <button
          onClick={() => {
            if (isVoiceStartBlocked) return;
            toggle();
          }}
          aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          className={`mr-2 p-1 rounded-md transition-all duration-200 shrink-0 ${
            isListening
              ? (isDark ? 'text-[#FFC72C] animate-pulse' : 'text-[#800000] animate-pulse')
              : (isDark ? 'text-[#b0b3b8] hover:text-[#e4e6eb]' : 'text-gray-400 hover:text-[#800000]')
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