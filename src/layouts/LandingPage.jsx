import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from "../services/API";
import { useAuth } from "../context/AuthProvider";

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth(); 

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) return;

  if (user?.role_id === 1 && token) navigate("/student");
  else if (user?.role_id === 2 && token) navigate("/alumni");
  else if (user?.role_id === 3 && token) navigate("/staff");
}, [user, navigate]);


  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await loginUser({ email, password });

      const token = response.data.token;
      const userData = response.data.user;

      login(userData, token);

      if (userData.role_id === 1 && token) {
        navigate('/student');
      } else if (userData.role_id === 2 && token) {
        navigate('/alumni');
      } else if (userData.role_id === 3 && token) {
        navigate('/staff');
      } else {
        navigate('/');
      }

    } catch (error) {
      console.error(error);
      alert("Invalid credentials");
    }
  };

  return (
    <div className="flex h-screen w-full font-sans bg-gray-50 overflow-hidden">
      
      <div className="hidden md:block flex-1 relative items-center justify-center overflow-hidden">
        <img 
          src='/src/assets/RIS1.png' 
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
          
          <img src="/src/assets/puplogoimage.png" alt="PUP Logo" className="w-24 h-24 drop-shadow-xl mb-6" />

          <h1 className="text-3xl font-bold text-pup-dark-maroon mb-2 tracking-wide">
            Welcome Back!
          </h1>
          <p className="text-sm text-gray-500 mb-8 font-medium">
            Enter your credentials to access your account.
          </p>

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


            <button 
              type="submit"
              className="w-full py-3.5 px-4 bg-pup-dark-maroon hover:bg-[#600000] text-white font-bold rounded-lg shadow-md transition-all transform active:scale-95"
            >
              Sign In
            </button>
          </form>

          <div className="mt-5 text-[10px] text-gray-400 leading-tight text-center">
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

const InputField = ({ type, placeholder, required, value, onChange }) => (
  <div className="w-full relative group">
    <input 
      type={type} 
      placeholder={placeholder} 
      value={value}
      onChange={onChange}
      required={required}
      className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#eebc48] focus:bg-white transition-all text-sm text-gray-700 placeholder-gray-400 shadow-sm"
    />
  </div>
);

export default LandingPage;