// import LineLoading from "../components/LineLoading.jsx";
import risImage from "../assets/RIS1.png"; 
import risLogo from "../assets/ris_logo.png";
import Tech4wardProfile from "../components/Tech4wardProfile.jsx";
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { useState } from 'react';
import LineLoading from "../components/LineLoading.jsx";
import tech4ward from "../assets/Tech4ward_Logo.png";

const MainPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const destination = {
      student:     "/student",
      alumni:      "/alumni",
      admin:       "/staff",
      super_admin: "/super-admin",
    }[user.role_name];
    if (destination) navigate(destination, { replace: true });
  }, [user, navigate]);

  const handleSsoLogin = () => {
    setLoading(true);
    window.location.href = import.meta.env.VITE_SSO_LOGIN_URL;
  };
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
                onClick={handleSsoLogin}
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
    <div className="relative z-10 max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-8">
      <div className="hidden md:block w-1 h-24 bg-yellow-400 rounded-full shrink-0" />
          <div className="shrink-0">
          <img 
            src={tech4ward} 
            alt="Tech4ward Logo" 
            className="w-40 md:w-56 h-auto object-contain drop-shadow-xl" 
          />
        </div>
        <div className="w-full text-center md:text-right">            
          <h2 className="text-3xl md:text-5xl font-black text-[#800000] uppercase leading-tight mb-4">
            Together, We <br /> Think Forward
          </h2>
          <p className="max-w-2xl ml-auto text-[#800000] text-sm leading-relaxed">
            Tech4ward is a dynamic team of four BSIT students from PUP–Taguig,
            united by a shared passion for technology and innovation. Together,
            we aim to create practical, forward-thinking solutions that address
            real-world problems and showcase our growing expertise in the field
            of information technology.
          </p>
        </div>
      </div>
    <footer className="relative w-full bg-[#800000] border-t-4 border-yellow-400 py-3 px-6">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-3">
          <p className="text-white text-[10px] font-bold uppercase tracking-[0.2em] text-center">
            © 1998–{new Date().getFullYear()} Polytechnic University of the Philippines
          </p>
        </div>
      </footer>
    </>
  );
};

export default MainPage;