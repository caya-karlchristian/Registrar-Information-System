import { createContext, useContext, useState, useEffect } from "react";
import {
  getDocumentTypes,
  getCertifications,
  getRequestStatuses,
  getRequestPurposes,
} from "../services/api";

/**
 * ReferenceDataContext
 * --------------------
 * Fetches all reference / lookup data from the API once on mount and makes it
 * available throughout the app.
 *
 * Why this replaces constants.js hardcoded maps:
 *   - The DB is the source of truth. If an admin adds a new document type,
 *     the frontend picks it up immediately without a code deploy.
 *   - The old DOC_TYPE_MAP, CERTIFICATION_MAP, and PURPOSE_MAP were integer-keyed
 *     objects that would silently drift from the database.
 *
 * Usage:
 *   const { documentTypes, certifications, statuses, purposes, loading } = useReferenceData();
 *
 * Convenience helpers are also exported:
 *   docTypeName(id)   → string | undefined
 *   certName(id)      → string | undefined
 *   statusConfig(id)  → { label, classes } | undefined
 */

// Status display config is purely presentational — it does NOT need to come
// from the API and is safe to keep here because the backend enum values are
// stable by design (changing status IDs is a breaking migration, not a routine
// admin action). We map over API-fetched statuses and merge this in.
const STATUS_DISPLAY = {
  1: { label: "Processing",     classes: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  2: { label: "Ready to Claim", classes: "bg-green-100 text-green-700 border-green-200"  },
  3: { label: "Completed",      classes: "bg-gray-100 text-gray-700 border-gray-200"     },
  4: { label: "Forfeited",      classes: "bg-red-100 text-red-700 border-red-200"        },
  5: { label: "Cancelled",      classes: "bg-orange-100 text-orange-700 border-orange-200" },
};

const ReferenceDataContext = createContext(null);

export const ReferenceDataProvider = ({ children }) => {
  const [documentTypes,   setDocumentTypes]   = useState([]);
  const [certifications,  setCertifications]  = useState([]);
  const [statuses,        setStatuses]        = useState([]);
  const [purposes,        setPurposes]        = useState([]);
  const [loading,         setLoading]         = useState(true);

  useEffect(() => {
    // Fetch all reference data in parallel. Individual failures are caught so
    // one unavailable endpoint cannot block the rest of the app from loading.
    const load = async () => {
      const results = await Promise.allSettled([
        getDocumentTypes(),
        getCertifications(),
        getRequestStatuses(),
        getRequestPurposes(),
      ]);

      if (results[0].status === "fulfilled") setDocumentTypes(results[0].value.data ?? []);
      if (results[1].status === "fulfilled") setCertifications(results[1].value.data ?? []);
      if (results[2].status === "fulfilled") setStatuses(results[2].value.data ?? []);
      if (results[3].status === "fulfilled") setPurposes(results[3].value.data ?? []);

      setLoading(false);
    };

    load();
  }, []);

  // ── Convenience lookup helpers ───────────────────────────────────────────

  /** Return the document name for a given document_type_id, or undefined. */
  const docTypeName = (id) =>
    documentTypes.find((d) => d.document_type_id === id)?.document_name;

  /** Return the certification name for a given certificate_type_id, or undefined. */
  const certName = (id) =>
    certifications.find((c) => c.certificate_type_id === id)?.certificate_name;

  /**
   * Return { label, classes } display config for a given status_id.
   * Falls back to STATUS_DISPLAY for styling; uses API name for the label
   * when available so the label always matches the DB value.
   */
  const statusConfig = (id) => {
    const apiStatus = statuses.find((s) => Number(s.status_id) === Number(id));
    const display   = STATUS_DISPLAY[id] ?? { label: "Unknown", classes: "bg-gray-100 text-gray-700" };
    return {
      ...display,
      label: apiStatus?.status_name ?? display.label,
    };
  };

  /** Return the purpose name for a given request_purpose_id, or undefined. */
  const purposeName = (id) =>
    purposes.find((p) => p.request_purpose_id === id)?.purpose_name;

  return (
    <ReferenceDataContext.Provider
      value={{
        documentTypes,
        certifications,
        statuses,
        purposes,
        loading,
        docTypeName,
        certName,
        statusConfig,
        purposeName,
      }}
    >
      {children}
    </ReferenceDataContext.Provider>
  );
};

export const useReferenceData = () => {
  const ctx = useContext(ReferenceDataContext);
  if (!ctx) throw new Error("useReferenceData must be used inside ReferenceDataProvider");
  return ctx;
};
