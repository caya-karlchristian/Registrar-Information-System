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
import StaffDashboard from './layouts/StaffDashboard.jsx';
import Logbook from './layouts/Logbook.jsx';
import ProfilePage from './layouts/ProfilePage.jsx';
import RegistrarContact from './layouts/RegistrarContact.jsx'; 
import MainPage from './layouts/MainPage.jsx';
import InboxCenter from './layouts/InboxCenter.jsx';

// Super Admin layouts
import UserManagement from './layouts/UserManagement.jsx';
import DocumentManagement from './layouts/DocumentManagement.jsx';
import ReportManagement from './layouts/ReportManagement.jsx';
import SystemSettings from './layouts/SystemSettings.jsx';

// Auth
import { ROLES } from './context/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';
import ForbiddenPage from './components/ForbiddenPage';
import SsoCallbackPage from './pages/SsoCallbackPage.jsx';

// Notifications
import { NotificationToastProvider } from './context/NotificationToastContext.jsx';
import NotificationToast from './components/NotificationToast.jsx';

import { NotificationsProvider } from './context/NotificationsContext.jsx';


const App = () => {
  return (
    <NotificationToastProvider>
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
            <Route index element={<RequestForm />} />
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
            <Route index element={<AlumniRequest />} />
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
            <Route index element={<StaffDashboard />} />
            <Route path="dashboard" element={<StaffDashboard />} />
            <Route path="analytics" element={<AnalyticsDashboard />} />
            <Route path="logbook" element={<Logbook />} />
            <Route path="profile" element={<ProfilePage userType="admin" />} />
            <Route path="contact" element={<RegistrarContact />} />
            <Route path="inbox" element={<InboxCenter />} />
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
            <Route index element={<UserManagement />} /> 
            <Route path="contact" element={<RegistrarContact />} /> 
            <Route path="user" element={<UserManagement />} />
            <Route path="documents" element={<DocumentManagement />} />
            <Route path="report" element={<ReportManagement/>} />
            <Route path="settings" element={<SystemSettings/>} />
            <Route path="inbox" element={<InboxCenter />} />
          </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Global toast stack — rendered outside Routes so it persists across navigation */}
        <NotificationToast />
      </div>
    </NotificationsProvider>
      </NotificationToastProvider>
  );
};

export default App;