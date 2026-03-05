import React, { useState, useEffect} from "react";
import InputGroup from "../components/InputGroup.jsx";
import { PrinterIcon } from "@heroicons/react/24/solid";
import SuccessToast from "../components/SuccessToast.jsx";
import { getAcademicRecords } from "../services/API";
import { CertHeader, CertFooter} from "../utils/Helpers.jsx";
import { CERT_CONFIG } from "../utils/Certification.jsx";
import DropDown from "../components/DropDown.jsx";


const courses = [
  "BS in Electronics Engineering",
  "BS in Information Technology",
  "BS in Information Systems",
  "BS in Accountancy",
  "BS in Business Administration",
  "BS in Applied Mathematics",
  "BS in Entrepreneurship",
  "BS in Office Administration",
  "Bachelor in Secondary Education",
  "BS in Hospitality Management",
  "BS in Civil Engineering",
];

const semesters   = ["1st Semester", "2nd Semester", "3rd Semester", "Summer"];
const latinHonors = ["(Cum Laude)", "(Magna Cum Laude)", "(Summa Cum Laude)"];
const eduLevels   = ["Undergraduate", "Graduate"];
const yearNum     = ["2", "3", "4", "5"];

const DEFAULT_FORM = {
  docType: "Certification of Graduation",
  fullName: "", 
  studentNum: "", 
  course: "", 
  syAdmitted: "", 
  eventTitle: "",
  dateGraduated: "", 
  educationLevel: "", 
  diplomaNum: "", 
  major: "", 
  date: "",
  semesters: "", 
  gwa: "", 
  latinHonors: "", 
  eligibilityType: "", 
  ladderizedDegree: "",
  studentStatus: "", 
  cavNum: "", 
  cavSeries: "", 
  amount: "", 
  nstpSerialNum: "",
  lastSemesters: "", 
  lastSy: "", 
  units: "", 
  semestersNum: "", 
  officialReceiptNum: "",
  yearNum: "",
};

// ─── Field Config ─────
// ComponentType: "input" | "dropdown"

const FIELD_CONFIG = [
  ["fullName",          "input",    "Full Name",               { placeholder: "Juan Santos Dela Cruz Jr." }],
  ["studentNum",        "input",    "Student Number",          { placeholder: "e.g. 2023-00101-TG-0" }],
  ["course",            "dropdown", "Course",                  { options: courses }],
  ["latinHonors",       "dropdown", "Latin Honors",            { options: latinHonors }],
  ["major",             "input",    "Major",                   { placeholder: "e.g. Human Resource Management" }],
  ["educationLevel",    "dropdown", "Education Level",         { options: eduLevels }],
  ["semesters",         "dropdown", "Semester",                { options: semesters }],
  ["yearNum",           "dropdown", "Year",                    { options: yearNum }],
  ["syAdmitted",        "input",    "S.Y. Admitted",           { type: "date", placeholder: "XXXX" }],
  ["eventTitle",        "input",    "Event/Seminar Title",     { placeholder: "e.g. 1st ICT Congress" }],
  ["dateGraduated",     "input",    "Date of Graduation",      { type: "date" }],
  ["diplomaNum",        "input",    "Diploma Number",          { placeholder: "e.g. 2026-XXXX" }],
  ["officialReceiptNum","input",    "Official Receipt Number", { placeholder: "e.g. XXXXXXX" }],
  ["gwa",               "input",    "General Weighted Average",{ placeholder: "e.g. 1.25" }],
  ["eligibilityType",   "input",    "Eligibility Type",        { placeholder: "e.g. Professional License" }],
  ["lastSemesters",     "dropdown", "Last Semester",           { options: semesters }],
  ["lastSy",            "input",    "Last S.Y. Admitted",      { type: "date", placeholder: "XXXX" }],
  ["units",             "input",    "Number of Units",         { placeholder: "e.g. 120" }],
  ["semestersNum",      "input",    "Number of Semesters",     { placeholder: "e.g. 8" }],
  ["ladderizedDegree",  "dropdown", "Ladderized Degree",       { options: courses }],
  ["studentStatus",     "input",    "Student Status",          { placeholder: "e.g. Graduated - BSBAMM" }],
  ["cavNum",            "input",    "CAV Number",              { placeholder: "e.g. TG-008" }],
  ["cavSeries",         "input",    "Series Year",             { placeholder: "e.g. 2026" }],
  ["amount",            "input",    "Amount (PHP)",            { placeholder: "e.g. 620.00" }],
  ["nstpSerialNum",     "input",    "NSTP Serial Number",      { placeholder: "e.g. C-13-113719-16" }],
];

// ─── Component ───────

const GenerateCertification = ({ initialData, onClose }) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ ...DEFAULT_FORM, ...(initialData ?? {}) });

  useEffect(() => {
    if (formData.course && formData.studentNum) return;
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await getAcademicRecords();
        const record = res.data.find(
          (r) => r.student_number === initialData?.studentNum || r.student_id === initialData?.studentId
        );
        if (record) {
          const educationLevel = ["Alumni", "Graduated"].includes(record.status) ? "Graduate" : "Undergraduate";
          setFormData((prev) => ({
            ...prev,
            course: record.course || prev.course,
            studentNum: record.student_number || prev.studentNum,
            educationLevel,
          }));
        }
      } catch (err) {
        console.error("Error fetching course data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const certConfig = CERT_CONFIG[formData.docType];
  const shouldShow = (fieldName) => certConfig?.fields.includes(fieldName);

  return (
    <div className="max-w-7xl mx-auto p-4 mt-10 md:p-6 flex flex-col min-h-screen lg:h-screen lg:overflow-hidden">

      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-6 shrink-0">
        <div className="w-full max-w-xs">
          <DropDown
            label="Certification Type"
            name="docType"
            value={formData.docType}
            onChange={handleChange}
            options={Object.keys(CERT_CONFIG)}
            labelColor="text-gray-600"
          />
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center justify-center gap-2 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-bold shadow active:scale-95 transition-all"
            >
              ← Back
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#4a120e] text-white px-8 py-3 rounded-lg font-bold shadow-lg active:scale-95 transition-all shrink-0"
          >
            <PrinterIcon className="w-5 h-5" />
            Print File
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start flex-1 min-h-0">

        {/* Left Sidebar */}
        <div className="w-full lg:w-[350px] border-1 border-gray-200 rounded-lg p-3 shrink-0 h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
          <div className="bg-gray-100 p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-lg text-gray-800 mb-6 uppercase tracking-tighter">Edit Information</h3>
            <form className={`space-y-6 ${loading ? "opacity-50 pointer-events-none" : ""}`}>
              {loading && <p className="text-sm text-blue-600 animate-pulse">Fetching academic records...</p>}

              {/* Dynamic fields */}
              {FIELD_CONFIG.map(([name, type, label, props]) => {
                if (!shouldShow(name)) return null;
                if (type === "dropdown") {
                  return (
                    <DropDown
                      key={name}
                      label={label}
                      name={name}
                      value={formData[name]}
                      onChange={handleChange}
                      options={props.options}
                      labelColor="text-gray-600"
                    />
                  );
                }
                return (
                  <InputGroup
                    key={name}
                    label={label}
                    name={name}
                    value={formData[name]}
                    onChange={handleChange}
                    {...props}
                    labelColor="text-gray-600" 
                  />
                );
              })}

              {/* Date Issued always visible */}
              <InputGroup label="Date Issued" type="date" name="date" value={formData.date} onChange={handleChange} labelColor="text-gray-600" />

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

        {/* Certificate Preview */}
        <div className="flex-1 bg-gray-100 rounded-2xl border border-gray-200 flex flex-col overflow-hidden h-full min-h-[500px] lg:min-h-0">
          <div className="p-4 bg-white border-b border-gray-200 shrink-0">
            <div className="flex items-center justify-between max-w-[750px] mx-auto w-full">
              <h2 className="text-lg font-bold text-gray-800 uppercase tracking-tight">Certificate Preview</h2>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 scrollbar-thin scrollbar-thumb-gray-300 print:p-0 print:overflow-visible">
            <div
              id="print-area"
              className="bg-white shadow-2xl mx-auto w-full max-w-[750px] flex flex-col p-8 sm:p-10 ring-1 ring-black/5 text-gray-800 print:shadow-none print:ring-0 print:p-0"
            >
              {!certConfig?.hideHeaderFooter && <CertHeader />}
              <div className="flex-1">{certConfig?.renderBody(formData)}</div>
              {!certConfig?.hideHeaderFooter && <CertFooter />}
            </div>
          </div>
        </div>
      </div>

      {showSuccess && <SuccessToast message="Data saved successfully!" onClose={() => setShowSuccess(false)} />}
    </div>
  );
};

export default GenerateCertification;