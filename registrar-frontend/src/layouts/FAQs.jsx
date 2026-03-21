import React, { useState } from 'react';
import {
  ChevronDownIcon,
  FaceSmileIcon,
} from '@heroicons/react/24/outline';
import VoiceSearchInput from '../components/VoiceSearchInput.jsx';

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
    <div className="min-h-screen font-sans pb-20">
      <div className="max-w-7xl mx-auto px-4 pt-10">

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
              <h3 className="text-[#800000] font-black text-xl uppercase tracking-wider mb-6 border-l-4 border-[#800000] pl-4">
                Categories
              </h3>
              <ul className="space-y-2">
                {categories.map((cat) => (
                  <li key={cat}>
                    <button
                      onClick={() => setActiveCategory(cat)}
                      className={`w-full text-left px-5 py-4 rounded-xl transition-all duration-200 text-base font-bold ${
                        activeCategory === cat
                          ? 'bg-[#800000] text-white shadow-lg translate-x-2'
                          : 'text-gray-500 hover:text-[#800000] hover:bg-white hover:shadow-sm'
                      }`}
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* FAQ Accordion */}
          <main className="col-span-1 md:col-span-9 space-y-4">
            {filteredFAQs.length > 0 ? (
              filteredFAQs.map(({ id, question, answer, category }) => (
                <div
                  key={id}
                  className={`group border rounded-2xl overflow-hidden transition-all duration-300 ${
                    openId === id
                      ? 'border-[#800000] shadow-xl ring-1 ring-[#800000]/10'
                      : 'border-gray-200 bg-white hover:border-gray-300 shadow-sm'
                  }`}
                >
                  <button
                    onClick={() => toggleAccordion(id)}
                    className={`w-full flex justify-between items-center p-6 text-left focus:outline-none transition-colors ${
                      openId === id ? 'bg-red-50/50' : 'bg-white'
                    }`}
                  >
                    <span className={`text-lg font-bold pr-4 ${openId === id ? 'text-[#800000]' : 'text-gray-800'}`}>
                      {question}
                    </span>
                    <span className={`shrink-0 p-2 rounded-full transition-all duration-300 ${
                      openId === id
                        ? 'bg-[#800000] text-white rotate-180'
                        : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
                    }`}>
                      <ChevronDownIcon className="w-5 h-5" />
                    </span>
                  </button>

                  <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
                    openId === id ? 'max-h-125 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <div className="px-6 pb-8 pt-2">
                      <div className="h-px bg-gray-100 mb-6" />
                      <p className="text-gray-600 text-lg leading-relaxed">{answer}</p>
                      <div className="mt-6 inline-flex items-center px-3 py-1 rounded-md bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-widest">
                        {category}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-300">
                <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaceSmileIcon className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">No results found</h3>
                <p className="text-gray-500 mt-2">Try adjusting your search or category filters.</p>
                <button
                  onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
                  className="mt-6 text-[#800000] font-bold hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </main>

        </div>
      </div>
  );
};

export default FAQPage;