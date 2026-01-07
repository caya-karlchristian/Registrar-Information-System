import React from "react";
import { Link } from 'react-router-dom'

const StaffNavigation = ({ mobile = false }) => {
  const desktopLink = "flex-1 flex items-center justify-center text-white text-sm font-bold uppercase tracking-wider py-4 hover:bg-[#5a0c0e] transition-colors duration-200 ";
  const mobileLink = "block text-white text-sm font-bold uppercase tracking-wider py-3 px-6 border-b border-red-900 hover:bg-[#5a0c0e]";

  return (
    <nav className="w-full">
      <ul className={`flex ${mobile ? "flex-col" : "flex-row"} list-none m-0 p-0 w-full`}>
        
        <li className={mobile ? "" : "flex-1"}>
          <Link to="dashboard" className={mobile ? mobileLink : desktopLink}>
            Staff Dashboard
          </Link>
        </li>

        <li className={mobile ? "" : "flex-1"}>
          <Link to="analytics" className={mobile ? mobileLink : desktopLink}>
            Staff Analytics
          </Link>
        </li>
        {/* ADD GENERATE REPORT */}
      </ul>
    </nav>
  );
};

export default StaffNavigation;