import React, { useState, useRef } from "react";
import api from "../services/API";
import InputGroup from "../components/InputGroup.jsx";
import CheckboxItem from "../components/Checkbox.jsx";
import DropdownGroup from "../components/DropDown.jsx";
import MultiSelectDropdown from "../components/MultiSelection.jsx";

const RequestForm = () => {
  const formRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showTermsError, setShowTermsError] = useState(false);

  const [formData, setFormData] = useState({
    termsAgreed: false,

    firstName: "",
    middleName: "",
    surname: "",
    dob: "",
    address: "",
    contactNumber: "",

    yearAdmitted: "",
    course: "",
    yearLevel: "",
    lastSYAttended: "",
    studentNumber: "",

    documentsRequested: [],
    purposeOfRequest: "",
    certification: "",

    receiptNumber: "",
    dateOfPayment: "",
    numberOfCopies: 1,
  });

  /* ---------------- HANDLERS ---------------- */

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "documentsRequested") {
      setFormData((prev) => ({
        ...prev,
        documentsRequested: value,
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.checked,
    }));
  };

  const nextStep = (e) => {
    e.preventDefault();

    if (currentStep === 1 && !formData.termsAgreed) {
      setShowTermsError(true);
      return;
    }

    setShowTermsError(false);

    if (formRef.current && !formRef.current.checkValidity()) {
      formRef.current.reportValidity();
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const prevStep = (e) => {
    e.preventDefault();
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  /* ---------------- SUBMIT ---------------- */

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      /**
       * 🔴 TEMPORARY HARD-CODED IDS
       * Replace with auth later
       */
      const user_id = 1;
      const student_profile_id = 1;
      const academic_record_id = 1;
      const status_id = 1; // Pending

      // 1️⃣ Create document request
      const requestRes = await api.post("/document-requests", {
        user_id,
        student_profile_id,
        academic_record_id,
        status_id,
        purpose_of_request: formData.purposeOfRequest,
        receipt_number: formData.receiptNumber,
        receipt_date: formData.dateOfPayment,
        number_of_copies: formData.numberOfCopies,
        certification_detail: formData.certification || null,
      });

      const request_id = requestRes.data.request_id;

      // 2️⃣ Insert requested documents
      for (const doc of formData.documentsRequested) {
        await api.post("/request-documents", {
          request_id,
          document_type_id: doc, // expects ID if you later map IDs
        });
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error("Submission failed:", error);
      alert("Failed to submit request. Please try again.");
    }
  };

  const handleConfirm = () => window.location.reload();

  /* ---------------- UI ---------------- */

  const stepTitle = {
    1: "Terms & Conditions",
    2: "Student Profile",
    3: "Student Records",
    4: "Documents Requested",
    5: "Payment Details",
  };

  const showCertificationDropdown =
    formData.documentsRequested.length > 0;

  return (
    <div className="min-h-screen pb-20">
      {isSubmitted ? (
        <div className="max-w-5xl mx-auto">
          <div className="bg-pup-dark-maroon shadow-2xl border-t-4 border-pup-yellow h-[750px] flex flex-col items-center justify-center text-center px-10">
            <p className="mb-6 text-4xl font-bold text-white">
              Please be patient as we process your request.
            </p>
            <button
              onClick={handleConfirm}
              className="bg-pup-yellow text-pup-maroon font-bold py-2 px-6 rounded"
            >
              Confirm
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto mt-5">
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="bg-pup-dark-maroon shadow-2xl border-t-4 border-pup-yellow h-[750px] flex flex-col"
          >
            {/* Header */}
            <div className="text-center pt-8 text-white">
              <p className="text-sm text-pup-yellow">
                {currentStep} of 5
              </p>
              <h2 className="text-xl font-semibold">
                {stepTitle[currentStep]}
              </h2>
            </div>

            {/* Body */}
            <div className="flex-1 px-10 py-6 text-white overflow-auto">

              {/* STEP 1 */}
              {currentStep === 1 && (
                <>
                  <CheckboxItem
                    name="termsAgreed"
                    checked={formData.termsAgreed}
                    onChange={handleCheckboxChange}
                    text="I agree to the Terms & Conditions"
                  />
                  {showTermsError && (
                    <p className="text-red-400 text-sm mt-2">
                      You must agree before proceeding.
                    </p>
                  )}
                </>
              )}

              {/* STEP 2 */}
              {currentStep === 2 && (
                <>
                  <InputGroup name="firstName" label="First Name" required onChange={handleInputChange} />
                  <InputGroup name="middleName" label="Middle Name" onChange={handleInputChange} />
                  <InputGroup name="surname" label="Surname" required onChange={handleInputChange} />
                </>
              )}

              {/* STEP 3 */}
              {currentStep === 3 && (
                <>
                  <InputGroup name="studentNumber" label="Student Number" required onChange={handleInputChange} />
                  <InputGroup name="yearAdmitted" label="Year Admitted" required onChange={handleInputChange} />
                </>
              )}

              {/* STEP 4 */}
              {currentStep === 4 && (
                <>
                  <MultiSelectDropdown
                    name="documentsRequested"
                    label="Documents Requested"
                    selectedValues={formData.documentsRequested}
                    onChange={handleInputChange}
                  />

                  {showCertificationDropdown && (
                    <InputGroup
                      name="certification"
                      label="Certification Details"
                      onChange={handleInputChange}
                    />
                  )}
                </>
              )}

              {/* STEP 5 */}
              {currentStep === 5 && (
                <>
                  <InputGroup name="receiptNumber" label="Receipt Number" required onChange={handleInputChange} />
                  <InputGroup name="dateOfPayment" label="Date of Payment" type="date" required onChange={handleInputChange} />
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between px-10 pb-6">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="bg-pup-yellow text-pup-maroon px-6 py-2 rounded"
                >
                  Back
                </button>
              )}
              <button
                type={currentStep === 5 ? "submit" : "button"}
                onClick={currentStep < 5 ? nextStep : undefined}
                className="bg-pup-yellow text-pup-maroon px-6 py-2 rounded ml-auto"
              >
                {currentStep < 5 ? "Next" : "Submit"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default RequestForm;
