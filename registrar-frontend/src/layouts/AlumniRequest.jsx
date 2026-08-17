import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import InputGroup from "../components/InputGroup.jsx";
import CheckboxItem from "../components/Checkbox.jsx";
import DropdownGroup from "../components/DropDown.jsx";
import MultiSelectDropdown from "../components/MultiSelection.jsx";
import ErrorToast from "../components/ErrorToast.jsx";
import LoadingOverlay from "../components/LoadingOverlay.jsx";
import SubmitConfirmationModal from "../components/SubmitConfirmationModal.jsx";
import ClaimTicket from "../components/ClaimTicket.jsx";
import OfficeHoursNotice from "../components/OfficeHoursNotice.jsx";
import qrCode from "../assets/qrcode.png";
import { useTheme } from "../context/ThemeContext";
import { useAlumniRequest } from "../hooks/useAlumniRequest";
import { getDateDaysAgo } from "../utils/alumniRequestUtils";
import { getTodayDate } from "../utils/helpers";

const AlumniRequestForm = ({ showProfileStep = false }) => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const formRef = useRef(null);

  const {
    currentStep,
    isSubmitted,
    claimTicket,
    errorMessage,
    setErrorMessage,
    showConfirmModal,
    setShowConfirmModal,
    formData,
    handleInputChange,
    handleCheckboxChange,
    handleCertCopyChange,
    handleDocCopyChange,
    nextStep,
    prevStep,
    handlePreSubmit,
    handleSubmit,
    handleConfirm,
    isLoading,
    availableDocs,
    certificationOptions,
    purposeOptions,
    documentOptions,
    stepLabels,
    totalSteps,
    hasTOR,
    showCertificationDropdown,
    finalStep,
  } = useAlumniRequest({ showProfileStep });

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

  useEffect(() => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentStep]);

  return (
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
                <OfficeHoursNotice isDark={isDark} small={true} />
                <p className="text-white/50 text-[11px] text-center md:text-left leading-relaxed max-w-sm">
                  Note: View/download your claim ticket QR code in your inbox or present the manual claim code when claiming.
                </p>
              </div>

              {/* Right Column: Claim Details & QR */}
              <div className="flex flex-col gap-4 w-full">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#FFC72C] text-center md:text-left">
                  Claim Ticket & Code
                </h3>

                {/* Claim Ticket Component */}
                <ClaimTicket uuid={claimTicket?.uuid} claimCode={claimTicket?.claimCode} small={true} />
              </div>
            </div>

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
        <div ref={formRef} className="max-w-5xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className={`shadow-2xl border-t-4 border-pup-yellow h-225 lg:h-187.5 flex flex-col relative ${isDark ? "bg-[#242526]" : "bg-pup-dark-maroon"
              }`}
            noValidate
          >
            <div className="flex flex-col items-center pt-8 pb-4">
              <div className="flex space-x-3 mb-2">
                {Array.from({ length: totalSteps }, (_, idx) => idx + 1).map((step) => (
                  <div
                    key={step}
                    className={`w-4 h-4 rounded-full border border-pup-yellow ${step <= currentStep ? "bg-pup-yellow" : isDark ? "bg-[#3a3b3c]" : "bg-white"
                      }`}
                  />
                ))}
              </div>
              <p className="text-pup-yellow font-bold text-sm tracking-wider">
                {currentStep} of {totalSteps}
              </p>

              <h2
                className={
                  isDark
                    ? "text-[#e4e6eb] text-xl font-semibold mt-2"
                    : "text-white text-xl font-semibold mt-2"
                }
              >
                {stepLabels[currentStep - 1]}
              </h2>
            </div>

            <div className={`flex-1 px-4 sm:px-6 md:px-10 py-4 ${isDark ? "text-[#e4e6eb]" : "text-white"}`}>
              {/* STEP 1: TERMS & CONDITIONS */}
              {currentStep === 1 && (
                <div
                  className={`space-y-6 animate-fadeIn text-[11px] text-justify lg:text-[14px] ${isDark ? "text-[#e4e6eb]" : ""
                    }`}
                >
                  <p>
                    <strong>A.</strong> In compliance with the Data Privacy Act (DPA) of 2012, and its
                    implementing rules and regulations (IRR), upon filling up this Google Form, I am
                    hereby providing my consent and authorization to use my personal data for this request.
                  </p>

                  <p>
                    <strong>B.</strong> This request is only for ONSITE TRANSACTION with Official Receipt
                    issued by the Cashier's Office
                  </p>

                  <p>
                    <strong>C.</strong> All CERTIFICATIONS are processed within three (3) working days,
                    while TOR is within 12 working days.
                  </p>

                  <p>
                    <strong>D.</strong> REMINDERS:<br />
                      • Requests must be submitted within one (1) week after receiving the receipt. Requests exceeding this period may be considered invalid.<br />
                      • For TOR (First Copy): Bring one (1) documentary stamp, two (2) colored 2x2 ID pictures in academic gown, valid PUP ID, and dummy diploma. In case of loss, an Affidavit of Loss is required.<br />
                      • For TOR (Second Copy): Bring one (1) violet documentary stamp and two (2) colored 2x2 ID pictures in formal attire with white background.<br />
                      • For Honorable Dismissal and other Certifications: Bring one (1) violet documentary stamp (or two (2) brown documentary stamps) per requested document.
                    </p>

                  <p>
                    <strong>E.</strong> In compliance with R.A. No. 10173 (Data Privacy Act of 2012),
                    representative must submit a signed AUTHORIZATION LETTER if claimant is immediate family
                    member or SPECIAL POWER OF ATTORNEY if claimant is other than immediate family member with
                    original valid ID of both owner/student and representative upon claiming the requested
                    documents.
                  </p>

                  <p>
                    <strong>F.</strong> All documents unclaimed within 90 days on the date of request will
                    be shredded automatically.
                  </p>

                  <div
                    className={`mt-2 pt-4 border-t text-l ${isDark ? "border-[#3e4042]" : "border-white/10"}`}
                  >
                    <CheckboxItem
                      name="termsAgreed"
                      checked={formData.termsAgreed}
                      onChange={handleCheckboxChange}
                      text="I have read, understood, and agree to the Terms & Conditions stated above."
                    />
                  </div>
                </div>
              )}

              {showProfileStep && currentStep === 2 && (
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

              {currentStep === (showProfileStep ? 3 : 2) && (
                <div className="space-y-6 animate-fadeIn ">
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-6 w-full mt-5">
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

              {currentStep === (showProfileStep ? 4 : 3) && hasTOR && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="grid grid-cols-1 gap-6 w-full mt-10">
                    <div
                      className={`space-y-3 p-4 rounded-lg border ${isDark ? "bg-[#1a1b1e] border-[#3e4042]" : "bg-white/10 border-white/10"
                        }`}
                    >
                      <p className={`text-sm text-justify lg:text-[15px] ${isDark ? "text-[#e4e6eb]" : ""}`}>
                        For TOR request for further studies, please secure an HONORABLE DISMISSAL first.
                        Once processed and submitted back to the University, you may request for TOR with copy
                        for remarks.
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
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: SUBMIT */}
              {currentStep === finalStep && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full -mt-6">
                    <InputGroup
                      name="receiptNumber"
                      label="Official Receipt Number"
                      value={formData.receiptNumber}
                      onChange={handleInputChange}
                      placeholder="XXXXXXX"
                      required
                      voiceEnabled
                    />

                    <InputGroup
                      name="dateOfPayment"
                      type="date"
                      label="Date reflected on the Official Receipt"
                      value={formData.dateOfPayment}
                      onChange={handleInputChange}
                      placeholder="e.g 01/01/2024"
                      min={getDateDaysAgo(7)}
                      max={getTodayDate()}
                      required
                      voiceEnabled={false}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-1 w-full -mt-2">
                    <div
                      className={`p-4 rounded-lg border ${isDark ? "bg-[#1a1b1e] border-[#3e4042]" : "bg-white/10 border-white/10"
                        }`}
                    >
                      <h3 className="text-pup-yellow font-bold mb-3 uppercase text-sm tracking-wide">
                        Number of copies per document
                      </h3>
                      <div className="space-y-3 max-h-23 overflow-y-auto pr-2 custom-scrollbar">
                        {formData.documentsRequested.filter((doc) => !doc.toLowerCase().includes("certif"))
                          .length > 0 &&
                          formData.documentsRequested
                            .filter((doc) => !doc.toLowerCase().includes("certif"))
                            .map((doc, index) => (
                              <div key={index} className="flex items-center justify-between gap-2">
                                <label className="text-white text-sm flex-1">{doc}</label>
                                <div className="w-24">
                                  <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    className={`w-full p-2 text-sm rounded-lg outline-none transition-all duration-200 border ${isDark
                                        ? "bg-[#242526] border-[#3e4042] text-[#e4e6eb] focus:bg-[#2b2c2d] focus:border-[#FFC72C] focus:ring-2 focus:ring-[#FFC72C]/30"
                                        : "bg-gray-50 border-gray-300 text-gray-700 focus:bg-white focus:border-[#FFC72C] focus:ring-2 focus:ring-[#FFC72C]/30 focus:text-black"
                                      }`}
                                    value={
                                      formData.documentCopies[doc] === undefined
                                        ? 1
                                        : formData.documentCopies[doc]
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      handleDocCopyChange(
                                        doc,
                                        val === "" ? "" : Math.max(1, Math.min(10, Number(val)))
                                      );
                                    }}
                                    onBlur={(e) => {
                                      if (e.target.value === "") handleDocCopyChange(doc, 1);
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                        {showCertificationDropdown &&
                          formData.certification.length > 0 &&
                          formData.certification.map((certName, index) => (
                            <div key={index} className="flex items-center justify-between gap-2">
                              <label
                                className={`text-sm flex-1 ${isDark ? "text-[#e4e6eb]" : "text-white"}`}
                              >
                                CERTIFICATION (<span className="text-[#FFC72C]">{certName}</span>)
                              </label>
                              <div className="w-24">
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  className={`w-full p-2 text-sm rounded-lg outline-none transition-all duration-200 border ${isDark
                                      ? "bg-[#242526] border-[#3e4042] text-[#e4e6eb] focus:bg-[#2b2c2d] focus:border-[#FFC72C] focus:ring-2 focus:ring-[#FFC72C]/30"
                                      : "bg-gray-50 border-gray-300 text-gray-700 focus:bg-white focus:border-[#FFC72C] focus:ring-2 focus:ring-[#FFC72C]/30 focus:text-black"
                                    }`}
                                  value={
                                    formData.certCopies[certName] === undefined
                                      ? ""
                                      : formData.certCopies[certName]
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    handleCertCopyChange(
                                      certName,
                                      val === "" ? "" : Math.max(1, Math.min(10, Number(val)))
                                    );
                                  }}
                                  onBlur={(e) => {
                                    if (e.target.value === "") handleCertCopyChange(certName, 1);
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div
                      className={`flex flex-col gap-3 max-h-50 md:max-h-105 lg:max-h-70 overflow-y-auto overflow-x-hidden pr-1 custom-scrollbar p-2 rounded-lg border -mt-2 ${isDark ? "bg-[#1a1b1e] border-[#3e4042]" : "bg-white/10 border-white/10"
                        }`}
                    >
                      {formData.documentsRequested.map((doc, index) => {
                        const docData = availableDocs.find((d) => d.document_name === doc);
                        const requirements = docData?.document_requirements
                          ? Array.isArray(docData.document_requirements)
                            ? docData.document_requirements
                            : docData.document_requirements
                              .split("\n")
                              .map((r) => r.trim().replace(/,$/, ""))
                              .filter(Boolean)
                          : [];

                        return (
                          <div
                            key={index}
                            className={`p-4 rounded-lg border px-4 py-3 ${isDark ? "bg-[#242526] border-[#3e4042]" : "bg-white/10 border-white/10"
                              }`}
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
                                  <li
                                    key={i}
                                    className={`flex items-start gap-2 text-xs leading-relaxed min-w-0 ${isDark ? "text-[#b0b3b8]" : "text-white/80"
                                      }`}
                                  >
                                    <span className="w-1.5 h-1.5 bg-[#FFC72C] rounded-full shrink-0 mt-1" />

                                    <span className="wrap-break-word whitespace-normal break-all max-w-full">
                                      {req}
                                    </span>
                                  </li>
                                ))
                              ) : (
                                <li className={`text-xs italic ${isDark ? "text-[#b0b3b8]/60" : "text-white/35"}`}>
                                  No requirements available
                                </li>
                              )}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                    <div className="-mt-9 flex justify-center items-start">
                      <div className=" p-4 md:mt-4 lg:mt-5 w-full max-w-sm max-h-lg flex flex-col items-center">
                        <p
                          className={`lg:mt-2 text-[10px] text-center leading-relaxed ${isDark ? "text-[#b0b3b8]" : "text-white/70"
                            }`}
                        >
                          <strong>REMINDER</strong>: Your feedback is important to us. Kindly take a moment
                          to share your experience.
                        </p>

                        <h3 className="text-[#FFC72C]  font-bold text-[10px] md:text-sm lg:text-sm uppercase tracking-wide md:mb-3 text-center">
                          Scan QR Code
                        </h3>

                        <img src={qrCode} alt="QR Code" className="w-20 h-20 lg:w-40 lg:h-40 object-contain" />

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
          handleSubmit({ preventDefault: () => { } });
        }}
        title="Submit Confirmation"
        message="Are you sure you want to submit your request?"
      />
      <ErrorToast message={errorMessage} onClose={() => setErrorMessage("")} />
    </div>
  );
};

export default AlumniRequestForm;