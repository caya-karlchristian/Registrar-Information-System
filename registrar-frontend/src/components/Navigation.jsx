import React, { useMemo, useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Squares2X2Icon,
  TableCellsIcon,
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
  QuestionMarkCircleIcon,
  UserCircleIcon,
  ArrowRightStartOnRectangleIcon,
  AcademicCapIcon,
  ChartBarSquareIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  InboxIcon
} from '@heroicons/react/24/outline';
import { useAuth } from "../context/AuthProvider";
import { useTheme } from "../context/ThemeContext";
import ConfirmationModal from "../components/ConfirmationModal";
import LineLoading from "../components/LineLoading.jsx";

const ROLE_CONFIG = {
  student: {
    profileKey: 'student_profile',
    profileLabel: (user) => user?.academic_record?.student_number || 'No Student Number',
    items: [
      { name: 'Dashboard', to: 'home', icon: Squares2X2Icon },
      { name: 'Inbox', to: 'inbox', icon: InboxIcon },
      { name: 'Document Lists', to: 'lists', icon: TableCellsIcon },
      { name: 'Student Requests', to: 'request', icon: ClipboardDocumentCheckIcon },
      { name: 'Student Profile', to: 'profile', icon: UserGroupIcon },
      { name: 'FAQs & Support', to: 'faqs', icon: QuestionMarkCircleIcon },
    ],
  },
  alumni: {
    profileKey: 'alumni_profile',
    profileLabel: (user) => user?.email,
    items: [
      { name: 'Dashboard', to: 'home', icon: Squares2X2Icon },
      { name: 'Inbox', to: 'inbox', icon: InboxIcon },
      { name: 'Document Lists', to: 'lists', icon: TableCellsIcon },
      { name: 'Alumni Request', to: 'request', icon: AcademicCapIcon },
      { name: 'Alumni Profile', to: 'profile', icon: UserCircleIcon },
      { name: 'FAQs & Support', to: 'faqs', icon: QuestionMarkCircleIcon },
    ],
  },
  staff: {
    profileKey: 'admin_profile',
    profileLabel: (user) => user?.email,
    items: [
      { name: 'Dashboard', to: 'dashboard', icon: Squares2X2Icon },
      { name: 'Inbox', to: 'inbox', icon: InboxIcon },
      { name: 'Walk-In Request', to: 'request', icon: AcademicCapIcon },
      { name: 'Admin Analytics', to: 'analytics', icon: ChartBarSquareIcon },
      { name: 'Admin Logbook', to: 'logbook', icon: BookOpenIcon },
      { name: 'Admin Profile', to: 'profile', icon: UserCircleIcon },
    ],
  },
  superAdmin: {
    profileKey: null,
    profileLabel: (user) => user?.email,
    items: [
      { name: 'User Management', to: 'user', icon: Squares2X2Icon },
      { name: 'Document Management', to: 'documents', icon: TableCellsIcon },
      { name: 'Certificate Management', to: 'certificates', icon: AcademicCapIcon },
      { name: 'Report Management', to: 'report', icon: UserCircleIcon },
      { name: 'System Settings', to: 'settings', icon: Cog6ToothIcon },
    ],
  },
};

const Navigation = ({ isOpen, onItemClick, role = 'student' }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'default',
    onConfirm: () => {},
  });
  const [headerHeight, setHeaderHeight] = useState(101); // Fallback default

  useEffect(() => {
    const headerElement = document.querySelector('header');
    if (!headerElement) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setHeaderHeight(entry.target.offsetHeight);
      }
    });
    resizeObserver.observe(headerElement);
    return () => resizeObserver.disconnect();
  }, []);

  const config = ROLE_CONFIG[role] || ROLE_CONFIG.student;
  const profile = config.profileKey ? user?.[config.profileKey] : null;

  const fullName = useMemo(() => {
    if (role === 'superAdmin') return 'SUPER ADMIN';
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return 'Guest';
  }, [profile, role]);

  const handleLogoutClick = () => {
    setModal({
      isOpen: true,
      title: 'Logout Session',
      message: 'Are you sure you want to log out? Any unsaved changes in the registrar system may be lost.',
      type: 'default',
      onConfirm: async () => {
        setModal((prev) => ({ ...prev, isOpen: false }));
        setIsLoggingOut(true);
        try {
          await logout();
          navigate('/', { replace: true });
        } catch (err) {
          console.error('Logout failed:', err);
          setIsLoggingOut(false);
        }
      },
    });
  };

  const closeModal = () => setModal((prev) => ({ ...prev, isOpen: false }));

  return (
    <>
      <LineLoading isVisible={isLoggingOut} />

      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="lg:hidden fixed inset-0 z-40 bg-transparent"
          onClick={onItemClick}
        />
      )}

          <div 
            className={`lg:hidden fixed inset-x-0 z-50 transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 -translate-y-4'}`}
            style={{ top: `${headerHeight}px` }} 
          >        
          <div className="w-full overflow-hidden rounded-b-lg shadow-[0_18px_42px_rgba(0,0,0,0.3)]">
          <div className={isDark ? 'bg-[#242526]' : 'bg-[#7a0000]'}>
            <nav className={`space-y-px ${isDark ? 'bg-[#18191a]' : 'bg-[#5c0000]'}`}>
              {config.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onItemClick}
                  className={({ isActive }) => `
                      group flex items-center justify-between px-5 py-4 font-bold transition-all duration-200 outline-none
                    ${isActive
                      ? (isDark
                        ? 'bg-[#3a3b3c] text-[#e4e6eb] hover:bg-[#4e4f50] hover:text-[#e4e6eb] dark:hover:bg-[#4e4f50] dark:hover:text-[#e4e6eb] active:bg-[#5a5b5c]'
                        : 'bg-[#5a0000] text-[#fff2f2] hover:bg-[#670000] active:bg-[#730000]')
                      : (isDark
                        ? 'bg-[#18191a] text-[#b0b3b8] hover:bg-[#3a3b3c] hover:text-[#e4e6eb] dark:hover:bg-[#3a3b3c] dark:hover:text-[#e4e6eb] active:bg-[#4e4f50] active:text-[#e4e6eb]'
                        : 'bg-[#7a0000] text-white hover:bg-[#8a0f0f] hover:text-[#fff3f3] active:bg-[#981a1a] active:text-white')}
                    ${isDark ? 'focus-visible:bg-[#3a3b3c] focus-visible:text-[#e4e6eb]' : 'focus-visible:bg-[#8a0f0f] focus-visible:text-[#fff3f3]'}
                  `}
                >
                    <span className="text-[16px] uppercase tracking-wider">{item.name}</span>
                  <item.icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 group-active:scale-110 ${isDark ? 'text-[#b0b3b8]' : 'text-white/85'}`} />
                </NavLink>
              ))}
            </nav>

            <button
              onClick={handleLogoutClick}
              className={`group flex w-full items-center justify-between px-5 py-4 text-[16px] font-bold text-white transition-all duration-200 ${isDark ? 'bg-[#242526] hover:bg-[#3a3b3c] dark:hover:bg-[#3a3b3c] active:bg-[#4e4f50] focus-visible:bg-[#3a3b3c]' : 'bg-[#4f0000] hover:bg-[#640000] active:bg-[#750000] focus-visible:bg-[#640000]'}`}
            >
              <span>LOGOUT</span>
              <ArrowRightStartOnRectangleIcon className={`h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5 ${isDark ? 'text-[#b0b3b8]' : 'text-white/85'}`} />
            </button>
          </div>
        </div>
      </div>

      <aside
        className={`
          hidden lg:fixed lg:left-0 lg:z-40 lg:flex lg:w-72
          ${isDark ? 'bg-[#18191a] border-[#3e4042]' : 'bg-[#E0E0E0] border-gray-300'} border-r lg:flex-col
        `}
        style={{
          top: `${headerHeight}px`,
          height: `calc(100vh - ${headerHeight}px)`
        }}
      >
        <div className="flex flex-col h-full z-9999">
          <div className="p-6 shrink-0">
            <div className="flex items-center gap-3">
              <UserCircleIcon className={`w-14 h-14 lg:w-17 lg:h-17 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-700'}`} />
              <div className="flex flex-col">
                <h2 className={`font-black text-l leading-tight uppercase ${isDark ? 'text-[#e4e6eb]' : 'text-pup-maroon'}`}>
                  {fullName}
                </h2>
                <span className={`text-xs font-medium ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>{config.profileLabel(user) || 'Guest'}</span>
              </div>
            </div>
            <hr className={`mt-6 ${isDark ? 'border-[#3e4042]' : 'border-gray-400'}`} />
          </div>

          <nav className="flex-1 px-4 py-3 space-y-3 overflow-y-auto custom-scrollbar">
            {config.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onItemClick}
                className={({ isActive }) => `
                  group flex items-center gap-4 px-4 py-4 rounded-lg font-bold transition-all duration-200 outline-none
                  ${isActive
                    ? (isDark
                      ? 'bg-[#3a3b3c] text-[#e4e6eb] shadow-none hover:bg-[#4e4f50] active:bg-[#5a5b5c]'
                      : 'bg-pup-dark-maroon text-white shadow-md shadow-[#700000]/25 hover:bg-[#5f0000] active:bg-[#6b0000]')
                    : (isDark
                      ? 'text-[#b0b3b8] hover:bg-[#3a3b3c] hover:text-[#e4e6eb] active:bg-[#4e4f50] active:text-[#e4e6eb]'
                      : 'text-[#700000] hover:bg-black/5 hover:text-[#5c0000] active:bg-black/15 active:text-[#4a0000]')}
                  ${isDark ? 'focus-visible:bg-[#3a3b3c] focus-visible:text-[#e4e6eb]' : 'focus-visible:bg-black/10 focus-visible:text-[#5c0000]'}
                `}
              >
                <item.icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110 group-active:scale-110" />
                <span className="text-sm uppercase tracking-wider">{item.name}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-6 mt-auto shrink-0 lg:p-3 lg:px-4">
            <button
              onClick={handleLogoutClick}
              className={`flex items-center gap-2 text-white px-5 py-2 rounded transition-all mb-4 w-fit font-bold text-sm uppercase ${isDark ? 'bg-[#242526] shadow-none hover:bg-[#3a3b3c] active:bg-[#4e4f50] focus-visible:bg-[#3a3b3c]' : 'bg-pup-dark-maroon shadow-md hover:bg-[#3a0303] active:bg-[#4a0707] focus-visible:bg-[#3a0303]'}`}
            >
              <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
              Logout
            </button>
            <div className={`flex items-center justify-between text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'}`}>
              <span>RIS @ 2026</span>
              <span>v. 1.0.1</span>
            </div>
          </div>
        </div>
      </aside>

      <ConfirmationModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </>
  );
};

export default Navigation;