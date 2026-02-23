import React from "react";

const LoadingOverlay = ({ isVisible = false, message = "Loading..." }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center transform translate-x-32 translate-y-12">
      <div className="w-12 h-12 border-4 border-gray-200 border-t-[#800000] rounded-full animate-spin "></div>   
      <p className="mt-4 text-[#800000] font-bold text-xs uppercase tracking-widest">
        {message}
      </p>
      </div>
    </div>
  );
};

export default LoadingOverlay;