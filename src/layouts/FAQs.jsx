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
    {
      id: 1, 
      question: "How do I request a Transcript of Records (TOR)?",
      answer: "The Transcript of Records is the official record of a student's academic performance. To request one, log in to your account, go to the 'Request' tab, select 'Transcript of Records', and fill out the necessary details regarding the purpose of your request.",
      category: "Document Requests"
    },
    {
      id: 2,
      question: "How long is the processing time for documents?",
      answer: "Processing times vary by document type. Certifications usually take 3 working days, while a Transcript of Records (TOR) takes approximately 12-15 working days depending on clearance verification.",
      category: "Document Requests"
    },
    {
      id: 3,
      question: "What payment methods are accepted?",
      answer: "We accept payments via the Cashier's Office (onsite) or through our online partners (Landbank, GCash, Maya). Please upload your proof of payment to proceed with processing.",
      category: "Payments"
    },
    {
      id: 4,
      question: "How do I claim my requested documents?",
      answer: "Once your document status changes to 'Ready to Claim', you will receive a notification. Please present your student ID and the official receipt at the Registrar's releasing window.",
      category: "Document Requests"
    },
    {
      id: 5,
      question: "I forgot my password, how do I reset it?",
      answer: "Click the 'Forgot Password' link on the login page. A reset link will be sent to your registered university email address.",
      category: "Account & Profile"
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