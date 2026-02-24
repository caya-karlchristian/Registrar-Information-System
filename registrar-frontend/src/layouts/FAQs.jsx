import React, { useState } from 'react';

const FAQPage = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [openId, setOpenId] = useState(1);

  // --- MOCK DATA ---
  const categories = [
    "All",
    "System Overview",
    "System Usage",
    "Security & Privacy",
    "System Features",
    "Technical Support"
  ];

  const faqData = [
    {
      id: 13,
      question: "What is the Registrar Information System (RIS)?",
      answer: "The RIS is a web-based platform designed to streamline document requests, track processing, and manage student records for the Polytechnic University of the Philippines. It replaces manual forms with a secure digital system.",
      category: "System Overview"
    },
    {
      id: 14,
      question: "Who can use the RIS?",
      answer: "Current students, alumni, and authorized staff members can use the RIS. Each user has a role-based access depending on whether they are submitting requests, processing documents, or managing the system.",
      category: "System Overview"
    },
    {
      id: 15,
      question: "How do I log in to the RIS?",
      answer: "Use your university-provided credentials (student number and password) to log in. Alumni will use the credentials created during alumni registration. Ensure your email is verified for notifications.",
      category: "System Usage"
    },
    {
      id: 16,
      question: "Is my personal information safe in RIS?",
      answer: "Yes, the RIS complies with the Data Privacy Act of 2012 (R.A. 10173). Your data is securely stored, and access is restricted based on roles. Sensitive information like grades and personal details are protected.",
      category: "Security & Privacy"
    },
    {
      id: 17,
      question: "Can I access RIS on mobile devices?",
      answer: "Yes, RIS is responsive and works on desktop, tablets, and smartphones. For best experience, use modern browsers like Chrome, Firefox, or Edge.",
      category: "System Usage"
    },
    {
      id: 18,
      question: "What features does the RIS provide?",
      answer: "RIS allows users to submit document requests, track request status, upload payment proofs, receive notifications, and generate printable forms. Staff can process requests, update statuses, and manage student data securely.",
      category: "System Features"
    },
    {
      id: 20,
      question: "Can multiple requests be submitted at once?",
      answer: "Yes, students and alumni can submit multiple document requests in a single session, specifying the type and purpose for each document. Each request will have a unique transaction ID.",
      category: "System Features"
    }
  ];

  const filteredFAQs = faqData.filter((item) => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleAccordion = (id) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="min-h-screen font-sans pb-20">
      <div className="max-w-7xl mx-auto px-4 pt-10">
        
        {/* --- SEARCH HEADER --- */}
        <div className="max-w-2xl mx-auto mb-16 relative">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for answers..."
              className="w-full p-5 pl-14 rounded-2xl border-none shadow-lg focus:ring-2 focus:ring-[#800000] outline-none transition-all text-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg className="w-6 h-6 text-gray-400 absolute left-5 top-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
        </div>

        {/* --- MAIN LAYOUT GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          
          {/* --- SIDEBAR: CATEGORIES (Fixed & Bigger on Desktop) --- */}
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
                          ? "bg-[#800000] text-white shadow-lg transform translate-x-2"
                          : "text-gray-500 hover:text-[#800000] hover:bg-white hover:shadow-sm"
                      }`}
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* --- CONTENT: FAQ ACCORDION --- */}
          <main className="col-span-1 md:col-span-9 space-y-4">
            {filteredFAQs.length > 0 ? (
              filteredFAQs.map((faq) => (
                <div 
                  key={faq.id} 
                  className={`group border rounded-2xl overflow-hidden transition-all duration-300 ${
                    openId === faq.id 
                      ? "border-[#800000] shadow-xl ring-1 ring-[#800000]/10" 
                      : "border-gray-200 bg-white hover:border-gray-300 shadow-sm"
                  }`}
                >
                  <button
                    onClick={() => toggleAccordion(faq.id)}
                    className={`w-full flex justify-between items-center p-6 text-left focus:outline-none transition-colors ${
                      openId === faq.id ? "bg-red-50/50" : "bg-white"
                    }`}
                  >
                    <span className={`text-lg font-bold pr-4 ${
                      openId === faq.id ? "text-[#800000]" : "text-gray-800"
                    }`}>
                      {faq.question}
                    </span>
                    <span className={`flex-shrink-0 p-2 rounded-full transition-all duration-300 ${
                      openId === faq.id ? "bg-[#800000] text-white rotate-180" : "bg-gray-100 text-gray-400 group-hover:bg-gray-200"
                    }`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </span>
                  </button>

                  <div
                    className={`transition-all duration-500 ease-in-out overflow-hidden ${
                      openId === faq.id ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="px-6 pb-8 pt-2">
                      <div className="h-px bg-gray-100 mb-6" />
                      <p className="text-gray-600 text-lg leading-relaxed">
                        {faq.answer}
                      </p>
                      
                      {/* Sub-tag for category display */}
                      <div className="mt-6 inline-flex items-center px-3 py-1 rounded-md bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-widest">
                        {faq.category}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-300">
                <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800">No results found</h3>
                <p className="text-gray-500 mt-2">Try adjusting your search or category filters.</p>
                <button 
                  onClick={() => {setSearchQuery(''); setActiveCategory('All');}}
                  className="mt-6 text-[#800000] font-bold hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </main>

        </div>
      </div>
    </div>
  );
};

export default FAQPage;