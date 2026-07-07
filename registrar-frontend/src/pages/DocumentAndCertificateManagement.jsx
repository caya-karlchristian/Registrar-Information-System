import React, { useState } from "react";
import DocumentManagement from "../layouts/DocumentManagement.jsx";
import CertificateTemplateManagement from "../layouts/CertificateTemplateManagement.jsx";
import { useTheme } from "../context/ThemeContext";
import {
  TableCellsIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
const DocumentAndCertificateManagement = () => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState("documents"); // "documents" or "certificates"

  return (
    <div className={`font-sans ${isDark ? 'text-[#e4e6eb]' : ''}`}>
      
      {/* Tab Switcher Navigation */}
      <div className="flex justify-center mx-4 sm:mx-6 mb-5">
        <div className={`inline-flex px-8 py-3.5 rounded-full transition-all duration-300 hover:-translate-y-0.5 ${
          isDark 
            ? 'bg-[#242526] border border-[#3e4042] shadow-[0_2px_8px_rgba(0,0,0,0.2)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.35)]' 
            : 'bg-white border border-gray-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]'
        } gap-8 items-center`}>
          <button
            onClick={() => setActiveTab("documents")}
            className={`text-sm relative rounded-full flex items-center justify-center shrink-0 font-semibold transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
              activeTab === "documents"
                ? isDark
                  ? "text-yellow-400 font-bold"
                  : "text-pup-dark-maroon font-black"
                : isDark
                ? "text-[#b0b3b8] hover:text-white"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {/* <ClipboardDocumentCheckIcon className={`gap-3 ${isDark ? 'text-gray-400' : 'text-gray-400'} h-5 w-5`} /> */}
            Document Management
          </button>
          <button
            onClick={() => setActiveTab("certificates")}
            className={`text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
              activeTab === "certificates"
                ? isDark
                  ? "text-yellow-400 font-bold"
                  : "text-pup-dark-maroon font-black"
                : isDark
                ? "text-[#b0b3b8] hover:text-white"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Certificate Logo Management
          </button>
        </div>
      </div>

      {/* Conditional Layout Rendering */}
      {activeTab === "documents" ? (
        <DocumentManagement />
      ) : (
        <CertificateTemplateManagement />
      )}
    </div>
  );
};

export default DocumentAndCertificateManagement;
