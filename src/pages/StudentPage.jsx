import { Outlet } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Navigation from '../components/Navigation.jsx';
import React, { useState, useEffect } from 'react'; 

const StudentPage = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileMenuOpen]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F5F5F5]">
      <Header onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

      <div className="flex flex-1 overflow-hidden relative">
        <Navigation 
          isOpen={isMobileMenuOpen} 
          onItemClick={() => setIsMobileMenuOpen(false)} 
        />

        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 lg:ml-72 transition-all duration-300 ease-in-out">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentPage;