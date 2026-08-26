/**
 * Canonical, single source of truth for `access_id` semantics on the
 * frontend. Mirrors the backend's App\Enums\AccessType (and the
 * `access_type` table it's built from): 1 = Student, 2 = Alumni,
 * 3 = Both.
 *
 * Why this exists
 * ----------------
 * Before this module, "which access_id values are visible on which
 * self-service form" was hand-copied as a raw array independently in
 * several files (RequestForm.jsx, DocumentLists.jsx,
 * AlumniDocumentList.jsx, alumniRequestUtils.js), plus a differently-named
 * label<->id map in documentManagementUtils.js. Nothing enforced that
 * those copies agreed. One of the backend's copies of this same idea
 * silently drifting from the rest (CashierDocumentSuggester using only
 * the student subset) caused every alumni-exclusive document/certificate
 * type to become unmatchable — see App\Enums\AccessType's docblock on the
 * backend for the full incident. Every file below now imports from here
 * instead of re-declaring its own copy, so the mapping can only ever be
 * changed in one place.
 */

export const ACCESS_TYPE = Object.freeze({
  STUDENT: 1,
  ALUMNI: 2,
  BOTH: 3,
});

/** access_id values visible on the STUDENT self-service request form. */
export const STUDENT_ACCESS_IDS = Object.freeze([ACCESS_TYPE.STUDENT, ACCESS_TYPE.BOTH]);

/** access_id values visible on the ALUMNI self-service request form. */
export const ALUMNI_ACCESS_IDS = Object.freeze([ACCESS_TYPE.ALUMNI, ACCESS_TYPE.BOTH]);

/**
 * access_id values visible to EITHER self-service form — the union of
 * STUDENT_ACCESS_IDS and ALUMNI_ACCESS_IDS. Use this for anything (e.g. a
 * shared admin view) that needs to see every self-service-visible type,
 * not just one audience's subset.
 */
export const ALL_SELF_SERVICE_ACCESS_IDS = Object.freeze([
  ACCESS_TYPE.STUDENT,
  ACCESS_TYPE.ALUMNI,
  ACCESS_TYPE.BOTH,
]);

/**
 * Human-readable label for each access_id, used by the admin
 * "Exclusive For" picker in DocumentManagement.jsx. Order matches the
 * picker's display order.
 */
export const EXCLUSIVE_FOR = Object.freeze(["Student", "Alumni", "All"]);

/** Label -> access_id, for submitting the admin form. */
export const ACCESS_MAP = Object.freeze({
  Student: ACCESS_TYPE.STUDENT,
  Alumni: ACCESS_TYPE.ALUMNI,
  All: ACCESS_TYPE.BOTH,
});

/** access_id -> label, for displaying data fetched from the API. */
export const ACCESS_MAP_REVERSE = Object.freeze({
  [ACCESS_TYPE.STUDENT]: "Student",
  [ACCESS_TYPE.ALUMNI]: "Alumni",
  [ACCESS_TYPE.BOTH]: "All",
});
