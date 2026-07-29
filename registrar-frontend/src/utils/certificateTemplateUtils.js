export const toCertificateRows = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

export const toDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const hasPreviewDataUrl = (layout) => {
  if (!layout || typeof layout !== "object") return false;

  const values = [layout.headerLeftUrl, layout.headerRightUrl, ...(layout.footerUrls ?? [])];
  return values.some((value) => typeof value === "string" && value.startsWith("data:"));
};

export const validateFile = (file) => {
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
  const fileExtension = file.name ? file.name.split('.').pop().toLowerCase() : '';
  const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "svg"];

  const isValidType = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(fileExtension);

  if (!isValidType) {
    return "Invalid file type. Only PNG, JPG, JPEG, and SVG files are allowed.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File is too large. Maximum allowed size is 2MB.";
  }
  return null;
};

export const SAMPLE_FORM_DATA = {
  fullName: "Juan Santos Dela Cruz",
  course: "BS in Information Technology",
  latinHonors: "(Cum Laude)",
  dateGraduated: "2026-04-02",
  diplomaNum: "2026-001",
  educationLevel: "Graduate",
  date: "2026-04-02",
  gwa: "1.25",
  officialReceiptNum: "2026-000123",
  major: "Web and Mobile Development",
  eligibilityType: "Civil Service Professional",
  semesters: "2nd Semester",
  syAdmitted: "2022-08-01",
  lastSemesters: "2nd Semester",
  lastSy: "2025-08-01",
  units: "120",
  semestersNum: "8",
  ladderizedDegree: "BS in Information Systems",
  studentStatus: "Graduated",
  cavNum: "TG-008",
  cavSeries: "2026",
  amount: "620.00",
  nstpSerialNum: "C-13-113719-16",
};
