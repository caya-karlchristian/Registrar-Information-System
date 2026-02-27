import React, { useEffect, useState } from 'react';
import GenerateCertification from '../layouts/GenerateCertificate.jsx';
import { CERT_CONFIG } from '../utils/Certification.jsx';

const CertificateModal = ({ request, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const validDocType = CERT_CONFIG[request.certName]
    ? request.certName
    : Object.keys(CERT_CONFIG)[0];

    useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 1024;

  if (!visible) return null;

  const initialData = {
    docType: validDocType,
    fullName: request.studentName ?? '',
    studentNum: request.studentNum?? '',
    course: request.course ?? '',
    syAdmitted: request.syAdmitted ?? '',
    eventTitle: request.eventTitle ?? '',
    dateGraduated: request.graduation_date?? '',
    educationLevel: request.educationLevel ?? '',
    diplomaNum: request.diplomaNum ?? '',
    major: request.major ?? '',
    date: new Date().toISOString().split('T')[0],
  };

  return (
    <div id="cert-modal-root" role="dialog" aria-modal="true" className="fixed inset-0 z-[9998]">
      {/* Dim Overlay - Native div with keyboard support */}
      <div
        className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Panel */}
      <div
        id="cert-modal-panel"
        className={`fixed inset-y-0 top-15 right-0 bg-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          width: isMobile ? "100%" : "calc(100vw - 300px)",
          zIndex: 9999,
        }}
      >
        {/* Modal Header: Accessible Close Button */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 shrink-0">
          <h2 className="font-bold text-gray-800 uppercase text-sm tracking-tight">
            Document Generator
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>
        {/* Top Bar — info only, no close button here */}
        <div id="cert-modal-topbar" className="flex items-center px-6 py-3 bg-[#4a120e] text-white shrink-0">
          <div>
            <p className="text-xs opacity-70 uppercase tracking-wide">Generating Certificate for</p>
            <p className="font-bold text-sm">
              {request.studentName}
              {request.certName ? ` — ${request.certName}` : ''}
              {!CERT_CONFIG[request.certName] && request.certName && (
                <span className="ml-2 text-yellow-300 text-xs font-normal">
                  (Defaulting to "{validDocType}")
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="fixed inset-0 w-full bg-white shadow-xl z-50">
          <div id="cert-modal-content" className="flex-1 overflow-auto h-full">
            <GenerateCertification initialData={initialData} onClose={handleClose} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateModal;