import { useState } from 'react';
import LineLoading from "../components/LineLoading.jsx";
import risImage from "../assets/RIS1.png"; 
import risLogo from "../assets/ris_logo.png";
import Tech4wardProfile from "../components/Tech4wardProfile.jsx";
import { useNavigate } from "react-router-dom";

const MainPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  return (
    <>
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#800000/90]">        
    <LineLoading isVisible={loading} />

      <div className="absolute inset-0">
        <img 
          src={risImage} 
          alt="Campus" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-tr from-[#800000]/90 to-black/30 mix-blend-multiply"></div>
      </div>

      {/* MAIN LAYOUT CONTAINER */}
      <div className="relative mt-30 md:mt-30 lg:mt-40 z-10 h-full w-full flex flex-col lg:flex-row items-center">
        <div className="flex-1 flex flex-col justify-center px-10 md:px-20 ml-10 lg:pl-32 text-white">
          
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.85] drop-shadow-2xl">
            REGISTRAR <br />INFORMATION
            <div className="flex items-center gap-4">
                <span>SYSTEM</span>
            <div className="flex items-center gap-3">
                <p className="text-[10px] md:text-lg lg:text-[15px] tracking-wide mt-2 text-gray-200 font-medium ">
                    Academic Request. <br/> Redefined Simplicity.
                </p>
            </div>
        </div>
        </h1>
            <p className="mt-8 max-w-xl text-sm md:text-base leading-relaxed text-gray-200 antialiased font-medium opacity-90 text-justify">
            Development of the PUP-Taguig Registrar Information System (RIS) a web-based platform that 
            automates registrar transactions, digitizes student records, and enables remote 
            access for students and alumni. By integrating online requests, payments, and 
            document tracking into a unified system, RIS aims to improve accuracy, reduce 
            processing time, and enhance the overall efficiency of registrar services.
            </p>

            <button 
                onClick={() => navigate("/signup")}
                className="mt-6 w-30 border border-yellow-400 text-yellow-400 text-xs py-2 font-semibold rounded-lg hover:bg-yellow-400 hover:text-[#800000] transition">
                Get Started
            </button>
        </div>

        <div className="hidden lg:flex flex-1 h-full items-center justify-center relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-yellow-500/10 via-transparent to-transparent opacity-30"></div>
          
          <div className="relative p-12 animate-pulse-slow">
             <img 
               src={risLogo} 
               alt="RIS Branded Graphic" 
               className="w-112.5 drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)] transition-transform hover:scale-105 duration-700"
             /> 
             <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-linear-to-tr from-blue-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>    
    </div>
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#800000/90]">             
        <Tech4wardProfile bgImage={risImage}/>
    </div>
    </>
  );
};

export default MainPage;