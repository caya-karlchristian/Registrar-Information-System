import { Outlet } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Navigation from '../components/Navigation.jsx';
import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const StudentPage = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isDark } = useTheme();
  const [headerHeight, setHeaderHeight] = useState(101);

  useEffect(() => {
    const headerElement = document.querySelector('header');
    if (!headerElement) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setHeaderHeight(entry.target.offsetHeight);
      }
    });
    resizeObserver.observe(headerElement);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div 
      style={{ paddingTop: `${headerHeight}px` }}
      className={`flex flex-col h-screen overflow-hidden ${isDark ? 'bg-[#18191a]' : 'bg-[#F5F5F5]'}`}
    >
      <Header onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

      <div className="flex flex-1 overflow-hidden relative">
        <Navigation 
          isOpen={isMobileMenuOpen} 
          onItemClick={() => setIsMobileMenuOpen(false)}
          role="student"
        />

        <main className={`flex-1 w-full overflow-y-auto pt-10 p-4 lg:pt-10 lg:p-8 lg:ml-72 transition-all duration-300 ease-in-out ${isDark ? 'bg-[#18191a]' : 'bg-[#F5F5F5]'}`}>
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentPage;