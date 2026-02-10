import React from "react";
import { NavLink } from 'react-router-dom';
import { 
  Squares2X2Icon, 
  ChartBarSquareIcon, 
  BookOpenIcon, 
  UserCircleIcon,
  ArrowRightStartOnRectangleIcon
} from '@heroicons/react/24/outline';

const StaffNavigation = ({ isOpen, onItemClick }) => {
  const navItems = [
    { name: "Dashboard", to: "dashboard", icon: Squares2X2Icon },
    { name: "Staff Analytics", to: "analytics", icon: ChartBarSquareIcon },
    { name: "Staff Logbook", to: "logbook", icon: BookOpenIcon },
    { name: "Staff Profile", to: "profile", icon: UserCircleIcon },
  ];

  return (
    <aside 
      className={`
        fixed z-40 w-72      
        top-30 lg:top-29
        h-[calc(100vh-140px)] lg:h-[calc(100vh-115px)]
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
          <button className="flex items-center gap-2 bg-pup-dark-maroon text-white px-5 py-2 rounded shadow-md hover:bg-[#3a0303] transition-all mb-4 w-fit font-bold text-sm uppercase">
            <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
            Logout {/* NEED FUNCTION TO LOG OUT USER */}
          </button>
          <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            <span>RIS @ 2026</span>
            <span>v. 1.0.1</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default StaffNavigation;