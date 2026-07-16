import { Routes, Route, Navigate } from 'react-router-dom';

// Pages (role shells)
import StudentPage from './pages/StudentPage.jsx';
import AlumniPage from './pages/AlumniPage.jsx';
import StaffPage from './pages/StaffPage.jsx';
import SuperAdminPage from './pages/SuperAdminPage.jsx';

// Layouts
import RequestForm from './layouts/RequestForm.jsx';
import DocumentLists from './layouts/DocumentLists.jsx';
import StudentDashboard from './layouts/StudentDashboard.jsx';
import FAQPage from './layouts/FAQs.jsx';
import AlumniRequest from './layouts/AlumniRequest.jsx';
import AlumniDocumentList from './layouts/AlumniDocumentList.jsx';
import AnalyticsDashboard from './layouts/AnalyticsDashboard.jsx';
import StaffDashboardPage from './pages/StaffDashboardPage.jsx';
import Logbook from './layouts/Logbook.jsx';
import WalkInRequest from './layouts/WalkInRequest.jsx';
import ProfilePage from './layouts/ProfilePage.jsx';
import RegistrarContact from './layouts/RegistrarContact.jsx';
import MainPage from './layouts/MainPage.jsx';
import InboxCenter from './layouts/InboxCenter.jsx';

// Super Admin layouts
import UserManagementPage from './pages/UserManagementPage.jsx';
import DocumentAndCertificateManagement from './pages/DocumentAndCertificateManagement.jsx';
import ReportManagement from './layouts/ReportManagement.jsx';
import SystemSettings from './layouts/SystemSettings.jsx';
import CertificateTemplateManagement from './layouts/CertificateTemplateManagement.jsx';

// Auth
import { ROLES, useAuth } from './context/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';
import ModuleRoute from './components/ModuleRoute';
import { MODULE_KEYS, hasModuleAccess } from './utils/policy';
import ForbiddenPage from './components/ForbiddenPage';
import SsoCallbackPage from './pages/SsoCallbackPage.jsx';

// Notifications
import { NotificationToastProvider } from './context/NotificationToastContext.jsx';
import NotificationToast from './components/NotificationToast.jsx';

// Lightweight alert toasts (ErrorToast / SuccessToast) — separate from the
// notification system above.
import { AlertToastProvider } from './context/AlertToastContext.jsx';

import { NotificationsProvider } from './context/NotificationsContext.jsx';
import { ReferenceDataProvider } from './context/ReferenceDataContext.jsx';
import FloatingActionMenu from './components/FloatingActionMenu.jsx';


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
  return (
    <NotificationToastProvider>
      <AlertToastProvider>
      <ReferenceDataProvider>
        <NotificationsProvider>
          <div className="flex flex-col min-h-screen">
            <Routes>
              <Route path="/" element={<MainPage />} />
              <Route path="/forbidden" element={<ForbiddenPage />} />
              <Route path="/auth/callback" element={<SsoCallbackPage />} />

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
                <Route path="documents" element={<DocumentAndCertificateManagement />} />
                <Route path="certificates" element={<Navigate to="../documents" replace />} />
                <Route path="report" element={<ReportManagement />} />
                <Route path="settings" element={<SystemSettings />} />
                <Route path="inbox" element={<InboxCenter />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

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