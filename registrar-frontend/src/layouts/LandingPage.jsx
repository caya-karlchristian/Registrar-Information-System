import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../context/AuthProvider";
import risImage from "../assets/RIS1.png";
import logoImage from "../assets/puplogoimage.png";
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';
import LineLoading from "../components/LineLoading.jsx";

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, login, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState('');

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
  window.location.href = import.meta.env.VITE_SSO_LOGIN_URL;
};

  return (
    <div className="flex h-screen w-full font-sans bg-gray-50 overflow-hidden">
      <LineLoading isVisible={loading} />
      <div className="hidden md:block flex-1 relative items-center justify-center overflow-hidden">
        <img 
          src={risImage} 
          alt="PUP Campus" 
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        
        <div className="absolute inset-0 bg-gradient-to-tr from-[#800000]/90 to-black/30 mix-blend-multiply"></div> 
        
        <div className="absolute inset-0 z-10 flex flex-col justify-center p-16 text-white">
          <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight drop-shadow-lg leading-tight">
            Registrar <br/> Information System
          </h1>
          <p className="mt-6 text-xl lg:text-2xl font-light text-gray-100 drop-shadow-md max-w-md">
            Academic Request. Redefined Simplicity.
          </p>
          <div className="w-32 h-1.5 bg-[#eebc48] mt-8 rounded-full shadow-lg"></div>
        </div>
      </div>

      <div className="w-full md:w-[450px] lg:w-[500px] bg-white shadow-2xl flex flex-col items-center justify-center p-8 relative z-10">
        
        <div className="hidden md:block absolute top-0 bottom-0 left-0 -translate-x-[99%] w-24 h-full pointer-events-none text-white z-20">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full fill-current">
            <path d="M 100 0 L 100 100 L 0 100 C 70 75 30 25 0 0 Z" />
          </svg>
        </div>

        <div className="w-full max-w-sm flex flex-col items-center animate-fadeIn">
          
          <img src={logoImage} alt="PUP Logo" className="w-24 h-24 drop-shadow-xl mb-6" />

            <button
              type="button"
              onClick={handleSsoLogin}
              className="w-full py-3.5 px-4 border-2 border-[#800000] text-[#800000] hover:bg-[#800000] hover:text-white font-bold rounded-lg shadow-sm transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              <img src={logoImage} alt="" className="w-5 h-5" />
              Sign in with PUP Account
            </button>


          <div className="mt-5 text-[10px] text-gray-400 leading-tight text-center">
            <p>
              By using this service, you agree to the PUP Online Services <br />
              <a
                href="https://www.pup.edu.ph/terms/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline mx-1"
              >
                Terms of Use
              </a>
              and
              <a
                href="https://www.pup.edu.ph/privacy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline mx-1"
              >
                Privacy Statement
              </a>.
            </p>
          </div>
          <div className="absolute bottom-4 left-0 w-full border-t border-gray-100 pt-5 mt-5">
            <p className="text-[#800000] text-[9px] font-bold uppercase tracking-[0.2em] text-center">
              © 1998-{new Date().getFullYear()} Polytechnic University of the Philippines
            </p>
        </div>
        </div>
      </div>
    </div>
  );
};

const InputField = ({ type, placeholder, required, value, onChange }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="w-full relative group">
      <input 
        type={inputType} 
        placeholder={placeholder} 
        value={value}
        onChange={onChange}
        required={required}
        className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#eebc48] focus:bg-white transition-all text-sm text-gray-700 placeholder-gray-400 shadow-sm pr-11"
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword(prev => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeIcon className="w-5 h-5" />
          ) : (
            <EyeSlashIcon className="w-5 h-5" />
          )}
        </button>
      )}
    </div>
  );
};
export default LandingPage;