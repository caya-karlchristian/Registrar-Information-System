import React from 'react';
import { Outlet } from 'react-router-dom';
import StaffHeaderNav from '../components/StaffHeaderNav.jsx';

const StaffPage = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <StaffHeaderNav />   {/* header/nav */}
      <Outlet />           {/* nested route content */}
    </div>
  );
};

export default StaffPage;
