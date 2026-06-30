import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronDownIcon, ClockIcon } from '@heroicons/react/24/outline';
import { getDocumentTypes } from '../services/api';
import LoadingOverlay from '../components/LoadingOverlay.jsx';
import { useTheme } from '../context/ThemeContext';
import { DocumentListSkeleton } from '../components/LoadingSkeleton';

const ensureArray = (data) => {
  if (Array.isArray(data)) return data; // Already an array
  if (typeof data === 'string' && data.trim().length > 0) {
    return data.split(',').map(item => item.trim()); // Convert string to array
  }
  return []; // Fallback for null or empty
};

const splitRequirementItems = (data) => {
  const baseItems = ensureArray(data);
  const items = [];

  baseItems.forEach((item) => {
    const text = String(item || '').trim();
    if (!text) return;

    const lineParts = text.split(/\r?\n/);
    lineParts.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const numberedSplit = trimmed.split(/\s(?=\d+\.\s)/);
      numberedSplit.forEach((part) => {
        const reminderSplit = part.split(/\s(?=Reminder:)/i);
        reminderSplit.forEach((chunk) => {
          const clean = chunk.trim();
          if (clean) items.push(clean);
        });
      });
    });
  });

  return items;
};

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

const splitTextWithLinks = (text) => {
  const value = String(text);
  const parts = [];
  let lastIndex = 0;

  for (const match of value.matchAll(URL_REGEX)) {
    const url = match[0];
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push({ type: 'text', value: value.slice(lastIndex, start) });
    }
    parts.push({ type: 'link', value: url });
    lastIndex = start + url.length;
  }

  if (lastIndex < value.length) {
    parts.push({ type: 'text', value: value.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', value }];
};

const renderUrlWithBreaks = (url) => {
  const segments = url.split('/');

  return segments.map((segment, index) => (
    <span key={`${segment}-${index}`}>
      {segment}
      {index < segments.length - 1 ? (
        <>
          /
          <wbr />
        </>
      ) : null}
    </span>
  ));
};

const STUDENT_ACCESS_IDS = [1, 3];

const DocumentLists = () => {
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
        setDocuments(res.data?.filter(doc => STUDENT_ACCESS_IDS.includes(doc.access_id)) || []);
      } catch (err) {
        console.error("Failed to fetch documents:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, []);

  const toggleAccordion = useCallback((id) => {
    setOpenId((prev) => (prev === id ? null : id));
  }, []);

  const parsedDocuments = useMemo(() => {
    return documents.map((doc) => ({
      ...doc,
      requirements: doc.document_requirements,
    }));
  }, [documents]);

  return (
      <div className="w-full pb-10">
        {/* --- HEADER --- */}
        <div className={`mb-8 border-b-2 pb-6 ${isDark ? 'border-yellow-600/30' : 'border-[#4a120e]/10'}`}>
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${isDark ? 'text-[#e4e6eb]' : 'text-gray-800'}`}>
            Document List <span className={isDark ? 'text-yellow-400' : 'text-[#4a120e]'}>&</span> Requirements
          </h1>
        </div>

        {/* --- FIXED GRID LAYOUT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {loading ? (
            <DocumentListSkeleton isDark={isDark} />
          ) : documents.length === 0 ? (
            <p className={`italic col-span-2 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'}`}>No documents available.</p>
          ) : (
          parsedDocuments.map((doc) => {
            const id = doc.document_type_id;
            const isOpen = openId === id;
            
            const requirements = isOpen
              ? splitRequirementItems(doc.requirements).map((req) => ({
                  text: req,
                  parts: splitTextWithLinks(req),
                }))
              : [];

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
                        <ClockIcon className="w-3 h-3" /> Process Period: {doc.document_process_period}
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
                  className={`transition-all duration-500 ease-in-out overflow-hidden ${
                    isOpen ? 'max-h-500' : 'max-h-0'
                  }`}
                >
                  {isOpen && (
                    <div className="px-7 pb-7 pt-0">
                      <div className={`h-px mb-5 ${isDark ? 'bg-[#3e4042]' : 'bg-gray-100'}`} />
                      <div className="space-y-5">
                        <div>
                          <h5 className={`text-[9px] font-black uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-white' : 'text-[#4a120e]'}`}>
                            Description
                          </h5>
                          <p className={`italic text-[13px] leading-relaxed whitespace-normal ${isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}`}>
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
                                  className={`flex items-start gap-3 text-[12px] font-bold min-w-0 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-700'}`}
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#4a120e] mt-1.5 shrink-0" />
                                  <span className="flex-1 leading-snug whitespace-normal">
                                    {req.parts.map((part, partIndex) => {
                                      if (part.type === 'link') {
                                        return (
                                          <a
                                            key={`${part.value}-${partIndex}`}
                                            href={part.value}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={`underline ${isDark ? 'text-white decoration-white/40' : 'text-[#4a120e] decoration-[#4a120e]/40'}`}
                                          >
                                            {renderUrlWithBreaks(part.value)}
                                          </a>
                                        );
                                      }

                                      return (
                                        <span key={`${part.value}-${partIndex}`}>
                                          {part.value}
                                        </span>
                                      );
                                    })}
                                  </span>
                                </li>
                              ))
                            ) : (
                              <li className={`text-[12px] italic ${isDark ? 'text-[#b0b3b8]/60' : 'text-gray-400'}`}>No specific requirements listed.</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
          )}
        </div>
      </div>
  );
};

export default DocumentLists;