export const DOC_TYPE_MAP = {
  1: "New Identification",
  2: "Replacement of Lost Identification Card",
  3: "Consultation Service",
  4: "Counselling Service",
  5: "Recommendation Letter",
  6: "Student/Alumni Referral and Recommendation",
  7: "Permission to Conduct an Activity",
  8: "Application for Graduation SIS and Non-SIS",
  9: "Course/Subject Description",
  10: "Correction of Entry of Grade, Completion of Incomplete Grade, Late Reporting of Grade",
  11: "Course Accreditation (SHS to Bridge)",
  12: "Course Accreditation (Transferees)",
  13: "CERTIFICATION",
  14: "CAV/APOSTILE",
  15: "Transcript of Records (TOR)",
  16: "Informative Copy of Grades",
  17: "Request for Leave of Absences",
  18: "Re-Admission",
  19: "Good Moral Character",
};

export const PURPOSE_MAP = {
  1: "DFA",
  2: "Employment - Local",
};

// Status IDs mirror RequestStatusEnum in the backend:
//   1 = Processing  2 = ReadyToClaim  3 = Completed
//   4 = Forfeited   5 = Cancelled
export const STATUS_CONFIG = {
  1: { label: "Processing",     classes: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  2: { label: "Ready to Claim", classes: "bg-green-100 text-green-700 border-green-200" },
  3: { label: "Completed",      classes: "bg-gray-100 text-gray-700 border-gray-200" },
  4: { label: "Forfeited",      classes: "bg-red-100 text-red-700 border-red-200" },
  5: { label: "Cancelled",      classes: "bg-orange-100 text-orange-700 border-orange-200" },
};

export const TAB_MAP = {
  1: "pending",   // Processing
  2: "ready",     // Ready to Claim
  3: "history",   // Completed
  4: "history",   // Forfeited
  5: "history",   // Cancelled
};

export const TABS = [
  { 
    label: "Pending", 
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
  1: 25,  // Processing
  2: 75,  // Ready to Claim
  3: 100, // Completed
  4: 0,   // Forfeited
  5: 0,   // Cancelled
};

export const CERTIFICATION_MAP = {
  1: "Certificate of GWA",
  2: "Non Issuance of SO",
  3: "Certification of Medium of Instruction",
  4: "Certification of Medium of Instruction with Units",
  5: "Certificate of Attendance",
  6: "Certificate of Graduation",
  7: "Certified True Copy of Records",
  8: "Certificate of Graduate Honor",
  9: "Consular Certification",
  10: "Certificate of Enrollment - PRESENT",
  11: "Certificate of Enrollment - UNDERGRAD",
  12: "Certificate of Ladderized Course",
  13: "CAV Request Letter",
  14: "CAV",
  15: "Certification of NSTP-CWTS",
  16: "Endorsement Letter",
  17: "Certificate of Eligibility to Transfer",
};

