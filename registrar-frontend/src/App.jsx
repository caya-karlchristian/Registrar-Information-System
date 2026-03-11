import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Pages (role shells)
import StudentPage from './pages/StudentPage.jsx';
import AlumniPage from './pages/AlumniPage.jsx';
import StaffPage from './pages/StaffPage.jsx';
import SuperAdminPage from './pages/SuperAdminPage.jsx';

// Layouts
import LandingPage from './layouts/LandingPage.jsx';
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
// import RegistrarContact from './layouts/RegistrarContact.jsx'; // Comment out - Not yet implemented

// Super Admin layouts (frontend dev fills these in)
import UserManagement from './layouts/UserManagement.jsx';
import DocumentManagement from './layouts/DocumentManagement.jsx';
import ReportManagement from './layouts/ReportManagement.jsx';
import SystemSettings from './layouts/SystemSettings.jsx';

// Auth
import { ROLES } from './context/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';
import ForbiddenPage from './components/ForbiddenPage';

const App = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />

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
          {/* <Route path="contact" element={<RegistrarContact />} /> */}
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
          {/* <Route path="contact" element={<RegistrarContact />} /> */}
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
          {/* <Route path="contact" element={<RegistrarContact />} /> */}
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
          {/* <Route path="contact" element={<RegistrarContact />} />  */}
          <Route path="user" element={<UserManagement />} />
          <Route path="documents" element={<DocumentManagement />} />
          <Route path="report" element={<ReportManagement/>} />
          <Route path="settings" element={<SystemSettings/>} />
        </Route>

      </Routes>
    </div>
  );
};

export default App;