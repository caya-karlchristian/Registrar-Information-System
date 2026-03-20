import React from 'react';
import risImage from "../assets/RIS1.png";
import logoImage from "../assets/puplogoimage.png";
import tech4ward from "../assets/Tech4ward_Logo.png";

const TEAM_MEMBERS = [
  { lastName: "CAYA",      firstName: "Karl Christian", role: "PROJECT LEAD, UI/UX, AND DATABASE", image: logoImage },
  { lastName: "CONDINO",   firstName: "Ciara Marie",    role: "FRONTEND DEVELOPER",                image: logoImage },
  { lastName: "CORDOVA",   firstName: "Aron Stephen",   role: "BACKEND DEVELOPER",                 image: logoImage },
  { lastName: "TOLENTINO", firstName: "Ma. Rose",       role: "DOCUMENT ANALYST AND QA",           image: logoImage },
];

const Tech4wardProfile = ({ bgImage }) => {
  const bg = bgImage || risImage;

  return (
    <div className="w-full overflow-hidden bg-gray-50">
      <div className="relative w-full border-t-4 border-yellow-400 py-12 px-6 overflow-hidden">
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
      </div>

      <div className="relative w-full py-16 px-6 overflow-hidden border-t-4 border-yellow-400">
        <div className="absolute inset-0">
          <img src={bg} alt="Campus" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-tr from-[#800000]/90 to-black/30 mix-blend-multiply" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {TEAM_MEMBERS.map((member, index) => (
            <div
              key={index}
              className="flex flex-col overflow-hidden rounded-[2.5rem] shadow-2xl border border-white/10 group transition-all hover:-translate-y-3 duration-300"
            >
              <div className="bg-[#eebc48] py-5 text-center shrink-0">
                <span className="text-[#800000] font-black text-xs md:text-sm uppercase">
                  {member.role}
                </span>
              </div>

              <div className="relative h-96 overflow-hidden bg-[#800000]">

                <div className="absolute inset-0 flex items-center justify-center pb-20">
                  <div className="w-40 h-40 rounded-full border-4 border-white/20 overflow-hidden shadow-2xl bg-white/5">
                    <img
                      src={member.image}
                      alt={member.lastName}
                      className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-700"
                    />
                  </div>
                </div>

                <div className="absolute bottom-0 w-full p-6 text-center text-white">
                  <h3 className="text-2xl font-black tracking-tighter uppercase leading-none">
                    {member.lastName}
                  </h3>
                  <p className="text-sm font-medium text-gray-200 mt-1">
                    {member.firstName}
                  </p>
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="relative w-full border-t-4 border-yellow-400 py-3 px-6">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-3">

          <p className="text-[#800000] text-[10px] font-bold uppercase tracking-[0.2em] text-center">
            © 1998–{new Date().getFullYear()} Polytechnic University of the Philippines
          </p>
        </div>
      </footer>

    </div>
  );
};

export default Tech4wardProfile;