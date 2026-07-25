import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import InputGroup from "../components/InputGroup.jsx";
import { useTheme } from "../context/ThemeContext";
import { useReferenceData } from "../context/ReferenceDataContext";
import { PrinterIcon } from "@heroicons/react/24/solid";
import { getAcademicRecords, getCertifications, getCertificationLayouts } from "../services/api";
import { CertHeader, CertFooter, getTodayDate } from "../utils/helpers.jsx";
import { CERT_CONFIG } from "../utils/Certification.jsx";
import DropDown from "../components/DropDown.jsx";
import {
  CERT_TEMPLATE_LAYOUT_CHANGED,
  DEFAULT_CERTIFICATE_LAYOUT,
  normalizeCertificateLayout,
} from "../utils/certificateTemplateSettings.js";

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

const buildFieldConfig = (courseOptions) => [
  ["fullName",          "input",    "Full Name",               { placeholder: "Juan Santos Dela Cruz Jr." }],
  ["studentNum",        "input",    "Student Number",          { placeholder: "e.g. 2023-00101-TG-0" }],
  ["course",            "dropdown", "Course",                  { options: courseOptions }],
  ["latinHonors",       "dropdown", "Latin Honors",            { options: latinHonors }],
  ["major",             "input",    "Major",                   { placeholder: "e.g. Human Resource Management" }],
  ["educationLevel",    "dropdown", "Education Level",         { options: eduLevels }],
  ["semesters",         "dropdown", "Semester",                { options: semesters }],
  ["yearNum",           "dropdown", "Year",                    { options: yearNum }],
  ["syAdmitted",        "input",    "S.Y. Admitted",           { type: "date", placeholder: "XXXX", max: getTodayDate() }],
  ["eventTitle",        "input",    "Event/Seminar Title",     { placeholder: "e.g. 1st ICT Congress" }],
  ["dateGraduated",     "input",    "Date of Graduation",      { type: "date", max: getTodayDate() }],
  ["diplomaNum",        "input",    "Diploma Number",          { placeholder: "e.g. 2026-XXXX" }],
  ["officialReceiptNum","input",    "Official Receipt Number", { placeholder: "e.g. XXXXXXX" }],
  ["gwa",               "input",    "General Weighted Average",{ placeholder: "e.g. 1.25" }],
  ["eligibilityType",   "input",    "Eligibility Type",        { placeholder: "e.g. Professional License" }],
  ["lastSemesters",     "dropdown", "Last Semester",           { options: semesters }],
  ["lastSy",            "input",    "Last S.Y. Admitted",      { type: "date", placeholder: "XXXX", max: getTodayDate() }],
  ["units",             "input",    "Number of Units",         { placeholder: "e.g. 120" }],
  ["semestersNum",      "input",    "Number of Semesters",     { placeholder: "e.g. 8" }],
  ["ladderizedDegree",  "dropdown", "Ladderized Degree",       { options: courseOptions }],
  ["studentStatus",     "input",    "Student Status",          { placeholder: "e.g. Graduated - BSBAMM" }],
  ["cavNum",            "input",    "CAV Number",              { placeholder: "e.g. TG-008" }],
  ["cavSeries",         "input",    "Series Year",             { placeholder: "e.g. 2026" }],
  ["amount",            "input",    "Amount (PHP)",            { placeholder: "e.g. 620.00" }],
  ["nstpSerialNum",     "input",    "NSTP Serial Number",      { placeholder: "e.g. C-13-113719-16" }],
];

// ─── Memoized Certificate Preview ───
  const CertificatePreview = React.memo(({ certConfig, activeLayout, debouncedFormData, isDark, pageDimensions, marginValue }) => {
    const pageSizeSpec = `${pageDimensions.widthInches}in ${pageDimensions.heightInches}in`;
    return (
      <div 
        id="print-area" 
        style={{
          "--print-margin": `${marginValue}in`,
          "--header-logo-size": `${activeLayout?.headerLogoSize ?? 120}px`,
          "--footer-logo-size": `${activeLayout?.footerLogoSize ?? 45}px`,
          padding: "var(--print-margin)",
          backgroundColor: "white",
          color: "black",
          width: `${pageDimensions.width}px`,
          height: `${pageDimensions.height}px`,
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
        className="bg-white text-black"
      >
        <style dangerouslySetInnerHTML={{__html: `
          @page {
            size: ${pageSizeSpec};
            margin: 0;
          }
        `}} />
        {!certConfig?.hideHeaderFooter && <CertHeader layout={activeLayout} />}
        
        <div className="flex-1 overflow-visible">{certConfig?.renderBody(debouncedFormData, activeLayout)}</div>
        
        {!certConfig?.hideHeaderFooter && <CertFooter layout={activeLayout} />}
      </div>
    );
  });

CertificatePreview.displayName = 'CertificatePreview';

// ─── Component ───────
const normalizeCertName = (name) => (typeof name === "string" ? name.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim() : "");

const GenerateCertification = ({ initialData, onClose, onCertificatePrinted, onLoadingChange }) => {
  const resolveCertConfigId = useCallback(
    (docType) => {
      const numericDocType = Number(docType);
      if (Number.isInteger(numericDocType) && CERT_CONFIG[numericDocType]) {
        return numericDocType;
      }

      const normalizedDocType = normalizeCertName(docType);
      if (!normalizedDocType) return null;

      const matchedEntry = Object.entries(CERT_CONFIG).find(([, config]) => normalizeCertName(config.name) === normalizedDocType);
      return matchedEntry ? Number(matchedEntry[0]) : null;
    },
    []
  );

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
  const [savedData, setSavedData] = useState({ ...DEFAULT_FORM, ...(initialData ?? {}) });

  const [paperSize, setPaperSize] = useState("Letter");
  const [orientation, setOrientation] = useState("Portrait");
  const [margins, setMargins] = useState("Narrow (0.25\")");

  const requestedDocTypeId = useMemo(() => Number(initialData?.docType), [initialData?.docType]);

const requestedCertNames = useMemo(() => Array.from(
  new Set(
    [
      ...(Array.isArray(initialData?.certificateNames) ? initialData.certificateNames : []),
      ...(typeof initialData?.certificateNames === "string" ? [initialData.certificateNames] : []),
      ...(typeof initialData?.docType === "string" ? [initialData.docType] : []),
    ]
      .map(normalizeCertName)
      .filter((name) => name.length > 0)
  )
), [initialData?.certificateNames, initialData?.docType]);

const lockDocTypeToRequest = useMemo(() => 
  Boolean(initialData?.requestId && (requestedCertNames.length > 0 || Number.isInteger(requestedDocTypeId)))
, [initialData?.requestId, requestedCertNames.length, requestedDocTypeId]);

useEffect(() => {
    const fetchLayoutData = async () => {
      try {
        const [certRes, layoutRes] = await Promise.all([
          getCertifications(),
          getCertificationLayouts(),
        ]);
        
        const certs = toCertificateRows(certRes?.data) || [];
        const layouts = toCertificateRows(layoutRes?.data) || [];

        // 1. Build mapping from database certificate_type_id to CERT_CONFIG ID
        const dbCertIdToCertConfigId = {};
        const fetchedIds = [];
        
        certs.forEach((cert) => {
          const normalizedName = normalizeCertName(cert?.certificate_name);
          const certConfigId = Object.entries(CERT_CONFIG).find(
            ([_, config]) => normalizeCertName(config.name) === normalizedName
          )?.[0];
          
          if (certConfigId) {
            dbCertIdToCertConfigId[cert.certificate_type_id] = Number(certConfigId);
            fetchedIds.push(Number(certConfigId));
          }
        });

        // 2. Map the layouts using BOTH IDs so both systems can find them
        const nextLayouts = {};
        layouts.forEach((layoutRow) => {
          const dbId = layoutRow.certificate_type_id;
          const normalizedLayout = normalizeCertificateLayout(layoutRow);
          
          // Save under database ID
          nextLayouts[String(dbId)] = normalizedLayout;
          
          // Also save under the CERT_CONFIG ID
          const configId = dbCertIdToCertConfigId[dbId];
          if (configId) {
            nextLayouts[String(configId)] = normalizedLayout;
          }
        });

        let finalDocTypeOptions = fetchedIds; // Default: show all

        // If this request came from a specific student application, lock the dropdown
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
          
          // Apply the restriction if we successfully mapped the requested IDs
          if (requestedIds.length > 0) {
            finalDocTypeOptions = requestedIds;
          }
        }

        // 4. Update the States
        setCertifications(certs);
        setLayoutsByCertId(nextLayouts);
        setDocTypeOptions(finalDocTypeOptions); // Now it uses the locked options!

        // Ensure the current selection is valid for the new restricted list
        setFormData((prev) => {
          const prevDocType = Number(prev.docType);
          const defaultId = finalDocTypeOptions.includes(prevDocType) ? prevDocType : (finalDocTypeOptions[0] ?? prevDocType ?? null);
          return { ...prev, docType: defaultId };
        });
        setSavedData((prev) => {
          const prevDocType = Number(prev.docType);
          const defaultId = finalDocTypeOptions.includes(prevDocType) ? prevDocType : (finalDocTypeOptions[0] ?? prevDocType ?? null);
          return { ...prev, docType: defaultId };
        });

      } catch (err) {
        console.error("Error fetching certification layouts:", err);
      }
    };

    fetchLayoutData();
  }, [lockDocTypeToRequest, requestedCertNames, requestedDocTypeId]); // ensure dependencies are correct // Add your dependencies here

  useEffect(() => {
    const handleTemplateLayoutChanged = (event) => {
      const certTypeId = Number(event?.detail?.certTypeId);
      if (!Number.isFinite(certTypeId)) return;

      const updatedLayout = normalizeCertificateLayout(event?.detail?.layout);

      setLayoutsByCertId((prev) => ({
        ...prev,
        [certTypeId]: updatedLayout,
        [String(certTypeId)]: updatedLayout,
      }));
    };

    window.addEventListener(CERT_TEMPLATE_LAYOUT_CHANGED, handleTemplateLayoutChanged);

    return () => {
      window.removeEventListener(CERT_TEMPLATE_LAYOUT_CHANGED, handleTemplateLayoutChanged);
    };
  }, []);

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
      const nextDocType = selectedId || value;
      setFormData((prev) => ({ ...prev, [name]: nextDocType }));
      // Always reflect doc type changes in preview so layout switches immediately.
      setSavedData((prev) => ({ ...prev, [name]: nextDocType }));
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

  const resolvedFormDocTypeId = resolveCertConfigId(formData.docType);
  const resolvedPreviewDocTypeId = resolveCertConfigId(savedData.docType);

  useEffect(() => {
    if (!resolvedPreviewDocTypeId) return;
    const config = CERT_CONFIG[resolvedPreviewDocTypeId];
    if (config) {
      setPaperSize(config.defaultPaperSize || "Letter");
      setOrientation(config.defaultOrientation || "Portrait");
      setMargins(config.defaultMargins || "Narrow (0.25\")");
    }
  }, [resolvedPreviewDocTypeId]);

  const formCertConfig = resolvedFormDocTypeId ? CERT_CONFIG[resolvedFormDocTypeId] : undefined;
  const previewCertConfig = resolvedPreviewDocTypeId ? CERT_CONFIG[resolvedPreviewDocTypeId] : undefined;
  const shouldShow = useCallback((fieldName) => formCertConfig?.fields.includes(fieldName), [formCertConfig]);
  
  // Get the certificate name for display
  const certDisplayName = previewCertConfig?.name || certIdToName[resolvedPreviewDocTypeId] || "Certificate";

  const activeLayout = useMemo(() => {
    // Look up the layout using the exact ID selected in the dropdown
    if (!resolvedPreviewDocTypeId) return DEFAULT_CERTIFICATE_LAYOUT;
    
    const id = String(resolvedPreviewDocTypeId);
    
    // If we have a layout in the database for this ID, use it. Otherwise, use default.
    return layoutsByCertId[id] ?? DEFAULT_CERTIFICATE_LAYOUT;
  }, [resolvedPreviewDocTypeId, layoutsByCertId]);

  const pageDimensions = useMemo(() => {
    let w = 8.5;
    let h = 11;
    if (paperSize === "A4") {
      w = 8.27;
      h = 11.69;
    } else if (paperSize === "Legal") {
      w = 8.5;
      h = 14;
    }
    return orientation === "Portrait"
      ? { width: Math.round(w * 96), height: Math.round(h * 96), widthInches: w, heightInches: h }
      : { width: Math.round(h * 96), height: Math.round(w * 96), widthInches: h, heightInches: w };
  }, [paperSize, orientation]);

  const marginValue = useMemo(() => {
    if (margins.startsWith("Narrow")) return 0.25;
    if (margins.startsWith("Wide")) return 1.0;
    if (margins.startsWith("None")) return 0;
    return 0.75; // Default: Normal (0.75")
  }, [margins]);

  const [scale, setScale] = useState(1);
  const previewContainerRef = useRef(null);

  const updateScale = useCallback(() => {
    if (!previewContainerRef.current) return;
    const containerWidth = previewContainerRef.current.clientWidth;
    const availableWidth = Math.max(200, containerWidth - 32); 
    const targetWidth = pageDimensions.width;
    setScale(Math.min(1, availableWidth / targetWidth));
  }, [pageDimensions.width]);

  useEffect(() => {
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (previewContainerRef.current) {
      observer.observe(previewContainerRef.current);
    }
    return () => observer.disconnect();
  }, [updateScale]);

  const { isDark } = useTheme();
  const { programs } = useReferenceData();

  // Build course options from the live programs table.
  // Falls back to an empty array while programs are loading —
  // the DropDown will show "Please Select" with no options until ready.
  const courseOptions = programs.map((p) => p.name);

  const FIELD_CONFIG = buildFieldConfig(courseOptions);

  return (
    <div className={`flex flex-col p-5 bg-transparent ${isDark ? 'bg-[#18191a]' : 'bg-white'}`}>

      {/* Header Toolbar */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 pt-4 pb-3 md:px-6 md:pt-6 md:pb-4 print:hidden">
        <div className={`flex flex-col gap-4 rounded-2xl px-4 py-4 shadow-sm backdrop-blur supports-backdrop-filter:bg-white/10 md:flex-row md:items-end md:justify-between md:px-5 md:py-5 ${isDark ? 'border-[#3e4042] bg-[#0f0f0f]' : 'border-stone-200/80 bg-white/90'}`}>
          <div className="flex flex-wrap items-end gap-4 relative z-10 w-full md:flex-1">
            <div className="w-full md:max-w-xs shrink-0">
              <DropDown
                label="Certification Type"
                name="docType"
                value={certIdToName[formData.docType] || "Certificate"}
                onChange={handleChange}
                options={docTypeDisplayOptions}
                labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
              />
            </div>
            <div className="w-30 md:w-35 shrink-0">
              <DropDown
                label="Size"
                name="paperSize"
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value)}
                options={["Letter", "A4", "Legal"]}
                labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
              />
            </div>
            <div className="w-37.5 md:w-45 shrink-0">
              <DropDown
                label="Margins"
                name="margins"
                value={margins}
                onChange={(e) => setMargins(e.target.value)}
                options={["Normal (0.75\")", "Narrow (0.25\")", "Wide (1.0\")", "None"]}
                labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {onClose && (
              <button
                onClick={onClose}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition-all active:scale-95 md:px-6 md:py-3 md:text-base ${isDark ? 'border-[#3e4042] bg-[#2a2a2f] text-[#e4e6eb]' : 'border-stone-300 bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
              >
                ← Back
              </button>
            )}
            <button
              onClick={handlePrint}
              disabled={printLoading}
              className={`w-full sm:w-auto flex-1 md:flex-none flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold 
                shadow-lg transition-all md:px-8 md:py-3 md:text-base ${
                printLoading
                  ? 'bg-gray-400 cursor-not-allowed opacity-75 text-white'
                  : isDark
                    ? 'bg-[#2a2a2f] hover:bg-[#353539] text-[#e4e6eb] border border-[#3e4042] active:scale-95'
                    : 'bg-pup-dark-maroon hover:bg-[#4a0000] text-white active:scale-95 shadow-stone-400/40'
              }`}
            >
              <PrinterIcon className="w-4 h-4 md:w-5 md:h-5" />
              {printLoading ? 'Preparing...' : 'Print File'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 items-start w-full max-w-7xl mx-auto px-4 md:px-6 pb-6 
      overflow-visible lg:overflow-visible print:block print:max-w-none print:px-0 print:pb-0 print:overflow-visible">

        {/* Left Sidebar */}
        <div className="w-full lg:w-88 xl:w-96 shrink-0 order-1 print:hidden">
          <div className="relative p-2 md:p-3">
            <div className={`rounded-2xl p-4 md:p-6 overflow-visible ${isDark ? 'border-[#3e4042] bg-[#242526]/95 text-[#e4e6eb]' : 
              'border-stone-200/80 bg-white/95 shadow-md shadow-stone-200/60'}`}>
              <h3 className={`mb-6 text-base font-extrabold uppercase tracking-tight md:text-lg ${isDark ? 'text-white' : 'text-[#800000]'}`}>Edit Information</h3>
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
                        labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
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
                      labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} 
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
                  labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
                  max={getTodayDate()}
                />

                <DropDown
                  label="Signee"
                  name="signee"
                  value={formData.signee}
                  onChange={handleChange}
                  options={signeeOptions}
                  labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
                />

                <button
                  type="button"
                  onClick={() => setSavedData({ ...formData })}
                  className={`w-full mt-6 rounded-lg font-semibold py-2.5 transition-all active:scale-95 ${
                    isDark
                      ? 'bg-[#2a2a2f] hover:bg-[#353539] text-[#e4e6eb] border border-[#3e4042]'
                      : 'bg-pup-dark-maroon hover:bg-[#4a0000] text-white'
                  }`}
                >
                  Save Changes
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Certificate Preview */}
        <div className={`relative order-2 flex flex-1 flex-col overflow-y-auto custom-scrollbar rounded-2xl min-h-96 
          sm:min-h-120 lg:min-h-150 max-h-[78vh] lg:max-h-[80vh] print:bg-white print:text-black print:rounded-none 
          print:border-0 print:min-h-0 print:max-h-none print:overflow-visible ${isDark ? 'border-[#3e4042] bg-[#242526]/90 text-[#e4e6eb]' : 
          'border-stone-200/80 bg-white/90 shadow-lg shadow-stone-200/70'}`}>
          <div className="pointer-events-none absolute inset-0 
          bg-[radial-gradient(circle_at_15%_20%,rgba(90,90,90,0.07),transparent_40%),radial-gradient(circle_at_85%_10%,rgba(120,120,120,0.06),transparent_35%)] 
          print:hidden" />
          <div className={`relative p-4 border-b shrink-0 print:hidden ${isDark ? 'bg-[#242526]/95 border-[#3e4042]' : 'bg-white/95 border-stone-200'}`}>
            <div className="flex items-center justify-between max-w-187.5 mx-auto w-full">
              <h2 className={`text-lg font-extrabold uppercase tracking-tight ${isDark ? 'text-white' : 'text-stone-800'}`}>Certificate Preview</h2>
            </div>
          </div>
          
          <div 
            ref={previewContainerRef}
            className="flex-1 flex justify-center items-start p-4 overflow-auto min-h-0 print:p-0 print:overflow-visible"
          >
            <div 
              style={{
                width: `${pageDimensions.width * scale}px`,
                height: `${pageDimensions.height * scale}px`,
                overflow: "hidden",
                position: "relative",
              }}
              className="print:shadow-none print:border-0 print:w-full print:h-full shrink-0"
            >
              <div
                style={{
                  width: `${pageDimensions.width}px`,
                  height: `${pageDimensions.height}px`,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  position: "absolute",
                  top: 0,
                  left: 0,
                }}
                className="print:static print:transform-none"
              >
                <CertificatePreview 
                  certConfig={previewCertConfig} 
                  activeLayout={activeLayout} 
                  debouncedFormData={savedData} 
                  isDark={isDark} 
                  pageDimensions={pageDimensions}
                  marginValue={marginValue}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateCertification;