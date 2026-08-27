/**
 * logbookHelpers.js
 * Shared pure-function helpers used by both Logbook.jsx (display) and
 * logbookDocx.js (export).  A single source of truth prevents drift between
 * what the UI shows and what ends up in the exported document.
 */
import { formatName } from './formatters.js';

// ---------------------------------------------------------------------------
// Date / time formatters
// ---------------------------------------------------------------------------

/** Format an ISO value as "Month DD, YYYY" */
export const formatDateLong = (value, includeTime = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const datePart = date.toLocaleDateString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  });

  if (!includeTime) return datePart;

  const timePart = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${datePart} ${timePart}`;
};

/** Extract the gender/sex from a request row */
export const getGender = (row) => {
  const p =
    row.student_profile ||
    row.alumni_profile ||
    row.user?.student_profile ||
    row.user?.alumni_profile;
  return p?.sex_at_birth || p?.gender || '---';
};

/** Format an ISO value as "Month DD, YYYY HH:MM" (24-hour) */
export const formatDateTimeLong = (value) => {
  const datePart = formatDateLong(value);
  if (!datePart) return null;
  const timePart = new Date(value).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${datePart} ${timePart}`;
};

/** Convert a minutes value into a human-readable duration string */
export const formatMinutesDuration = (minutesValue) => {
  if (minutesValue === null || minutesValue === undefined || minutesValue === '') return '---';

  const totalMinutes = Number(minutesValue);
  if (Number.isNaN(totalMinutes) || totalMinutes < 0) return '---';

  const wholeMinutes = Math.floor(totalMinutes);
  const days = Math.floor(wholeMinutes / 1440);
  const hours = Math.floor((wholeMinutes % 1440) / 60);
  const minutes = wholeMinutes % 60;
  const minuteLabel = minutes === 1 ? 'min' : 'mins';

  if (days > 0) return `${days}day${days > 1 ? 's' : ''} ${hours}hr${hours !== 1 ? 's' : ''} ${minutes}${minuteLabel}`;
  if (hours > 0) return `${hours}hr${hours !== 1 ? 's' : ''} ${minutes}${minuteLabel}`;
  return `${minutes}${minuteLabel}`;
};

// ---------------------------------------------------------------------------
// Row field extractors — normalise the multiple possible payload shapes
// ---------------------------------------------------------------------------

/** Convert text to Proper Case, preserving roman numerals and hyphens */
export const toProperCase = (value = '') =>
  value
    .toString()
    .trim()
    .split(/\s+/)
    .map((token) => {
      if (/^[IVXLCDM]+$/i.test(token)) return token.toUpperCase();
      return token
        .toLowerCase()
        .replace(/(^|[-'])([a-z])/g, (_, sep, letter) => `${sep}${letter.toUpperCase()}`);
    })
    .join(' ');

export const getFullName = (row) => {
  const name = formatName(row, { lastNameFirst: true, middleInitialOnly: true });
  return name || 'Walk-in Client';
};

/** Extract the course string from a request row */
export const getCourse = (row) =>
  row.student_profile?.academic_records?.[0]?.course ||
  row.student_profile?.course ||
  row.academic_record?.course ||
  row.alumni_academic_record?.course ||
  '---';

/** Extract the email from a request row */
export const getEmail = (row) =>
  row.user?.email || row.student_profile?.email || '---';

// ---------------------------------------------------------------------------
// History helpers — work with embedded history (row.history[]) or a
// historyByRequestId lookup map (legacy; kept for backward-compatibility).
// ---------------------------------------------------------------------------

/** Return sorted history entries for a row (most recent first) */
export const getHistoryRows = (row, historyByRequestId = {}) => {
  const fromMap = historyByRequestId?.[row.request_id];
  const base = Array.isArray(fromMap)
    ? fromMap
    : Array.isArray(row.history)
    ? row.history
    : [];
  return [...base].sort(
    (a, b) =>
      new Date(b?.changed_at || 0).getTime() - new Date(a?.changed_at || 0).getTime()
  );
};

/** changed_at from the ReadyToClaim (new_status_id=2) history entry.
 *  This is the true "processed" timestamp — not the most-recent entry,
 *  which for a completed request is the Completed transition.
 *  Fix applied by migration FE-1.
 */
export const getProcessedAt = (row, historyByRequestId = {}) => {
  const history = getHistoryRows(row, historyByRequestId);
  const entry = history.find((h) => h.new_status_id === 2  /* ReadyToClaim — migration FE-1 */);
  return entry?.changed_at || null;
};

/**
 * Raw cumulative wall-clock minutes (minutes_processed) from the ReadyToClaim
 * entry. Kept for backward compatibility and as the fallback source when a
 * request predates business_minutes (see getBusinessMinutesProcessed below).
 * Do not use this directly for a "processing time" figure shown to staff —
 * it counts weekends/holidays/after-hours as elapsed time. Use
 * getProcessingDuration() instead, which prefers the business-hours-aware
 * figure and only falls back to this.
 */
export const getMinutesProcessed = (row, historyByRequestId = {}) => {
  const history = getHistoryRows(row, historyByRequestId);
  const entry = history.find((h) => h.new_status_id === 2);
  return entry?.minutes_processed ?? null;
};

/**
 * Cumulative, calendar-aware processing time (minutes) from the request
 * being filed through its ReadyToClaim transition — i.e. the office-hours
 * counterpart of getMinutesProcessed() above.
 *
 * WHY THIS ISN'T A SIMPLE FIELD SWAP:
 * Each request_history row's `business_minutes` is a PER-SEGMENT duration —
 * the calendar-aware time elapsed since the PREVIOUS status change, not
 * since the request was filed (see BusinessCalendarService and the
 * business_minutes column comment on migration
 * 2026_08_15_000000_add_pending_signature_status on the backend). A request
 * that went Processing -> Pending Signature -> Ready to Claim has its
 * total office-hours processing time split across two separate history
 * rows. Reading business_minutes off only the ReadyToClaim row — mirroring
 * how getMinutesProcessed() reads minutes_processed off that single row —
 * would silently drop every earlier segment.
 *
 * This walks the request's full history chronologically and sums
 * business_minutes for every segment up to and including the ReadyToClaim
 * transition, which is the calendar-aware equivalent of "cumulative time
 * since requested_at" that minutes_processed represents.
 *
 * Returns null (never a partial/incorrect number) when:
 *   - there's no ReadyToClaim entry for this row, or
 *   - any segment in that span predates the business_minutes column and is
 *     therefore null — callers should fall back to getMinutesProcessed()
 *     for those older records rather than mixing business-hours and
 *     wall-clock minutes into one total.
 */
export const getBusinessMinutesProcessed = (row, historyByRequestId = {}) => {
  const history = getHistoryRows(row, historyByRequestId); // newest first
  const readyIndex = history.findIndex((h) => h.new_status_id === 2);
  if (readyIndex === -1) return null;

  // Every segment from the earliest history row through the ReadyToClaim
  // transition (inclusive) — getHistoryRows() sorts newest-first, so that's
  // everything from readyIndex to the end of the array.
  const segments = history.slice(readyIndex);

  let total = 0;
  for (const segment of segments) {
    const minutes = segment?.business_minutes;
    if (minutes === null || minutes === undefined) return null; // incomplete data — let the caller fall back
    total += Number(minutes) || 0;
  }

  return total;
};

/**
 * The processing-time figure that should be shown/exported to staff:
 * business-hours-aware when available, transparently falling back to the
 * raw cumulative figure for requests that predate the business_minutes
 * column so older records still display something rather than "---".
 */
export const getProcessingDuration = (row, historyByRequestId = {}) => {
  const businessMinutes = getBusinessMinutesProcessed(row, historyByRequestId);
  return businessMinutes ?? getMinutesProcessed(row, historyByRequestId);
};

/** Timestamp when the request was claimed (new_status_id === 3) */
export const getClaimedAt = (row, historyByRequestId = {}) => {
  const history = getHistoryRows(row, historyByRequestId);
  const entry = history.find((h) => h.new_status_id === 3);
  return entry?.changed_at || null;
};

/** Extract document type names from a request row */
export const getDocumentNames = (row) =>
  (Array.isArray(row?.documents) ? row.documents : [])
    .map(
      (d) =>
        d?.documentType?.document_name ??
        d?.document_type?.document_name ??
        d?.document_name ??
        ''
    )
    .filter(Boolean)
    .map((n) => String(n).trim())
    .filter(Boolean);

/** Extract certification type names from a request row */
export const getCertificationNames = (row) =>
  (Array.isArray(row?.certificates) ? row.certificates : [])
    .map(
      (c) =>
        c?.certification_type?.certificate_name ??
        c?.certificate_name ??
        c?.name ??
        ''
    )
    .filter(Boolean)
    .map((n) => String(n).trim())
    .filter(Boolean);