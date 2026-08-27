import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../context/ThemeContext';

/**
 * Modal shown when an Official Receipt fails verification or has item/payment mismatches.
 * Follows system theme (PUP Maroon / Yellow / Dark Mode) with no automatic timer
 * so the user can read the explanation and checklist and dismiss at their own pace.
 * Rendered using a React Portal so it is never trapped under parent layout stacking contexts.
 */
const OrValidationErrorModal = ({
  isOpen,
  onClose,
  title = "We couldn't validate this receipt",
  message,
  buttonText = "Re-check and try again",
  checklist,
}) => {
  const { isDark } = useTheme();
  const modalRef = useRef(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const defaultDescription =
    "The Cashier's Office couldn't match this receipt to your record. This usually happens when the name on the receipt doesn't exactly match your name in the system.";

  const displayMessage = message || defaultDescription;

  const defaultChecklist = [
    "Check that the name on the receipt exactly matches your registered name in the system.",
    "Double-check that the OR number contains exactly 7 digits and matches the number printed on the receipt.",
    "If the name on the receipt does not match your registered name in the system, contact tech4ward.bsit2027@gmail.com for assistance or any concerns.",
  ];

  const items = checklist && checklist.length > 0 ? checklist : defaultChecklist;

  // Helper to format text containing quotes (e.g. "CAV/APOSTILE") with highlight
  const formatMessage = (text) => {
    if (!text || typeof text !== 'string') return text;
    const parts = text.split(/(".*?"|'.*?')/g);
    return parts.map((part, index) => {
      if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith("'") && part.endsWith("'"))) {
        return (
          <span
            key={index}
            className={`font-bold px-1.5 py-0.5 rounded ${
              isDark
                ? 'bg-[#FFC72C]/20 text-[#FFC72C] border border-[#FFC72C]/30'
                : 'bg-[#800000]/10 text-[#800000] border border-[#800000]/20'
            }`}
          >
            {part.slice(1, -1)}
          </span>
        );
      }
      return part;
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="or-modal-title"
    >
      <div
        ref={modalRef}
        className={`relative w-full max-w-md sm:max-w-lg overflow-hidden rounded-2xl shadow-2xl transition-all duration-200 border animate-in zoom-in-95 duration-200 my-auto ${
          isDark
            ? 'bg-[#1e1f23] border-[#3e4042] text-[#e4e6eb]'
            : 'bg-white border-[#800000]/20 text-gray-900'
        }`}
      >
        {/* Top Accent Strip */}
        <div
          className={`h-1.5 w-full ${
            isDark
              ? 'bg-gradient-to-r from-[#FFC72C] via-[#8B0000] to-[#FFC72C]'
              : 'bg-gradient-to-r from-pup-maroon via-pup-yellow to-pup-maroon'
          }`}
        />

        <div className="p-5 sm:p-7">
          {/* Header with Title and Close Button */}
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 sm:p-2.5 rounded-xl shrink-0 mt-0.5 ${
                  isDark
                    ? 'bg-[#FFC72C]/15 text-[#FFC72C] border border-[#FFC72C]/30'
                    : 'bg-[#800000]/10 text-pup-maroon border border-pup-maroon/20'
                }`}
              >
                <ExclamationTriangleIcon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.2} />
              </div>
              <div>
                <h3
                  id="or-modal-title"
                  className={`text-base sm:text-xl font-bold leading-tight ${
                    isDark ? 'text-white' : 'text-pup-maroon'
                  }`}
                >
                  {title}
                </h3>
                <div
                  className={`mt-2 text-xs sm:text-sm leading-relaxed ${
                    isDark ? 'text-[#b0b3b8]' : 'text-gray-600'
                  }`}
                >
                  {formatMessage(displayMessage)}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                isDark
                  ? 'text-[#b0b3b8] hover:text-white hover:bg-white/10'
                  : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }`}
              aria-label="Close modal"
            >
              <XMarkIcon className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {/* Checklist Box */}
          {items && items.length > 0 && (
            <div
              className={`mt-4 sm:mt-5 rounded-xl p-3.5 sm:p-5 text-left border ${
                isDark
                  ? 'bg-[#151619] border-[#2e3035]'
                  : 'bg-[#faf6eb] border-[#f0dfad]'
              }`}
            >
              <h4
                className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                  isDark ? 'text-[#FFC72C]' : 'text-[#8B0000]'
                }`}
              >
                Before trying again, please check
              </h4>

              <ul className="mt-2.5 sm:mt-3 space-y-2 sm:space-y-2.5">
                {items.map((item, index) => (
                  <li
                    key={index}
                    className={`flex items-start gap-2 sm:gap-2.5 text-xs sm:text-sm leading-snug ${
                      isDark ? 'text-[#d1d5db]' : 'text-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                        isDark ? 'bg-[#FFC72C]' : 'bg-pup-maroon'
                      }`}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Button */}
          <div className="mt-5 sm:mt-6">
            <button
              type="button"
              onClick={onClose}
              className={`w-full py-2.5 sm:py-3 px-5 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 shadow-md active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer ${
                isDark
                  ? 'bg-pup-yellow hover:bg-[#eeb61b] text-pup-maroon'
                  : 'bg-pup-maroon hover:bg-pup-dark-maroon text-white'
              }`}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default OrValidationErrorModal;
