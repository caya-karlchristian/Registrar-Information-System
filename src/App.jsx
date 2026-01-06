import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import RequestHeader from './components/RequestHeader.jsx';
import RequestForm from './layouts/RequestForm.jsx';
import DocumentLists from './layouts/DocumentLists.jsx';
import DocumentHeader from './components/DocumentHeader.jsx';
import Footer from './components/Footer.jsx';
import DashboardHeader from './components/DashboardHeader.jsx';
import StudentDashboard from './layouts/StudentDashboard.jsx';
import AnalyticsDashboard from './layouts/AnalyticsDashboard.jsx';
import AnalyticsHeader from './components/AnalyticsHeader.jsx';
import AnalyticsSummary from './components/AnalyticsSummary.jsx';
import FAQsHeader from './components/FAQsHeader.jsx';
import FAQPage from './layouts/FAQs.jsx';
import AlumniRequestForm from './layouts/AlumniRequest.jsx';
import AlumniRequestHeader from './components/AlumniHeader.jsx';
import StaffDashboard from './layouts/StaffDashboard.jsx';
import StaffDashboardHeader from './components/StaffHeader.jsx';

const App = () => {
  return (
    <div>
      <Header />
      <Routes>
        <Route path="/staff_dashboard" element={
          <>
            <StaffDashboardHeader/>
            <StaffDashboard/>
          </>
        } />
      <Route path="/faqs" element={
          <>
            <FAQsHeader/>
            <FAQPage/>
          </>
        } />
      <Route
          path="/analytics"
          element={
            <>
              <AnalyticsHeader/>
              <AnalyticsSummary/>
              <AnalyticsDashboard />
            </>
          }
        />        
        <Route path="/home" element={
          <>
            <DashboardHeader />
            <StudentDashboard />
          </>
          } />
        <Route path="/lists" element={
          <>
            <DocumentHeader />
            <DocumentLists />
          </>
        } />
        <Route path="/student_request" element={
          <>
            <RequestHeader />
            <RequestForm />
          </>
        } />
        <Route path="/alumni_request" element={
          <>
            <AlumniRequestHeader />
            <AlumniRequestForm />
          </>
        } />
        <Route path="/" element={
          <>
            <RequestHeader />
            <RequestForm />
          </>
        } />
      </Routes>
      <Footer />
    </div>
  );
};

export default App;
