export const DOC_TYPE_MAP = {
  1: "Recommendation Letter",
  2: "Course Subject Description",
  3: "Certificates",
  4: "CAV / Apostille",
  5: "Transcript of Records",
  6: "Certificate of Good Moral Character",
  7: "Academic Verification",
  8: "New Identification Card",
  9: "Replacement Identification Card",
  10: "Consultation Service",
  11: "Counseling Service",
  12: "Permit to Conduct an Activity",
  13: "Application for Graduation",
  14: "Grade Correction",
  15: "Name Correction",
  16: "SHS Course Accreditation",
  17: "Transferee Course Accreditation",
  18: "Informative Copy of Grades",
  19: "Leave of Absence",
  20: "Re-Admission Certificate",
};

export const PURPOSE_MAP = {
  1: "DFA",
  2: "Employment - Local",
  3: "Employment - Abroad",
  4: "Further Studies",
  5: "Board Exam",
  6: "Scholarship",
  7: "Personal Copy",
};

export const STATUS_CONFIG = {
  1: { label: "Pending", classes: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  2: { label: "Ready to claim", classes: "bg-green-100 text-green-700 border-green-200" },
  3: { label: "Completed", classes: "bg-gray-100 text-gray-700 border-gray-200" },
  5: { label: "Forfeited", classes: "bg-red-100 text-red-700 border-red-200" },
  6: { label: "Ready", classes: "bg-green-100 text-green-700 border-green-200" },
};

export const TAB_MAP = {
  1: "pending",   // Pending
  2: "ready",     // Ready to claim
  6: "ready",     // Ready
  3: "history",   // Completed
  5: "history",   // Forfeited
};

export const TABS = [
  { 
    label: "Ongoing", 
    value: "pending", 
    active: "bg-yellow-50 border-yellow-500 text-yellow-900", 
    inactive: "bg-white border-gray-200 text-gray-500 hover:bg-yellow-50" 
  },
  { 
    label: "To Claim", 
    value: "ready", 
    active: "bg-green-50 border-green-500 text-green-900", 
    inactive: "bg-white border-gray-200 text-gray-500 hover:bg-green-50" 
  },
  { 
    label: "History", 
    value: "history", 
    active: "bg-gray-100 border-gray-500 text-gray-900", 
    inactive: "bg-white border-gray-200 text-gray-500 hover:bg-gray-50" 
  },
];

export const PROGRESS_MAP = {
  1: 25,  // Pending
  2: 75,  // Ready to claim
  3: 100, // Completed
  5: 0,   // Forfeited
  6: 75,  // Ready
};