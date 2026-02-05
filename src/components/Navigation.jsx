import React from "react";
import { NavLink } from 'react-router-dom';
import { 
  HomeIcon, 
  TableCellsIcon, 
  ClipboardDocumentCheckIcon, 
  UserGroupIcon, 
  QuestionMarkCircleIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const Navigation = ({ isCollapsed = false, onItemClick }) => {
  const navItems = [
    { name: "Dashboard", to: "home", icon: HomeIcon },
    { name: "Document Lists", to: "lists", icon: TableCellsIcon },
    { name: "Student Requests", to: "request", icon: ClipboardDocumentCheckIcon },
    { name: "Student Profile", to: "profile", icon: UserGroupIcon },
    { name: "FAQs & Support", to: "faqs", icon: QuestionMarkCircleIcon },
  ];

  return (
    <nav className="flex flex-col space-y-1 px-3 gap-4 mt-4">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onItemClick}
          className={({ isActive }) => `
            group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300
            ${isActive 
              ? "bg-white/15 text-pup-yellow shadow-lg backdrop-blur-md" 
              : "text-red-100 hover:bg-white/5 hover:translate-x-1"}
          `}
        >
          <div className="flex items-center gap-4">
            <item.icon className={`w-6 h-6 transition-colors ${isCollapsed ? "mx-auto" : ""}`} />
            {!isCollapsed && (
              <span className="text-sm font-bold uppercase tracking-widest whitespace-nowrap">
                {item.name}
              </span>
            )}
          </div>
          
          {!isCollapsed && (
            <ChevronRightIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </NavLink>
      ))}
    </nav>
  );
};

export default Navigation;