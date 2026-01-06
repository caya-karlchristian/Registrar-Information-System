import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-full font-sans bg-gray-100 overflow-hidden">
      
      <div className="hidden md:block flex-1 relative">
        <img 
        src='/src/assets/RIS1.png' 
        alt="PUP Campus" 
        className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/10"></div>
      </div>

      <div className="w-full md:w-[400px] lg:w-[450px] bg-white shadow-2xl flex flex-col items-center justify-center p-8 relative z-10">
        
        <div className="w-full max-w-xs flex flex-col items-center text-center">

          <div className="mb-6 hidden md:block">
            <img 
              src="/src/assets/puplogoimage.png" 
              alt="PUP Logo" 
              className="w-24 h-24 drop-shadow-md"
            />
          </div>

            <h1 className="text-2xl font-bold text-[#800000] mb-2">
            Welcome, PUPian!
            </h1>

            <p className="text-xs text-gray-500 font-medium mb-8 flex items-center justify-center gap-2">
            <span className="animate-bounce">↓</span> 
            <span>Please click or tap your destination.</span>
            </p>

          <div className="w-full space-y-3">
            <button 
              onClick={() => navigate('/student')} 
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-sm transition-transform transform active:scale-95"
            >
              Student
            </button>
            
            <button 
              onClick={() => navigate('/staff')} 
              className="w-full py-3 px-4 bg-[#dc3545] hover:bg-red-700 text-white font-bold rounded shadow-sm transition-transform transform active:scale-95"
            >
              Faculty
            </button>

            <button 
              onClick={() => navigate('/alumni')} 
              className="w-full py-3 px-4 bg-pup-yellow hover:bg-yellow-600 text-white font-bold rounded shadow-sm transition-transform transform active:scale-95"
            >
              Alumni
            </button>
          </div>

          {/* 4. FOOTER TERMS */}
          <div className="mt-12 text-[10px] text-gray-400 leading-tight">
            <p>
              By using this service, you understood and agree to the PUP Online Services 
              <a href="#" className="text-blue-500 hover:underline mx-1">Terms of Use</a> 
              and 
              <a href="#" className="text-blue-500 hover:underline mx-1">Privacy Statement</a>.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};

export default LandingPage;