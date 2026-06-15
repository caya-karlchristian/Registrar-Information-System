import { useState, useEffect, useRef } from "react";
import { useToast } from "../context/NotificationToastContext";

const FloatingActionMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVoiceAnimating, setIsVoiceAnimating] = useState(false);
  const { addToast } = useToast();
  const menuRef = useRef(null);

  const toggleMenu = () => setIsOpen((prev) => !prev);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleAccessibilityClick = () => {
    const siennaBtn = document.querySelector(".asw-menu-btn");
    if (siennaBtn) {
      siennaBtn.click();
    } else {
      console.warn("Sienna Accessibility widget launcher button (.asw-menu-btn) not found in the DOM.");
      addToast({
        type: "payment_invalid",
        title: "Accessibility Menu",
        message: "The accessibility widget is still loading. Please try again in a moment.",
      });
    }
  };

  const handleVoiceSpeechClick = () => {
    setIsVoiceAnimating(true);
    setTimeout(() => {
      setIsVoiceAnimating(false);
      setIsOpen(false);
    }, 2000);
  };

  return (
    <div
      ref={menuRef}
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
      role="region"
      aria-label="Quick Access Menu"
    >
      {/* Submenu items */}
      <div
        className={`flex flex-col gap-3 mb-1 transition-all duration-300 transform origin-bottom ${isOpen
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-y-4 scale-75 pointer-events-none"
          }`}
      >
        {/* Accessibility Submenu Option */}
        <div className="flex items-center justify-end relative group">
          <span className="absolute right-16 bg-gray-900/90 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            Accessibility Options
          </span>
          <button
            onClick={() => {
              handleAccessibilityClick();
              setIsOpen(false);
            }}
            className="w-14 h-14 rounded-full bg-pup-dark-maroon hover:bg-[#500000] text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-yellow-400"
            aria-label="Open Accessibility Menu"
            title="Accessibility Options"
          >
            <svg
              className="w-7 h-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="5.5" r="2" fill="currentColor" stroke="none" />
              <path d="M5 11h14" />
              <path d="M12 7.5v8" />
              <path d="M8.5 21.5L12 15.5L15.5 21.5" />
            </svg>
          </button>
        </div>

        {/* Voice Speech Submenu Option */}
        <div className="flex items-center justify-end relative group">
          <span className="absolute right-16 bg-gray-900/90 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            Voice Speech
          </span>
          <button
            onClick={handleVoiceSpeechClick}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-yellow-400 ${isVoiceAnimating
                ? "bg-pup-yellow text-[#800000] scale-110"
                : "bg-pup-dark-maroon text-white hover:bg-[#500000]"
              }`}
            aria-label="Voice Speech"
            title="Voice Speech"
            disabled={isVoiceAnimating}
          >
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M3 11v2" className={isVoiceAnimating ? "animate-wave-1" : ""} />
              <path d="M6 9v6" className={isVoiceAnimating ? "animate-wave-2" : ""} />
              <path d="M9 6v12" className={isVoiceAnimating ? "animate-wave-3" : ""} />
              <path d="M12 3v18" className={isVoiceAnimating ? "animate-wave-4" : ""} />
              <path d="M15 6v12" className={isVoiceAnimating ? "animate-wave-3" : ""} />
              <path d="M18 9v6" className={isVoiceAnimating ? "animate-wave-2" : ""} />
              <path d="M21 11v2" className={isVoiceAnimating ? "animate-wave-1" : ""} />
            </svg>
          </button>
        </div>
      </div>

      <button
        onClick={toggleMenu}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={isOpen ? "Close Quick Access Menu" : "Open Quick Access Menu"}
        className="w-14 h-14 rounded-full bg-pup-dark-maroon hover:bg-[#500000] text-white flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-yellow-400/50"
      >
        <span
          className={`transform transition-transform duration-300 ${isOpen ? "rotate-45" : "rotate-0"
            }`}
        >
          <svg
            className="w-7 h-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
      </button>
    </div>
  );
};

export default FloatingActionMenu;
