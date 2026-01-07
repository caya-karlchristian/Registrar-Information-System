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

import AnalyticsSummary from './components/AnalyticsSummary.jsx'
import DashboardHeader from './components/DashboardHeader.jsx';
import RequestHeader from './components/RequestHeader.jsx';
import DocumentHeader from './components/DocumentHeader.jsx';
import FAQsHeader from './components/FAQsHeader.jsx';
import StaffHeader from './components/StaffHeader.jsx';
import Footer from './components/Footer.jsx';
import AnalyticsHeader from './components/AnalyticsHeader.jsx';
import AlumniHeader from './components/AlumniHeader.jsx'
import AlumniDashboardHeader from './components/AlumniDashboardHeader.jsx';


const App = () => {
  return (
    <div className="flex flex-col min-h-screen">
      
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/student" element={<StudentPage />}>
          <Route index element={
            <>
              <RequestHeader />
              <RequestForm />
            </>
            } /> {/* /student */}
          <Route path="home" element={
            <>
              <DashboardHeader />
              <StudentDashboard />
            </>
          } />
          <Route path="request" element={
            <>
              <RequestHeader />
              <RequestForm />
            </>
          } />
          <Route path="lists" element={
            <>
              <DocumentHeader />
              <DocumentLists />
            </>
          } />
          <Route path="faqs" element={
            <>
              <FAQsHeader />
              <FAQPage />
            </>
          } />
        </Route>
          <Route path="/alumni" element={<AlumniPage />}>
          <Route index element={
            <>
              <AlumniHeader/>
              <AlumniRequest />
            </>
            } /> 
          <Route path="home" element={
            <>
              <AlumniDashboardHeader />
              <StudentDashboard />
            </>
          } />
          <Route path="request" element={
            <>
              <AlumniHeader/>
              <AlumniRequest />
            </>
            } />
          <Route path="lists" element={
            <>
              <DocumentHeader />
              <DocumentLists />
            </>
          } />
          <Route path="faqs" element={
            <>
              <FAQsHeader />
              <FAQPage />
            </>
          } />
        </Route>

        <Route path="/staff" element={<StaffPage />}>
          <Route index element={
            <>
              <StaffHeader/>
              <StaffDashboard />
            </>
            } /> {/* /staff */}
          <Route path="dashboard" element={
            <>
              <StaffHeader/>
              <StaffDashboard />
            </>
            } />
          <Route path="analytics" element={
            <>
              <AnalyticsHeader/>
              <AnalyticsSummary/>
              <AnalyticsDashboard />
            </>
            } />
        </Route>
        
      </Routes>

      <Footer />
      
    </div>
  );
};

export default App;
