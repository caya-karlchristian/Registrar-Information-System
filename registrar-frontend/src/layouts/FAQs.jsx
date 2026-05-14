import React, { useState } from 'react';
import {
  ChevronDownIcon,
  FaceSmileIcon,
  EnvelopeIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import VoiceSearchInput from '../components/VoiceSearchInput.jsx';
import { useTheme } from '../context/ThemeContext';

const categories = [
  "All",
  "System Overview",
  "System Usage",
  "Security & Privacy",
  "System Features",
  "Document Process",
  "Technical Support",
];

const faqData = [
  {
    id: 13,
    question: "What is the Registrar Information System (RIS)?",
    answer: "The RIS is a web-based platform designed to streamline document requests, track processing, and manage student records for the Polytechnic University of the Philippines. It replaces manual forms with a secure digital system.",
    category: "System Overview",
  },
  {
    id: 14,
    question: "Who can use the RIS?",
    answer: "Current students, alumni, and authorized admin members can use the RIS. Each user has a role-based access depending on whether they are submitting requests, processing documents, or managing the system.",
    category: "System Overview",
  },
  {
    id: 15,
    question: "How do I log in to the RIS?",
    answer: "Use your university-provided credentials (student number and password) to log in. Alumni will use the credentials created during alumni registration. Ensure your email is verified for notifications.",
    category: "System Usage",
  },
  {
    id: 16,
    question: "Is my personal information safe in RIS?",
    answer: "Yes, the RIS complies with the Data Privacy Act of 2012 (R.A. 10173). Your data is securely stored, and access is restricted based on roles. Sensitive information like grades and personal details are protected.",
    category: "Security & Privacy",
  },
  {
    id: 17,
    question: "Can I access RIS on mobile devices?",
    answer: "Yes, RIS is responsive and works on desktop, tablets, and smartphones. For best experience, use modern browsers like Chrome, Firefox, or Edge.",
    category: "System Usage",
  },
  {
    id: 18,
    question: "What features does the RIS provide?",
    answer: "RIS allows users to submit document requests, track request status, upload payment proofs, receive notifications, and generate printable forms. Admin can process requests, update statuses, and manage student data securely.",
    category: "System Features",
  },
  {
    id: 20,
    question: "Can multiple requests be submitted at once?",
    answer: "Yes, students and alumni can submit multiple document requests in a single session, specifying the type and purpose for each document. Each request will have a unique transaction ID.",
    category: "System Features",
  },
  {
    id: 21,
    question: "How do I submit a document request through the RIS?",
    answer: "Log in to your RIS account and navigate to the 'Request Documents' section. Select the type of document you need (e.g., Transcript of Records, Certificate of Enrollment), specify the purpose, indicate the number of copies, and click 'Submit Request'. You will receive a confirmation with a unique transaction ID.",
    category: "Document Process",
  },
  {
    id: 22,
    question: "What documents can be requested through the RIS?",
    answer: "You can request a wide range of documents including Transcript of Records (TOR), Certificate of Enrollment, Certificate of Graduation, Diploma, Form 137, Good Moral Certificate, and other registrar-issued certifications. The available list may vary depending on your student status.",
    category: "Document Process",
  },
  {
    id: 23,
    question: "How long does document processing take?",
    answer: "Processing time varies by document type. Standard documents such as Certificates of Enrollment are typically processed within 3–5 working days. Official Transcripts of Records may take 7–10 working days.",
    category: "Document Process",
  },
  {
    id: 24,
    question: "How can I track the status of my document request?",
    answer: "Go to 'Dashboard' from your dashboard. Each request displays a real-time status: Pending, Under Review, Processing, Ready for Release, or Completed. You will also receive email notifications whenever your request status is updated.",
    category: "Document Process",
  },
];

const FAQPage = () => {
  const { isDark } = useTheme();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [openId, setOpenId] = useState(null);

  const filteredFAQs = faqData.filter(({ category, question, answer }) => {
    const matchesCategory = activeCategory === 'All' || category === activeCategory;
    const query = searchQuery.toLowerCase();
    const matchesSearch = question.toLowerCase().includes(query) || answer.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const toggleAccordion = (id) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <div className={`min-h-screen font-sans pb-20 ${isDark ? 'bg-[#18191a] text-[#e4e6eb]' : ''}`}>
      <div className="max-w-lg mx-auto ">
        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-16">
          <VoiceSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search questions or keywords..."
            language="en-US"
          />
        </div>

          {searchQuery && (
            <p className="text-sm text-gray-500 mt-2 pl-1">
              {filteredFAQs.length} result{filteredFAQs.length !== 1 ? 's' : ''} for{' '}
              <span className="font-semibold text-[#800000]">"{searchQuery}"</span>
            </p>
          )}
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">

          {/* Sidebar */}
          <aside className="hidden md:block md:col-span-3">
            <div className="sticky top-10">
              <h3 className={`${isDark ? 'text-[#eebc48] border-l-4 border-[#eebc48]' : 'text-[#800000] border-l-4 border-[#800000]'} font-black text-xl uppercase tracking-wider mb-6 pl-4`}>
                Categories
              </h3>
              <ul className="space-y-2">
                {categories.map((cat) => (
                  <li key={cat}>
                    <button
                      onClick={() => setActiveCategory(cat)}
                          className={`w-full text-left px-5 py-4 rounded-xl text-base font-bold ${
                          activeCategory === cat
                            ? (isDark ? 'bg-[#3a3b3c] text-[#e4e6eb]' : 'bg-pup-dark-maroon text-white')
                            : (isDark ? 'text-[#b0b3b8] hover:text-[#e4e6eb] hover:bg-[#242526]' : 'text-[#700000] hover:bg-black/5 hover:text-[#5c0000]')
                      }`}
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>

             {/* Email Registrar Section */}
              <div className={`${isDark ? 'mt-5 overflow-hidden rounded-2xl bg-[#242526] border border-[#3e4042] shadow-xl' : 'mt-5 overflow-hidden rounded-2xl bg-white border border-[#800000] shadow-xl'} transition-all duration-300 hover:shadow-2xl`}>
                <a
                 href="https://mail.google.com/mail/?view=cm&fs=1&to=registrar@pup.edu.ph&su=Inquiry%3A%20PUP%20Registrar%20Office%20Concern"
                  className="group flex items-center gap-4 border-b border-gray-100 p-4 text-left transition-all duration-200 hover:bg-red-50"
                >
                  <div className={`${isDark ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3a3b3c] text-[#eebc48]' : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-[#800000]'} transition-transform group-hover:scale-110`}>
                    <EnvelopeIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wide text-[#800000]">
                      Compose Email
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-gray-500 underline group-hover:text-[#800000]">
                      registrar@pup.edu.ph
                    </p>
                  </div>
                </a>

                <div className={`${isDark ? 'bg-[#18191a] px-6 py-4' : 'bg-gray-50 px-6 py-4'}`}>
                  <div className="text-left">
                    <InformationCircleIcon className="float-left mr-3 mt-1 h-6 w-6 text-amber-500" />
                    <p className={`${isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} text-justify text-xs font-medium leading-relaxed`}>
                      <span className={`${isDark ? 'font-bold text-[#e4e6eb] text-xs' : 'font-bold text-gray-900 text-xs'}`}>Submission Guide:</span> Ensure your message includes your <span className="text-[#800000]">full name</span>, <span className="text-[#800000]">student number</span>, and a detailed description of your <span className="text-[#800000]">concern or purpose</span> for faster processing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* FAQ Accordion */}
          <main className="col-span-1 md:col-span-9 space-y-4">
            <div className="md:hidden">
              <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-[#800000]">
                Categories
              </h3>
              <div className="-mx-1 flex gap-2 overflow-x-auto pb-2 px-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${
                      activeCategory === cat
                        ? (isDark ? 'bg-[#3a3b3c] text-[#e4e6eb]' : 'bg-pup-dark-maroon text-white')
                        : (isDark ? 'bg-[#242526] text-[#b0b3b8] border border-[#3e4042] hover:text-[#e4e6eb] hover:bg-[#242526]' : 'bg-white text-[#700000] border border-gray-200 hover:bg-black/5 hover:text-[#5c0000]')
                    }`} 
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {filteredFAQs.length > 0 ? (
              filteredFAQs.map(({ id, question, answer, category }) => (
                <div
                  key={id}
                  className={`group border rounded-2xl overflow-hidden transition-all duration-300 ${
                    openId === id
                      ? (isDark ? 'border-[#800000] shadow-xl ring-1 ring-[#800000]/10 bg-[#242526]' : 'border-[#800000] shadow-xl ring-1 ring-[#800000]/10')
                      : (isDark ? 'border-[#3e4042] bg-[#242526] hover:border-[#4e4f50] shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 shadow-sm')
                  }`}
                >
                  <button
                    onClick={() => toggleAccordion(id)}
                    className={`w-full flex justify-between items-center p-6 text-left focus:outline-none transition-colors ${
                      openId === id ? (isDark ? 'bg-[#3a3b3c]/60' : 'bg-red-50/50') : (isDark ? 'bg-[#242526]' : 'bg-white')
                    }`}
                  >
                    <span className={`text-lg font-bold pr-4 ${openId === id ? 'text-[#800000]' : (isDark ? 'text-[#e4e6eb]' : 'text-gray-800')}`}>
                      {question}
                    </span>
                    <span className={`shrink-0 p-2 rounded-full transition-all duration-300 ${
                      openId === id
                        ? 'bg-[#800000] text-white rotate-180'
                        : (isDark ? 'bg-[#2b2c2d] text-[#b0b3b8] group-hover:bg-[#333435]' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200')
                    }`}>
                      <ChevronDownIcon className="w-5 h-5" />
                    </span>
                  </button>

                  <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
                    openId === id ? 'max-h-125 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <div className="px-6 pb-8 pt-2">
                      <div className={`h-px mb-6 ${isDark ? 'bg-white/6' : 'bg-gray-100'}`} />
                      <p className={`${isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} text-lg leading-relaxed`}>{answer}</p>
                      <div className={`mt-6 inline-flex items-center px-3 py-1 rounded-md ${isDark ? 'bg-[#1a1b1e] text-[#b0b3b8]' : 'bg-gray-100 text-gray-500'} text-xs font-bold uppercase tracking-widest`}>
                        {category}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className={`${isDark ? 'text-center py-24 bg-[#242526] rounded-3xl border border-dashed border-[#3e4042]' : 'text-center py-24 bg-white rounded-3xl border border-dashed border-gray-300'}`}>
                <div className={`${isDark ? 'bg-[#1a1b1e] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4' : 'bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4'}`}>
                  <FaceSmileIcon className={`${isDark ? 'w-10 h-10 text-[#b0b3b8]' : 'w-10 h-10 text-gray-300'}`} />
                </div>
                <h3 className={`${isDark ? 'text-[#e4e6eb]' : 'text-xl font-bold text-gray-800'}`}>No results found</h3>
                <p className={`${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'} mt-2`}>Try adjusting your search or category filters.</p>
                <button
                  onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
                  className={`mt-6 font-bold ${isDark ? 'text-[#eebc48] hover:underline' : 'text-[#800000] hover:underline'}`}
                >
                  Clear all filters
                </button>
              </div>
            )}
          </main>

        </div>

        <div className={`${isDark ? 'mt-10 md:hidden overflow-hidden rounded-2xl bg-[#242526] border border-[#3e4042] shadow-xl transition-all duration-300 hover:shadow-2xl' : 'mt-10 md:hidden overflow-hidden rounded-2xl bg-white border border-[#800000] shadow-xl transition-all duration-300 hover:shadow-2xl'}`}>
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=registrar@pup.edu.ph&su=Inquiry%3A%20PUP%20Registrar%20Office%20Concern"
            className={`${isDark ? 'group flex items-center gap-4 border-b border-[#3e4042] p-4 text-left transition-all duration-200 hover:bg-[#3a3b3c]' : 'group flex items-center gap-4 border-b border-gray-100 p-4 text-left transition-all duration-200 hover:bg-red-50'}`}
          >
            <div className={`${isDark ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3a3b3c] text-[#eebc48] transition-transform group-hover:scale-110' : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-[#800000] transition-transform group-hover:scale-110'}`}>
              <EnvelopeIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className={`${isDark ? 'text-xs font-black uppercase tracking-wide text-[#eebc48]' : 'text-xs font-black uppercase tracking-wide text-[#800000]'}`}>
                Compose Email
              </p>
              <p className={`${isDark ? 'mt-0.5 text-xs font-bold text-[#b0b3b8] underline group-hover:text-[#e4e6eb]' : 'mt-0.5 text-xs font-bold text-gray-500 underline group-hover:text-[#800000]'}`}>
                registrar@pup.edu.ph
              </p>
            </div>
          </a>

          <div className={`${isDark ? 'bg-[#18191a] px-6 py-4' : 'bg-gray-50 px-6 py-4'}`}>
            <div className="text-left">
              <InformationCircleIcon className={`${isDark ? 'float-left mr-3 mt-1 h-6 w-6 text-[#eebc48]' : 'float-left mr-3 mt-1 h-6 w-6 text-amber-500'}`} />
              <p className={`${isDark ? 'text-justify text-xs font-medium text-[#b0b3b8] leading-relaxed' : 'text-justify text-xs font-medium text-gray-600 leading-relaxed'}`}>
                <span className={`${isDark ? 'font-bold text-[#e4e6eb] text-xs' : 'font-bold text-gray-900 text-xs'}`}>Submission Guide:</span> Ensure your message includes your <span className="text-[#800000]">full name</span>, <span className="text-[#800000]">student number</span>, and a detailed description of your <span className="text-[#800000]">concern or purpose</span> for faster processing.
              </p>
            </div>
          </div>
        </div>
      </div>
  );
};

export default FAQPage;