import React from 'react';
import logo from '../assets/half_background.png'; 
import tech4ward from '../assets/tech4ward_logo.png';
import ris_logo from '../assets/ris_logo.png'; 

const AnalyticsHeader = () => {
  return (
    <header className='relative w-full border-pup-yellow border-b-[5px] mb-10'>
      <div>
        <div>
          <img src={logo} 
             alt="Background"
             className="w-full h-[200px] object-cover lg:object-fill lg:h-[250px]"
          />

          <div className="bg-pup-maroon-header rounded-[20px] shadow-md absolute inset-10 flex items-center justify-between px-5">

            <img src={tech4ward} 
              alt="Tech4Ward Logo"
              className="w-[50px] h-[65px] object-contain lg:w-[100px] lg:h-[100px] lg:ml-5"
            />

            <div className="flex flex-col items-center px-1">
              <h2 className="text-[22px] font-bold mb-4 text-center text-white leading-tight lg:text-[50px]">
                DOCUMENT ANALYTICS              
              </h2>
              <p className="text-center text-[8px] -mt-3 text-white lg:text-[15px]">
                Here’s the analytics of the requested documents
              </p>
            </div>

            <img src={ris_logo} 
              alt="Right Icon"
              className="h-[90px] object-contain lg:w-[100px] lg:h-[200px] lg:mr-5"
            />

          </div>   
        </div>
      </div>
    </header>
  );
};

export default AnalyticsHeader;