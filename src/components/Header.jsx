import React, { useState, useEffect } from "react";
import Navigation from "./Navigation.jsx";
import { Bars3Icon, BellIcon } from '@heroicons/react/24/outline';

function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="w-full font-sans">
      <header className="bg-white w-full shadow-sm relative z-10 border-b-[5px] border-[#FFC72C] md:border-none">        
        <div className="w-full px-4 py-4 flex justify-between items-center">          
    
          <div className="flex space-x-4">
            <img
              src="/src/assets/puplogoimage.png"
              alt="PUP Logo"
              className="w-24 h-20 lg:w-32 lg:h-32"
            />
            <div className="flex flex-col justify-center relative">
              <h1 className="text-pup-maroon font-bold text-[14px] uppercase lg:text-[25px] leading-tight font-inter -mt-3">
                Polytechnic University of the Philippines - Taguig Campus
              </h1>
              <p className="text-pup-maroon text-[10px] uppercase lg:text-[14px] font-inter mt-2">
                The Country's 1st Polytechnic
              </p>
            </div>
          </div>

          {/* CONDITIONS FOR DESKTOP AND MOBILE */}
          <div className="flex items-center">
            {!isMobile && (
              <button className="p-2 mr-4 hover:bg-gray-100 rounded-full transition-colors">
                <BellIcon className="w-8 h-8 text-[#800000]" />
              </button>
            )}

            {isMobile && (
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                <Bars3Icon className="w-10 h-10 text-[#800000]" />
              </button>
            )}
            
          </div>
        </div>
      </header>

      {!isMobile && (
        <div className="w-full">
          <div className="bg-[#7B1113] w-full border-b-[5px] border-[#FFC72C]"> 
            <div className="w-full px-4">
              <Navigation mobile={false} />
            </div>
          </div>
        </div>
      )}

      {isMobile && isMobileMenuOpen && (
        <div className="bg-[#7B1113] w-full z-10">
          <Navigation mobile={true} />
        </div>
      )}
    </div>
  );
}

export default Header;