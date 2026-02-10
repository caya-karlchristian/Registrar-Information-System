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

const App = () => {
  return (
    <div className="flex flex-col min-h-screen">
      
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/student" element={<StudentPage />}>
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

        </Route>
          <Route path="/alumni" element={<AlumniPage />}>
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
            <DocumentLists />
          } />
          <Route path="faqs" element={
            <FAQPage />
          } />
          <Route path="profile" element={
            <ProfilePage userType="alumni" />
          } />
        </Route>

        <Route path="/staff" element={<StaffPage />}>
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
        </Route>

        
      </Routes>
      
    </div>
  );
};

export default App;
