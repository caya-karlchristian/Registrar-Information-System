import React, { useEffect, useState } from 'react';
import GenerateCertification from '../layouts/GenerateCertificate.jsx';
import { CERT_CONFIG } from '../utils/Certification.jsx';
import LoadingOverlay from './LoadingOverlay.jsx';

const CertificateModal = ({ request, onClose, onCertificatePrinted }) => {
  const [visible, setVisible] = useState(false);
  const [opening, setOpening] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    const openingTimer = setTimeout(() => setOpening(false), 600);
    return () => {
      clearTimeout(t);
      clearTimeout(openingTimer);
    };
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
    requestId: request.id,
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
    <div id="cert-modal-root" role="dialog" aria-modal="true" className="fixed inset-0 z-9998 mb-2">
      {/* Dim Overlay - Native div with keyboard support */}
      <div
        id="cert-modal-overlay"
        className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Panel */}
      <div
        id="cert-modal-panel"
        className={`fixed inset-y-0 top-0 md:top-15 right-0 bg-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          width: isMobile ? "100%" : "min(1200px, calc(100vw - 280px))",
          zIndex: 9999,
        }}
      >
        <div id="cert-modal-content" className="flex-1 overflow-auto h-full bg-white">
          <GenerateCertification
            initialData={initialData}
            onClose={handleClose}
            onCertificatePrinted={onCertificatePrinted}
            onLoadingChange={setEditLoading}
          />
        </div>
      </div>

      <LoadingOverlay
        isVisible={opening || editLoading}
        message= "Loading Certificate..." 
      />
    </div>
  );
};

export default CertificateModal;