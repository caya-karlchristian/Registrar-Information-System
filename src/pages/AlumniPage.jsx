import React from 'react';
import { Outlet } from 'react-router-dom';
import AlumniHeaderNav from '../components/AlumniHeaderNav.jsx';

const AlumniPage = () => {
  return (
    <div>
        <AlumniHeaderNav/>
        <Outlet /> 
    </div>
  );
};

export default AlumniPage;
