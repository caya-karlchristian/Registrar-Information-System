import React, { useState, useEffect } from 'react';
import InputGroup from '../components/InputGroup.jsx';
import CheckboxItem from '../components/Checkbox.jsx';
import DropdownGroup from '../components/DropDown.jsx';
import MultiSelectDropdown from '../components/MultiSelection.jsx';
import ErrorToast from "../components/ErrorToast.jsx";
import ImageUploader from "../components/ImageUploader.jsx";
import axios from "../services/api.js";
import { PURPOSE_MAP, CERTIFICATION_MAP, DOC_TYPE_MAP } from '../utils/constants';
import LoadingOverlay from "../components/LoadingOverlay.jsx";
import SubmitConfirmationModal from '../components/SubmitConfirmationModal.jsx';
import { getTodayDate } from "../utils/helpers";
import qrCode from "../assets/qrcode.png";

const AlumniRequestForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [availableDocs, setAvailableDocs] = useState([]);
  const [availableCertifications, setAvailableCertifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const getDateDaysAgo = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  };
  

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const docsRes = await axios.get("/document-types");
        setAvailableDocs(docsRes.data);
      } catch (err) {
        console.warn("Failed to load document types.");
      }

      try {
        const certRes = await axios.get("/certifications");
        setAvailableCertifications(certRes.data);
      } catch (err) {
        console.warn("Certification types API unavailable, using constants.");
      }
    };
    loadOptions();
  }, []);

  const [formData, setFormData] = useState({
    termsAgreed: false,
    documentsRequested: [],
    purposeOfRequest: '',
    certification: [],
    noRequests: false,
    doneRequest: false,
    receiptNumber: '',
    dateOfPayment: '',
    documentCopies: {},
    certCopies: {},
    torImage: null,
  });

  // Helper to update text inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Helper to update checkboxes
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => {
      if (name === "noRequests") {
        return {
          ...prev,
          noRequests: checked,
          doneRequest: checked ? false : prev.doneRequest,
        };
      }

      if (name === "doneRequest") {
        return {
          ...prev,
          doneRequest: checked,
          noRequests: checked ? false : prev.noRequests,
        };
      }

      return { ...prev, [name]: checked };
    });
  };

  const handleImageChange = (name, file) => {
    setFormData(prev => ({ ...prev, [name]: file }));
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

    const hasInvalidDocCopy = formData.documentsRequested.some((doc) => {
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

  // Function to go to next step
  const nextStep = (e) => {
    e.preventDefault();

    const finalStep = hasTOR ? 4 : 3;

    if (currentStep === 1 && !formData.termsAgreed) {
      setErrorMessage("You must read and agree to the Terms & Conditions to proceed.");
      return;
    }

    if (currentStep === 2 && formData.documentsRequested.length === 0) {
      setErrorMessage("Please select at least one document to proceed.");
      return;
    }

    if (currentStep === 2 && formData.purposeOfRequest.length === 0) {
      setErrorMessage("Please select a purpose for your request.");
      return;
    }

    if (currentStep === 2 && showCertificationDropdown && formData.certification.length === 0) {
      setErrorMessage("Please specify the certification type.");
      return;
    }

    if (currentStep === 3 && hasTOR && !formData.noRequests && !formData.doneRequest) {
      setErrorMessage("Please select at least one TOR option to proceed.");
      return;
    }

    if (currentStep === 3 && hasTOR && !formData.torImage) {
      setErrorMessage("Please upload your 1x1 size photo for TOR request.");
      return;
    }

    if (currentStep < finalStep) setCurrentStep(currentStep + 1);
  };

  const prevStep = (e) => {
    e.preventDefault(); 
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const purposeId = Object.keys(PURPOSE_MAP).find(
        key => PURPOSE_MAP[key] === formData.purposeOfRequest
      );

      // Map all selected certification names to their IDs
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
        documents: formData.documentsRequested.map(name => { const dbDoc = availableDocs.find(d => d.document_name === name); const id = dbDoc?.document_type_id ?? Object.keys(DOC_TYPE_MAP).find(key => DOC_TYPE_MAP[key] === name); return { document_type_id: id, number_of_copies: parseInt(formData.documentCopies[name]) || 1 }; }).filter(doc => doc.document_type_id),
        certificates: certificates,
      };

      const response = await axios.post("/document-requests", payload);

      console.log("Submission successful:", response.data);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Submission error:", error.response?.data || error);
      setErrorMessage(error.response?.data?.message || "Submission failed. Please check your data.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleConfirm = () => {
    setIsSubmitted(false);
    setCurrentStep(1);
    setFormData({
      termsAgreed: false,
      documentsRequested: [],
      purposeOfRequest: "",
      certification: [],
      noRequests: false,
      doneRequest: false,
      receiptNumber: "",
      dateOfPayment: "",
      documentCopies: {},
      certCopies: {},
      torImage: null,
    });
    setErrorMessage("");
    setIsLoading(false);
  };

  const hasTOR = formData.documentsRequested.some(doc =>
    doc.toLowerCase().includes("tor") || doc.toLowerCase().includes("transcript")
  );

  const showCertificationDropdown = formData.documentsRequested.some((doc) => {
    const lower = doc.toLowerCase();
    return (
      lower.includes("certif") 
    );
  });

  const certificationOptions = availableCertifications.length > 0
      ? availableCertifications.map((c) => c.certificate_name)
      : Object.values(CERTIFICATION_MAP);

  const purposeOptions = Object.values(PURPOSE_MAP);


  const documentOptions = availableDocs.length > 0
    ? availableDocs.map(d => d.document_name)
    : Object.values(DOC_TYPE_MAP);

  const stepLabels = hasTOR
    ? [
        "Terms & Conditions",
        "Alumni Request",
        "TOR Requirements",
        "Payment and Document Details",
      ]
    : [
        "Terms & Conditions",
        "Alumni Request",
        "Payment and Document Details",
      ];
  const totalSteps = stepLabels.length;

  const certificationLabel = formData.certification.join(', ');

  return (
    <div className="min-h-screen pb-20 ">
        <LoadingOverlay isVisible={isLoading} message="Submitting Request..." />
    {isSubmitted ? (
      <div className="max-w-5xl mx-auto">
        <div className="bg-pup-dark-maroon shadow-2xl border-t-4 border-pup-yellow h-225 lg:h-187.5 items-center justify-center text-center px-10 flex flex-col relative ">
          <p className="mb-6 text-4xl text-center font-bold text-white mt-35">
            Please be patient as we process your requested document. 
          </p>
          <p className="mb-6 text-4xl text-center font-bold text-white mt-2">
            Thank you and keep safe always.
          </p>
          <button 
            onClick={handleConfirm}
            className="bg-pup-yellow mt-70 hover:bg-[#eeb61b] text-pup-maroon w-32 font-bold py-2 px-6 rounded shadow-md transition-transform active:scale-95"
          >
            Confirm 
          </button>
        </div>
      </div>

    ) : (
      <div className="max-w-5xl mx-auto">
        <form 
        onSubmit={handleSubmit}
        className="bg-pup-dark-maroon shadow-2xl border-t-4 border-pup-yellow h-225 lg:h-187.5 flex flex-col relative"
        noValidate>
          
          <div className="flex flex-col items-center pt-8 pb-4">
            <div className="flex space-x-3 mb-2">
              {Array.from({ length: totalSteps }, (_, idx) => idx + 1).map((step) => (
                <div 
                  key={step}
                  className={`w-4 h-4 rounded-full border border-pup-yellow ${
                    step <= currentStep ? 'bg-pup-yellow' : 'bg-white'
                  }`}
                />
              ))}
            </div>
            <p className="text-pup-yellow font-bold text-sm tracking-wider">
              {currentStep} of {totalSteps}
            </p>

          <h2 className="text-white text-xl font-semibold mt-2">
            {stepLabels[currentStep - 1]}
          </h2>

          </div>

          <div className="flex-1 px-10 md:px-20 py-4 text-white">
            
            {/* STEP 1: TERMS & CONDITIONS */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fadeIn text-[11px] text-justify lg:text-[14px]">
                  <p><strong>A.</strong> In compliance with the Data Privacy Act (DPA) of 2012, and its implementing rules 
                    and regulations (IRR), upon filling up this Google Form, I am hereby providing my 
                    consent and authorization to use my personal data for this request.
                  </p>

                  <p><strong>B.</strong> This request is only for ONSITE TRANSACTION with Official Receipt issued by the Cashier's Office</p>

                  <p><strong>C.</strong> All CERTIFICATIONS are processed within three (3) working days, while TOR is within 12 working days.</p>

                  <p><strong>D.</strong> REMINDERS: For TOR (first copy), please bring one documentary stamp, 
                    two colored 2x2 picture in academic grown,  PUP ID, and dummy diploma 
                    (in case of loss, please bring an affidavit of loss). 
                    For TOR (second copy), please bring one documentary stamp (violet), 
                    two colored 2x2 picture in formal attire with white background.
                    For Honorable Dismissal and other certifications, please bring one 
                    violet documentary stamp (or two brown documentary stamp) per requested document.</p>

                  <p><strong>E.</strong> In compliance with R.A. No. 10173 (Data Privacy Act of 2012), representative must submit 
                    a signed AUTHORIZATION LETTER if claimant is immediate family member or SPECIAL POWER OF ATTORNEY 
                    if claimant is other than immediate family member with original valid ID of both owner/student and 
                    representative upon claiming the requested documents.</p>

                  <p><strong>F.</strong>  All documents unclaimed within 90 days on the date of request will be shredded automatically.</p>

                  <div className="mt-2 pt-4 border-t text-l border-white/10">
                    <CheckboxItem
                      name="termsAgreed"
                      checked={formData.termsAgreed}
                      onChange={handleCheckboxChange}
                      text="I have read, understood, and agree to the Terms & Conditions stated above."
                    />
                  </div>
                  </div>
                )}
            
            {currentStep === 2 && (
              <div className="space-y-6 animate-fadeIn ">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-6 w-full mt-10">
                  <MultiSelectDropdown 
                    name="documentsRequested"
                    label="Documents Requested (You may select multiple)"
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
              </div>
            )}

            {currentStep === 3 && hasTOR && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 gap-6 w-full mt-10">
                  <div className="space-y-3 p-4 ">
                    <p className="text-sm text-justify lg:text-[15px] ">
                      For TOR request for further studies, please secure an HONORABLE DISMISSAL first.
                      Once processed and submitted back to the University, you may request for TOR with copy for remarks.
                    </p>
                    <CheckboxItem
                      text="No Request Yet"
                      name="noRequests"
                      checked={formData.noRequests}
                      onChange={handleCheckboxChange}
                    />
                    <CheckboxItem
                      text="Done Honorable Dismissal Request"
                      name="doneRequest"
                      checked={formData.doneRequest}
                      onChange={handleCheckboxChange}
                    />
                    <div className="mt-4 pt-4 bg-white/10 p-4 rounded-lg border">
                      <ImageUploader
                        label="1x1 Size Photo (Required for TOR)"
                        name="torImage"
                        required={true}
                        value={formData.torImage}
                        onChange={handleImageChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
    
            {/* STEP 6: SUBMIT */}
            {currentStep === (hasTOR ? 4 : 3) && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full -mt-6">
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
                    type="date"
                    label="Date reflected on the Official Receipt"
                    value={formData.dateOfPayment}
                    onChange={handleInputChange}
                    placeholder='e.g 01/01/2024'
                    min={getDateDaysAgo(7)}
                    max={getTodayDate()}
                    required
                  />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-1 w-full -mt-2">
                  <div className="bg-white/10 p-4 rounded-lg border">
                    <h3 className="text-pup-yellow font-bold mb-3 uppercase text-sm tracking-wide">
                      Number of copies per document
                    </h3>
                    <div className="space-y-3 max-h-23 overflow-y-auto pr-2 custom-scrollbar">
                      {formData.documentsRequested.length > 0 ? (
                        formData.documentsRequested.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between gap-2">
                           <label className="text-white text-sm flex-1">
                            {doc}
                              {doc.toLowerCase().includes("certif") && certificationLabel && (
                                <span className="text-[#eebc48] font-semibold ml-1">
                                  — {certificationLabel}
                                </span>
                              )}
                            </label>
                              <div className="w-24">
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  className="w-full p-2 bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg 
                                  outline-none transition-all duration-200
                                  focus:bg-white 
                                  focus:border-[#FFC72C] 
                                  focus:ring-2 
                                  focus:ring-[#FFC72C]/30 
                                  focus:text-black"    
                                  value={formData.documentCopies[doc] || 1}
                                  onChange={(e) => handleDocCopyChange(doc, e.target.value)}
                                />
                              </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-300 text-sm italic">No documents selected.</p>
                      )}
                    </div>
                  </div>
                  {showCertificationDropdown && formData.certification.length > 0 && (
                    <div className="border-t border-white/20 mt-2 pt-2">
                      <p className="text-pup-yellow text-xs font-bold uppercase tracking-wide mb-2">
                        Copies per certification type
                      </p>
                      {formData.certification.map((certName, index) => (
                        <div key={index} className="flex items-center justify-between gap-2 mt-2">
                          <label className="text-white text-sm flex-1">{certName}</label>
                          <div className="w-24">
                            <input
                              type="number"
                              min="1"
                              max="10"
                              className="w-full p-2 bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg outline-none transition-all duration-200 focus:bg-white focus:border-[#FFC72C] focus:ring-2 focus:ring-[#FFC72C]/30 focus:text-black"
                              value={formData.certCopies[certName] || 1}
                              onChange={e => handleCertCopyChange(certName, e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-3 max-h-50 md:max-h-105 lg:max-h-70 overflow-y-auto overflow-x-hidden pr-1 custom-scrollbar -mt-2">
                  {formData.documentsRequested.map((doc, index) => {

                    const docData = availableDocs.find((d) => d.document_name === doc);
                    const requirements = docData?.document_requirements
                      ? (Array.isArray(docData.document_requirements)
                          ? docData.document_requirements
                          : docData.document_requirements.split(',').map(r => r.trim()).filter(Boolean))
                      : [];

                    return (
                      <div
                        key={index}
                        className="bg-white/10 p-4 rounded-lg border  px-4 py-3"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-0.75 h-4 bg-[#FFC72C] rounded-full shrink-0" />
                          <h3 className="text-[#FFC72C] font-bold text-xs uppercase tracking-wide">
                            {doc}
                            {doc.toLowerCase().includes("certif") && certificationLabel && (
                              <span className="text-white/60 font-normal ml-1 normal-case tracking-normal">
                                — {certificationLabel}
                              </span>
                            )}
                          </h3>
                        </div>

                        <ul className="flex flex-col gap-1.5 pl-1">
                          {requirements.length > 0 ? (
                            requirements.map((req, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-white/80 leading-relaxed min-w-0">
                                <span className="w-1.5 h-1.5 bg-[#FFC72C] rounded-full shrink-0 mt-1" />

                                <span className="wrap-break-word whitespace-normal">
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
                        className="lg:mt-2 lg:text-sm text-[10px] text-[#FFC72C] underline text-center wrap-break-word hover:text-yellow-400 transition"
                      >
                        https://pupsinta.freshservice.com/support/home
                      </a>

                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          <div className="mb-8 px-8 flex flex-col items-center mt-auto space-y-2">
            <div className="flex justify-between items-center w-full">
              <div className="w-32">
                {currentStep > 1 && (
                  <button
                    onClick={prevStep}
                    type="button"
                    className="bg-pup-yellow hover:bg-[#eeb61b] text-pup-maroon font-bold py-2 px-6 rounded shadow-md transition-transform active:scale-95 w-full"
                  >
                    Back
                  </button>
                )}
              </div>

              <div className="w-32">
                <button
                  type="button"
                  onClick={currentStep < totalSteps ? nextStep : handlePreSubmit}
                  className="font-bold py-2 px-6 rounded shadow-md w-full ml-auto bg-pup-yellow hover:bg-[#eeb61b] text-pup-maroon"
                >
                  {currentStep < totalSteps ? "Next" : "Submit"}
                </button>
              </div>
            </div>
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
    <ErrorToast 
    message={errorMessage} 
    onClose={() => setErrorMessage("")} 
  />
    </div>
  );
};


export default AlumniRequestForm;