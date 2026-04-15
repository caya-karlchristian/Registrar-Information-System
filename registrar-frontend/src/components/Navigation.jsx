import React, { useMemo, useState } from "react";
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
} from '@heroicons/react/24/outline';
import { useAuth } from "../context/AuthProvider";
import ConfirmationModal from "../components/ConfirmationModal";
import LineLoading from "../components/LineLoading.jsx";

const ROLE_CONFIG = {
  student: {
    profileKey: 'student_profile',
    profileLabel: (user) => user?.academic_record?.student_number || 'No Student Number',
    items: [
      { name: 'Dashboard', to: 'home', icon: Squares2X2Icon },
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'default',
    onConfirm: () => {},
  });

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

      <div className={`lg:hidden absolute inset-x-0 top-0 z-50 transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 -translate-y-3'}`}>
        <div className="w-full overflow-hidden rounded-b-lg shadow-[0_18px_42px_rgba(0,0,0,0.3)]">
          <div className="bg-[#7a0000]">
            <nav className="space-y-px bg-[#5c0000]">
              {config.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onItemClick}
                  className={({ isActive }) => `
                    group flex items-center justify-between px-5 py-4 text-[16px] font-bold text-white transition-all duration-200 outline-none
                    ${isActive
                      ? 'bg-[#5a0000] text-[#fff2f2] hover:bg-[#670000] active:bg-[#730000]'
                      : 'bg-[#7a0000] hover:bg-[#8a0f0f] hover:text-[#fff3f3] active:bg-[#981a1a] active:text-white'}
                    focus-visible:bg-[#8a0f0f] focus-visible:text-[#fff3f3]
                  `}
                >
                  <span>{item.name}</span>
                  <item.icon className="h-5 w-5 text-white/85 transition-transform duration-200 group-hover:scale-110 group-active:scale-110" />
                </NavLink>
              ))}
            </nav>

            <button
              onClick={handleLogoutClick}
              className="group flex w-full items-center justify-between bg-[#4f0000] px-5 py-4 text-[16px] font-bold text-white transition-all duration-200 hover:bg-[#640000] active:bg-[#750000] focus-visible:bg-[#640000]"
            >
              <span>Logout</span>
              <ArrowRightStartOnRectangleIcon className="h-5 w-5 text-white/85 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>

      <aside
        className={`
          hidden lg:fixed lg:left-0 lg:top-25 lg:z-40 lg:flex lg:w-72
          lg:h-[calc(100vh-100px)]
          bg-[#E0E0E0] border-r border-gray-300 lg:flex-col
        `}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 shrink-0">
            <div className="flex items-center gap-3">
              <UserCircleIcon className="w-14 h-14 lg:w-17 lg:h-17 text-gray-700" />
              <div className="flex flex-col">
                <h2 className="text-pup-maroon font-black text-l leading-tight uppercase">
                  {fullName}
                </h2>
                <span className="text-gray-500 text-xs font-medium">{config.profileLabel(user) || 'Guest'}</span>
              </div>
            </div>
            <hr className="mt-6 border-gray-400" />
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
                    ? 'bg-pup-dark-maroon text-white shadow-md shadow-[#700000]/25 hover:bg-[#5f0000] active:bg-[#6b0000]'
                    : 'text-[#700000] hover:bg-black/5 hover:text-[#5c0000] active:bg-black/15 active:text-[#4a0000]'}
                  focus-visible:bg-black/10 focus-visible:text-[#5c0000]
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
              className="flex items-center gap-2 bg-pup-dark-maroon text-white px-5 py-2 rounded shadow-md hover:bg-[#3a0303] active:bg-[#4a0707] focus-visible:bg-[#3a0303] transition-all mb-4 w-fit font-bold text-sm uppercase"
            >
              <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
              Logout
            </button>
            <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-widest">
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