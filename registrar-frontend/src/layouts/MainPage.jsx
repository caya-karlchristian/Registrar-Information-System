// import LineLoading from "../components/LineLoading.jsx";
import risImage from "../assets/RIS1.png"; 
import risLogo from "../assets/ris_logo.png";
import Tech4wardProfile from "../components/Tech4wardProfile.jsx";
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { useState } from 'react';
import LineLoading from "../components/LineLoading.jsx";
import tech4ward from "../assets/Tech4ward_Logo.png";
import LandingPage from "../layouts/LandingPage.jsx";

const ROLE_HOME = {
  student:     "/student",
  alumni:      "/alumni",
  admin:       "/staff",
  super_admin: "/super-admin",
};

const MainPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  // If the user already has a valid session, send them straight to their dashboard.
  useEffect(() => {
    if (!user) return;
    const destination = ROLE_HOME[user.role_name];
    if (destination) navigate(destination, { replace: true });
  }, [user, navigate]);

  // Auto-SSO: when the portal links to us with ?sso=1 (or ?auto_login=1),
  // skip showing the login page entirely and bounce straight to the IDP.
  // The IDP already has the user's session from the portal, so it will
  // immediately redirect back to /auth/callback?code=... with no interaction.
  // We wait until AuthProvider has finished its /me check first — if the user
  // already has a cookie session, the effect above will redirect them before
  // this one fires.
  useEffect(() => {
    if (authLoading) return;         // wait for session check to complete
    if (user) return;                // already handled above
    const autoLogin = searchParams.get('sso') === '1' || searchParams.get('auto_login') === '1';
    if (!autoLogin) return;

    setLoading(true);
    setTimeout(() => {
      window.location.href = import.meta.env.VITE_SSO_LOGIN_URL;
    }, 0);
  }, [authLoading, user, searchParams]);

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
              width="224"
              height="224"
              className="w-40 md:w-56 h-40 md:h-56 object-contain drop-shadow-xl"            />
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