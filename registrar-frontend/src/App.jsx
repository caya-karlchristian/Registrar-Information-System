import React from 'react';
import { Routes, Route } from 'react-router-dom';

import StudentPage from './pages/StudentPage.jsx';
import AlumniPage from './pages/AlumniPage.jsx';
import StaffPage from './pages/StaffPage.jsx';
import LandingPage from './layouts/LandingPage.jsx';

import RequestForm from './layouts/RequestForm.jsx';
import DocumentLists from './layouts/DocumentLists.jsx';
import StudentDashboard from './layouts/StudentDashboard.jsx';
import FAQPage from './layouts/FAQs.jsx';
import AlumniRequest from './layouts/AlumniRequest.jsx';
import AnalyticsDashboard from './layouts/AnalyticsDashboard.jsx';
import StaffDashboard from './layouts/StaffDashboard.jsx';
import Logbook from './layouts/Logbook.jsx';
import ProfilePage from './layouts/ProfilePage.jsx';
import RegistrarContact from './layouts/RegistrarContact.jsx';
import AlumniDocumentList from './layouts/AlumniDocumentList.jsx';
import ProtectedRoute from './components/ProtectedRoute';
import ForbiddenPage from './components/ForbiddenPage';
import SuperAdminPage from './pages/SuperAdminPage.jsx';
import UserManagement from './layouts/UserManagement.jsx';
import DocumentManagement from './layouts/DocumentManagement.jsx';

const App = () => {
  return (
    <div className="flex flex-col min-h-screen">
      
      <Routes>
        {/* /super admin - need to implement */}
        <Route path="/superadmin" element={<SuperAdminPage />}>
        <Route path="contact" element={<RegistrarContact />} />  {/* /superadmin/contact */}
        <Route path="user" element={<UserManagement />} />
        <Route path="documents" element={<DocumentManagement />} />
        </Route>

        <Route path="/" element={<LandingPage />} />
        
        <Route path="/forbidden" element={<ForbiddenPage />} />

        <Route path="/student" element={
            <ProtectedRoute allowedRoles={[1]}><StudentPage /></ProtectedRoute>}>
          <Route index element={
              <RequestForm />
            } /> {/* /student */}
          <Route path="home" element={
                <StudentDashboard />
          } />
          <Route path="request" element={
            <RequestForm />
          } />
          <Route path="lists" element={
            <DocumentLists />
          } />
          <Route path="faqs" element={
            <FAQPage />
          } />

          <Route path="profile" element={
            <ProfilePage userType="student" /> 
          } />

          <Route path="contact" element={
            <RegistrarContact />
          } />

        </Route>
          <Route path="/alumni" element={
            <ProtectedRoute allowedRoles={[2]}>
              <AlumniPage />
            </ProtectedRoute>
            }>
          <Route index element={
            <AlumniRequest />
            } /> 
          <Route path="home" element={
            <StudentDashboard />
          } />
          <Route path="request" element={
            <AlumniRequest />
            } />
          <Route path="lists" element={
            <AlumniDocumentList />
          } />
          <Route path="faqs" element={
            <FAQPage />
          } />
          <Route path="profile" element={
            <ProfilePage userType="alumni" />
          } />
          <Route path="contact" element={
            <RegistrarContact />
          } />
        </Route>

        <Route path="/staff" element={
          <ProtectedRoute allowedRoles={[3]}>
            <StaffPage />
          </ProtectedRoute>
          }>
          <Route index element={
            <StaffDashboard />
            } /> {/* /staff */}
          <Route path="dashboard" element={
            <StaffDashboard />
            } />
          <Route path="analytics" element={
            <AnalyticsDashboard />
            } />
          <Route path="logbook" element={
            <Logbook />
            } />
          <Route path="profile" element={
            <ProfilePage userType="staff" />
          } />
          <Route path="contact" element={
            <RegistrarContact />
          } />
        </Route>

        
      </Routes>
      
    </div>
  );
};

export default App;
