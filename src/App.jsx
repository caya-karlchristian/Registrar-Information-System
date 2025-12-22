import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import RequestHeader from './components/RequestHeader.jsx';
import RequestForm from './layouts/RequestForm.jsx';
import DocumentLists from './layouts/DocumentLists.jsx';
import DocumentHeader from './components/DocumentHeader.jsx';
import Footer from './components/Footer.jsx';

const App = () => {
  return (
    <div>
      <Header />
      <Routes>
        <Route path="/lists" element={
          <>
            <DocumentHeader />
            <DocumentLists />
          </>
        } />
        <Route path="/request" element={
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
