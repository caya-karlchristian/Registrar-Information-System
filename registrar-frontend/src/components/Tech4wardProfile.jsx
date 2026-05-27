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

const Tech4wardProfile = ({ bgImage }) => {
  const bg = bgImage || risImage;
  const [announcementPage, setAnnouncementPage] = useState(0);
  const [announcements, setAnnouncements] = useState([]);
  const ITEMS_PER_PAGE = 3;

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
    setAnnouncementPage(0);
  }, [notifications[0]?.id]);

  const totalPages = Math.ceil(announcements.length / ITEMS_PER_PAGE);
  const startIndex = announcementPage * ITEMS_PER_PAGE;
  const visibleAnnouncements = announcements.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevAnnouncements}
              disabled={announcementPage === 0}
              className="bg-[#800000] text-white p-3 rounded disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              aria-label="Previous announcements"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>

            <div className="flex-1 mx-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {visibleAnnouncements.length === 0 ? (
                <div className="col-span-3 text-center text-white/60 py-8 italic text-sm">
                  No announcements at this time.
                </div>
              ) : (
                visibleAnnouncements.map((item, index) => {
                  const Icon = ICON_CYCLE[(startIndex + index) % ICON_CYCLE.length];
                  return (
                    <div
                      key={item.id}
                      className="bg-[#800000] rounded-lg p-6 shadow-lg"
                    >
                      <div className="flex flex-col items-center text-center gap-3">
                        <Icon className="w-10 h-10 text-yellow-300" />
                        <div>
                          <h3 className="text-lg font-black text-white uppercase">{item.title}</h3>
                          <p className="text-xs text-gray-200 mt-1">{item.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={handleNextAnnouncements}
              disabled={announcementPage >= totalPages - 1}
              className="bg-[#800000] text-white p-3 rounded disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
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
