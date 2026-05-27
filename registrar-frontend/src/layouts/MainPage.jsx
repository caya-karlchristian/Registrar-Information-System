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
import LandingPage from "../layouts/LandingPage.jsx";

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
    // Defer the hard-navigation so React's synthetic event handling and
    // the Router's location subscriptions finish before the document is
    // replaced.  Without this, Chromium logs:
    //   "Prevented /auth/callback from accessing QueryParameters"
    setTimeout(() => {
      window.location.href = import.meta.env.VITE_SSO_LOGIN_URL;
    }, 0);
  };
  return (
    <>
    <div className="relative min-h-screen w-full overflow-x-hidden bg-white">        
    <LineLoading isVisible={loading} />

      <div className="absolute inset-0 z-0">
          <LandingPage />
        </div>
      </div>    
      <div className="relative min-h-screen w-full overflow-x-hidden bg-white z-30">             
        <Tech4wardProfile bgImage={risImage}/>
      </div>
      <div className="w-full relative z-40 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-8 text-[#800000]">
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