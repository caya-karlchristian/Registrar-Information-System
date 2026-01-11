import React, { useState } from 'react';

const FAQPage = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [openId, setOpenId] = useState(1); 

  // --- MOCK DATA ---
  const categories = [
    "All",
    "Document Requests",
    "Account & Profile",
    "Payments",
    "Transcript Requests",
    "Contact"
  ];

  const faqData = [
    // Existing FAQs...
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
      id: 19,
      question: "Who do I contact for technical issues with RIS?",
      answer: "For technical problems, use the 'Support' tab in RIS or contact the IT/Registrar Office at PUP Taguig via email or hotline. Include details of your issue and screenshots for faster resolution.",
      category: "Technical Support"
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
    <div className="min-h-screen font-sans">
      
      <div className="max-w-6xl mx-auto ">
        
        <div className="max-w-2xl mx-auto mb-10 relative">
          <input
            type="text"
            placeholder="Search for answers..."
            className="w-full p-4 pl-12 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-[#800000] focus:border-transparent outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg className="w-6 h-6 text-gray-400 absolute left-4 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 ">
          
          <div className="col-span-1 bg-white p-6 hidden md:block">
            <h3 className="text-pup-maroon font-bold text-lg mb-4 border-l-4 border-pup-maroon pl-3">
              Categories
            </h3>
            <ul className="space-y-2">
              {categories.map((cat) => (
                <li key={cat}>
                  <button
                    onClick={() => setActiveCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                      activeCategory === cat
                        ? "bg-red-50 text-pup-maroon font-bold"
                        : "text-gray-600 hover:text-pup-maroon hover:bg-gray-50"
                    }`}
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-1 md:col-span-3 space-y-4">
            {filteredFAQs.length > 0 ? (
              filteredFAQs.map((faq) => (
                <div 
                  key={faq.id} 
                  className={`border rounded-lg overflow-hidden transition-all duration-200 ${
                    openId === faq.id 
                      ? "border-pup-maroon shadow-md" 
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <button
                    onClick={() => toggleAccordion(faq.id)}
                    className={`w-full flex justify-between items-center p-5 text-left focus:outline-none ${
                      openId === faq.id ? "bg-red-50" : "bg-white"
                    }`}
                  >
                    <span className={`text-lg font-semibold ${
                      openId === faq.id ? "text-pup-maroon" : "text-gray-800"
                    }`}>
                      {faq.question}
                    </span>
                    <span className={`transform transition-transform duration-300 text-pup-maroon ${
                      openId === faq.id ? "rotate-180" : ""
                    }`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </span>
                  </button>

                  <div
                    className={`transition-[max-height] duration-300 ease-in-out overflow-hidden ${
                      openId === faq.id ? "max-h-96" : "max-h-0"
                    }`}
                  >
                    <div className="bg-[#FEF9C3] p-6 text-gray-700 leading-relaxed border-t border-gray-100">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-500">
                <p>No questions found matching your search.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default FAQPage;