import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import RequestHeader from './components/RequestHeader.jsx';
import RequestForm from './layouts/RequestForm.jsx';

const App = () => {
  return (
    <div>
      <Header />
      <Routes>
        <Route path="/request" element={
          <>
            <RequestHeader />
            <RequestForm />
          </>
        } />
      </Routes>
    </div>
  );
};

export default App;
