import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, ClockIcon  } from '@heroicons/react/24/outline';
import { getDocumentTypes } from '../services/api';
import LoadingOverlay from '../components/LoadingOverlay.jsx';
import { useTheme } from '../context/ThemeContext';

const ensureArray = (data) => {
    if (Array.isArray(data)) return data; // Already an array
    if (typeof data === 'string' && data.trim().length > 0) {
      return data.split(',').map(item => item.trim()); // Convert string to array
    }
    return []; 
  };

const ALUMNI_ACCESS_IDS = [2, 3];

const AlumniDocumentList = () => {
  const [openId, setOpenId] = useState(null);
  const contentRefs = useRef({}); 
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const res = await getDocumentTypes();
        const all = res.data ?? [];
        setDocuments(all.filter(doc => ALUMNI_ACCESS_IDS.includes(doc.access_id)));      } catch (err) {
        console.error("Failed to fetch documents:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, []);

  const toggleAccordion = (id) => {
    setOpenId(openId === id ? null : id);
  };

  return (
      <div className="w-full pb-10 relative">      
        <LoadingOverlay isVisible={loading} message="Loading Documents..." />
        {/* --- HEADER --- */}
        <div className={`mb-8 border-b-2 pb-6 ${isDark ? 'border-yellow-600/30' : 'border-[#4a120e]/10'}`}>
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${isDark ? 'text-[#e4e6eb]' : 'text-gray-800'}`}>
            Document List <span className={isDark ? 'text-yellow-400' : 'text-[#4a120e]'}>&</span> Requirements
          </h1>
        </div>

        {/* --- FIXED GRID LAYOUT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {documents.length === 0 && !loading ? (
            <p className={`italic col-span-2 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'}`}>No documents available.</p>
          ) : (
          documents.map((doc) => {
            const id = doc.document_type_id;
            const isOpen = openId === id;
            const contentHeight = contentRefs.current[id]?.scrollHeight || 0;
            
            const requirements = ensureArray(doc.document_requirements);
            
            return (
              <div
                key={id}
                className={`transition-all duration-300 h-fit border rounded-4xl overflow-hidden ${
                  isOpen
                    ? `border-[#4a120e] shadow-xl ring-1 ring-[#4a120e]/10 ${isDark ? 'bg-[#242526]' : 'bg-white'}`
                    : `shadow-sm ${isDark ? 'bg-[#242526] border-[#3e4042] hover:border-[#4e4f50]' : 'bg-white border-gray-200 hover:border-gray-300'}`
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(id)}
                  className={`w-full flex justify-between items-center p-7 text-left focus:outline-none transition-colors ${
                    isOpen ? (isDark ? 'bg-[#4a120e]/10' : 'bg-[#4a120e]/5') : (isDark ? 'bg-[#242526]' : 'bg-white')
                  }`}
                >
                  <div className="flex-1 pr-4">
                    <h4 className={`text-base font-black tracking-tight leading-tight ${isOpen ? (isDark ? 'text-white' : 'text-[#4a120e]') : (isDark ? 'text-[#e4e6eb]' : 'text-gray-800')}`}>
                      {doc.document_name}
                    </h4>
                    {/* Compact Processing Period Preview */}
                    {isOpen && doc.document_process_period && (
                      <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 mt-1 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'}`}>
                        <ClockIcon className="w-3 h-3" /> {doc.document_process_period} processing day/s
                      </span>
                    )}
                  </div>

                  <span
                    className={`p-2 rounded-full transition-all duration-300 shrink-0 ${
                      isOpen
                        ? 'bg-[#4a120e] text-white rotate-180'
                        : (isDark ? 'bg-[#3a3b3c] text-[#b0b3b8]' : 'bg-gray-100 text-gray-400')
                    }`}
                  >
                    <ChevronDownIcon className="w-4 h-4" />
                  </span>
                </button>

                <div
                  ref={(el) => (contentRefs.current[id] = el)}
                  style={{
                    maxHeight: isOpen ? `${contentHeight + 100}px` : '0px',
                  }}
                  className="transition-all duration-500 ease-in-out overflow-hidden"
                >
                  <div className="px-7 pb-7 pt-0">
                    <div className={`h-px mb-5 ${isDark ? 'bg-[#3e4042]' : 'bg-gray-100'}`} />
                    <div className="space-y-5">
                      <div>
                        <h5 className={`text-[9px] font-black uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-white' : 'text-[#4a120e]'}`}>
                          Description
                        </h5>
                        <p className={`italic text-[13px] leading-relaxed ${isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}`}>
                          {doc.document_description || "No description provided."}
                        </p>
                      </div>
                      <div className={`rounded-3xl p-5 border ${isDark ? 'bg-[#1a1b1e] border-[#3e4042]' : 'bg-gray-50 border-gray-100'}`}>
                        <h5 className={`text-[9px] font-black uppercase tracking-[0.2em] mb-4 ${isDark ? 'text-white' : 'text-[#4a120e]'}`}>
                          Requirements
                        </h5>
                        <ul className="space-y-3">
                          {requirements.length > 0 ? (
                            requirements.map((req, i) => (
                              <li
                                key={i}
                                className={`flex items-start gap-3 text-[12px] font-bold ${isDark ? 'text-[#b0b3b8]' : 'text-gray-700'}`}
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-[#4a120e] mt-1.5 shrink-0" />
                                <span className="flex-1 leading-snug">{req}</span>
                              </li>
                            ))
                          ) : (
                            <li className={`text-[12px] italic ${isDark ? 'text-[#b0b3b8]/60' : 'text-gray-400'}`}>No specific requirements listed.</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>
  );
};

export default AlumniDocumentList;
