import React, { useEffect, useState } from 'react';
import GenerateCertification from '../layouts/GenerateCertificate.jsx';
import { CERT_CONFIG } from '../utils/Certification.jsx';

const CertificateModal = ({ request, onClose }) => {
  const [visible, setVisible] = useState(false);

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
    <div id="cert-modal-root">
      {/* Dim overlay */}
      <div
        id="cert-modal-overlay"
        className="fixed inset-0 bg-black/30 transition-opacity duration-300"
        style={{ zIndex: 9998, opacity: visible ? 1 : 0 }}
      />

      {/* Slide-in panel */}
      <div
        id="cert-modal-panel"
        className="fixed top-0 right-0 h-full bg-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out"
        style={{
          zIndex: 9999,
          width: 'calc(100vw - 300px)',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
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

        {/* GenerateCertification — back button lives inside here */}
        <div id="cert-modal-content" className="flex-1 overflow-auto">
          <GenerateCertification initialData={initialData} onClose={handleClose} />
        </div>
      </div>
    </div>
  );
};

export default CertificateModal;