import React from "react";
import { Link } from 'react-router-dom'

const Navigation = ({ mobile = false }) => {
  const desktopLink = "flex-1 flex items-center justify-center text-white text-sm font-bold uppercase tracking-wider py-4 hover:bg-[#5a0c0e] transition-colors duration-200 ";
  const mobileLink = "block text-white text-sm font-bold uppercase tracking-wider py-3 px-6 border-b border-red-900 hover:bg-[#5a0c0e]";

  return (
    <nav className="w-full">
      <ul className={`flex ${mobile ? "flex-col" : "flex-row"} list-none m-0 p-0 w-full`}>
        
        <li className={mobile ? "" : "flex-1"}>
          <Link to="/home" className={mobile ? mobileLink : desktopLink}>
            Home
          </Link>
        </li>

        <li className={mobile ? "" : "flex-1"}>
          <Link to="/analytics" className={mobile ? mobileLink : desktopLink}>
            Staff Analytics
          </Link>
        </li>

        <li className={mobile ? "" : "flex-1"}>
          <Link to="/lists" className={mobile ? mobileLink : desktopLink}>
            Lists
          </Link>
        </li>

        <li className={mobile ? "" : "flex-1"}>
          <Link to="/student_request" className={mobile ? mobileLink : desktopLink}>
            Student Request
          </Link>
        </li>

        <li className={mobile ? "" : "flex-1"}>
          <Link to="/alumni_request" className={mobile ? mobileLink : desktopLink}>
            Alumni Request
          </Link>
        </li>

        <li className={mobile ? "" : "flex-1"}>
          <Link to="/faqs" className={mobile ? mobileLink : desktopLink}>
            FAQs
          </Link>
        </li>

      </ul>
    </nav>
  );
};

export default Navigation;