import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createDocumentRequest } from "../services/api"
import InputGroup from "../components/InputGroup.jsx";
import CheckboxItem from "../components/Checkbox.jsx";
import DropdownGroup from "../components/DropDown.jsx";
import MultiSelectDropdown from "../components/MultiSelection.jsx";
import LoadingOverlay from "../components/LoadingOverlay.jsx";
import ErrorToast from "../components/ErrorToast.jsx";
import { getTodayDate } from "../utils/helpers";
import qrCode from "../assets/qrcode.png";
import SubmitConfirmationModal from '../components/SubmitConfirmationModal.jsx';
import ClaimTicket from '../components/ClaimTicket.jsx';
import OfficeHoursNotice from '../components/OfficeHoursNotice.jsx';
import { useTheme } from '../context/ThemeContext';
import { useReferenceData } from '../context/ReferenceDataContext';
import { useMutation } from '@tanstack/react-query';

const STUDENT_ACCESS_IDS = [1, 3];

// parseRequirements is pure — no hooks needed here
const parseRequirements = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((item) => item.trim().replace(/,$/, ''))
      .filter(Boolean);
  }
  return [];
};

const RequestForm = ({ showProfileStep = false }) => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { 
    documentTypes, 
    certifications, 
    purposes, 
    docTypeName, 
    purposeName, 
    certName 
  } = useReferenceData();

  const [currentStep, setCurrentStep] = useState(1);
  const formRef = useRef(null);

  useEffect(() => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentStep]);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  // Populated from the create response on success — holds just the two
  // fields ClaimTicket needs. Not the whole DocumentRequest object: this
  // screen has nothing else to do with the rest of it, and keeping only
  // what's displayed avoids this state going stale/wrong if the request
  // is later updated elsewhere while this tab is still open.
  const [claimTicket, setClaimTicket] = useState(null);

  const availableDocs = useMemo(() => {
    return documentTypes.filter(doc => STUDENT_ACCESS_IDS.includes(doc.access_id));
  }, [documentTypes]);

  const availableCertifications = useMemo(() => {
    return certifications.filter(cert => STUDENT_ACCESS_IDS.includes(cert.access_id));
  }, [certifications]);

  const availablePurposes = purposes;

  const getDateDaysAgo = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    termsAgreed: false,
    firstName: '',
    middleName: '',
    surname: '',
    dob: '',
    address: '',
    contactNumber: '',
    documentsRequested: [],
    purposeOfRequest: "",
    certification: [],
    receiptNumber: "",
    dateOfPayment: "",
    documentCopies: {},
    certCopies: {},
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePreSubmit = (e) => {
    e.preventDefault();

    if (!(formData.receiptNumber || '').trim()) {
      setErrorMessage("Please enter the Official Receipt Number.");
      return;
    }

    if (!/^\d{7}$/.test((formData.receiptNumber || '').trim())) {
      setErrorMessage("Official Receipt Number must be exactly 7 digits.");
      return;
    }

    if (!formData.dateOfPayment) {
      setErrorMessage("Please select the date of payment.");
      return;
    }

    if (formData.dateOfPayment < getDateDaysAgo(7) || formData.dateOfPayment > getTodayDate()) {
      setErrorMessage("Date of payment must be within the last 7 days up to today.");
      return;
    }

    const hasInvalidDocCopy = formData.documentsRequested
      .filter((doc) => !doc.toLowerCase().includes("certif"))
      .some((doc) => {
      const copies = Number(formData.documentCopies[doc] || 1);
      return !Number.isInteger(copies) || copies < 1 || copies > 10;
    });

    if (hasInvalidDocCopy) {
      setErrorMessage("Number of copies must be between 1 and 10.");
      return;
    }

    setShowConfirmModal(true);
  };

  const handleCertCopyChange = (certName, value) => {
    setFormData((prev) => ({
      ...prev,
      certCopies: {
        ...prev.certCopies,
        [certName]: value,
      },
    }));
  };

  const handleDocCopyChange = (docName, value) => {
    setFormData((prev) => ({
      ...prev,
      documentCopies: {
        ...prev.documentCopies,
        [docName]: value
      }
    }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const hasProfileStep = showProfileStep;
  const finalStep = hasProfileStep ? 4 : 3;

  const nextStep = (e) => {
    e.preventDefault();

    if (currentStep === 1 && !formData.termsAgreed) {
      setErrorMessage("You must read and agree to the Terms & Conditions to proceed.");
      return;
    }

    if (hasProfileStep && currentStep === 2) {
      if (!(formData.firstName || '').trim()) {
        setErrorMessage("Please enter the first name.");
        return;
      }

      if (!(formData.middleName || '').trim()) {
        setErrorMessage("Please enter the middle name.");
        return;
      }

      if (!(formData.surname || '').trim()) {
        setErrorMessage("Please enter the surname.");
        return;
      }

      if (!formData.dob) {
        setErrorMessage("Please select the date of birth.");
        return;
      }

      if (!(formData.address || '').trim()) {
        setErrorMessage("Please enter the present/permanent mailing address.");
        return;
      }

      if (!(formData.contactNumber || '').trim()) {
        setErrorMessage("Please enter the contact number.");
        return;
      }
    }

    if (currentStep === (hasProfileStep ? 3 : 2) && formData.documentsRequested.length === 0) {
      setErrorMessage("Please select at least one document to proceed.");
      return;
    }

    if (currentStep === (hasProfileStep ? 3 : 2) && formData.purposeOfRequest.length === 0) {
      setErrorMessage("Please select a purpose for your request.");
      return;
    }

    if (currentStep === (hasProfileStep ? 3 : 2) && showCertificationDropdown && formData.certification.length === 0) {
      setErrorMessage("Please specify the certification type.");
      return;
    }

    if (currentStep < finalStep) setCurrentStep((s) => s + 1);
  };

  const prevStep = (e) => {
    e.preventDefault();
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const mutation = useMutation({
    mutationFn: createDocumentRequest,
    onSuccess: (response) => {
      // response.data is the full created DocumentRequest (see
      // DocumentRequestController::store) — uuid/claim_code are always
      // present since DocumentRequest::booted() generates both for
      // every new row, and neither is in $hidden.
      setClaimTicket({
        uuid: response?.data?.uuid ?? null,
        claimCode: response?.data?.claim_code ?? null,
      });
      setIsSubmitted(true);
    },
    onError: (error) => {
      console.error("Submission error:", error.response?.data || error);
      setErrorMessage(error.response?.data?.message || "Submission failed. Please check your data.");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const selectedPurpose = availablePurposes.find(
      p => p.purpose_name === formData.purposeOfRequest
    );
    // Fall back to scanning ReferenceData context if the live list didn't load
    const purposeId = selectedPurpose?.request_purpose_id
      ?? Object.keys({}).find(key => purposeName(key) === formData.purposeOfRequest);

    const certificates = formData.certification
      .map(name => ({
        certificate_type_id: availableCertifications.find(
          c => c.certificate_name === name
        )?.certificate_type_id,
        number_of_copies: parseInt(formData.certCopies[name]) || 1,
      }))
      .filter(c => c.certificate_type_id);

    const payload = {
      request_purpose_id: purposeId,
      or_number: formData.receiptNumber,
      receipt_date: formData.dateOfPayment,
      documents: formData.documentsRequested
        .filter(name => !name.toLowerCase().includes("certif"))
        .map(name => {
          const id = docByName[name]?.document_type_id
            ?? Object.keys({}).find(key => docTypeName(key) === name);
          return {
            document_type_id: id,
            number_of_copies: parseInt(formData.documentCopies[name]) || 1,
          };
        })
        .filter(doc => doc.document_type_id),
      certificates: certificates,
    };

    mutation.mutate(payload);
  };

  const isLoading = mutation.isPending;

  const handleConfirm = () => {
    setIsSubmitted(false);
    setCurrentStep(1);
    setFormData({
      termsAgreed: false,
      firstName: '',
      middleName: '',
      surname: '',
      dob: '',
      address: '',
      contactNumber: '',
      documentsRequested: [],
      purposeOfRequest: "",
      certification: [],
      receiptNumber: "",
      dateOfPayment: "",
      documentCopies: {},
      certCopies: {},
    });
    setErrorMessage("");
    mutation.reset();
  };

  const handleGoToDashboard = () => {
    if (window.location.pathname.startsWith('/staff')) {
      navigate('/staff/dashboard');
    } else if (window.location.pathname.startsWith('/alumni')) {
      navigate('/alumni/home');
    } else {
      navigate('/student/home');
    }
  };

  const handleGoToInbox = () => {
    if (window.location.pathname.startsWith('/staff')) {
      navigate('/staff/inbox');
    } else if (window.location.pathname.startsWith('/alumni')) {
      navigate('/alumni/inbox');
    } else {
      navigate('/student/inbox');
    }
  };

  const showCertificationDropdown = formData.documentsRequested.some((doc) => {
    const lower = doc.toLowerCase();
    return lower.includes("certif");
  });

  const stepProcess = hasProfileStep
    ? {
        1: "Terms & Conditions",
        2: "Student Profile",
        3: "Document Request",
        4: "Payment and Document Details",
      }
    : {
        1: "Terms & Conditions",
        2: "Document Request",
        3: "Payment and Document Details",
      };

  const purposeOptions = availablePurposes.length > 0
    ? availablePurposes.map(p => p.purpose_name)
    : [];

  const certificationOptions = availableCertifications.length > 0
    ? availableCertifications.map((c) => c.certificate_name)
    : [];

  const documentOptions = availableDocs.length > 0
    ? availableDocs.map(d => d.document_name)
    : [];

  const certificationLabel = formData.certification.join(', ');

  const docByName = useMemo(() => {
    return availableDocs.reduce((acc, doc) => {
      acc[doc.document_name] = {
        ...doc,
        requirementsParsed: parseRequirements(doc.document_requirements),
      };
      return acc;
    }, {});
  }, [availableDocs]);

  return (
    <>
    <div className="relative min-h-screen pb-20 z-20">
      <LoadingOverlay isVisible={isLoading} message="Submitting Request..." />
      {isSubmitted ? (
        <div className="max-w-4xl mx-auto">
          <div className="shadow-2xl border-t-4 border-pup-yellow flex flex-col items-center text-center px-6 py-12 md:px-10 lg:px-16 bg-[#660000]">
            {/* Green Check Icon */}
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 text-green-400/80 mb-6 shrink-0">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Title & Subtitle */}
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-wide">
              Request Submitted Successfully
            </h2>
            <p className="text-white/80 text-[10px] sm:text-base max-w-xl mx-auto mb-6 font-medium">
              Please be patient as we process your requested document. Thank you and keep safe always!
            </p>

            {/* Top Divider */}
            <div className="w-full max-w-4xl mx-auto border-t border-dashed border-white/15 my-6" />

            {/* Side-by-Side Grid Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mx-auto my-4 items-start text-left">
              {/* Left Column: Office Hours Notice */}
              <div className="flex flex-col gap-4 w-full">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#FFC72C] text-center md:text-left">
                  Processing Schedule & Hours
                </h3>
                <OfficeHoursNotice isDark={isDark} />
              </div>

              {/* Right Column: Claim Details & QR */}
              <div className="flex flex-col gap-4 w-full">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#FFC72C] text-center md:text-left">
                  Claim Ticket & Code
                </h3>

                {/* Claim Code Box */}
                <div className="w-full bg-[#181110] border border-white/5 rounded-xl p-5 text-center shadow-inner">
                  <span className="text-3xl font-black text-white tracking-[0.25em] font-mono select-all uppercase">
                    {claimTicket?.claimCode ? claimTicket.claimCode.split('').join(' ') : '— — — — — —'}
                  </span>
                </div>

                {/* Go to Inbox Button */}
                <div className="w-full">
                  <button
                    type="button"
                    onClick={handleGoToInbox}
                    className="flex items-center justify-center gap-2 px-8 py-2.5 rounded-lg font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer text-white bg-[#800000] hover:bg-[#6c0000] w-full max-w-[280px] mx-auto"
                  >
                    Go to Inbox
                  </button>
                </div>
              </div>
            </div>

            {/* QR Code Simple Note */}
            <p className="text-white/50 text-[12px] text-center leading-relaxed w-full max-w-xl mx-auto">
              Note: View/download your claim ticket QR code in your inbox or present the manual claim code when claiming.
            </p>
            
            {/* Bottom Divider */}
            <div className="w-full max-w-4xl mx-auto border-t border-dashed border-white/15 my-6" />

            {/* Bottom Navigation Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-xl mx-auto mt-6">
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full sm:w-1/2 py-3 px-6 rounded-lg font-bold text-sm border border-white/10 bg-[#3d0c0c] hover:bg-[#4c1212] text-white transition-all shadow-md active:scale-95 text-center cursor-pointer"
              >
                Create Another Request
              </button>
              <button
                type="button"
                onClick={handleGoToDashboard}
                className="w-full sm:w-1/2 py-3 px-8 rounded-lg font-bold text-sm bg-[#F8BF1E] hover:bg-[#e6b01b] text-pup-maroon transition-all shadow-md active:scale-95 text-center cursor-pointer"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div ref={formRef} className="max-w-5xl mx-auto -mt-2">
          <form
            className={`shadow-2xl border-t-4 border-pup-yellow h-225 lg:h-187.5 flex flex-col relative ${isDark ? 'bg-[#242526]' : 'bg-pup-dark-maroon'}`}
            onSubmit={handleSubmit}
            noValidate
          >
            {/* Step Indicators */}
            <div className="flex flex-col items-center pt-4 pb-4">
              <div className="flex space-x-3 mb-2">
                {Array.from({ length: finalStep }, (_, index) => index + 1).map((step) => (
                  <div
                    key={step}
                    className={`w-4 h-4 rounded-full border border-pup-yellow ${
                      step <= currentStep ? "bg-pup-yellow" : (isDark ? "bg-[#3a3b3c]" : "bg-white")
                    }`}
                  />
                ))}
              </div>
              <p className="text-pup-yellow font-bold text-sm tracking-wider">
                {currentStep} of {finalStep}
              </p>
              <h2 className="text-white text-xl font-semibold mt-2">
                {stepProcess[currentStep]}
              </h2>
            </div>

            <div className={`flex-1 px-4 sm:px-6 md:px-10 py-2 text-white `}>
              {/* STEP 1 */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-fadeIn text-[11px] text-justify lg:text-[14px]">
                  <p><strong>A.</strong> In compliance with the Data Privacy Act (DPA) of 2012, and its implementing rules 
                    and regulations (IRR), upon filling up this request through the system constitutes, I am hereby providing my 
                    consent and authorization to use my personal data for this request.
                  </p>

                  <p><strong>B.</strong> This request is only for ONSITE TRANSACTION with Official Receipt issued by the Cashier's Office</p>

                  <p><strong>C.</strong> All CERTIFICATIONS are processed within three (3) working days, while TOR is within 12 working days.</p>

                  <p>
                    <strong>D.</strong> REMINDERS:<br />
                    • Requests must be submitted within one (1) week after receiving the receipt. Requests exceeding this period may be considered invalid.<br />
                    • For TOR (First Copy): Bring one (1) documentary stamp, two (2) colored 2x2 ID pictures in academic gown, valid PUP ID, and dummy diploma. In case of loss, an Affidavit of Loss is required.<br />
                    • For TOR (Second Copy): Bring one (1) violet documentary stamp and two (2) colored 2x2 ID pictures in formal attire with white background.<br />
                    • For Honorable Dismissal and other Certifications: Bring one (1) violet documentary stamp (or two (2) brown documentary stamps) per requested document.
                  </p>

                  <p>
                    <strong>E.</strong> In compliance with R.A. No. 10173 (Data Privacy Act of 2012), representatives must present a signed Authorization Letter (for immediate family) or Special Power of Attorney (for non-family), along with valid IDs of both the student and the representative upon claiming documents.
                  </p>

                  <p><strong>F.</strong> All documents unclaimed within 90 days on the date of request will be shredded automatically.</p>

                  <div className={`mt-2 pt-4 border-t text-l ${isDark ? 'border-white/20' : 'border-white/10'}`}>
                    <CheckboxItem
                      name="termsAgreed"
                      checked={formData.termsAgreed}
                      onChange={handleCheckboxChange}
                      text="I have read, understood, and agree to the Terms & Conditions stated above."
                    />
                  </div>
                  </div>
                )}             
          
              {/* STEP 2: Student Profile */}
              {hasProfileStep && currentStep === 2 && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InputGroup 
                      name="firstName" 
                      label="First Name" 
                      value={formData.firstName} 
                      onChange={handleInputChange} 
                      placeholder="e.g., Juan"
                    />

                    <InputGroup 
                      name="middleName" 
                      label="Middle Name" 
                      value={formData.middleName} 
                      onChange={handleInputChange} 
                      placeholder="e.g., Miguel"
                    />

                    <InputGroup 
                      name="surname" 
                      label="Surname" 
                      value={formData.surname} 
                      onChange={handleInputChange} 
                      placeholder="e.g., Dela Cruz"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputGroup 
                      label="Date of Birth"
                      type="date" 
                      name="dob"
                      value={formData.dob}
                      onChange={handleInputChange}
                      className="w-full p-2 rounded text-black bg-white focus:outline-none focus:ring-2 focus:ring-[#FFC72C]" 
                    />

                    <InputGroup 
                      name="contactNumber" 
                      label="Contact Number" 
                      placeholder="09XXXXXXXXX" 
                      value={formData.contactNumber}
                      onChange={handleInputChange} 
                    />
                  </div>

                  <InputGroup 
                    name="address" 
                    label="Present/Permanent Mailing Address" 
                    value={formData.address} 
                    onChange={handleInputChange} 
                    placeholder="House No., Street, Barangay, City/Municipality"
                  />
                </div>
              )}

              {/* STEP 3: Documents Requested */}
              {currentStep === (hasProfileStep ? 3 : 2) && (
                <div className="space-y-6 animate-fadeIn">
                  <MultiSelectDropdown
                    name="documentsRequested"
                    label="Documents Requested"
                    required
                    options={documentOptions}
                    selectedValues={formData.documentsRequested}
                    onChange={handleInputChange}
                  />

                  {showCertificationDropdown && (
                    <MultiSelectDropdown
                      name="certification"
                      label="For Certification, please specify"
                      selectedValues={formData.certification}
                      onChange={handleInputChange}
                      options={certificationOptions}
                    />
                  )}

                  <DropdownGroup
                    name="purposeOfRequest"
                    label="Purpose of Request"
                    value={formData.purposeOfRequest}
                    onChange={handleInputChange}
                    required
                    options={purposeOptions}
                  />
                </div>
              )}

              {/* STEP 4: Payment & Copies */}
              {currentStep === (hasProfileStep ? 4 : 3) && (
                <div className="space-y-6 animate-fadeIn -mt-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputGroup
                      name="receiptNumber"
                      label="Official Receipt Number"
                      value={formData.receiptNumber}
                      onChange={handleInputChange}
                      placeholder='XXXXXXX'
                      required
                      voiceEnabled
                    />
                    <InputGroup
                      name="dateOfPayment"
                      label="Date of Payment"
                      type="date"
                      value={formData.dateOfPayment}
                      onChange={handleInputChange}
                      min={getDateDaysAgo(7)}
                      max={getTodayDate()}
                      required
                      voiceEnabled={false}
                    />
                  </div>
                  <div className={`p-4 rounded-lg border -mb-1 ${isDark ? 'bg-[#3a3b3c] border-[#4e4f50]' : 'bg-white/10 border-white/20'}`}>
                    <h3 className="text-[#eebc48] font-bold mb-3 uppercase text-sm tracking-wide">
                      Number of copies per document
                    </h3>
                    <div className="space-y-3 max-h-23 overflow-y-auto pr-2 custom-scrollbar">
                      {formData.documentsRequested.filter((doc) => !doc.toLowerCase().includes("certif")).map((doc, index) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                           <label className="text-white text-sm flex-1">
                            {doc}
                            </label>
                           <div className="w-24 ">
                              <input
                                type="number"
                                min="1"
                                max="10"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                className={`w-full p-2 text-sm rounded-lg 
                                  outline-none transition-all duration-200
                                  focus:border-[#FFC72C] 
                                  focus:ring-2 
                                  focus:ring-[#FFC72C]/30
                                  appearance-auto ${isDark ? 'bg-[#1a1b1e] border border-[#3e4042] text-white focus:bg-[#1a1b1e]' : 'bg-gray-50 border border-gray-300 text-gray-700 focus:bg-white focus:text-black'}`}        
                                value={formData.documentCopies[doc] === undefined ? '' : formData.documentCopies[doc]}
                                onChange={e => {
                                  const val = e.target.value;
                                  handleDocCopyChange(doc, val === '' ? '' : Math.max(1, Math.min(10, Number(val))));
                                }}
                                onBlur={e => {
                                  if (e.target.value === '') handleDocCopyChange(doc, 1);
                                }}
                              />
                           </div>
                        </div>
                      ))}
                      {showCertificationDropdown && formData.certification.length > 0 && 
                        formData.certification.map((certName, index) => (
                          <div key={index} className="flex items-center justify-between gap-4">
                            <label className="text-white text-sm flex-1">CERTIFICATION (<span className="text-[#FFC72C]">{certName}</span>)</label>
                            <div className="w-24">
                              <input
                                type="number"
                                min="1"
                                max="10"
                                className={`w-full p-2 text-sm rounded-lg outline-none transition-all duration-200 focus:border-[#FFC72C] focus:ring-2 focus:ring-[#FFC72C]/30 ${isDark ? 'bg-[#1a1b1e] border border-[#3e4042] text-white focus:bg-[#1a1b1e]' : 'bg-gray-50 border border-gray-300 text-gray-700 focus:bg-white focus:text-black'}`}
                                value={formData.certCopies[certName] === undefined ? '' : formData.certCopies[certName]}
                                onChange={e => {
                                  const val = e.target.value;
                                  handleCertCopyChange(certName, val === '' ? '' : Math.max(1, Math.min(10, Number(val))));
                                }}
                                onBlur={e => {
                                  if (e.target.value === '') handleCertCopyChange(certName, 1);
                                }}
                              />
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={`flex flex-col gap-3 max-h-50 md:max-h-105 lg:max-h-70 overflow-y-auto overflow-x-hidden pr-1 custom-scrollbar p-2 rounded-lg border ${isDark ? 'bg-[#3a3b3c] border-[#4e4f50]' : 'bg-white/10 border-white/20'}`}>
                    {formData.documentsRequested.map((doc, index) => {
                      const docData = docByName[doc];
                      const requirements = docData?.requirementsParsed ?? [];

                      return (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border px-4 py-3 ${isDark ? 'bg-[#1a1b1e] border-[#3e4042]' : 'bg-white/10 border-white/20'}`}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-0.75 h-4 bg-[#FFC72C] rounded-full shrink-0" />
                            <h3 className="text-[#FFC72C] font-bold text-xs uppercase tracking-wide">
                              {doc}
                            </h3>
                          </div>

                          <ul className="flex flex-col gap-1.5 pl-1">
                            {requirements.length > 0 ? (
                              requirements.map((req, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-white/80 leading-relaxed min-w-0">
                                  <span className="w-1.5 h-1.5 bg-[#FFC72C] rounded-full shrink-0 mt-1" />
                                  <span className="flex-1 min-w-0 whitespace-normal break-normal max-w-full">
                                    {req}
                                  </span>
                                </li>
                              ))
                            ) : (
                              <li className="text-xs text-white/35 italic">No requirements available</li>
                            )}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                    <div className="-mt-9 flex justify-center items-start">
                      <div className=" p-4 md:mt-4 lg:mt-5 w-full max-w-sm max-h-lg flex flex-col items-center">
                        <p className="lg:mt-2 text-[10px] text-white/70 text-center leading-relaxed">
                          <strong>REMINDER</strong>: Your feedback is important to us. Kindly take a moment to share your experience.
                        </p>

                        <h3 className="text-[#FFC72C]  font-bold text-[10px] md:text-sm lg:text-sm uppercase tracking-wide md:mb-3 text-center">
                          Scan QR Code
                        </h3>

                        <img
                          src={qrCode}
                          alt="QR Code"
                          className="w-20 h-20 lg:w-40 lg:h-40 object-contain"
                        />

                        <a
                          href="https://pupsinta.freshservice.com/support/home"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="lg:mt-2 lg:text-sm text-[10px] text-[#FFC72C] underline text-center whitespace-normal break-normal hover:text-yellow-400 transition"
                        >
                          https://pupsinta.freshservice.com/support/home
                        </a>

                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="mb-8 px-8 flex justify-between items-center mt-auto">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className={`font-bold py-2 px-6 rounded shadow-md w-32 transition-colors ${isDark ? 'bg-[#3a3b3c] hover:bg-[#4e4f50] text-[#e4e6eb] border border-[#4e4f50]' : 'bg-pup-yellow hover:bg-[#eeb61b] text-pup-maroon'}`}
                >
                  Back
                </button>
              )}

                <button
                  type="button"
                  onClick={currentStep < finalStep ? nextStep : handlePreSubmit}
                className={`font-bold py-2 px-6 rounded shadow-md w-32 ml-auto transition-colors ${isDark ? 'bg-[#3a3b3c] hover:bg-[#4e4f50] text-[#e4e6eb] border border-[#4e4f50]' : 'bg-pup-yellow hover:bg-[#eeb61b] text-pup-maroon'}`}
              >
                  {currentStep < finalStep ? "Next" : "Submit"}
              </button>

            </div>
          </form>
        </div>
      )}
      <SubmitConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => {
          setShowConfirmModal(false); 
          handleSubmit({ preventDefault: () => {} });
        }}
        title="Submit Confirmation"
        message="Are you sure you want to submit your request?"
      />
    </div>
      <ErrorToast 
        message={errorMessage} 
        onClose={() => setErrorMessage("")} 
      />
    </>
  );
};

export default RequestForm;