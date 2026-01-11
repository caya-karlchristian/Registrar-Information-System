import React from "react";

const LoadingOverlay = () => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="flex flex-col items-center">
        
        <div className="w-16 h-16 border-4 border-white border-t-pup-yellow rounded-full animate-spin shadow-lg"></div>
        
        <p className="mt-6 text-white font-bold text-xl tracking-wider animate-bounce drop-shadow-lg">
          Loading...
        </p>
      </div>
    </div>
  );
};

export default LoadingOverlay;