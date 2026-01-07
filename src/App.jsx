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


const App = () => {
  return (
    <div className="flex flex-col min-h-screen">
      
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/" element={<StudentPage />}>
          <Route index element={<RequestForm />} /> {/* /student */}
          <Route path="/home" element={
            <>
              <DashboardHeader />
              <StudentDashboard />
            </>
          } />
          <Route path="/student/request" element={
            <>
              <RequestHeader />
              <RequestForm />
            </>
          } />
          <Route path="/lists" element={
            <>
              <DocumentHeader />
              <DocumentLists />
            </>
          } />
          <Route path="/faqs" element={
            <>
              <FAQsHeader />
              <FAQPage />
            </>
          } />
        </Route>

        <Route path="/" element={<AlumniPage />}>
          <Route index element={<AlumniRequest />} /> 
          <Route path="/alumni/home" element={
            <>
              <AlumniHeader />
              <StudentDashboard />
            </>
          } />
          <Route path="/alumni/request" element={
            <>
              <AlumniHeader/>
              <AlumniRequest />
            </>
            } />
          <Route path="/alumni/lists" element={
            <>
              <DocumentHeader />
              <DocumentLists />
            </>
          } />
          <Route path="/alumni/faqs" element={
            <>
              <FAQsHeader />
              <FAQPage />
            </>
          } />
        </Route>

        <Route path="/" element={<StaffPage />}>
          <Route index element={<StaffDashboard />} /> {/* /staff */}
          <Route path="/dashboard" element={
            <>
              <StaffHeader/>
              <StaffDashboard />
            </>
            } />
          <Route path="/analytics" element={
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
