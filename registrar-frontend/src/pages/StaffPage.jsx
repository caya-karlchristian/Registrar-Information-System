import { useState, useEffect } from "react";
import { Outlet, useNavigate} from 'react-router-dom';
import StaffHeaderNav from '../components/StaffHeaderNav.jsx';
import StaffNavigation from '../components/StaffNavigation.jsx';
// import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';

const StaffPage = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

    useEffect(() => {
      if (isMobileMenuOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
    }, [isMobileMenuOpen]);
  
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-[#F5F5F5]">
        <StaffHeaderNav onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
  
        <div className="flex flex-1 overflow-hidden relative">
          <StaffNavigation
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
          {/* <button
            onClick={() => navigate('/staff/contact')} // This directs the main content to display the email design
            className="fixed bottom-2 right-8 z-50 bg-pup-dark-maroon p-4 rounded-full shadow-2xl hover:scale-110 transition-all active:scale-95 group border-2 border-white/20"
            >
            <ChatBubbleLeftRightIcon className="w-4 h-4 text-white" />
        </button> */}
        </div>
      </div>
    );
  };

export default StaffPage;
