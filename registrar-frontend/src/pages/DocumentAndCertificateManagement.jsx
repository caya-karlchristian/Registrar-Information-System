import React, { useState, useEffect } from "react";
import DocumentManagement from "../layouts/DocumentManagement.jsx";
import CertificateTemplateManagement from "../layouts/CertificateTemplateManagement.jsx";
import ArchivedManagement from "../pages/ArchivedManagement.jsx";
import { useTheme } from "../context/ThemeContext";
import {
  getDocumentTypes,
  getCertifications,
  getCertificationLayouts,
  archiveDocumentType,
  restoreDocumentType,
  archiveCertification,
  restoreCertification,
} from "../services/api";
import { normalizeCertificateLayout, DEFAULT_CERTIFICATE_LAYOUT } from "../utils/certificateTemplateSettings.js";

// NOTE: MOCK_ARCHIVED_DOCS / MOCK_ARCHIVED_CERTS have been removed.
// Archived items now come from the real API (is_archived/archived_on are
// real, persisted columns as of the 2026_07_11 migration) instead of being
// hardcoded fake rows concatenated onto every load.

const MOCK_ACTIVE_DOCS = [
  {
    document_type_id: "active-doc-1",
    document_name: "Official Transcript of Records (OTR)",
    document_description: "Official record of a student's academic history, courses taken, and grades received.",
    document_requirements: "Clearance form, Official receipt, 2x2 Photo.",
    document_process_period: "5 working day/s",
    access_id: 3,
    is_archived: false
  },
  {
    document_type_id: "active-doc-2",
    document_name: "Certificate of Graduation",
    document_description: "Certifies that a student has completed all academic requirements for graduation.",
    document_requirements: "Approved graduation clearance, Transcript copy.",
    document_process_period: "3 working day/s",
    access_id: 3,
    is_archived: false
  },
  {
    document_type_id: "active-doc-3",
    document_name: "Honorable Dismissal / Transfer Credential",
    document_description: "Issued to a student who desires to transfer to another school or university.",
    document_requirements: "Registrar clearance, Request form, Return of Student ID.",
    document_process_period: "3 working day/s",
    access_id: 3,
    is_archived: false
  }
];

const MOCK_ACTIVE_CERTS = [
  {
    certificate_type_id: "active-cert-1",
    certificate_name: "Certificate of Enrollment",
    certificate_requirements: "Latest registration card copy, Current school ID.",
    certificate_process_period: "1 working day/s",
    access_id: 3,
    is_archived: false
  },
  {
    certificate_type_id: "active-cert-2",
    certificate_name: "Certificate of Registration (COR)",
    certificate_requirements: "Paid school fees receipt, Enrolled student profile.",
    certificate_process_period: "1 working day/s",
    access_id: 3,
    is_archived: false
  }
];

const DocumentAndCertificateManagement = () => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState("documents"); // "documents", "certificates", or "archived"
  const [documents, setDocuments] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [layoutsByCertId, setLayoutsByCertId] = useState({});
  const [loading, setLoading] = useState(true);

  // Fetch all documents and certifications on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [docsRes, certsRes, layoutsRes] = await Promise.all([
          getDocumentTypes(),
          getCertifications(),
          getCertificationLayouts()
        ]);
        // Trust the real is_archived/archived_on values from the API now
        // that they're persisted columns, instead of overwriting them with
        // a hardcoded false and bolting on fake archived rows.
        const apiDocs = docsRes.data ?? [];
        const apiCerts = certsRes.data ?? [];

        setDocuments(apiDocs);
        setCertifications(apiCerts);

        // Process layouts
        const layoutRows = Array.isArray(layoutsRes?.data) ? layoutsRes.data : [];
        const layoutMap = {};
        layoutRows.forEach((row) => {
          layoutMap[row.certificate_type_id] = normalizeCertificateLayout(row);
        });

        setLayoutsByCertId(layoutMap);
      } catch (err) {
        console.warn("Failed to load list items from API (backend offline), falling back to UI demo active lists:", err);
        setDocuments(MOCK_ACTIVE_DOCS);
        setCertifications(MOCK_ACTIVE_CERTS);

        // Fallback layout mockup mapping
        const layoutMap = {
          "active-cert-1": { ...DEFAULT_CERTIFICATE_LAYOUT },
          "active-cert-2": { ...DEFAULT_CERTIFICATE_LAYOUT }
        };
        setLayoutsByCertId(layoutMap);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleArchiveDoc = async (docId) => {
    try {
      const res = await archiveDocumentType(docId);
      setDocuments(prev => prev.map(d =>
        d.document_type_id === docId ? { ...d, ...res.data } : d
      ));
    } catch (err) {
      console.error("Failed to archive document type:", err);
      alert("Couldn't archive this document. Please try again.");
    }
  };

  const handleArchiveCert = async (certId) => {
    try {
      const res = await archiveCertification(certId);
      setCertifications(prev => prev.map(c =>
        c.certificate_type_id === certId ? { ...c, ...res.data } : c
      ));
    } catch (err) {
      console.error("Failed to archive certification type:", err);
      alert("Couldn't archive this certification. Please try again.");
    }
  };

  const handleRestoreDoc = async (docId) => {
    try {
      const res = await restoreDocumentType(docId);
      setDocuments(prev => prev.map(d =>
        d.document_type_id === docId ? { ...d, ...res.data } : d
      ));
    } catch (err) {
      console.error("Failed to restore document type:", err);
      alert("Couldn't restore this document. Please try again.");
    }
  };

  const handleRestoreCert = async (certId) => {
    try {
      const res = await restoreCertification(certId);
      setCertifications(prev => prev.map(c =>
        c.certificate_type_id === certId ? { ...c, ...res.data } : c
      ));
    } catch (err) {
      console.error("Failed to restore certification type:", err);
      alert("Couldn't restore this certification. Please try again.");
    }
  };

  return (
    <div className={`font-sans ${isDark ? 'text-[#e4e6eb]' : ''}`}>
      
      {/* Tab Switcher Navigation */}
      <div className="flex justify-center mx-4 sm:mx-6 mb-5">
        <div className={`inline-flex px-8 py-3.5 rounded-full transition-all duration-300 hover:-translate-y-0.5 ${isDark
            ? 'bg-[#242526] border border-[#3e4042] shadow-[0_2px_8px_rgba(0,0,0,0.2)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.35)]'
            : 'bg-white border border-gray-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]'
          } gap-8 items-center`}>
          <button
            onClick={() => setActiveTab("documents")}
            className={`text-sm relative rounded-full flex items-center justify-center shrink-0 font-semibold transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${activeTab === "documents"
                ? isDark
                  ? "text-yellow-400 font-bold"
                  : "text-pup-dark-maroon font-black"
                : isDark
                  ? "text-[#b0b3b8] hover:text-white"
                  : "text-gray-500 hover:text-gray-900"
              }`}
          >
            Document Management
          </button>
          <button
            onClick={() => setActiveTab("certificates")}
            className={`text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${activeTab === "certificates"
                ? isDark
                  ? "text-yellow-400 font-bold"
                  : "text-pup-dark-maroon font-black"
                : isDark
                  ? "text-[#b0b3b8] hover:text-white"
                  : "text-gray-500 hover:text-gray-900"
              }`}
          >
            Certificate Logo Management
          </button>
          <button
            onClick={() => setActiveTab("archived")}
            className={`text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${activeTab === "archived"
                ? isDark
                  ? "text-yellow-400 font-bold"
                  : "text-pup-dark-maroon font-black"
                : isDark
                  ? "text-[#b0b3b8] hover:text-white"
                  : "text-gray-500 hover:text-gray-900"
              }`}
          >
            Archived Documents
          </button>
        </div>
      </div>

      {/* Conditional Layout Rendering */}
      {activeTab === "documents" && (
        <DocumentManagement 
          documents={documents}
          setDocuments={setDocuments}
          certifications={certifications}
          setCertifications={setCertifications}
          loading={loading}
          onArchiveDoc={handleArchiveDoc}
          onArchiveCert={handleArchiveCert}
        />
      )}
      {activeTab === "certificates" && (
        <CertificateTemplateManagement />
      )}
      {activeTab === "archived" && (
        <ArchivedManagement 
          documents={documents}
          certifications={certifications}
          layoutsByCertId={layoutsByCertId}
          onRestoreDoc={handleRestoreDoc}
          onRestoreCert={handleRestoreCert}
        />
      )}
    </div>
  );
};

export default DocumentAndCertificateManagement;