import React from 'react';
import { DocumentTextIcon, XMarkIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import qrCode from '../assets/qrcode.png';
import { useTheme } from '../context/ThemeContext';

const RequestCompletedModal = ({
  isOpen,
  onClose,
  title = 'ID No. 1234567890',
  requestedAt = 'Apr 28, 2026',
  claimedAt = 'JAN 15, 2025, 2:30 PM',
  message = 'Awaiting recipient acknowledgment of document receipt.',
  onReceived = () => {},
  onNotYet = () => {},
}) => {
  if (!isOpen) return null;

  const { isDark } = useTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className={`relative z-50 w-full max-w-xl my-4 sm:my-6 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.2)] overflow-y-auto border flex flex-col max-h-[80vh] ${isDark ? 'bg-[#242526] border-[#3e4042] text-[#e4e6eb]' : 'bg-white border-[#800000]/20 text-gray-900'}`}>

        {/* Header */}
        <div className={`px-4 py-4 shrink-0 ${isDark ? 'bg-[#660000] border-b-2 border-pup-yellow/20' : 'bg-pup-dark-maroon border-b-2 border-pup-yellow'}`}>
          <div className="relative">
            <h3 className="mx-auto text-2xl text-white font-black uppercase tracking-wider">REQUEST COMPLETED</h3>
            <button onClick={onClose} className="p-2 rounded hover:opacity-90 absolute right-1 top-1/2 -translate-y-1/2">
              <XMarkIcon className={`w-6 h-6 ${isDark ? 'text-[#e4e6eb]' : 'text-white'}`} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto px-4 py-4 space-y-4 ${isDark ? 'text-[#e4e6eb]' : 'text-[#4a0000]'}`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-md ${isDark ? 'bg-[#3a3b3c] text-pup-yellow' : 'text-pup-maroon'} shadow-sm`}> 
              <DocumentTextIcon className="w-10 h-12" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className={`text-lg font-black leading-tight truncate ${isDark ? 'text-[#e4e6eb]' : 'text-pup-maroon'}`}>{title}</h3>
              <div className="mt-1 text-xs">
                <div className={`${isDark ? 'text-[#b0b3b8]' : 'text-gray-700'}`}><strong>Requested:</strong> {requestedAt}</div>
                <div className={`${isDark ? 'text-[#b0b3b8]' : 'text-gray-700'} mt-1`}><strong>Claimed:</strong> {claimedAt}</div>
              </div>
            </div>
          </div>

          {/* Info box */}
            <div
              className={`rounded-md p-2 ${
                  isDark
                  ? 'bg-[#3a3420] border border-yellow-500/20'
                  : 'bg-yellow-50 border border-pup-yellow'
              } text-xs`}
              >
            <strong className={`${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
                Pending Confirmation:
            </strong>
            <span className={`ml-2 ${isDark ? 'text-[#d1d5db]' : 'text-yellow-700'}`}>
                {message}
            </span>
            </div>

          {/* QR and feedback */}
          <div className="flex items-start gap-4">
            <img src={qrCode} alt="feedback-qr" className="w-25 h-25 object-contain rounded-md border-2 border-pup-yellow" />

            <div className={`${isDark ? 'border-l border-white/10' : 'border-l border-black/10'} h-25`} />

            <div className="flex-1 text-sm mt-2">
              <h4 className={`text-sm font-bold ${isDark ? 'text-[#e4e6eb]' : 'text-pup-maroon'}`}>Feedback & Concerns</h4>
                <p className={`mt-1 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-700'}`}>How was your experience? Scan the code to leave feedback or ask questions.</p>
                <a href="https://pupsinta.freshservice.com/support/home" className={`mt-2 inline-flex items-center gap-2 text-sm font-semibold ${isDark ? 'text-pup-yellow' : 'text-pup-maroon'} underline`}>
                <DevicePhoneMobileIcon className="w-4 h-4" />
                <span>Open in your browser</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
        className={`px-4 py-4 border-t shrink-0 flex items-center justify-between ${
          isDark ? 'bg-[#1f1f1f] border-[#3e4042]' : 'bg-white border-gray-200'
        }`}
        >
        <button
            onClick={() => onNotYet && onNotYet()}
            className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-md transition-colors duration-200 ${
            isDark
              ? 'text-[#b0b3b8] hover:bg-[#2a2a2a] hover:text-white'
              : 'text-pup-maroon hover:bg-gray-100'
            }`}
        >
            NO, NOT YET
        </button>

        <button
          onClick={() => onReceived && onReceived()}
          className={`px-4 py-2 rounded-md font-bold text-xs shadow-md flex items-center gap-2 transition-all duration-200 ${
          isDark
            ? 'bg-[#3a3b3c] text-[#FFD96B] border border-[#4e4f50] hover:bg-[#4a4b4c]'
            : 'bg-pup-maroon text-pup-yellow hover:opacity-90'
          }`}
        >
          <span>YES, I RECEIVED</span>
        </button>
        </div>
      </div>
    </div>
  );
};

export default RequestCompletedModal;
