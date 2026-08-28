import React, { useEffect, useRef } from 'react';
import { MicrophoneIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import useVoiceRecognition from '../utils/useVoiceRecognition.js';
import { useTheme } from '../context/ThemeContext';

const VoiceSearchInput = ({
  value,
  onChange,
  placeholder = 'Search',
  language = 'en-US',
}) => {
  const { isDark } = useTheme();
  const lastProcessedRef = useRef('');

  const { isListening, transcript, interimTranscript, isSupported, toggle, reset } = useVoiceRecognition({
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

  const handleReset = () => {
    reset();
    lastProcessedRef.current = '';
    onChange('');
  };

  const handleInputChange = (e) => {
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

  const displayValue = isListening
    ? (transcript + (interimTranscript ? ' ' + interimTranscript : '')).trim()
    : value;

  return (
    <div
      className={`relative flex items-center rounded-lg shadow-sm border transition-all duration-200 ${
        isListening
          ? isDark
            ? 'border-[#FFC72C] ring-2 ring-[#FFC72C]/25 bg-[#1f1f1f]'
            : 'border-[#FFC72C] ring-2 ring-[#FFC72C]/25 bg-white'
          : isDark
          ? 'bg-[#1f1f1f] border-[#3e4042] focus-within:border-[#FFC72C] focus-within:ring-2 focus-within:ring-[#FFC72C]/30'
          : 'bg-white border-gray-200 focus-within:border-[#FFC72C] focus-within:ring-2 focus-within:ring-[#FFC72C]/20'
      }`}
    >
      
      {/* Screen Reader Announcements */}
      <div className="sr-only" aria-live="polite">
        {isListening ? 'Voice search active. Speak now.' : 'Voice search inactive.'}
      </div>

      <div className="pl-3 pr-2 pointer-events-none">
        <MagnifyingGlassIcon className={`w-4 h-4 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'}`} />
      </div>

      <div className="flex w-full">
        <input 
          type="text"
          placeholder={isListening ? 'Listening...' : placeholder}
          className={`w-full py-3 bg-transparent outline-none text-sm font-medium placeholder:font-normal ${
            isDark
              ? 'text-[#e4e6eb] placeholder:text-[#8f949d]'
              : 'text-gray-800 placeholder:text-gray-400'
          }`}
          value={displayValue}
          onChange={handleInputChange}
        />
      </div>

      {value && !isListening && (
        <>
          <div className={`w-px h-5 mx-1 ${isDark ? 'bg-[#3e4042]' : 'bg-gray-200'}`} />
          <button
            type="button"
            onClick={handleReset}
            className={`p-1.5 mr-1 rounded-md transition-all ${isDark ? 'text-[#b0b3b8] hover:text-[#e4e6eb] hover:bg-[#3a3b3c]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            aria-label="Clear search"
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
          className={`mr-2 p-1.5 rounded-md transition-all duration-200 shrink-0 ${
            isListening
              ? 'text-[#b58700] dark:text-[#FFC72C] bg-[#FFC72C]/20 border border-[#FFC72C]/40 animate-pulse'
              : isDark
                ? 'text-[#b0b3b8] hover:text-[#FFC72C] hover:bg-[#3a3b3c]'
                : 'text-gray-400 hover:text-[#b58700] hover:bg-amber-50'
          }`}
        >
          <MicrophoneIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default VoiceSearchInput;