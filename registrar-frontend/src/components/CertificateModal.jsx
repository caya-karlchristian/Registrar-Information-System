import React, { useEffect, useState } from 'react';
import GenerateCertification from '../layouts/GenerateCertificate.jsx';
import { CERT_CONFIG } from '../utils/Certification.jsx';
import LoadingOverlay from './LoadingOverlay.jsx';

const CertificateModal = ({ request, onClose, onCertificatePrinted }) => {
  const [visible, setVisible] = useState(false);
  const [opening, setOpening] = useState(true);
  const [editLoading, setEditLoading] = useState(false);

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

  const certNames = (request.certificateNames ?? []).filter(n => CERT_CONFIG[n]);
  const defaultCert = certNames.length > 0 ? certNames[0] : Object.keys(CERT_CONFIG)[0];
  const [selectedCert, setSelectedCert] = useState(defaultCert);

  if (!visible) return null;

  const initialData = {
    requestId: request.id,
    docType: selectedCert,
    certificateNames: certNames,
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
        className={`fixed top-0 bottom-0 left-0 right-0 md:top-15 lg:left-72 bg-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ zIndex: 9999 }}
      >
        {certNames.length > 1 && (
          <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-gray-100 bg-gray-50 flex-wrap">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Generate:</span>
            {certNames.map(name => (
              <button
                key={name}
                onClick={() => setSelectedCert(name)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                  selectedCert === name
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        <div id="cert-modal-content" className="flex-1 overflow-auto h-full bg-white">
          <GenerateCertification
            key={selectedCert}
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