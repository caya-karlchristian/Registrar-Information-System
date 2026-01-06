import React from 'react';
import { Routes, Route } from 'react-router-dom';

import StudentPage from './pages/StudentPage.jsx';
import AlumniPage from './pages/AlumniPage.jsx';
import StaffPage from './pages/StaffPage.jsx';

import RequestForm from './layouts/RequestForm.jsx';
import DocumentLists from './layouts/DocumentLists.jsx';
import StudentDashboard from './layouts/StudentDashboard.jsx';
import FAQPage from './layouts/FAQs.jsx';
import AlumniRequest from './layouts/AlumniRequest.jsx'
import AnalyticsDashboard from './layouts/AnalyticsDashboard.jsx'
import StaffDashboard from './layouts/StaffDashboard.jsx'

import DashboardHeader from './components/DashboardHeader.jsx'
import RequestHeader from './components/RequestHeader.jsx'
import DocumentHeader from './components/DocumentHeader.jsx'
import FAQsHeader from './components/FAQsHeader.jsx'
import Footer from './components/Footer.jsx';


const App = () => {
  return (
    <div className="flex flex-col min-h-screen">
      
      <Routes>
        <Route path="/" element={<StudentPage />}>
          {/* --- ADD BACKEND LOGIC --- */}
          <Route index element={<RequestForm />} /> {/* OUTLETTT */}
          <Route path="/home" element={
            <>
            <DashboardHeader/>
            <StudentDashboard />
            </>
            } 
            />
          <Route path="/student/request" element={
            <>
            <RequestHeader/>
            <RequestForm />
            </>
            } 
            />
          <Route path="/lists" element={
            <>
            <DocumentHeader/>
            <DocumentLists />
            </>
            } 
            />
          <Route path="/faqs" element={
            <>
            <FAQsHeader/>
            <FAQPage />
            </>
            } 
            />

        </Route>

        <Route path="/" element={<AlumniPage />}>
          {/* --- ADD BACKEND LOGIC --- */}
          <Route index element={<AlumniRequest />} /> {/* OUTLETTT */}
          <Route path="/alumni/home" element={<StudentDashboard />} />
          <Route path="/alumni/request" element={<AlumniRequest />} />
          <Route path="/alumni/lists" element={<DocumentLists />} />
          <Route path="/alumni/faqs" element={<FAQPage />} />

        </Route>

        <Route path="/" element={<StaffPage />}>
          {/* --- ADD BACKEND LOGIC --- */}
          <Route index element={<StaffDashboard />} /> {/* OUTLETTT */}
          <Route path="/dashboard" element={<StaffDashboard />} />
          <Route path="/analytics" element={<AnalyticsDashboard />} />

        </Route>

      </Routes>

      <Footer />
      
    </div>
  );
};

export default App;