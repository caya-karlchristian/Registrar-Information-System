import { Outlet } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Navigation from '../components/Navigation.jsx';
import { useState } from 'react';

const StudentPage = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F5F5F5] pt-25">
      <Header onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

      <div className="flex flex-1 overflow-hidden relative">
        <Navigation 
          isOpen={isMobileMenuOpen} 
          onItemClick={() => setIsMobileMenuOpen(false)}
          role="student"
        />

        <main className="flex-1 w-full overflow-y-auto pt-10 p-4 lg:pt-15 lg:p-8 lg:ml-72 transition-all duration-300 ease-in-out">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentPage;