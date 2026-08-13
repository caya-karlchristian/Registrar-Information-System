import React, { useState, useEffect } from 'react';
import {
  MegaphoneIcon,
  QuestionMarkCircleIcon,
  ClipboardDocumentListIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/solid';
import risImage from "../assets/RIS1.png";
import CAYA_img from "../assets/members/CAYA.jpg";
import CONDINO_img from "../assets/members/CONDINO.jpg";
import CORDOVA_img from "../assets/members/CORDOVA.jpg";
import TOLENTINO_img from "../assets/members/TOLENTINO.jpg";
import { getAnnouncements } from "../services/api";
import { useNotificationsContext } from '../context/NotificationsContext';

const ICON_CYCLE = [MegaphoneIcon, QuestionMarkCircleIcon, ClipboardDocumentListIcon];

const TEAM_MEMBERS = [
  { lastName: "CAYA",      firstName: "Karl Christian", role: "PROJECT LEAD, UI/UX, AND DATABASE", image: CAYA_img },
  { lastName: "CONDINO",   firstName: "Ciara Marie",    role: "FRONTEND DEVELOPER",                image: CONDINO_img },
  { lastName: "CORDOVA",   firstName: "Aron Stephen",   role: "BACKEND DEVELOPER",                 image: CORDOVA_img },
  { lastName: "TOLENTINO", firstName: "Ma. Rose",       role: "DOCUMENT ANALYST AND QA",           image: TOLENTINO_img },
];

const QUICK_QUESTIONS = [
  {
    question: "What is the Registrar Information System (RIS)?",
    answer: "The RIS is a secure, web-based platform designed to streamline document requests, track processing, and manage student and alumni records for the Polytechnic University of the Philippines - Taguig Campus. It replaces manual, paper-based forms with an automated digital system."
  },
  {
    question: "How do I log in to the RIS?",
    answer: "PUP-TAGUIG students and staff can log in using their university IDP credentials (Link:https://one-portal.isaxbsit2027.com/landing). For alumni, you can register for a local account and log in using your verified email and password. (Link: https://puptaps.ojt-ims-bsit.net/)"
  },
  {
    question: "How do I submit a document request?",
    answer: "Log in, go to 'Student/Alumni Requests', select your document/certificate type, enter payment details, and submit."
  },
  {
    question: "How long does document processing take?",
    answer: "Standard certifications are typically processed in 3–5 working days. More comprehensive documents take 7–10 working days, subject to payment verification."
  },
  {
    question: "How can I track the status of my request?",
    answer: "You can view real-time status updates directly on your RIS Dashboard. Automatic in app notifications will also be sent to you as your request progresses."
  },
  {
    question: "Is my personal data protected?",
    answer: "Yes. The RIS is fully compliant with the Data Privacy Act of 2012 (R.A. 10173). All student records, credentials, and uploaded transaction receipts are securely stored and accessible only to authorized administrative staff."
  }
];

const Tech4wardProfile = ({ bgImage }) => {
  const bg = bgImage || risImage;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [announcements, setAnnouncements] = useState([]);
  const [openFaqs, setOpenFaqs] = useState({});
  const [faqPageIndex, setFaqPageIndex] = useState(0);

  const toggleFaq = (index) => {
    setOpenFaqs(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        let page = 1;
        let all = [];
        while (true) {
          const res = await getAnnouncements(page, 20);
          const data = res.data.data ?? [];
          all = [...all, ...data.filter(a => a.enabled)];
          if (page >= (res.data.last_page ?? 1)) break;
          page++;
        }
        setAnnouncements(all);
      } catch (err) {
        console.warn("Could not load announcements:", err);
      }
    };
    fetchAll();
  }, []);

  // Real-time — reuse the shared notification context instead of a duplicate Echo subscription
  const { notifications } = useNotificationsContext();
  useEffect(() => {
    if (!notifications.length) return;
    const latest = notifications[0];
    if (latest?.type !== 'announcement_published' || !latest?.announcement) return;
    setAnnouncements(prev => {
      if (prev.some(a => a.id === latest.announcement.id)) return prev;
      return [{ id: latest.announcement.id, title: latest.announcement.title, content: latest.announcement.content, enabled: true }, ...prev];
    });
    setCurrentIndex(0);
  }, [notifications[0]?.id]);

  const maxIndex = Math.max(0, announcements.length - 3);
  const safeIndex = Math.min(currentIndex, maxIndex);
  const visibleAnnouncements = announcements.length <= 3 
    ? announcements 
    : announcements.slice(safeIndex, safeIndex + 3);

  const visibleFaqs = QUICK_QUESTIONS.slice(faqPageIndex * 4, (faqPageIndex + 1) * 4);
  const faqTotalPages = Math.ceil(QUICK_QUESTIONS.length / 4);

  return (
    <div className="w-full overflow-hidden bg-gray-50 border-y-4 border-yellow-400">
      <section id="announcements" className="lp-section lp-section--alt border-t-4 border-yellow-400 py-16">
        <div className="lp-section-inner">
          <div className="lp-section-label text-center">Latest Updates</div>
          <h2 className="lp-section-title text-center">
            System Announcements
          </h2>
          <p className="lp-section-label align- text-center mb-15">
            Stay informed with the latest news and notices from the Registrar's Office.
          </p>

          <div className="lp-cards-grid">
            {announcements.length === 0 ? (
              <div className="lp-announce-empty-card">
                <svg className="w-12 h-12 text-[#F8BF1E]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
                <h3 className="text-lg font-bold text-[#800000] mt-4 font-sans uppercase tracking-wide">All Caught Up!</h3>
                <p className="text-sm text-gray-500 mt-2 max-w-sm leading-relaxed">
                  There are no official system announcements active at this time. Please check back later.
                </p>
              </div>
            ) : (
              visibleAnnouncements.map((item, index) => {
                const tag = ["Important", "Notice", "Reminder"][(safeIndex + index) % 3];
                const dateStr = item.created_at 
                  ? new Date(item.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                  : "Recent";
                return (
                  <div key={item.id} className="lp-announce-card lp-revealed">
                    <div className="lp-announce-top">
                      <span className="lp-announce-tag">{tag}</span>
                      <span className="lp-announce-date">{dateStr}</span>
                    </div>
                    <h3 className="lp-announce-title">{item.title}</h3>
                    <p className="lp-announce-desc">{item.content}</p>
                  </div>
                );
              })
            )}
          </div>

          {announcements.length > 3 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: announcements.length - 2 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-3.5 h-3.5 rounded-full transition-all border border-[#F8BF1E]/30 cursor-pointer ${
                    safeIndex === i ? "bg-[#F8BF1E] scale-110 shadow-md" : "bg-gray-300 hover:bg-gray-400"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* New FAQs Section matching the design */}
      <div id="faqs" className="relative w-full py-20 px-6 overflow-hidden border-t-4 border-yellow-400">
        <div className="absolute inset-0">
          <img src={bg} alt="Campus" className="w-full h-full object-cover" />
          <div className="absolute inset-0 lp-hero-bg-overlay" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-3 select-none leading-none tracking-tight">
              <span>Frequently asked questions</span>
            </h2>
            <p className="text-gray-200 text-xs md:text-sm mt-4 max-w-md mx-auto leading-relaxed">
              Here are some common questions about our system to help you understand better.
            </p>
          </div>

          {/* 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleFaqs.map((faq, relativeIndex) => {
              const actualIndex = faqPageIndex * 4 + relativeIndex;
              const isOpen = !!openFaqs[actualIndex];
              return (
                <div 
                  key={actualIndex}
                  className="bg-[#450000] border border-white/10 rounded-3xl p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-start text-left h-fit hover:border-[#F8BF1E]/30"
                >
                  <div className="flex justify-between items-center gap-4 w-full">
                    <h3 
                      onClick={() => toggleFaq(actualIndex)}
                      className="text-white hover:text-yellow-400 font-bold text-[14px] md:text-[16px] leading-snug cursor-pointer select-none grow transition-colors duration-200"
                    >
                      {faq.question}
                    </h3>
                    <button
                      onClick={() => toggleFaq(actualIndex)}
                      className="w-9 h-9 md:w-10 md:h-10 bg-[#F8BF1E] hover:bg-[#eebc48] text-[#660000] rounded-full flex items-center justify-center transition-colors duration-200 cursor-pointer focus:outline-none shrink-0 text-xl font-bold select-none"
                    >
                      <span className={`inline-block transform ${isOpen ? '-translate-y-[1.5px]' : '-translate-y-[0.5px]'}`}>
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                  </div>
                  <div 
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isOpen ? "max-h-40 opacity-100 mt-4" : "max-h-0 opacity-0"
                    }`}
                  >
                    <p className="text-gray-200 text-xs md:text-[13px] leading-relaxed text-justify">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {faqTotalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: faqTotalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setFaqPageIndex(i)}
                  className={`w-3.5 h-3.5 rounded-full transition-all border cursor-pointer ${
                    faqPageIndex === i ? "bg-[#F8BF1E] border-[#F8BF1E] scale-110 shadow-md" : "bg-white/20 hover:bg-white/40 border-white/10"
                  }`}
                  aria-label={`Go to FAQ page ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Commented Out About Section (Developer Cards) */}
      {/* 
      <div id="about" className="relative w-full py-16 px-6 overflow-hidden border-t-4 border-yellow-400">
        <div className="absolute inset-0">
          <img src={bg} alt="Campus" className="w-full h-full object-cover" />
          <div className="absolute inset-0 lp-hero-bg-overlay" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {TEAM_MEMBERS.map((member, index) => (
            <div
              key={index}
              className="flex flex-col overflow-hidden rounded-[2.5rem] shadow-2xl border border-white/10 group transition-all hover:-translate-y-3 duration-300 hover:border-yellow-400/30"
            >
              <div className="bg-[#eebc48] py-5 text-center shrink-0">
                <span className="text-[#800000] font-black text-xs md:text-sm uppercase">
                  {member.role}
                </span>
              </div>

              <div className="relative h-96 overflow-hidden bg-linear-to-b from-[#800000] to-[#500000]">
                <div className="absolute inset-0 flex items-center justify-center pb-20">
                  <div className="w-40 h-40 rounded-full border-4 border-white/20 overflow-hidden shadow-2xl bg-white/5 transition-all duration-300 group-hover:border-yellow-400 group-hover:shadow-[0_0_20px_rgba(248,191,30,0.4)]">
                    <img
                      src={member.image}
                      alt={member.lastName}
                      className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-700"
                  />
                  </div>
                </div>

                <div className="absolute bottom-0 w-full p-6 text-center text-white">
                  <h3 className="text-2xl font-black tracking-tighter uppercase leading-none group-hover:text-yellow-400 transition-colors duration-300">
                    {member.lastName}
                  </h3>
                  <p className="text-sm font-medium text-gray-200 mt-1">
                    {member.firstName}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      */}
    </div>
  );
};

export default Tech4wardProfile;