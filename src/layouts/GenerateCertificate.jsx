import React, { useState, useEffect, useRef } from "react";
import InputGroup from "../components/InputGroup.jsx";
import { 
  PrinterIcon, 
  ChevronDownIcon, 
} from "@heroicons/react/24/solid";
import puplogoimage from "../assets/puplogoimage.png";
import Bagong_Pilipinas_Logo from "../assets/Bagong_Pilipinas_Logo.png";  
import SuccessToast from "../components/SuccessToast.jsx";

const GenerateCertification = () => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    docType: "Certification",
    fullName: "",
    studentNum: "",
    course: "",
    syAdmitted: "", 
    eventTitle: "",
    dateGraduated: "",
    educationLevel: "",
    diplomaNum: "",
    date: "" 
  });

  const courses = [
    "BS in Electronics Engineering ",
    "BS in Information Technology ",
    "BS in Information Systems ",
    "BS in Accountancy ",
    "BS in Business Administration ",
    "BS in Applied Mathematics ",
    "BS in Entrepreneurship ",
    "BS in Office Administration ",
    "Bachelor in Secondary Education ",
    "BS in Hospitality Management ",
    "BS in Civil Engineering ",
  ];

  const docTypes = Object.keys(CERT_CONFIG);

  const handleSave = () => {
    setShowSuccess(true);
    
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const shouldShow = (fieldName) => CERT_CONFIG[formData.docType].fields.includes(fieldName);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col min-h-screen lg:h-screen lg:overflow-hidden">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-6 shrink-0">
        <div className="w-full max-w-xs">
          <SimpleDropdown 
            label="Certification Type"
            name="docType"
            selected={formData.docType}
            onSelect={handleChange}
            options={docTypes}
          />
        </div>
        <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#4a120e] text-white px-8 py-3 rounded-lg font-bold shadow-lg active:scale-95 transition-all shrink-0">
          <PrinterIcon className="w-5 h-5" />
          Print File
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start flex-1 min-h-0">
        
        {/* 2. Left Sidebar */}
        <div className="w-full lg:w-[350px] shrink-0 h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
          <div className="bg-gray-100 p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-lg text-gray-800 mb-6 uppercase tracking-tighter">Edit Information</h3>
            <form className="space-y-6">
              {shouldShow("fullName") && (
                <InputGroup label="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Juan Santos Dela Cruz Jr." />
              )}
              
              {shouldShow("studentNum") && (
                <InputGroup label="Student Number" name="studentNum" value={formData.studentNum} onChange={handleChange} placeholder="e.g. 2023-00101-TG-0" />
              )}

              {shouldShow("course") && (
                <SimpleDropdown label="Course" name="course" selected={formData.course} onSelect={handleChange} options={courses} />
              )}

              {shouldShow("educationLevel") && (
                <SimpleDropdown label="Education Level" name="educationLevel" selected={formData.educationLevel} onSelect={handleChange} options={eduLevels} />
              )}

              {shouldShow("syAdmitted") && (
                <InputGroup label="Last S.Y. Admitted" type="date" name="syAdmitted" value={formData.syAdmitted} onChange={handleChange} />
              )}

              {shouldShow("eventTitle") && (
                <InputGroup label="Event/Seminar Title" name="eventTitle" value={formData.eventTitle} onChange={handleChange} placeholder="e.g. 1st ICT Congress" />
              )}

              {shouldShow("dateGraduated") && (
                <InputGroup label="Date of Graduation" type="date" name="dateGraduated" value={formData.dateGraduated} onChange={handleChange} />
              )}

              {shouldShow("diplomaNum") && (
                <InputGroup label="Diploma Number" name="diplomaNum" value={formData.diplomaNum} onChange={handleChange} placeholder="e.g. 2026-XXXX" />
              )}

              <div className="relative">
                <InputGroup label="Date Issued" type="date" name="date" value={formData.date} onChange={handleChange} />
              </div>

              <button 
                type="button" 
                onClick={handleSave}
                className="w-full mt-4 bg-[#4a120e] text-white py-4 rounded-xl font-bold shadow-xl transition-all active:scale-95 hover:bg-[#360d0a]"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>

        <div className="flex-1 bg-gray-100 rounded-2xl border border-gray-200 flex flex-col overflow-hidden h-full min-h-[500px] lg:min-h-0">
          <div className="p-4 bg-white border-b border-gray-200 shrink-0">
            <div className="flex items-center justify-between max-w-[750px] mx-auto w-full">
              <h2 className="text-lg font-bold text-gray-800 uppercase tracking-tight">Certificate Preview</h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 scrollbar-thin scrollbar-thumb-gray-300">
            <div className="bg-white shadow-2xl mx-auto w-full max-w-[750px] h-fit min-h-fit flex flex-col p-6 sm:p-12 md:p-16 ring-1 ring-black/5 text-gray-800">
              
              {/* Header */}
              <div className="flex flex-row items-start justify-between border-b-2 border-gray-100 pb-4 sm:pb-6 mb-4 sm:mb-8 gap-4 text-left">
                <div className="flex flex-row items-start gap-4">
                  <div className="w-14 h-14 sm:w-18 sm:h-18 shrink-0">
                    <img src={puplogoimage} alt="PUP Logo" className="w-full h-full object-contain" />
                  </div>                  
                  <div>
                    <p className="text-[5px] lg:text-[8px] font-medium font-serif uppercase">Republic of the Philippines</p>
                    <p className="text-[9px] lg:text-[10px] font-bold font-serif leading-tight uppercase tracking-tight">Polytechnic University of the Philippines</p>
                    <p className="text-[5px] lg:text-[9px] font-medium font-serif uppercase">office of the vice president for campuses</p>
                    <p className="text-[9px] lg:text-[10px] font-bold font-serif">TAGUIG CAMPUS</p>
                  </div>
                </div>
                <div className="w-14 h-14 sm:w-18 sm:h-18 shrink-0">
                  <img src={Bagong_Pilipinas_Logo} alt="Bagong Pilipinas Logo" className="w-full h-full object-contain" />
                </div> 
              </div>

              {/* Body */}
              <div className="flex-1"> 
                <p className="text-[10px] lg:-mt-7 -mt-3">Office of the Campus Registrar</p>
                <div className="text-right text-xs sm:text-sm text-gray-700 mb-6 sm:mb-12 font-serif italic">
                  {formatDateFormal(formData.date)}
                </div>
                <div className="text-center mb-8 sm:mb-16">
                  <h1 className="text-xl sm:text-3xl font-serif tracking-[0.2em] font-bold uppercase leading-tight">
                    {formData.docType}
                  </h1>
                </div>

                <div className="space-y-3 text-[9px] sm:text-[10px] leading-[1.6] text-justify px-2 sm:px-4 wrap-break-words">
                  <p className="-mt-5">To Whom It May Concern:</p>
                  <p className="leading-loose">
                    {CERT_CONFIG[formData.docType].template(formData)}
                  </p>
                  <p>This certification is issued this {formatDateFormal(formData.date)} upon request of the aforementioned name for whatever legal purpose it may serve.</p>
                </div>

                <div className="mt-6 sm:mt-15 flex justify-end pr-4 sm:pr-8 pb-12">
                  <div className="text-center w-48 pt-2">
                    <p className="font-bold text-xs sm:text-sm uppercase font-serif text-gray-900">mhel p. garcia</p>
                    <p className="text-[6px] lg:text-[8px]">Campus Registrar/Head of Registration Office</p>
                  </div>
                </div>
                <div className="text-left -mt-6 py-7">
                  <p className="text-[6px] sm:text-[8px] tracking-tighter mb-1">Not valid without University Dry Seal</p>
                  <p className="text-[6px] sm:text-[8px] tracking-tighter">Diploma No.: {bold(formData.diplomaNum || "________________")}</p>
                  <p className="text-[6px] sm:text-[8px] tracking-tighter mb-1">Date: {bold(formatDateFormal(formData.date))}</p>
                  <p className="text-[5px] sm:text-[7px] tracking-tighter">/shgsese2026</p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-auto pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6 shrink-0">
                <div className="space-y-2 text-left">
                  <div className="text-[7px] lg:text-[6.5px]">
                    General Santos Avenue, Lower Bicutan, Taguig City, Philippines 1632<br />
                    Direct Line: (02) 8837 5858 to 60 | Email: taguig@pup.edu.ph<br />
                    Website: www.pup.edu.ph | Inquiries: https://bit.ly/PUPSINTA
                  </div>
                  <div className="text-[10px] lg:text-[10px] font-serif tracking-tight uppercase">THE COUNTRY'S 1st POLYTECHNIC</div>
                </div>
                <div className="flex gap-4 grayscale opacity-40 scale-75 sm:scale-90 origin-bottom sm:origin-bottom-right shrink-0">
                  <div className="h-8 sm:h-10 w-16 sm:w-20 bg-gray-100 border rounded flex items-center justify-center font-bold text-[7px] sm:text-[8px] text-gray-400 uppercase">WURI</div>
                  <div className="h-8 sm:h-10 w-16 sm:w-20 bg-gray-100 border rounded flex items-center justify-center font-bold text-[7px] sm:text-[8px] text-gray-400 uppercase leading-none text-center">QS STARS<br/>Accredited</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showSuccess && (
        <SuccessToast 
          message="Data saved successfully!" 
          onClose={() => setShowSuccess(false)} 
        />
      )}
    </div>
  );
};

const bold = (text) => (
  <span className="font-bold px-1">
    {text || "________________"}
  </span>
);

const formatDateFormal = (dateString) => {
  if (!dateString) return "________________";
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};
const CERT_CONFIG = {
  "Certification": {
    fields: ["fullName", "course", "educationLevel", "syAdmitted", "diplomaNum"], 
    template: (data) => (
      <>
        This is to certify that {bold(data.fullName)} is a {bold(data.educationLevel)}  
        of the Polytechnic University of the Philippines Taguig Campus and 
        Received the degree of {bold(data.course)} on {bold(formatDateFormal(data.syAdmitted))}.
      </>
    )
  },
};

const eduLevels = ["Undergraduate", "Graduate"];

const SimpleDropdown = ({ label, name, options, selected, onSelect, id }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-full relative text-left" ref={dropdownRef}>
      <label htmlFor={id} className="block text-sm text-gray-700 mb-2 font-medium">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full text-left px-4 py-3 bg-white border border-gray-100 rounded-lg text-base transition-all outline-none focus:ring-2 focus:ring-[#FFC72C] ${
            selected ? 'text-gray-700' : 'text-gray-300'
          }`}
        >
          {selected || "Please select"}
        </button>
        <ChevronDownIcon className={`absolute right-4 top-4 w-5 h-5 text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onSelect({ target: { name, value: option } });
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 border-b border-gray-50 last:border-none"
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GenerateCertification;