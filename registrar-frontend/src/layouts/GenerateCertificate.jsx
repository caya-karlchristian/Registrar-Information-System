import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import InputGroup from "../components/InputGroup.jsx";
import { PrinterIcon } from "@heroicons/react/24/solid";
import { getAcademicRecords, getCertifications, getCertificationLayouts } from "../services/api";
import { CertHeader, CertFooter, getTodayDate } from "../utils/helpers.jsx";
import { CERT_CONFIG } from "../utils/Certification.jsx";
import DropDown from "../components/DropDown.jsx";
import { DEFAULT_CERTIFICATE_LAYOUT, normalizeCertificateLayout } from "../utils/certificateTemplateSettings.js";

const toCertificateRows = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timeoutRef.current);
  }, [value, delay]);

  return debouncedValue;
};

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
const signeeOptions = ["Mhel P. Garcia", "Marissa B. Ferrer, DEM, RPsy"];

const DEFAULT_FORM = {
  docType: null, // Will be set after fetching certifications
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
  signee: "Mhel P. Garcia",
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

// ─── Memoized Certificate Preview ───
const CertificatePreview = React.memo(({ certConfig, activeLayout, debouncedFormData }) => (
  <div
    id="print-area"
    className="bg-white shadow-2xl shadow-stone-300/70 mx-auto w-full max-w-full md:max-w-187.5 flex flex-col origin-top scale-100 md:scale-95 p-3 sm:p-6 md:p-8 ring-1 ring-stone-900/5 text-gray-800 print:scale-100 print:shadow-none print:ring-0 print:p-0"
  >
    {!certConfig?.hideHeaderFooter && <CertHeader layout={activeLayout} />}
    <div className="flex-1">{certConfig?.renderBody(debouncedFormData)}</div>
    {!certConfig?.hideHeaderFooter && <CertFooter layout={activeLayout} />}
  </div>
));

CertificatePreview.displayName = 'CertificatePreview';

// ─── Component ───────

const GenerateCertification = ({ initialData, onClose, onCertificatePrinted, onLoadingChange }) => {
  const normalizeCertName = (name) => (typeof name === "string" ? name.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim() : "");

  // Create a mapping from CERT_CONFIG ID to certificate name for display
  const certIdToName = Object.entries(CERT_CONFIG).reduce((acc, [id, config]) => {
    acc[id] = config.name;
    return acc;
  }, {});

  // Create a mapping from database certificate_type_id to CERT_CONFIG ID
  // For now, assuming database IDs match CERT_CONFIG IDs
  const certTypeIdToCertConfigId = (dbId) => dbId;

  const [loading, setLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [certifications, setCertifications] = useState([]);
  const [layoutsByCertId, setLayoutsByCertId] = useState({});
  const [docTypeOptions, setDocTypeOptions] = useState(Object.keys(CERT_CONFIG).map(Number));
  const [certNameById, setCertNameById] = useState(certIdToName);
  const [formData, setFormData] = useState({ ...DEFAULT_FORM, ...(initialData ?? {}) });
  const debouncedFormData = useDebounce(formData, 300);
  const requestedCertNames = Array.from(
    new Set(
      [
        ...(Array.isArray(initialData?.certificateNames) ? initialData.certificateNames : []),
        ...(typeof initialData?.certificateNames === "string" ? [initialData.certificateNames] : []),
        ...(typeof initialData?.docType === "string" ? [initialData.docType] : []),
      ]
        .map(normalizeCertName)
        .filter((name) => name.length > 0)
    )
  );
  const requestedDocTypeId = Number(initialData?.docType);
  const lockDocTypeToRequest = Boolean(initialData?.requestId && (requestedCertNames.length > 0 || Number.isInteger(requestedDocTypeId)));

  useEffect(() => {
    const fetchLayoutData = async () => {
      if (lockDocTypeToRequest) {
        const requestedIdsFromNames = requestedCertNames
          .map((name) => {
            return Object.entries(CERT_CONFIG).find(
              ([_, config]) => normalizeCertName(config.name) === name
            )?.[0];
          })
          .filter(Boolean)
          .map(Number);

        const requestedIds = Array.from(
          new Set([
            ...requestedIdsFromNames,
            ...(Number.isInteger(requestedDocTypeId) && requestedDocTypeId in CERT_CONFIG ? [requestedDocTypeId] : []),
          ])
        );
        
        setDocTypeOptions(requestedIds);
        setFormData((prev) => {
          const prevDocType = Number(prev.docType);
          const defaultId = requestedIds.includes(prevDocType) ? prevDocType : (requestedIds[0] ?? prevDocType ?? null);
          return { ...prev, docType: defaultId };
        });
        return;
      }

      try {
        const [certRes, layoutRes] = await Promise.all([
          getCertifications(),
          getCertificationLayouts(),
        ]);
        const certs = toCertificateRows(certRes?.data);
        const layouts = layoutRes?.data ?? [];

        const nextLayouts = {};
        layouts.forEach((layoutRow) => {
          nextLayouts[layoutRow.certificate_type_id] = normalizeCertificateLayout(layoutRow);
        });

        // Create mapping from database certificate_type_id to CERT_CONFIG ID
        const dbCertIdToCertConfigId = {};
        const fetchedIds = [];
        
        certs.forEach((cert) => {
          const normalizedName = normalizeCertName(cert?.certificate_name);
          // Find matching CERT_CONFIG entry by name
          const certConfigId = Object.entries(CERT_CONFIG).find(
            ([_, config]) => normalizeCertName(config.name) === normalizedName
          )?.[0];
          
          if (certConfigId) {
            dbCertIdToCertConfigId[cert.certificate_type_id] = Number(certConfigId);
            fetchedIds.push(Number(certConfigId));
          }
        });

        setCertifications(certs);
        setLayoutsByCertId(nextLayouts);
        setDocTypeOptions(fetchedIds);
        
        setFormData((prev) => {
          if (fetchedIds.includes(prev.docType)) return prev;
          return {
            ...prev,
            docType: fetchedIds[0] ?? prev.docType,
          };
        });
      } catch (err) {
        console.error("Error fetching certification layouts:", err);
      }
    };

    fetchLayoutData();
  }, [lockDocTypeToRequest, requestedCertNames, requestedDocTypeId]);

  useEffect(() => {
    if (typeof onLoadingChange === "function") {
      onLoadingChange(loading);
    }
  }, [loading, onLoadingChange]);

  useEffect(() => {
    if (initialData?.or_number) {
      setFormData((prev) => ({ ...prev, officialReceiptNum: initialData.or_number }));
    }
  }, [initialData?.or_number]);

  useEffect(() => {
    if (formData.course && formData.studentNum) return;
    const studentNum = initialData?.studentNum;
    const studentId  = initialData?.studentId;
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await getAcademicRecords();
        const records = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
        const record = records.find(
          (r) => r.student_number === studentNum || r.student_id === studentId
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
        setLoading(false)
      }
    };
    fetch();
  }, [initialData?.studentNum, initialData?.studentId]);

  // Create display options (names) in the order of docTypeOptions
  const docTypeDisplayOptions = useMemo(() =>
    docTypeOptions.map((id) => certIdToName[id])
  , [docTypeOptions, certIdToName]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If this is the docType field, convert display name back to numeric ID
    if (name === "docType") {
      const selectedId = docTypeOptions.find((id) => certIdToName[id] === value);
      setFormData((prev) => ({ ...prev, [name]: selectedId || value }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePrint = async () => {
    setPrintLoading(true);

    await new Promise(resolve => setTimeout(resolve, 0));

    window.print();

    // Clear loading state after a brief delay (covers most print scenarios)
    setTimeout(() => setPrintLoading(false), 1000);

    // Also clear when print dialog closes (if user cancels)
    const handleAfterPrint = () => {
      setPrintLoading(false);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
    window.addEventListener("afterprint", handleAfterPrint, { once: true });

    if (onCertificatePrinted && initialData?.requestId) {
      const requestId = initialData.requestId;
      onCertificatePrinted(requestId);
    }
  };

  const certConfig = CERT_CONFIG[formData.docType];
  const shouldShow = useCallback((fieldName) => certConfig?.fields.includes(fieldName), [certConfig]);
  
  // Get the certificate name for display
  const certDisplayName = certIdToName[formData.docType] || "Certificate";

  // Find active certification by matching against CERT_CONFIG name 
  const activeCertification = useMemo(() => {
    return certifications.find((item) => {
      const normalizedDbName = (typeof item.certificate_name === "string"
        ? item.certificate_name.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim()
        : "");
      return normalizedDbName === certDisplayName;
    });
  }, [certifications, certDisplayName]);
  
  const activeLayout = activeCertification
    ? layoutsByCertId[activeCertification.certificate_type_id] ?? DEFAULT_CERTIFICATE_LAYOUT
    : DEFAULT_CERTIFICATE_LAYOUT;

  return (
    <div className="mt-15 h-screen flex flex-col bg-white">

      {/* Header Toolbar */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 pt-12 pb-3 md:px-6 md:pt-10 md:pb-4 print:hidden">
        <div className="flex flex-col gap-4 rounded-2xl border border-stone-200/80 bg-white/90 px-4 py-4 shadow-sm backdrop-blur supports-backdrop-filter:bg-white/70 md:flex-row md:items-end md:justify-between md:px-5 md:py-5">
          <div className="relative z-10 w-full md:max-w-xs">
            <DropDown
              label="Certification Type"
              name="docType"
              value={certIdToName[formData.docType] || "Certificate"}
              onChange={handleChange}
              options={docTypeDisplayOptions}
              labelColor="text-gray-600"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {onClose && (
              <button
                onClick={onClose}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm transition-all hover:bg-stone-200 active:scale-95 md:px-6 md:py-3 md:text-base"
              >
                ← Back
              </button>
            )}
            <button
              onClick={handlePrint}
              disabled={printLoading}
              className={`w-full sm:w-auto flex-1 md:flex-none flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-lg shadow-stone-400/40 transition-all md:px-8 md:py-3 md:text-base ${
                printLoading
                  ? 'bg-gray-400 cursor-not-allowed opacity-75'
                  : 'bg-pup-dark-maroon hover:bg-[#4a0000] active:scale-95'
              }`}
            >
              <PrinterIcon className="w-4 h-4 md:w-5 md:h-5" />
              {printLoading ? 'Preparing...' : 'Print File'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 items-start w-full max-w-7xl mx-auto px-4 md:px-6 pb-6 overflow-visible lg:overflow-visible print:block print:max-w-none print:px-0 print:pb-0 print:overflow-visible">

        {/* Left Sidebar */}
        <div className="w-full lg:w-88 xl:w-96 shrink-0 order-1 print:hidden">
          <div className="relative p-2 md:p-3">
            <div className="rounded-2xl border border-stone-200/80 bg-white/95 p-4 shadow-md shadow-stone-200/60 md:p-6 overflow-visible">
              <h3 className="mb-6 text-base font-extrabold uppercase tracking-tight text-[#800000] md:text-lg">Edit Information</h3>
              <form className={`space-y-4 md:space-y-6 ${loading ? "opacity-50 pointer-events-none" : ""}`}>
                {loading && <p className="text-xs md:text-sm text-stone-500 animate-pulse">Fetching academic records...</p>}

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
                      voiceEnabled={props.type !== "date"}
                      labelColor="text-gray-600" 
                    />
                  );
                })}

                <InputGroup
                  label="Date Issued"
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  voiceEnabled={false}
                  labelColor="text-gray-600"
                  min={getTodayDate()}
                />

                <DropDown
                  label="Signee"
                  name="signee"
                  value={formData.signee}
                  onChange={handleChange}
                  options={signeeOptions}
                  labelColor="text-gray-600"
                />
              </form>
            </div>
          </div>
        </div>

        {/* Certificate Preview */}
        <div className="relative order-2 flex flex-1 flex-col overflow-y-auto custom-scrollbar rounded-2xl border border-stone-200/80 bg-white/90 shadow-lg shadow-stone-200/70 min-h-96 sm:min-h-120 lg:min-h-150 max-h-[78vh] lg:max-h-[80vh] print:bg-white print:rounded-none print:border-0 print:min-h-0 print:max-h-none print:overflow-visible">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(90,90,90,0.07),transparent_40%),radial-gradient(circle_at_85%_10%,rgba(120,120,120,0.06),transparent_35%)] print:hidden" />
          <div className="relative p-4 bg-white/95 border-b border-stone-200 shrink-0 print:hidden">
            <div className="flex items-center justify-between max-w-187.5 mx-auto w-full">
              <h2 className="text-lg font-extrabold uppercase tracking-tight text-stone-800">Certificate Preview</h2>
            </div>
          </div>
          <div className="relative flex-1 p-3 sm:p-6 lg:p-8 print:p-0 print:overflow-visible">
            <CertificatePreview certConfig={certConfig} activeLayout={activeLayout} debouncedFormData={debouncedFormData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateCertification;