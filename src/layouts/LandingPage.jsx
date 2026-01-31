import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);

  const handleLogin = (e) => {
    e.preventDefault();
    if (selectedRole === 'Student') navigate('/student');
    else if (selectedRole === 'Registrar Staff') navigate('/staff');
    else if (selectedRole === 'Alumni') navigate('/alumni');
  };

  // Helper to get the color based on selected role for the Submit button
  const getButtonColor = () => {
    if (selectedRole === 'Student') return 'bg-blue-600 hover:bg-blue-700';
    if (selectedRole === 'Registrar Staff') return 'bg-[#dc3545] hover:bg-[#b02a37]';
    return 'bg-[#eebc48] hover:bg-[#d4a53b]';
  };

  return (
    <div className="flex h-screen w-full font-sans bg-gray-50 overflow-hidden">
      
      <div className="hidden md:block flex-1 relative items-center justify-center overflow-hidden">
        
        <img 
          src='/src/assets/RIS1.png' 
          alt="PUP Campus" 
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        
        <div className="absolute inset-0 bg-gradient-to-tr from-pup-maroon/90 to-black/30 mix-blend-multiply"></div> 
        <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(128,0,0,0.7)] z-0"></div>

        <div className="absolute inset-0 z-10 flex flex-col justify-center p-16 text-white">
            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight drop-shadow-lg leading-tight">
              Registrar <br/> Information System
            </h1>
            <p className="mt-6 text-xl lg:text-2xl font-light text-gray-100 drop-shadow-md max-w-md">
              Academic Request. Redefined Simplicity.
            </p>
            <div className="w-100 h-1.5 bg-[#eebc48] mt-8 rounded-full shadow-lg"></div>
        </div>
      </div>

      <div className="w-full md:w-[450px] lg:w-[500px] bg-white shadow-2xl flex flex-col items-center justify-center p-8 relative z-10">
        
        <div className="hidden md:block absolute top-0 bottom-0 left-0 -translate-x-[99%] w-24 h-full pointer-events-none text-white z-20">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full fill-current">
              <path d="M 100 0 L 100 100 L 0 100 C 70 75 30 25 0 0 Z" />
            </svg>
        </div>

        <div className="w-full max-w-sm flex flex-col items-center">

          <button 
            type="button"
            onClick={() => setSelectedRole(null)} 
            className="mb-6 hover:scale-105 transition-transform duration-300 focus:outline-none"
          >
            <img src="/src/assets/puplogoimage.png" alt="PUP Logo" className="w-24 h-24 drop-shadow-xl" />
          </button>

          <h1 className="text-3xl font-bold text-[#800000] mb-2 tracking-wide">
            {selectedRole ? 'Portal Login' : 'Welcome, PUPian!'}
          </h1>
          <p className="text-sm text-gray-500 mb-8 font-medium">
             {selectedRole ? `Please enter your ${selectedRole} credentials.` : 'Select your destination to proceed.'}
          </p>

          {!selectedRole ? (
            /* --- SIMPLIFIED BUTTONS --- */
            <div className="w-full space-y-3 animate-fadeIn">
              
              <RoleButton 
                title="Student"
                colorClass="bg-blue-600 hover:bg-blue-700"
                onClick={() => setSelectedRole('Student')}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                  </svg>
                }
              />

              <RoleButton 
                title="Registrar Staff"
                colorClass="bg-[#dc3545] hover:bg-[#c82333]"
                onClick={() => setSelectedRole('Registrar Staff')}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                  </svg>
                }
              />

              <RoleButton 
                title="Alumni"
                colorClass="bg-[#eebc48] hover:bg-[#d4a53b]"
                onClick={() => setSelectedRole('Alumni')}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                }
              />

            </div>
          ) : (
            
            <div className="w-full animate-slideUp">
              <form onSubmit={handleLogin} className="space-y-5 text-left">
                
                {selectedRole === 'Student' && (
                  <InputField type="text" placeholder="Student Number (e.g., 2023-00000-TG-0)" required />
                )}

                {selectedRole === 'Registrar Staff' && (
                  <InputField type="email" placeholder="Email Address" required />
                )}

                {selectedRole === 'Alumni' && (
                  <>
                    <InputField type="text" placeholder="Maiden Full Name" required />
                    <InputField type="text" placeholder="Last S.Y. Attended" required />
                  </>
                )}

                <InputField type="password" placeholder="Password" required />

                <button 
                  type="submit"
                  className={`w-full py-3.5 px-4 text-white font-bold rounded-lg shadow-md transition-all transform active:scale-95 ${getButtonColor()}`}
                >
                  Sign In
                </button>
              </form>

              <div className="mt-6 flex justify-between items-center text-xs font-medium text-gray-500">
                <button 
                  type="button"
                  onClick={() => setSelectedRole(null)}
                  className="hover:text-[#800000] flex items-center gap-1 transition-colors"
                >
                  <span>&larr;</span> Back to Roles
                </button>
                <button 
                  type="button" 
                  className="text-blue-600 hover:underline"
                  onClick={() => alert("Redirect to Forgot Password")}
                >
                  Forgot Password?
                </button>
              </div>
            </div>
          )}

          <div className="mt-12 text-[10px] text-gray-400 leading-tight text-center">
            <p>
              By using this service, you agree to the PUP Online Services <br />
                <button className="text-blue-500 hover:underline mx-1">Terms of Use</button> 
                and 
                <button className="text-blue-500 hover:underline mx-1">Privacy Statement</button>.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

const RoleButton = ({ title, colorClass, onClick, icon }) => (
  <button 
    onClick={onClick}
    className={`w-full p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 ${colorClass} text-white text-left flex items-center gap-4`}
  >
    <div className="p-2 bg-white/20 rounded-md">
      {icon}
    </div>
    <span className="font-bold text-lg tracking-wide">{title}</span>
    <div className="ml-auto opacity-70">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
    </div>
  </button>
);

const InputField = ({ type, placeholder, required }) => (
  <div className="relative group">
    <input 
      type={type} 
      placeholder={placeholder} 
      className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#eebc48] focus:bg-white transition-all text-sm text-gray-700 placeholder-gray-400 shadow-sm"
      required={required}
    />
  </div>
);

export default LandingPage;