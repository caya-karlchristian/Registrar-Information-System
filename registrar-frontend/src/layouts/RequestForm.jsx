import React, { useState, useRef, useEffect} from "react";
import axios from "../services/api"
import InputGroup from "../components/InputGroup.jsx";
import CheckboxItem from "../components/Checkbox.jsx";
import DropdownGroup from "../components/DropDown.jsx";
import MultiSelectDropdown from "../components/MultiSelection.jsx";
import LoadingOverlay from "../components/LoadingOverlay.jsx";
import ErrorToast from "../components/ErrorToast.jsx";
import { PURPOSE_MAP, CERTIFICATION_MAP, DOC_TYPE_MAP } from '../utils/constants';

const RequestForm = () => {
  const formRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [availableDocs, setAvailableDocs] = useState([]);
  const [availableCertifications, setAvailableCertifications] = useState([]);

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
    purposeOfRequest: "",
    certification: "",
    receiptNumber: "",
    dateOfPayment: "",
    documentCopies: {},
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  const nextStep = (e) => {
    e.preventDefault();

    if (currentStep === 1 && !formData.termsAgreed) {
      setErrorMessage("You must read and agree to the Terms & Conditions to proceed.");
      return;
    }

    if (formRef.current && !formRef.current.checkValidity()) {
      formRef.current.reportValidity();
      return;
    }

    if (currentStep === 3) {
      const initialCopies = { ...formData.documentCopies };
      formData.documentsRequested.forEach(doc => {
        if (!initialCopies[doc]) {
          initialCopies[doc] = 1;
        }
      });
      setFormData(prev => ({ ...prev, documentCopies: initialCopies }));
    }

    if (currentStep < 3) setCurrentStep((s) => s + 1);
  };

  const prevStep = (e) => {
    e.preventDefault();
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    const purposeId = Object.keys(PURPOSE_MAP).find(
      key => PURPOSE_MAP[key] === formData.purposeOfRequest
    );

    const selectedDocIds = formData.documentsRequested.map(name => {
      const dbFound = availableDocs.find(d => d.document_name === name)?.document_type_id;
      if (dbFound) return dbFound;

      return Object.keys(DOC_TYPE_MAP).find(key => DOC_TYPE_MAP[key] === name);
    }).filter(Boolean);

    const certId = availableCertifications.find(c => c.cert_name === formData.certification)?.certification_type_id
            ?? CERTIFICATION_MAP[formData.certification] 
            ?? null;
    // 3. Prepare Payload (Matches your Laravel store validation)
    const payload = {
      request_purpose_id: purposeId,
      or_number: formData.receiptNumber,
      receipt_date: formData.dateOfPayment,
      document_type_ids: selectedDocIds,
      cert_type_id: certId,
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

  const handleConfirm = () => window.location.reload();

  /* ---------------- CERTIFICATION VISIBILITY ---------------- */

  const certificationDocuments = new Set([
    "Certificate of Good Moral Character",
    "Certification, Authentication, Verification (CAV) / APOSTILE",
    "Authentication/Certified True Copy - Local",
    "CAV - CHED",
    "CAV - WES/CES",
  ]);

  const showCertificationDropdown = formData.documentsRequested.some((doc) =>
    certificationDocuments.has(doc)
  );

  const stepProcess = {
    1: "Terms & Conditions",
    2: "Student Information",
    3: "Student Request",
    4: "Payment Details",
  };
  const purposeOptions = Object.values(PURPOSE_MAP);

  const certificationOptions = availableCertifications.length > 0
  ? availableCertifications.map(c => c.cert_name)
  : Object.values(CERTIFICATION_MAP); 

  const documentOptions = availableDocs.length > 0
    ? availableDocs.map(d => d.document_name)
    : Object.values(DOC_TYPE_MAP); 

  return (
    <div className="relative min-h-screen pb-20 z-20">
      <LoadingOverlay isVisible={isLoading} message="Submitting Request..." />
      {isSubmitted ? (
        <div className="max-w-4xl mx-auto ">
          <div className="bg-pup-dark-maroon shadow-2xl border-t-4 border-pup-yellow h-[900px] lg:h-[750px] flex flex-col items-center justify-center text-center px-10">
            <p className="mb-6 text-4xl font-bold text-white">
              Please be patient as we process your requested document.
            </p>
            <p className="mb-6 text-4xl font-bold text-white">
              Thank you and keep safe always.
            </p>
            <button
              onClick={handleConfirm}
              className="bg-pup-yellow hover:bg-[#eeb61b] text-pup-maroon w-32 font-bold py-2 px-6 rounded shadow-md"
            >
              Confirm
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto -mt-2">
          <form
            ref={formRef}
            className="bg-pup-dark-maroon shadow-2xl border-t-4 border-pup-yellow h-[900px] lg:h-[750px] flex flex-col relative"
            onSubmit={handleSubmit}
          >
            {/* Step Indicators */}
            <div className="flex flex-col items-center pt-4 pb-4">
              <div className="flex space-x-3 mb-2">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`w-4 h-4 rounded-full border border-pup-yellow ${
                      step <= currentStep ? "bg-pup-yellow" : "bg-white"
                    }`}
                  />
                ))}
              </div>
              <p className="text-pup-yellow font-bold text-sm tracking-wider">
                {currentStep} of 3
              </p>
              <h2 className="text-white text-xl font-semibold mt-2">
                {stepProcess[currentStep]}
              </h2>
            </div>

            <div className="flex-1 px-10 md:px-10 py-2 text-white ">
              {/* STEP 1 */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-fadeIn text-[11px] text-justify lg:text-[14px]">
                  <p><strong>A.</strong> In compliance with the Data Privacy Act (DPA) of 2012, and its implementing rules 
                    and regulations (IRR), upon filling up this Google Form, I am hereby providing my 
                    consent and authorization to use my personal data for this request."
                  </p>

                  <p><strong>B.</strong> This request is only for ONSITE TRANSACTION with Official Receipt issued by the Cashier's Office</p>

                  <p><strong>C.</strong> All CERTIFICATIONS are processed within three (3) working days, while TOR is within 12 working days.</p>

                  <p><strong>D.</strong> REMINDERS: For TOR (first copy), please bring one documentary stamp, 
                    two colored 2x2 picture in academic grown, PUP ID, and dummy diploma 
                    (in case of loss, please bring an affidavit of loss). 
                    For TOR (second copy), please bring one documentary stamp (violet), 
                    two colored 2x2 picture in formal attire with white background.
                    For Honorable Dismissal and other certifications, please bring one 
                    violet documentary stamp (or two brown documentary stamp) per requested document."</p>

                  <p><strong>E.</strong> In compliance with R.A. No. 10173 (Data Privacy Act of 2012), representative must submit 
                    a signed AUTHORIZATION LETTER if claimant is immediate family member or SPECIAL POWER OF ATTORNEY 
                    if claimant is other than immediate family member with original valid ID of both owner/student and 
                    representative upon claiming the requested documents.</p>

                  <p><strong>F.</strong> All documents unclaimed within 90 days on the date of request will be shredded automatically.</p>

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
          
              {/* STEP 4: Documents Requested */}
              {currentStep === 2 && (
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
                    <DropdownGroup
                      name="certification"
                      label="For Certification, please specify"
                      value={formData.certification}
                      onChange={handleInputChange}
                      required
                      options={certificationOptions}
                    />
                  )}

                  <DropdownGroup
                    name="purposeOfRequest"
                    label="Purpose of Request"
                    value={formData.purposeOfRequest}
                    onChange={handleInputChange}
                    options={purposeOptions}
                    required
                  />
                </div>
              )}

              {/* STEP 5: Payment & Copies */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputGroup
                      name="receiptNumber"
                      label="Official Receipt Number"
                      value={formData.receiptNumber}
                      onChange={handleInputChange}
                      placeholder='XXXXXXX'
                      pattern="^\d{7}$"
                      title="Format must be 7 digits"
                      required
                    />
                    <InputGroup
                      name="dateOfPayment"
                      label="Date of Payment"
                      type="date"
                      value={formData.dateOfPayment}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="bg-white/10 p-4 rounded-lg border ">
                    <h3 className="text-[#FFC72C] font-bold mb-3 uppercase text-sm tracking-wide">
                      Number of copies per document
                    </h3>
                    <div className="space-y-3 max-h-23 overflow-y-auto pr-2 custom-scrollbar">
                      {formData.documentsRequested.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                           <label className="text-white text-sm flex-1">{doc}</label>
                           <div className="w-24 ">
                              <input
                                type="number"
                                min="1"
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
                      ))}
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
                  className="bg-pup-yellow hover:bg-[#eeb61b] text-pup-maroon font-bold py-2 px-6 rounded shadow-md w-32"
                >
                  Back
                </button>
              )}

              <button
                type={currentStep < 3 ? "button" : "submit"}
                onClick={currentStep < 3 ? nextStep : undefined}
                className="font-bold py-2 px-6 rounded shadow-md w-32 ml-auto bg-pup-yellow hover:bg-[#eeb61b] text-pup-maroon"
              >
                {currentStep < 3 ? "Next" : "Submit"}
              </button>

            </div>
          </form>
        </div>
      )}
      <ErrorToast 
        message={errorMessage} 
        onClose={() => setErrorMessage("")} 
      />
    </div>
  );
};

export default RequestForm;
