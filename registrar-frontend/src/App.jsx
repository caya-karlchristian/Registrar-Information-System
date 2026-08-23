import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Auth
import { ROLES, useAuth } from './context/AuthProvider';
import { useTheme } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import ModuleRoute from './components/ModuleRoute';
import { MODULE_KEYS, hasModuleAccess } from './utils/policy';
import { FolderLoadingOverlay } from './components/LoadingSkeleton.jsx';

// Providers & Global UI (Synchronous)
import { NotificationToastProvider } from './context/NotificationToastContext.jsx';
import NotificationToast from './components/NotificationToast.jsx';
import { AlertToastProvider } from './context/AlertToastContext.jsx';
import { NotificationsProvider } from './context/NotificationsContext.jsx';
import { ReferenceDataProvider } from './context/ReferenceDataContext.jsx';
import FloatingActionMenu from './components/FloatingActionMenu.jsx';

// Synchronous Role Shells & Main (for instant layout, header, sidebar & route evaluation)
import StudentPage from './pages/StudentPage.jsx';
import AlumniPage from './pages/AlumniPage.jsx';
import StaffPage from './pages/StaffPage.jsx';
import SuperAdminPage from './pages/SuperAdminPage.jsx';
import MainPage from './layouts/MainPage.jsx';
import UserManagementPage from './pages/UserManagementPage.jsx';

// Lazy-loaded Direct Pages
const ForbiddenPage = lazy(() => import('./components/ForbiddenPage'));
const SsoCallbackPage = lazy(() => import('./pages/SsoCallbackPage.jsx'));
const AccessControlPage = lazy(() => import('./pages/AccessControlPage.jsx'));
const StaffDashboardPage = lazy(() => import('./pages/StaffDashboardPage.jsx'));
const RequestAccessPage = lazy(() => import('./pages/RequestAccessPage.jsx'));
const DocumentAndCertificateManagement = lazy(() => import('./pages/DocumentAndCertificateManagement.jsx'));

// Lazy-loaded Layouts
const RequestForm = lazy(() => import('./layouts/RequestForm.jsx'));
const DocumentLists = lazy(() => import('./layouts/DocumentLists.jsx'));
const StudentDashboard = lazy(() => import('./layouts/StudentDashboard.jsx'));
const FAQPage = lazy(() => import('./layouts/FAQs.jsx'));
const AlumniRequest = lazy(() => import('./layouts/AlumniRequest.jsx'));
const AlumniDocumentList = lazy(() => import('./layouts/AlumniDocumentList.jsx'));
const AnalyticsDashboard = lazy(() => import('./layouts/AnalyticsDashboard.jsx'));
const Logbook = lazy(() => import('./layouts/Logbook.jsx'));
const WalkInRequest = lazy(() => import('./layouts/WalkInRequest.jsx'));
const ProfilePage = lazy(() => import('./layouts/ProfilePage.jsx'));
const RegistrarContact = lazy(() => import('./layouts/RegistrarContact.jsx'));
const InboxCenter = lazy(() => import('./layouts/InboxCenter.jsx'));
const ReportManagement = lazy(() => import('./layouts/ReportManagement.jsx'));
const SystemSettings = lazy(() => import('./layouts/SystemSettings.jsx'));
const BusinessCalendarManagement = lazy(() => import('./layouts/BusinessCalendarManagement.jsx'));
const SuperAdminAnalyticsDashboard = lazy(() => import('./layouts/SuperAdminAnalyticsDashboard.jsx'));

const StaffIndexRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  const items = [
    { to: "dashboard", module: MODULE_KEYS.DASHBOARD },
    { to: "inbox", module: MODULE_KEYS.INBOX },
    { to: "analytics", module: MODULE_KEYS.ANALYTICS },
    { to: "logbook", module: MODULE_KEYS.LOGBOOK },
    { to: "profile", module: MODULE_KEYS.PROFILE },
  ];

  const firstAllowed = items.find(item => !item.module || hasModuleAccess(user, item.module));

  if (firstAllowed) {
    return <Navigate to={firstAllowed.to} replace />;
  }

  return <Navigate to="/forbidden" state={{ reason: "policy" }} replace />;
};

const App = () => {
  const { isDark } = useTheme();
  return (
    <NotificationToastProvider>
      <AlertToastProvider>
        <ReferenceDataProvider>
          <NotificationsProvider>
            <div className="flex flex-col min-h-screen">
              <Suspense fallback={<FolderLoadingOverlay isDark={isDark} message="Loading..." />}>
                <Routes>
                  <Route path="/" element={<MainPage />} />
                  <Route path="/forbidden" element={<ForbiddenPage />} />
                  <Route path="/auth/callback" element={<SsoCallbackPage />} />
                  <Route path="/access-control" element={<AccessControlPage />} />

                  {/* STUDENT (role: student) */}
                  <Route
                    path="/student"
                    element={
                      <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
                        <StudentPage />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Navigate to="/student/home" replace />} />
                    <Route path="home" element={<StudentDashboard />} />
                    <Route path="request" element={<RequestForm />} />
                    <Route path="lists" element={<DocumentLists />} />
                    <Route path="faqs" element={<FAQPage />} />
                    <Route path="profile" element={<ProfilePage userType="student" />} />
                    <Route path="contact" element={<RegistrarContact />} />
                    <Route path="inbox" element={<InboxCenter />} />
                  </Route>

                  {/* ALUMNI (role: alumni) */}
                  <Route
                    path="/alumni"
                    element={
                      <ProtectedRoute allowedRoles={[ROLES.ALUMNI]}>
                        <AlumniPage />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Navigate to="/alumni/home" replace />} />
                    <Route path="home" element={<StudentDashboard />} />
                    <Route path="request" element={<AlumniRequest />} />
                    <Route path="lists" element={<AlumniDocumentList />} />
                    <Route path="faqs" element={<FAQPage />} />
                    <Route path="profile" element={<ProfilePage userType="alumni" />} />
                    <Route path="contact" element={<RegistrarContact />} />
                    <Route path="inbox" element={<InboxCenter />} />
                  </Route>

                  {/* STAFF / ADMIN (role: admin) */}
                  <Route
                    path="/staff"
                    element={
                      <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                        <StaffPage />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<StaffIndexRedirect />} />
                    <Route path="dashboard" element={
                      <ModuleRoute module={MODULE_KEYS.DASHBOARD}><StaffDashboardPage /></ModuleRoute>
                    } />
                    <Route path="request" element={<WalkInRequest />} />
                    <Route path="request/student" element={<RequestForm showProfileStep />} />
                    <Route path="request/alumni" element={<AlumniRequest showProfileStep />} />
                    <Route path="analytics" element={
                      <ModuleRoute module={MODULE_KEYS.ANALYTICS}><AnalyticsDashboard /></ModuleRoute>
                    } />
                    <Route path="logbook" element={
                      <ModuleRoute module={MODULE_KEYS.LOGBOOK}><Logbook /></ModuleRoute>
                    } />
                    <Route path="profile" element={
                      <ModuleRoute module={MODULE_KEYS.PROFILE}><ProfilePage userType="admin" /></ModuleRoute>
                    } />
                    <Route path="contact" element={<RegistrarContact />} />
                    <Route path="inbox" element={
                      <ModuleRoute module={MODULE_KEYS.INBOX}><InboxCenter /></ModuleRoute>
                    } />
                    <Route path="access-requests" element={
                      <ModuleRoute module={MODULE_KEYS.ACCESS_REQUESTS}><RequestAccessPage /></ModuleRoute>
                    } />
                    <Route path="business-calendar" element={
                      <ModuleRoute module={MODULE_KEYS.BUSINESS_CALENDAR}><BusinessCalendarManagement /></ModuleRoute>
                    } />
                  </Route>

                  {/* SUPER ADMIN (role: super_admin) */}
                  <Route
                    path="/super-admin"
                    element={
                      <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
                        <SuperAdminPage />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Navigate to="/super-admin/user" replace />} />
                    <Route path="contact" element={<RegistrarContact />} />
                    <Route path="user" element={<UserManagementPage />} />
                    <Route path="system-analytics" element={<SuperAdminAnalyticsDashboard />} />
                    <Route path="documents" element={<DocumentAndCertificateManagement />} />
                    <Route path="certificates" element={<Navigate to="../documents" replace />} />
                    <Route path="report" element={<ReportManagement />} />
                    <Route path="settings" element={<SystemSettings />} />
                    <Route path="business-calendar" element={<BusinessCalendarManagement />} />
                    <Route path="inbox" element={<InboxCenter />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>

              {/* Global toast stack — rendered outside Routes so it persists across navigation */}
              <NotificationToast />
              <FloatingActionMenu />
            </div>
          </NotificationsProvider>
        </ReferenceDataProvider>
      </AlertToastProvider>
    </NotificationToastProvider>
  );
};

export default App;