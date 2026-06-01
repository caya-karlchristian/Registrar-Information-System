/**
 * logbookHelpers.js
 * Shared pure-function helpers used by both Logbook.jsx (display) and
 * logbookDocx.js (export).  A single source of truth prevents drift between
 * what the UI shows and what ends up in the exported document.
 */

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

/** Build "Last, First M." from a request row */
export const getFullName = (row) => {
  const p =
    row.student_profile ||
    row.alumni_profile ||
    row.user?.student_profile ||
    row.user?.alumni_profile;
  if (!p) return 'Walk-in Client';
  const middle = p.middle_name ? ` ${p.middle_name.trim().charAt(0).toUpperCase()}.` : '';
  const last  = toProperCase(p.last_name  || p.lastname  || '');
  const first = toProperCase(p.first_name || p.firstname || '');
  return `${last}, ${first}${middle}`.trim();
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

/** Most-recent changed_at timestamp for a row */
export const getProcessedAt = (row, historyByRequestId = {}) => {
  const history = getHistoryRows(row, historyByRequestId);
  return history[0]?.changed_at || null;
};

/** minutes_processed from the most-recent history entry */
export const getMinutesProcessed = (row, historyByRequestId = {}) => {
  const history = getHistoryRows(row, historyByRequestId);
  return history[0]?.minutes_processed ?? null;
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
