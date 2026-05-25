import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import risImage  from "../assets/RIS1.png";
import logoImage from "../assets/puplogoimage.png";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import LineLoading from "../components/LineLoading.jsx";

const SSO_LOGIN_URL = import.meta.env.VITE_SSO_LOGIN_URL;

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, login, localLogin } = useAuth();

  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [loginError, setLoginError] = useState(null);
  // null | "idp-fallback" | "no-local-auth"
  const [authMode, setAuthMode]     = useState(null);

  // Redirect if already logged in
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

  // ── IDP-first Sign In ────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);
    setAuthMode(null);
    try {
      await login(email, password);
      // login() navigates on success — if we reach here, it threw.
    } catch (err) {
      const data   = err.response?.data;
      const status = err.response?.status;

      if (data?.idp_offline) {
        setLoginError("The identity provider is currently unavailable and this account does not have local login enabled. Please contact the registrar.");
        setAuthMode("no-local-auth");
      } else if (status === 403) {
        setLoginError(data?.message || "Your account is not authorised to access RIS.");
      } else {
        setLoginError(data?.message || "Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Explicit local-only login ────────────────────────────────────────────
  const handleLocalLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);
    setAuthMode(null);
    try {
      await localLogin(email, password);
    } catch (err) {
      const data = err.response?.data;
      setLoginError(data?.message || "Local login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full font-sans bg-gray-50 overflow-hidden">
      <LineLoading isVisible={loading} />

      {/* Left panel */}
      <div className="hidden md:block flex-1 relative items-center justify-center overflow-hidden">
        <img
          src={risImage}
          alt="PUP Campus"
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-tr from-[#800000]/90 to-black/30 mix-blend-multiply" />
        <div className="absolute inset-0 z-10 flex flex-col justify-center p-16 text-white">
          <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight drop-shadow-lg leading-tight">
            Registrar <br /> Information System
          </h1>
          <p className="mt-6 text-xl lg:text-2xl font-light text-gray-100 drop-shadow-md max-w-md">
            Academic Request. Redefined Simplicity.
          </p>
          <div className="w-32 h-1.5 bg-[#eebc48] mt-8 rounded-full shadow-lg" />
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full md:w-112.5 lg:w-125 bg-white shadow-2xl flex flex-col items-center justify-center p-8 relative z-10">
        <div className="hidden md:block absolute top-0 bottom-0 left-0 -translate-x-[99%] w-24 h-full pointer-events-none text-white z-20">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full fill-current">
            <path d="M 100 0 L 100 100 L 0 100 C 70 75 30 25 0 0 Z" />
          </svg>
        </div>

        <div className="w-full max-w-sm flex flex-col items-center animate-fadeIn">
          <img src={logoImage} alt="PUP Logo" className="w-24 h-24 drop-shadow-xl mb-6" />

          <h1 className="text-3xl font-bold text-[#800000] mb-2 tracking-wide">Welcome Back!</h1>
          <p className="text-sm text-gray-500 mb-6 font-medium">
            Enter your credentials to access your account.
          </p>

          {/* IDP offline advisory banner */}
          {authMode === "idp-fallback" && (
            <div className="w-full mb-4 px-4 py-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-xs flex items-start gap-2">
              <span className="mt-0.5 shrink-0">⚠️</span>
              <span>
                The identity provider is currently unreachable. You are logged in
                using your local credentials. Some IDP-dependent features may be
                limited.
              </span>
            </div>
          )}

          {/* Error message */}
          {loginError && (
            <div className="w-full mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-300 text-red-700 text-xs">
              {loginError}
            </div>
          )}

          {/* Main login form (IDP-first) */}
          <form onSubmit={handleLogin} className="w-full space-y-5">
            <InputField
              type="email"
              placeholder="Email Address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <InputField
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="mt-3 space-y-3">
              <button
                type="button"
                onClick={handleLocalLogin}
                disabled={loading}
                className="w-full py-3.5 px-4 bg-[#800000] hover:bg-[#4a0000] disabled:opacity-60 text-white font-bold rounded-lg shadow-md transition-all transform active:scale-95"
              >
                Sign In Locally
              </button>
              <p className="text-center text-gray-400 text-[11px] leading-snug">
                Local login uses your RIS password directly — no IDP required.
                Only available if your account has local auth enabled.
              </p>
            </div>
          </form>
          
          <div className="w-full flex items-center my-4">
            <div className="flex-1 border-t border-gray-300" />
            <span className="px-3 text-xs text-gray-400 font-medium">OR</span>
            <div className="flex-1 border-t border-gray-300" />
          </div>

          {/* IDP SSO button */}
          <a
            href={SSO_LOGIN_URL}
            className="w-full py-3.5 px-4 bg-[#eebc48] hover:bg-[#d4a935] text-[#800000] font-bold rounded-lg shadow-md transition-all transform active:scale-95 text-center block"
          >
            Log in with IDP
          </a>

          <div className="mt-5 text-[10px] text-gray-400 leading-tight text-center">
            <p>
              By using this service, you agree to the PUP Online Services{" "}
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
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const InputField = ({ type, placeholder, required, value, onChange }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType  = isPassword ? (showPassword ? "text" : "password") : type;

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
          onClick={() => setShowPassword((p) => !p)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
          tabIndex={-1}
        >
          {showPassword ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
        </button>
      )}
    </div>
  );
};

export default LandingPage;
