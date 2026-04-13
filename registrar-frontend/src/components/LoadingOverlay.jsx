import React from "react";
import risLogo from "../assets/ris_logo.png";

const LoadingOverlay = ({ isVisible = false, message = "Loading..." }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-x-0 top-24 bottom-0 z-30 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm px-4 lg:left-72 lg:w-[calc(100vw-18rem)]">
      <div className="flex flex-col items-center gap-3 sm:gap-4 text-center max-w-[90vw] lg:translate-x-15">

        {/* Jumping logo */}
        <img
          src={risLogo}
          alt="RIS Logo"
          className="w-12 h-12 sm:w-14 sm:h-14 object-contain animate-bounce"
          style={{ animationDelay: "0s" }}
        />

        {/* Jumping message — letter by letter */}
        <div className="flex flex-wrap justify-center gap-0.5 max-w-full">
          {message.split("").map((char, i) => (
            <span
              key={i}
              className="text-[#800000] font-bold text-[10px] sm:text-xs uppercase tracking-wide sm:tracking-widest animate-bounce inline-block"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;