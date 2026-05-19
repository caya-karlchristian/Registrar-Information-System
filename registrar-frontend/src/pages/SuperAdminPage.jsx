import { Outlet } from 'react-router-dom';
import { useState } from "react";
import Header from '../components/Header.jsx';                        
import Navigation from '../components/Navigation.jsx';
import { useTheme } from '../context/ThemeContext';

const SuperAdminPage = () => {
  const { isDark } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className={`flex flex-col h-screen overflow-hidden pt-25 ${isDark ? 'bg-[#18191a] text-[#e4e6eb]' : 'bg-[#F5F5F5]'}`}>
      <Header onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

      <div className="flex flex-1 overflow-hidden relative">
        <Navigation
          isOpen={isMobileMenuOpen}
          onItemClick={() => setIsMobileMenuOpen(false)}
          role="superAdmin"
        />

        <main className={`flex-1 w-full overflow-y-auto p-4 lg:p-8 lg:ml-72 transition-all duration-300 ease-in-out ${isDark ? 'bg-[#18191a]' : ''}`}>
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SuperAdminPage;