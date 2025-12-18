import React from "react";

const Navigation = ({ mobile = false }) => {
  const desktopLink = "flex-1 flex items-center justify-center text-white text-sm font-bold uppercase tracking-wider py-4 hover:bg-[#5a0c0e] transition-colors duration-200 ";
  const mobileLink = "block text-white text-sm font-bold uppercase tracking-wider py-3 px-6 border-b border-red-900 hover:bg-[#5a0c0e]";

  return (
    <nav className="w-full !bg-transparent">
      <ul className={`flex ${mobile ? "flex-col" : "flex-row"} list-none m-0 p-0 w-full`}>
        
        <li className={mobile ? "" : "flex-1"}>
          <a href="/" className={mobile ? mobileLink : desktopLink}>
            Home
          </a>
        </li>

        <li className={mobile ? "" : "flex-1"}>
          <a href="/about" className={mobile ? mobileLink : desktopLink}>
            About
          </a>
        </li>

        <li className={mobile ? "" : "flex-1"}>
          <a href="/lists" className={mobile ? mobileLink : desktopLink}>
            Lists
          </a>
        </li>

        <li className={mobile ? "" : "flex-1"}>
          <a href="/request" className={mobile ? mobileLink : desktopLink}>
            Request
          </a>
        </li>

        <li className={mobile ? "" : "flex-1"}>
          <a href="/faqs" className={mobile ? mobileLink : desktopLink}>
            FAQs
          </a>
        </li>

      </ul>
    </nav>
  );
};

export default Navigation;