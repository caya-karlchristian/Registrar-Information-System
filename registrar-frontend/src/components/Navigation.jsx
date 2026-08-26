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
  InboxIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  BriefcaseIcon,
  UserIcon,
  ShieldCheckIcon,
  XMarkIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { useAuth } from "../context/AuthProvider";
import { useTheme } from "../context/ThemeContext";
import ConfirmationModal from "../components/ConfirmationModal";
import LineLoading from "../components/LineLoading.jsx";
import { MODULE_KEYS, hasModuleAccess } from "../utils/policy";

const ROLE_CONFIG = {
  student: {
    profileKey: 'student_profile',
    profileLabel: (user) => user?.academic_record?.student_number || user?.email || 'Student',
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
    profileLabel: (user) => user?.email || 'Alumni',
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
      { name: 'Dashboard', to: 'dashboard', icon: Squares2X2Icon, module: MODULE_KEYS.DASHBOARD },
      { name: 'Inbox', to: 'inbox', icon: InboxIcon, module: MODULE_KEYS.INBOX },
      // { name: 'Walk-In Request', to: 'request', icon: AcademicCapIcon },
      { name: 'Admin Analytics', to: 'analytics', icon: ChartBarSquareIcon, module: MODULE_KEYS.ANALYTICS },
      { name: 'Admin Logbook', to: 'logbook', icon: BookOpenIcon, module: MODULE_KEYS.LOGBOOK },
      { name: 'Access Requests', to: 'access-requests', icon: ClipboardDocumentCheckIcon, module: MODULE_KEYS.ACCESS_REQUESTS },
      { name: 'Business Calendar', to: 'business-calendar', icon: CalendarDaysIcon, module: MODULE_KEYS.BUSINESS_CALENDAR },
      { name: 'Cashier OR Overrides', to: 'cashier-overrides', icon: ShieldCheckIcon, module: MODULE_KEYS.CASHIER_OVERRIDES },
      { name: 'Admin Profile', to: 'profile', icon: UserCircleIcon, module: MODULE_KEYS.PROFILE },
    ],
  },
  superAdmin: {
    profileKey: null,
    profileLabel: (user) => user?.email,
    items: [
      { name: 'Admin Management', to: 'user', icon: Squares2X2Icon },
      { name: 'System Analytics', to: 'system-analytics', icon: ChartBarSquareIcon },
      { name: 'Document Management', to: 'documents', icon: TableCellsIcon },
      { name: 'Audit Trail', to: 'report', icon: UserCircleIcon },
      { name: 'Announcement Management', to: 'settings', icon: Cog6ToothIcon },
      { name: 'Business Calendar', to: 'business-calendar', icon: CalendarDaysIcon },
      { name: 'Cashier OR Overrides', to: 'cashier-overrides', icon: ShieldCheckIcon },
    ],
  },
};

const Navigation = ({ isOpen, onItemClick, role = 'student' }) => {
  const navigate = useNavigate();
  const { user, logout, idpOffline, roleAssignments, switchRole, ROLE_ID_TO_NAME } = useAuth();
  const [isSwitching, setIsSwitching] = useState(false);
  const { isDark } = useTheme();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);

  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'default',
    onConfirm: () => { },
  });
  const [headerHeight, setHeaderHeight] = useState(101); // Fallback default

  // canUseSwitcher: enabled whenever this account currently holds more
  // than one Active role_assignments row (e.g. Student + a
  // policy-restricted Admin — the "student staff" case). Server-driven
  // now, via GET /role-assignments/mine, rather than a hardcoded
  // "Student Staff" policy name — any account granted a second role
  // gets the switcher automatically, with no extra flag to maintain.
  const canUseSwitcher = Array.isArray(roleAssignments) && roleAssignments.length > 1;

  const switchableRoles = useMemo(() => {
    const ICONS = { admin: BriefcaseIcon, super_admin: BriefcaseIcon, student: UserIcon, alumni: AcademicCapIcon };
    const GRADS = {
      admin: 'from-[#0052d4] to-[#4364f7]',
      super_admin: 'from-[#0052d4] to-[#4364f7]',
      student: 'from-[#11998e] to-[#38ef7d]',
      alumni: 'from-[#11998e] to-[#38ef7d]',
    };
    const LABELS = { admin: 'Admin', super_admin: 'Super Admin', student: 'Student', alumni: 'Alumni' };
    const DESCRIPTIONS = {
      student: 'Student Role',
      alumni: 'Alumni Role',
      admin: 'Registrar Staff',
      super_admin: 'System Administrator',
    };

    return (roleAssignments || []).map((assignment) => {
      const roleName = ROLE_ID_TO_NAME?.[assignment.role_id];
      return {
        role_id: assignment.role_id,
        label: LABELS[roleName] || roleName || 'Unknown',
        description: assignment.policy?.name || DESCRIPTIONS[roleName] || 'Account Role',
        icon: ICONS[roleName] || UserIcon,
        grad: GRADS[roleName] || 'from-gray-500 to-gray-700',
      };
    });
  }, [roleAssignments, ROLE_ID_TO_NAME]);

  const handleSwitchRole = async (roleId) => {
    if (isSwitching) return;
    setIsSwitching(true);
    try {
      await switchRole(roleId);
      setIsSwitchModalOpen(false);
    } catch (err) {
      console.error('Role switch failed:', err);
    } finally {
      setIsSwitching(false);
    }
  };
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sidebar-collapsed', isCollapsed);
    } catch (e) {
      console.error('Failed to save sidebar collapsed state:', e);
    }
    if (isCollapsed) {
      document.documentElement.classList.add('sidebar-collapsed');
    } else {
      document.documentElement.classList.remove('sidebar-collapsed');
    }
    return () => {
      document.documentElement.classList.remove('sidebar-collapsed');
    };
  }, [isCollapsed]);

  useEffect(() => {
    const handleSetCollapsed = (event) => {
      if (typeof event?.detail === 'boolean') {
        setIsCollapsed(event.detail);
      } else {
        setIsCollapsed(true);
      }
    };
    window.addEventListener('collapse-sidebar', handleSetCollapsed);
    return () => window.removeEventListener('collapse-sidebar', handleSetCollapsed);
  }, []);

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

  const baseConfig = ROLE_CONFIG[role] || ROLE_CONFIG.student;
  // Items without a `module` tag (student/alumni/superAdmin items, plus
  // any future staff item not covered by the policy system) always pass
  // through. Items tagged with a `module` are only shown if the current
  // user's assigned policy actually grants that module — see
  // src/utils/policy.js.
  const config = useMemo(() => ({
    ...baseConfig,
    items: baseConfig.items.filter((item) => !item.module || hasModuleAccess(user, item.module)),
  }), [baseConfig, user]);
  const profile = config.profileKey ? user?.[config.profileKey] : null;

  const fullName = useMemo(() => {
    if (role === 'superAdmin') return 'SUPER ADMIN';

    const p =
      (profile?.first_name || profile?.last_name) ? profile :
      (user?.admin_profile?.first_name || user?.admin_profile?.last_name) ? user.admin_profile :
      (user?.student_profile?.first_name || user?.student_profile?.last_name) ? user.student_profile :
      (user?.alumni_profile?.first_name || user?.alumni_profile?.last_name) ? user.alumni_profile :
      null;

    if (p) {
      const name = [p.first_name, p.last_name, p.suffix]
        .filter(Boolean)
        .join(' ')
        .trim();
      if (name) return name;
    }

    if (user?.first_name || user?.last_name) {
      const name = [user.first_name, user.last_name, user.suffix]
        .filter(Boolean)
        .join(' ')
        .trim();
      if (name) return name;
    }

    if (role === 'staff') {
      return user?.policy?.name || 'Staff';
    }

    if (role === 'student') {
      return 'Student';
    }

    if (role === 'alumni') {
      return 'Alumni';
    }

    return user?.policy?.name || 'Student';
  }, [profile, role, user]);

  const initials = useMemo(() => {
    if (role === 'superAdmin') return 'SA';

    const getInitialsFrom = (name) => {
      if (!name) return null;
      const parts = name.trim().split(/\s+/);
      return parts.length > 1
        ? (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
        : parts[0].charAt(0).toUpperCase();
    };

    if (fullName) {
      return getInitialsFrom(fullName);
    }

    return role === 'student' ? 'S' : role === 'alumni' ? 'A' : 'SS';
  }, [fullName, role]);

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
            {canUseSwitcher && (
              <div className="px-4 py-3 border-b">
                <button
                  type="button"
                  onClick={() => setIsSwitchModalOpen(true)}
                  className={`w-full text-left flex items-center justify-between font-bold transition-all ${isDark ? 'text-[#e4e6eb]' : 'text-white'}`}
                >
                  <div className="flex flex-col text-left">
                    <span className="text-sm uppercase tracking-wider">{fullName}</span>
                    <span className="text-[11px] font-semibold opacity-85">{config.profileLabel(user) || user?.email}</span>
                  </div>
                  <ChevronDownIcon className={`h-5 w-5 ${isDark ? 'text-[#b0b3b8]' : 'text-white/85'}`} />
                </button>
              </div>
            )}
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
          hidden lg:fixed lg:left-0 lg:z-40 lg:flex lg:flex-col relative
          ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}
          ${isDark ? 'bg-[#18191a] border-[#3e4042]' : 'bg-[#E0E0E0] border-gray-300'} border-r transition-all duration-300 ease-in-out
        `}
        style={{
          top: `${headerHeight}px`,
          height: `calc(100vh - ${headerHeight}px)`
        }}
      >
        {/* Toggle Button */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`
            hidden lg:flex absolute top-5 -right-5 z-9999 items-center justify-center w-10 h-8 rounded-full border shadow-md transition-all duration-300 hover:scale-110
            ${isDark
              ? 'bg-[#18191a] border-[#3e4042] text-[#e4e6eb] hover:bg-[#3a3b3c]'
              : 'bg-[#E0E0E0] border-gray-300 text-[#700000] hover:bg-white'}
          `}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="w-4 h-4 font-bold" />
          ) : (
            <ChevronLeftIcon className="w-4 h-4 font-bold" />
          )}
        </button>

        <div className={`flex flex-col h-full ${isCollapsed ? 'overflow-visible' : 'overflow-hidden'}`}>
          <div className={`shrink-0 transition-all duration-300 relative ${isCollapsed ? 'p-3' : 'p-6'}`}>
            <button
              type="button"
              disabled={!canUseSwitcher}
              onClick={() => setIsSwitchModalOpen(true)}
              className={`w-full text-left flex items-center justify-between focus:outline-none min-w-0 ${canUseSwitcher
                ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-2xl transition-all duration-200'
                : ''
                } ${isCollapsed ? 'justify-center p-0' : 'gap-3'}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex items-center justify-center rounded-full shrink-0 font-black text-white bg-pup-dark-maroon transition-all duration-300 border border-white/10 shadow-sm
                    ${isCollapsed ? 'w-10 h-10 text-xs' : 'w-12 h-12 text-sm lg:w-14 lg:h-14 lg:text-base'}
                  `}
                >
                  {initials}
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col overflow-hidden transition-all duration-300 min-w-0">
                    <h2 className={`font-black text-sm leading-tight uppercase truncate ${isDark ? 'text-[#e4e6eb]' : 'text-pup-maroon'}`}>
                      {fullName}
                    </h2>
                    <span className={`text-[10px] font-semibold truncate ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>{config.profileLabel(user) || user?.email}</span>
                  </div>
                )}
              </div>
              {!isCollapsed && canUseSwitcher && (
                <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`} />
              )}
            </button>

            {!isCollapsed && <hr className={`mt-6 ${isDark ? 'border-[#3e4042]' : 'border-gray-400'}`} />}
          </div>

          <nav className={`flex-1 space-y-3 custom-scrollbar transition-all duration-300 ${isCollapsed ? 'px-2 py-3 overflow-visible' : 'px-4 py-3 overflow-y-auto'}`}>
            {config.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onItemClick}
                className={({ isActive }) => `
                  group relative flex items-center rounded-lg font-bold transition-all duration-200 outline-none
                  ${isCollapsed ? 'justify-center p-3' : 'gap-4 px-4 py-4'}
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
                <item.icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110 group-active:scale-110 shrink-0" />
                {!isCollapsed && <span className="text-sm uppercase tracking-wider truncate">{item.name}</span>}
                {isCollapsed && (
                  <span className={`pointer-events-none absolute left-full ml-4 z-50 rounded-md px-2.5 py-1.5 text-xs font-semibold shadow-lg border transition-all duration-200 opacity-0 translate-x-[-8px] scale-95 group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-100 ${isDark
                    ? 'bg-[#242526] text-[#e4e6eb] border-[#3e4042]'
                    : 'bg-white text-[#700000] border-gray-200'
                    }`}>
                    {item.name}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className={`mt-auto shrink-0 transition-all duration-300 ${isCollapsed ? 'p-2 overflow-visible' : 'p-6 lg:p-3 lg:px-4'}`}>
            <button
              type="button"
              onClick={handleLogoutClick}
              className={`group relative flex items-center transition-all mb-4 font-bold text-sm uppercase ${isCollapsed ? 'justify-center w-full p-3 rounded-lg' : 'gap-2 px-5 py-2 rounded w-fit'} text-white ${isDark ? 'bg-[#242526] shadow-none hover:bg-[#3a3b3c] active:bg-[#4e4f50] focus-visible:bg-[#3a3b3c]' : 'bg-pup-dark-maroon shadow-md hover:bg-[#3a0303] active:bg-[#4a0707] focus-visible:bg-[#3a0303]'}`}
            >
              <ArrowRightStartOnRectangleIcon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span>Logout</span>}
              {isCollapsed && (
                <span className={`pointer-events-none absolute left-full ml-4 z-50 rounded-md px-2.5 py-1.5 text-xs font-semibold shadow-lg border transition-all duration-200 opacity-0 translate-x-[-8px] scale-95 group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-100 ${isDark
                  ? 'bg-[#242526] text-[#e4e6eb] border-[#3e4042]'
                  : 'bg-white text-[#700000] border-gray-200'
                  }`}>
                  Logout
                </span>
              )}
            </button>
            {!isCollapsed && (
              <div className={`flex items-center justify-between text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'}`}>
                <span>RIS @ 2026</span>
                <span>v. 1.0.1</span>
              </div>
            )}
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

      {/* Switch Role Modal inside Navigation */}
      {isSwitchModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-99999 flex items-center justify-center p-4">
          <div className={`relative rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden ${isDark ? 'bg-[#242526] border border-[#3e4042] text-[#e4e6eb]' : 'bg-white text-gray-900 border border-gray-200'
            }`}>

            {/* Header */}
            <div className={`px-6 py-5 flex items-center justify-between rounded-t-2xl shrink-0 ${isDark ? 'bg-[#2a2a2f] border-b border-[#3e4042] text-[#e4e6eb]' : 'bg-pup-dark-maroon text-white'
              }`}>
              <div className="flex items-center gap-2 text-left">
                <ShieldCheckIcon className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <h2 className="font-bold text-base uppercase tracking-wide">Switch Role</h2>
                  <p className={`text-[10px] ${isDark ? 'text-[#b0b3b8]' : 'text-white/60'}`}>
                    {user?.email || ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSwitchModalOpen(false)}
                className={`p-1.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer ${isDark ? 'text-gray-400 hover:text-white' : 'text-white/80 hover:text-white'
                  }`}
                aria-label="Close modal"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="px-6 py-6 space-y-4">
              <p className={`text-xs ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'} leading-relaxed`}>
                Your account has multiple roles assigned. Please select the role context for your current session.
              </p>

              {/* List — one entry per Active role_assignments row this
                  account currently holds (see GET /role-assignments/mine).
                  Selecting a role calls the server-enforced
                  POST /auth/switch-role, not a client-only override. */}
              <div className="w-full space-y-3">
                {switchableRoles.map((roleOption) => {
                  const isSelected = user?.role_id === roleOption.role_id;
                  const RoleIcon = roleOption.icon;
                  return (
                    <button
                      key={roleOption.role_id}
                      type="button"
                      disabled={isSwitching}
                      onClick={() => handleSwitchRole(roleOption.role_id)}
                      className={`w-full text-left flex items-center justify-between p-3.5 border rounded-xl transition-all duration-200 group cursor-pointer active:scale-98 shadow-xs disabled:opacity-60 disabled:cursor-wait ${isSelected
                        ? (isDark
                          ? "bg-red-955/20 border-red-500/40 text-white font-bold"
                          : "bg-red-50 border-red-200 text-pup-maroon font-bold")
                        : (isDark
                          ? "bg-[#18191a] border-[#3e4042] hover:bg-[#2c2d30] hover:border-gray-500 text-[#e4e6eb]"
                          : "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300 text-gray-800")
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-200 bg-gradient-to-tr ${roleOption.grad} text-white shrink-0`}>
                          <RoleIcon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className={`font-bold text-sm transition-colors ${isSelected
                            ? (isDark ? "text-red-400" : "text-pup-maroon")
                            : (isDark ? "text-white group-hover:text-amber-400" : "text-gray-900 group-hover:text-pup-maroon")
                            }`}>
                            {roleOption.label}
                          </span>
                          <span className={`text-[11px] ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
                            {roleOption.description}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-red-600 text-white border border-red-500">
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Cancel Button */}
              <div className="w-full pt-2">
                <button
                  type="button"
                  onClick={() => setIsSwitchModalOpen(false)}
                  className={`w-full px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${isDark
                    ? 'text-[#e4e6eb] bg-[#3a3b3c] hover:bg-[#4e4f50] border border-[#4e4f50]'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200'
                    }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;