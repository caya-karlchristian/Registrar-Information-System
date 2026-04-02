import React, { useState } from 'react';
import {
  MegaphoneIcon,
  QuestionMarkCircleIcon,
  ClipboardDocumentListIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/solid';
import risImage from "../assets/RIS1.png";
import logoImage from "../assets/puplogoimage.png";

const TEAM_MEMBERS = [
  { lastName: "CAYA",      firstName: "Karl Christian", role: "PROJECT LEAD, UI/UX, AND DATABASE", image: logoImage },
  { lastName: "CONDINO",   firstName: "Ciara Marie",    role: "FRONTEND DEVELOPER",                image: logoImage },
  { lastName: "CORDOVA",   firstName: "Aron Stephen",   role: "BACKEND DEVELOPER",                 image: logoImage },
  { lastName: "TOLENTINO", firstName: "Ma. Rose",       role: "DOCUMENT ANALYST AND QA",           image: logoImage },
];

const Tech4wardProfile = ({ bgImage }) => {
  const bg = bgImage || risImage;
  const [announcementPage, setAnnouncementPage] = useState(0);
  const ITEMS_PER_PAGE = 3;

   const ANNOUNCEMENTS = [
     { icon: MegaphoneIcon, title: 'Enrollment Period', desc: 'Configured in System Settings: this card shows the enrollment announcement preview.' },
     { icon: QuestionMarkCircleIcon, title: 'Help & Support', desc: 'Configured in System Settings: contact details and support guidance can be edited there.' },
     { icon: ClipboardDocumentListIcon, title: 'Requirements', desc: 'Configured in System Settings: document requirements and request instructions are managed there.' },
     { icon: MegaphoneIcon, title: 'Important Dates', desc: 'Configured in System Settings: key academic schedule notices are prepared there.' },
     { icon: QuestionMarkCircleIcon, title: 'Service Advisory', desc: 'Configured in System Settings: temporary service updates are drafted there.' },
     { icon: ClipboardDocumentListIcon, title: 'Submission Checklist', desc: 'Configured in System Settings: checklist details are maintained there.' },
   ];

   const totalPages = Math.ceil(ANNOUNCEMENTS.length / ITEMS_PER_PAGE);
   const startIndex = announcementPage * ITEMS_PER_PAGE;
   const visibleAnnouncements = ANNOUNCEMENTS.slice(startIndex, startIndex + ITEMS_PER_PAGE);

   const handlePrevAnnouncements = () => {
     setAnnouncementPage((prev) => Math.max(prev - 1, 0));
   };

   const handleNextAnnouncements = () => {
     setAnnouncementPage((prev) => Math.min(prev + 1, totalPages - 1));
   };

  return (
    <div className="w-full overflow-hidden bg-gray-50 border-b-4 border-yellow-400">
      <div className="relative w-full border-t-4 border-yellow-400 py-12 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-4xl font-black text-[#800000] uppercase mb-4 -mt-8 text-center">
            System Announcement
          </h2>
          <div className="flex flex-wrap md:flex-nowrap items-center gap-4">
            <button
              onClick={handlePrevAnnouncements}
              disabled={announcementPage === 0}
              className="order-1 bg-[#800000] text-white px-4 py-2 md:px-3 md:py-1 rounded disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              aria-label="Previous announcements"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>

            <div className="order-3 md:order-2 basis-full md:basis-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 flex-1">
              {visibleAnnouncements.map((item, index) => (
                <div
                  key={`${item.title}-${startIndex + index}`}
                  className="bg-[#800000] rounded-lg p-6 shadow-lg"
                >
                  <div className="flex flex-col items-center text-center gap-3">
                    <item.icon className="w-10 h-10 text-yellow-300" />
                    <div>
                      <h3 className="text-lg font-black text-white uppercase">{item.title}</h3>
                      <p className="text-xs text-gray-200 mt-1">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleNextAnnouncements}
              disabled={announcementPage >= totalPages - 1}
              className="order-2 md:order-3 bg-[#800000] text-white px-4 py-2 md:px-3 md:py-1 rounded disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              aria-label="Next announcements"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative w-full py-16 px-6 overflow-hidden border-t-4 border-yellow-400">
        <div className="absolute inset-0">
          <img src={bg} alt="Campus" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-tr from-[#800000]/90 to-black/30 mix-blend-multiply" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {TEAM_MEMBERS.map((member, index) => (
            <div
              key={index}
              className="flex flex-col overflow-hidden rounded-[2.5rem] shadow-2xl border border-white/10 group transition-all hover:-translate-y-3 duration-300"
            >
              <div className="bg-[#eebc48] py-5 text-center shrink-0">
                <span className="text-[#800000] font-black text-xs md:text-sm uppercase">
                  {member.role}
                </span>
              </div>

              <div className="relative h-96 overflow-hidden bg-[#800000]">

                <div className="absolute inset-0 flex items-center justify-center pb-20">
                  <div className="w-40 h-40 rounded-full border-4 border-white/20 overflow-hidden shadow-2xl bg-white/5">
                    <img
                      src={member.image}
                      alt={member.lastName}
                      className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-700"
                    />
                  </div>
                </div>

                <div className="absolute bottom-0 w-full p-6 text-center text-white">
                  <h3 className="text-2xl font-black tracking-tighter uppercase leading-none">
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
    </div>
  );
};

export default Tech4wardProfile;