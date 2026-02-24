import React, { useState, useRef } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { alumni_documents } from '../utils/constants'; 

const AlumniDocumentList = () => {
  const [openId, setOpenId] = useState(null);
  const contentRefs = useRef({}); // store refs for each accordion content

  const toggleAccordion = (id) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans">
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-10">
        {/* --- HEADER --- */}
        <div className="mb-8 border-b-2 border-[#4a120e]/10 pb-6">
          <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">
            Document List <span className="text-[#4a120e]">&</span> Requirements
          </h1>
        </div>

        {/* --- FIXED GRID LAYOUT --- */}
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {alumni_documents.map((doc) => {
            const isOpen = openId === doc.id;
            const contentHeight = contentRefs.current[doc.id]?.scrollHeight || 0;

            return (
              <div
                key={doc.id}
                className={`transition-all duration-300 bg-white h-fit border rounded-[2rem] overflow-hidden ${
                  isOpen
                    ? 'border-[#4a120e] shadow-xl ring-1 ring-[#4a120e]/10'
                    : 'border-gray-200 shadow-sm hover:border-gray-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(doc.id)}
                  className={`w-full flex justify-between items-center p-7 text-left focus:outline-none transition-colors ${
                    isOpen ? 'bg-[#4a120e]/5' : 'bg-white'
                  }`}
                >
                  <h4
                    className={`text-base font-black tracking-tight leading-tight flex-1 pr-4 ${
                      isOpen ? 'text-[#4a120e]' : 'text-gray-800'
                    }`}
                  >
                    {doc.title}
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
                  ref={(el) => (contentRefs.current[doc.id] = el)}
                  style={{
                    maxHeight: isOpen ? `${contentHeight}px` : '0px',
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
                          {doc.desc}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-[1.5rem] p-5 border border-gray-100">
                        <h5 className="text-[9px] font-black text-[#4a120e] uppercase tracking-[0.2em] mb-4">
                          Requirements
                        </h5>
                        <ul className="space-y-3">
                          {doc.reqs.map((req, i) => (
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
