import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();
  
  const [selectedRole, setSelectedRole] = useState(null);

  const handleLogin = (e) => {
    e.preventDefault();
    if (selectedRole === 'Student') navigate('/student');
    else if (selectedRole === 'Faculty') navigate('/staff');
    else if (selectedRole === 'Alumni') navigate('/alumni');
  };

  return (
    <div className="flex h-screen w-full font-sans bg-gray-100 overflow-hidden">
      
      <div className="hidden md:block flex-1 relative items-center justify-center">
        <img 
          src='/src/assets/RIS1.png' 
          alt="PUP Campus" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute"></div> 
      </div>

      <div className="w-full md:w-[400px] lg:w-[450px] bg-white shadow-2xl flex flex-col items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-xs flex flex-col items-center text-center">

          <div className="mb-4 md:block">
            <button 
              type="button"
              onClick={() => setSelectedRole(null)} 
              className="bg-transparent border-none p-0 cursor-pointer hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
              aria-label="Return to role selection"
            >
              <img 
                src="/src/assets/puplogoimage.png" 
                alt="PUP Logo" 
                className="w-24 h-24 drop-shadow-md"
              />
            </button>
          </div>

          <h1 className="text-2xl font-bold text-pup-maroon">Welcome, PUPian!</h1>

          {!selectedRole ? (
            <>
              <p className="text-xs text-gray-500 font-medium mb-8 flex items-center justify-center gap-2">
                <span className="animate-bounce">↓</span> 
                <span>Please click or tap your destination.</span>
              </p>

              <div className="w-full space-y-3">
                <button 
                  onClick={() => setSelectedRole('Student')} 
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-sm transition-transform transform active:scale-95"
                >
                  Student
                </button>
                
                <button 
                  onClick={() => setSelectedRole('Faculty')} 
                  className="w-full py-3 px-4 bg-[#dc3545] hover:bg-red-700 text-white font-bold rounded shadow-sm transition-transform transform active:scale-95"
                >
                  Faculty
                </button>

                <button 
                  onClick={() => setSelectedRole('Alumni')} 
                  className="w-full py-3 px-4 bg-pup-yellow hover:bg-yellow-600 text-white font-bold rounded shadow-sm transition-transform transform active:scale-95"
                >
                  Alumni
                </button>
              </div>
            </>
          ) : (
            
            <div className="w-full animate-fadeIn">
              <p className="text-sm text-gray-600 mb-6 font-semibold tracking-wide uppercase">
                {selectedRole} Login
              </p>

              <form onSubmit={handleLogin} className="space-y-4 text-left">
                
                {selectedRole === 'Student' && (
                  <div>
                    <input 
                      type="text" 
                      placeholder="Student Number (e.g., 2023-00000-TG-0)" 
                      className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                      required
                    />
                  </div>
                )}

                {selectedRole === 'Faculty' && (
                  <div>
                    <input 
                      type="email" 
                      placeholder="Email Address" 
                      className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                      required
                    />
                  </div>
                )}

                {selectedRole === 'Alumni' && (
                  <>
                    <div>
                      <input 
                        type="text" 
                        placeholder="Maiden Full Name " 
                        className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                        required
                      />
                    </div>
                    <div>
                      <input 
                        type="text" 
                        placeholder="Last S.Y. Attended (e.g., 2019-2020)" 
                        className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                        required
                      />
                    </div>
                  </>
                )}

                <div>
                  <input 
                    type="password" 
                    placeholder="Password" 
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    required
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-sm transition-transform transform active:scale-95"
                >
                  Login
                </button>
              </form>

              <div className="mt-4 flex justify-between items-center text-xs">
                <button 
                  type="button"
                  onClick={() => setSelectedRole(null)}
                  className="text-gray-400 hover:text-gray-600 underline bg-transparent border-none cursor-pointer p-0"
                >
                  &larr; Back
                </button>
                
                <button 
                  type="button"
                  className="text-blue-500 hover:text-blue-700 bg-transparent border-none cursor-pointer p-0"
                  onClick={() => alert("Redirect to Forgot Password")}
                >
                  Forgot Password?
                </button>
              </div>
            </div>
          )}

          <div className="mt-12 text-[10px] text-gray-400 leading-tight">
            <p>
              By using this service, you understood and agree to the PUP Online Services 
              <button 
                type="button" 
                className="text-blue-500 hover:underline mx-1 bg-transparent border-none cursor-pointer p-0 align-baseline"
              >
                Terms of Use
              </button> 
              and 
              <button 
                type="button" 
                className="text-blue-500 hover:underline mx-1 bg-transparent border-none cursor-pointer p-0 align-baseline"
              >
                Privacy Statement
              </button>.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};

export default LandingPage;