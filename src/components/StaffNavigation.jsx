import React, { useState } from "react";
import { NavLink,  useNavigate  } from 'react-router-dom';
import { 
  Squares2X2Icon, 
  ChartBarSquareIcon, 
  BookOpenIcon, 
  UserCircleIcon,
  DocumentCheckIcon,
  ArrowRightStartOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from "../context/AuthProvider"; 
import ConfirmationModal from "../components/ConfirmationModal";


const StaffNavigation = ({ isOpen, onItemClick }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const navItems = [
    { name: "Dashboard", to: "dashboard", icon: Squares2X2Icon },
    { name: "Staff Analytics", to: "analytics", icon: ChartBarSquareIcon },
    { name: "Certification", to: "certification", icon: DocumentCheckIcon },
    { name: "Staff Logbook", to: "logbook", icon: BookOpenIcon },
    { name: "Staff Profile", to: "profile", icon: UserCircleIcon },
  ];

  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'default',
    onConfirm: () => {},
  });

  const handleLogoutClick = () => {
    setModal({
      isOpen: true,
      title: 'Logout Session',
      message: 'Are you sure you want to log out? Any unsaved changes in the registrar system may be lost.',
      type: 'default', 
      onConfirm: () => {
        logout();
        navigate("/", { replace: true });
      }
    });
  };

  const closeModal = () => setModal({ ...modal, isOpen: false });

  return (
    <>
    <aside 
      className={`
        fixed z-40 w-72      
        top-25 lg:top-29 md:top-25 
        h-[calc(100vh-100px)] lg:h-[calc(100vh-115px)] md:h-[calc(100vh-100px)]
        lg:left-0 right-0 
        bg-[#E0E0E0] border-l lg:border-r border-gray-300 flex flex-col
        transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
      `}
    >
      <div className="flex flex-col h-full">
        {/* Profile Section */}
        <div className="p-6 shrink-0">
          <div className="flex items-center gap-3">
            <UserCircleIcon className="w-14 h-14 lg:w-17 lg:h-17 text-gray-700" />
            <div className="flex flex-col">
              <h2 className="text-pup-maroon font-black text-l leading-tight uppercase">
                sir mhel {/* NEED API TO DISPLAY USER NAME */}
              </h2>
              <span className="text-gray-500 text-xs font-medium">mhel@gmail.com</span> {/* NEED API TO DISPLAY EMAIL */}
            </div>
          </div>
          <hr className="mt-6 border-gray-400" />
        </div>

        <nav className="flex-1 px-4 py-3 space-y-3 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onItemClick}
              className={({ isActive }) => `
                group flex items-center gap-4 px-4 py-4 rounded-lg font-bold
                ${isActive ? "bg-pup-dark-maroon text-white" : "text-[#700000] hover:bg-black/5"}
              `}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm uppercase tracking-wider">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-6 mt-auto shrink-0 lg:p-3 lg:px-4">
          <button onClick={handleLogoutClick} className="flex items-center gap-2 bg-pup-dark-maroon text-white px-5 py-2 rounded shadow-md hover:bg-[#3a0303] transition-all mb-4 w-fit font-bold text-sm uppercase">
            <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
            Logout 
          </button>
          <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            <span>RIS @ 2026</span>
            <span>v. 1.0.1</span>
          </div>
        </div>
      </div>
    </aside>
      <ConfirmationModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </>
  );
};

export default StaffNavigation;