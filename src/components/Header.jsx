import { useState, useEffect } from "react";
import Navigation from "../components/Navigation.jsx";
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

function Header() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // This ensures the body doesn't scroll when the sidebar is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isSidebarOpen]);

  return (
    <div className="relative w-full font-sans">
      <header className="bg-white w-full shadow-sm relative z-20 border-b-[5px] border-pup-yellow">        
        <div className="w-full px-4 py-4 flex justify-between items-center">          
          <div className="flex space-x-4">
            <img
              src="/src/assets/puplogoimage.png"
              alt="PUP Logo"
              className="w-16 h-16 lg:w-23 lg:h-23"
            />
            <div className="flex flex-col justify-center">
              <h1 className="text-pup-maroon font-bold text-[14px] uppercase lg:text-[22px] leading-tight font-inter">
                POLYTECHNIC UNIVERSITY OF THE PHILIPPINES - TAGUIG CAMPUS
              </h1>
              <p className="text-pup-maroon text-[10px] uppercase lg:text-[13px] font-inter">
                THE COUNTRY’S 1ST POLYTECHNIC
              </p>
            </div>
          </div>

          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Bars3Icon className="w-10 h-10 text-pup-maroon" />
          </button>
        </div>
      </header>

      {/* 2. THE OVERLAY BACKDROP (Removes white space/interaction with background) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 right-0 h-full bg-pup-maroon z-50 shadow-2xl transition-transform duration-300 ease-in-out
        w-72 flex flex-col
        ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}
      `}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-red-900 bg-pup-dark-maroon flex justify-between items-center">
           <span className="text-white font-bold uppercase tracking-widest text-sm">Menu</span>
           <button onClick={() => setIsSidebarOpen(false)}>
              <XMarkIcon className="w-8 h-8 text-white hover:text-pup-yellow transition-colors" />
           </button>
        </div>

        <div className="px-6 py-10 bg-gradient-to-b from-[#700000] to-pup-maroon border-b border-white/10 relative overflow-hidden group">
  
      {/* Abstract Background Decoration */}
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-pup-yellow/5 rounded-full blur-3xl group-hover:bg-pup-yellow/10 transition-all duration-700" /> 
        <div className="flex flex-col items-center relative z-10">
          {/* Avatar with Status Pulse */}
          <div className="relative mb-4">
            <div className="w-18 h-18 bg-white rounded-2xl flex items-center justify-center border-2 border-pup-yellow shadow-[0_10px_20px_-5px_rgba(0,0,0,0.3)] transform -rotate-3 group-hover:rotate-0 transition-transform duration-500">
              <span className="text-pup-maroon font-black text-2xl tracking-tighter">AD</span>
            </div>
            
            {/* Online/Active Indicator */}
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500 border-4 border-[#700000]"></span>
            </div>
          </div>

            <div className="text-center">
              <p className="text-white font-bold text-sm tracking-wide uppercase">
                Registrar Admin
              </p>
              <div className="flex items-center justify-center gap-2 mt-1">
              </div>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <div className="flex-1 overflow-y-auto">
          <Navigation mobile={true} onItemClick={() => setIsSidebarOpen(false)} />
        </div>

        <div className="p-6 bg-black/20 border-t border-white/5">
          <div className="flex items-center justify-between opacity-50 text-[9px] text-white uppercase tracking-[0.3em]">
            <span>v2.0.4</span>
            <span>© 2026 RIS</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default Header;