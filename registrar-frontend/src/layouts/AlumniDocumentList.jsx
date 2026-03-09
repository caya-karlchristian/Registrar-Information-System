import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { getDocumentTypes } from '../services/API';
import LineLoading from '../components/LineLoading.jsx'

const ALUMNI_IDS = [1, 3, 2, 4, 6, 5]; 

const AlumniDocumentList = () => {
  const [openId, setOpenId] = useState(null);
  const contentRefs = useRef({}); 
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const res = await getDocumentTypes();
        const all = res.data ?? [];
        setDocuments(all.filter(doc => ALUMNI_IDS.includes(doc.document_type_id)));
      } catch (err) {
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
    <div className="min-h-screen bg-gray-50/50 font-sans relative">
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-10">
        <LineLoading isVisible={loading} /> 
        {/* --- HEADER --- */}
        <div className="mb-8 border-b-2 border-[#4a120e]/10 pb-6">
          <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">
            Document List <span className="text-[#4a120e]">&</span> Requirements
          </h1>
        </div>

        {/* --- FIXED GRID LAYOUT --- */}
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {documents.map((doc) => {
            const id = doc.document_type_id;
            const isOpen = openId === id;
            const contentHeight = contentRefs.current[id]?.scrollHeight || 0;

            return (
              <div
                key={id}
                className={`transition-all duration-300 bg-white h-fit border rounded-[2rem] overflow-hidden ${
                  isOpen
                    ? 'border-[#4a120e] shadow-xl ring-1 ring-[#4a120e]/10'
                    : 'border-gray-200 shadow-sm hover:border-gray-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(id)}
                  className={`w-full flex justify-between items-center p-7 text-left focus:outline-none transition-colors ${
                    isOpen ? 'bg-[#4a120e]/5' : 'bg-white'
                  }`}
                >
                  <h4
                    className={`text-base font-black tracking-tight leading-tight flex-1 pr-4 ${
                      isOpen ? 'text-[#4a120e]' : 'text-gray-800'
                    }`}
                  >
                    {doc.document_name}
                  </h4>

                  <span
                    className={`p-2 rounded-full transition-all duration-300 shrink-0 ${
                      isOpen
                        ? 'bg-[#4a120e] text-white rotate-180'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <ChevronDownIcon className="w-4 h-4" />
                  </span>
                </button>

                <div
                  ref={(el) => (contentRefs.current[id] = el)}
                  style={{
                    maxHeight: isOpen ? `1000px` : '0px',
                  }}
                  className="transition-all duration-500 ease-in-out overflow-hidden"
                >
                  <div className="px-7 pb-7 pt-0">
                    <div className="h-px bg-gray-100 mb-5" />
                    <div className="space-y-5">
                      <div>
                        <h5 className="text-[9px] font-black text-[#4a120e] uppercase tracking-[0.2em] mb-2">
                          Description
                        </h5>
                        <p className="text-gray-600 italic text-[13px] leading-relaxed">
                          {doc.document_description}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-[1.5rem] p-5 border border-gray-100">
                        <h5 className="text-[9px] font-black text-[#4a120e] uppercase tracking-[0.2em] mb-4">
                          Requirements
                        </h5>
                        <ul className="space-y-3">
                          {(doc.document_requirements || []).map((req, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-3 text-[12px] text-gray-700 font-bold"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-[#4a120e] mt-1.5 shrink-0" />
                              <span className="flex-1 leading-snug">{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </main>
      </div>
    </div>
  );
};

export default AlumniDocumentList;
