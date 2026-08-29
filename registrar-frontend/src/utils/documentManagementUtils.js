// Re-exported from the single source of truth so existing imports of
// EXCLUSIVE_FOR / ACCESS_MAP / ACCESS_MAP_REVERSE from this file keep
// working unchanged. See src/constants/accessTypes.js for the canonical
// definitions and the rationale for centralizing them.
export { EXCLUSIVE_FOR, ACCESS_MAP, ACCESS_MAP_REVERSE } from "../constants/accessTypes";

export const EMPTY_FORM = {
  document_name: "",
  document_description: "",
  document_requirements: "",
  document_process_period: "",
  access_id: "",
  // Added alongside the 2026_08_29 logbook_category / CTC reconciliation
  // work. logbook_category_id is nullable — most types don't collapse
  // with anything else and log under their own name (see the
  // logbook_category migration docblock), so "" (→ null on submit) is a
  // valid, common value, not a placeholder waiting to be filled in.
  logbook_category_id: "",
  requires_source_submission: false,
};

export const FOLDER_COLORS = [
  {
    folder: "text-[#8B0000] hover:text-[#700000] dark:text-[#a51a1a] dark:hover:text-[#be2323]",
    inner: "text-[#8B0000] dark:text-[#a51a1a]",
    bg: "bg-[#8B0000]/5 dark:bg-[#8B0000]/10",
    text: "text-[#8B0000] dark:text-red-200",
    activeRing: "ring-2 ring-[#8B0000] border-[#8B0000]",
  },
  {
    folder: "text-[#F8BF1E] hover:text-[#d3a010] dark:text-[#f9c738] dark:hover:text-[#fad360]",
    inner: "text-[#F8BF1E] dark:text-[#f9c738]",
    bg: "bg-[#F8BF1E]/5 dark:bg-[#F8BF1E]/10",
    text: "text-amber-800 dark:text-amber-200",
    activeRing: "ring-2 ring-[#F8BF1E] border-[#F8BF1E]",
  },
  {
    folder: "text-[#10b981] hover:text-[#059669] dark:text-[#34d399] dark:hover:text-[#6ee7b7]",
    inner: "text-[#10b981] dark:text-[#34d399]",
    bg: "bg-[#10b981]/5 dark:bg-[#10b981]/10",
    text: "text-[#065f46] dark:text-emerald-200",
    activeRing: "ring-2 ring-[#10b981] border-[#10b981]",
  },
];

/**
 * Validates process period value according to standard rules:
 * - Whole number of days between 1 and 30.
 * - Acceptable suffixes: "day/s", "days", "day", "working day", etc.
 */
export const validateProcessPeriod = (periodStr) => {
  if (!periodStr || !periodStr.trim()) {
    return false;
  }
  const cleanStr = periodStr.trim().toLowerCase();
  let dayMatch = cleanStr.match(/^([^\s,]+)\s*(?:working\s*day\/s|working\s*days|working\s*day|days|day)/);
  if (!dayMatch) {
    dayMatch = cleanStr.match(/^([^\s,]+)$/);
  }

  if (dayMatch) {
    const rawDays = dayMatch[1];
    const hasDecimal = rawDays.includes(".");
    const daysVal = parseInt(rawDays, 10);
    if (!hasDecimal && !isNaN(daysVal) && daysVal >= 1 && daysVal <= 30) {
      return true;
    }
  }
  return false;
};

/**
 * Normalizes API response structures. Handles both direct payload responses 
 * and wrapped { success: true, data: ... } response formats safely.
 */
export const extractApiResponseData = (res) => {
  if (res && res.data && typeof res.data === "object") {
    if ("success" in res.data && "data" in res.data) {
      return res.data.data;
    }
  }
  return res?.data;
};