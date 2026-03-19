import React from "react";
import risLogo from "../assets/ris_logo.png";

const LoadingOverlay = ({ isVisible = false, message = "Loading..." }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">

        {/* Jumping logo */}
        <img
          src={risLogo}
          alt="RIS Logo"
          className="w-14 h-14 object-contain animate-bounce"
          style={{ animationDelay: "0s" }}
        />

        {/* Jumping message — letter by letter */}
        <div className="flex gap-[2px]">
          {message.split("").map((char, i) => (
            <span
              key={i}
              className="text-[#800000] font-bold text-xs uppercase tracking-widest animate-bounce inline-block"
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