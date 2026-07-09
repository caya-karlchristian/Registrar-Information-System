import React, { useState, useEffect } from "react";
import DocumentManagement from "../layouts/DocumentManagement.jsx";
import CertificateTemplateManagement from "../layouts/CertificateTemplateManagement.jsx";
import ArchivedManagement from "../pages/ArchivedManagement.jsx";
import { useTheme } from "../context/ThemeContext";
import { getDocumentTypes, getCertifications, getCertificationLayouts } from "../services/api";
import { normalizeCertificateLayout, DEFAULT_CERTIFICATE_LAYOUT } from "../utils/certificateTemplateSettings.js";

const MOCK_ARCHIVED_DOCS = [
  {
    document_type_id: "mock-doc-1",
    document_name: "Correction of Entry of Grade",
    document_description: "Corrects an entry of grade for a student's academic record, including incomplete grade resolution and late reporting cases.",
    document_requirements: "Grade correction form, Instructor's certification, Approved request slip.",
    document_process_period: "2 working day/s",
    access_id: 3,
    is_archived: true,
    archived_on: "Jun 14, 2026"
  },
  {
    document_type_id: "mock-doc-2",
    document_name: "Late Reporting of Grade",
    document_description: "Allows reporting of grades that were not submitted on time.",
    document_requirements: "Explanation letter, Grade sheet copy, Approved request form.",
    document_process_period: "3 working day/s",
    access_id: 3,
    is_archived: true,
    archived_on: "May 30, 2026"
  }
];

const MOCK_ARCHIVED_CERTS = [
  {
    certificate_type_id: "mock-cert-1",
    certificate_name: "Certificate of GWA",
    certificate_requirements: "Transcript of Records copy, Official receipt.",
    certificate_process_period: "1 working day/s",
    access_id: 3,
    is_archived: true,
    archived_on: "Jul 1, 2026"
  },
  {
    certificate_type_id: "mock-cert-2",
    certificate_name: "Certification of Medium of Instruction",
    certificate_requirements: "Letter of intent, Proof of payment.",
    certificate_process_period: "1 working day/s",
    access_id: 3,
    is_archived: true,
    archived_on: "Apr 2, 2026"
  }
];

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
        const apiDocs = (docsRes.data ?? []).map(d => ({ ...d, is_archived: false }));
        const apiCerts = (certsRes.data ?? []).map(c => ({ ...c, is_archived: false }));
        
        setDocuments([...apiDocs, ...MOCK_ARCHIVED_DOCS]);
        setCertifications([...apiCerts, ...MOCK_ARCHIVED_CERTS]);

        // Process layouts
        const layoutRows = Array.isArray(layoutsRes?.data) ? layoutsRes.data : [];
        const layoutMap = {};
        layoutRows.forEach((row) => {
          layoutMap[row.certificate_type_id] = normalizeCertificateLayout(row);
        });

        // Seed mock details mapping
        layoutMap["mock-cert-1"] = { ...DEFAULT_CERTIFICATE_LAYOUT };
        layoutMap["mock-cert-2"] = { ...DEFAULT_CERTIFICATE_LAYOUT };
        layoutMap["active-cert-1"] = { ...DEFAULT_CERTIFICATE_LAYOUT };
        layoutMap["active-cert-2"] = { ...DEFAULT_CERTIFICATE_LAYOUT };

        setLayoutsByCertId(layoutMap);
      } catch (err) {
        console.warn("Failed to load list items from API (backend offline), falling back to UI demo active lists:", err);
        setDocuments([...MOCK_ACTIVE_DOCS, ...MOCK_ARCHIVED_DOCS]);
        setCertifications([...MOCK_ACTIVE_CERTS, ...MOCK_ARCHIVED_CERTS]);

        // Fallback layout mockup mapping
        const layoutMap = {
          "mock-cert-1": { ...DEFAULT_CERTIFICATE_LAYOUT },
          "mock-cert-2": { ...DEFAULT_CERTIFICATE_LAYOUT },
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

  const handleArchiveDoc = (docId) => {
    setDocuments(prev => prev.map(d => 
      d.document_type_id === docId 
        ? { 
            ...d, 
            is_archived: true,
            archived_on: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          } 
        : d
    ));
  };

  const handleArchiveCert = (certId) => {
    setCertifications(prev => prev.map(c => 
      c.certificate_type_id === certId 
        ? { 
            ...c, 
            is_archived: true,
            archived_on: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          } 
        : c
    ));
  };

  const handleRestoreDoc = (docId) => {
    setDocuments(prev => prev.map(d => 
      d.document_type_id === docId ? { ...d, is_archived: false } : d
    ));
  };

  const handleRestoreCert = (certId) => {
    setCertifications(prev => prev.map(c => 
      c.certificate_type_id === certId ? { ...c, is_archived: false } : c
    ));
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
