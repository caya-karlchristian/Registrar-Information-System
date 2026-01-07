import React, { useState } from "react";
import axios from "../services/API.js"; // Make sure this is correctly cased
import InputGroup from "../components/InputGroup.jsx";
import CheckboxItem from "../components/Checkbox.jsx";
import DropdownGroup from "../components/DropDown.jsx";
import MultiSelectDropdown from "../components/MultiSelection.jsx";

const RequestForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    privacyConsent: false,
    onsiteTransaction: false,
    certificationsAgreed: false,
    remindersAgreed: false,
    authLetterAgreed: false,
    unclaimedAgreed: false,
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
    numberOfCopies: "",
  });

  // Update text inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Update checkboxes
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  // Agree to all T&C
  const handleAgreeAll = () => {
    setFormData((prev) => ({
      ...prev,
      privacyConsent: true,
      onsiteTransaction: true,
      certificationsAgreed: true,
      remindersAgreed: true,
      authLetterAgreed: true,
      unclaimedAgreed: true,
    }));
  };

  // Navigation
  const nextStep = (e) => {
    e.preventDefault();
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const prevStep = (e) => {
    e.preventDefault();
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // Submit form to backend
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Assuming student_id = 1 for testing
      const payload = { ...formData, student_id: 1 };
      const response = await axios.post("/document-requests", payload);

      console.log("Document request submitted:", response.data);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Failed to submit request:", error);
      alert("Failed to submit request. Please try again.");
    }
  };

  // Reload page after confirmation
  const handleConfirm = () => window.location.reload();

  // Show certification dropdown if relevant documents selected
  const certificationDocuments = new Set([
    "Certificates of Attendance, Graduation, Medium of Instruction, General Weighted Average, Non Issuance of Special Order, and Certified True Copy",
    "Certification, Authentication, Verification (CAV) / APOSTILE",
    "Certificate of Good Moral Character",
  ]);

  const showCertificationDropdown = formData.documentsRequested.some((doc) =>
    certificationDocuments.has(doc)
  );

  const stepProcess = {
    1: "Terms & Conditions",
    2: "Student Profile",
    3: "Student Records",
    4: "Student Credentials",
    5: "Student Request",
  };

  return (
    <div className="min-h-screen pb-20">
      {isSubmitted ? (
        <div className="max-w-5xl mx-auto">
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
        <div className="max-w-5xl mx-auto mt-5">
          <form
            className="bg-pup-dark-maroon shadow-2xl border-t-4 border-pup-yellow h-[900px] lg:h-[750px] flex flex-col relative"
            onSubmit={handleSubmit}
          >
            {/* Step Indicators */}
            <div className="flex flex-col items-center pt-8 pb-4">
              <div className="flex space-x-3 mb-2">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div
                    key={step}
                    className={`w-4 h-4 rounded-full border border-pup-yellow ${
                      step <= currentStep ? "bg-pup-yellow" : "bg-white"
                    }`}
                  />
                ))}
              </div>
              <p className="text-pup-yellow font-bold text-sm tracking-wider">
                {currentStep} of 5
              </p>
              <h2 className="text-white text-xl font-semibold mt-2">
                {stepProcess[currentStep]}
              </h2>
            </div>

            {/* Step Contents */}
            <div className="flex-1 px-10 md:px-20 py-4 text-white">
              {/* STEP 1 */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-fadeIn text-[13px] text-justify lg:text-[15px]">
                  <CheckboxItem
                    name="privacyConsent"
                    checked={formData.privacyConsent}
                    onChange={handleCheckboxChange}
                    text="I consent to the use of my personal data for this request (Data Privacy Act)."
                  />
                  <CheckboxItem
                    name="onsiteTransaction"
                    checked={formData.onsiteTransaction}
                    onChange={handleCheckboxChange}
                    text="This request is only for ONSITE TRANSACTION with official receipt."
                  />
                  <CheckboxItem
                    name="certificationsAgreed"
                    checked={formData.certificationsAgreed}
                    onChange={handleCheckboxChange}
                    text="All certifications are processed within 3 working days; TOR within 12 working days."
                  />
                  <CheckboxItem
                    name="remindersAgreed"
                    checked={formData.remindersAgreed}
                    onChange={handleCheckboxChange}
                    text="Bring necessary documentary stamps, photos, and IDs based on document type."
                  />
                  <CheckboxItem
                    name="authLetterAgreed"
                    checked={formData.authLetterAgreed}
                    onChange={handleCheckboxChange}
                    text="Representative must submit authorization letter or SPA upon claiming documents."
                  />
                  <CheckboxItem
                    name="unclaimedAgreed"
                    checked={formData.unclaimedAgreed}
                    onChange={handleCheckboxChange}
                    text="All unclaimed documents within 90 days will be shredded."
                  />

                  <div className="flex justify-end mb-4">
                    <button
                      type="button"
                      onClick={handleAgreeAll}
                      className="text-xs font-white underline hover:text-yellow-300 focus:outline-none"
                    >
                      Agree to All Terms & Conditions
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Student Profile */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InputGroup
                      name="firstName"
                      label="First Name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                    />
                    <InputGroup
                      name="middleName"
                      label="Middle Name"
                      value={formData.middleName}
                      onChange={handleInputChange}
                    />
                    <InputGroup
                      name="surname"
                      label="Surname"
                      value={formData.surname}
                      onChange={handleInputChange}
                    />
                  </div>
                  <InputGroup
                    name="dob"
                    label="Date of Birth"
                    type="date"
                    value={formData.dob}
                    onChange={handleInputChange}
                  />
                  <InputGroup
                    name="address"
                    label="Mailing Address"
                    value={formData.address}
                    onChange={handleInputChange}
                  />
                  <InputGroup
                    name="contactNumber"
                    label="Contact Number"
                    value={formData.contactNumber}
                    onChange={handleInputChange}
                  />
                </div>
              )}

              {/* STEP 3: Student Records */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-fadeIn">
                  <InputGroup
                    name="yearAdmitted"
                    label="Year Admitted (S.Y.)"
                    value={formData.yearAdmitted}
                    onChange={handleInputChange}
                  />
                  <DropdownGroup
                    name="course"
                    label="Course"
                    value={formData.course}
                    onChange={handleInputChange}
                    options={[
                      "BS Computer Science",
                      "BS Information Technology",
                      "BS Information Systems",
                      "BS in Accountancy",
                      "BS in Business Administration",
                    ]}
                  />
                  <DropdownGroup
                    name="yearLevel"
                    label="Year Level"
                    value={formData.yearLevel}
                    onChange={handleInputChange}
                    options={["1st Year", "2nd Year", "3rd Year", "4th Year"]}
                  />
                  <InputGroup
                    name="lastSYAttended"
                    label="Last S.Y. Attended"
                    value={formData.lastSYAttended}
                    onChange={handleInputChange}
                  />
                  <InputGroup
                    name="studentNumber"
                    label="Student Number"
                    value={formData.studentNumber}
                    onChange={handleInputChange}
                  />
                </div>
              )}

              {/* STEP 4: Documents Requested */}
              {currentStep === 4 && (
                <div className="space-y-6 animate-fadeIn">
                  <MultiSelectDropdown
                    name="documentsRequested"
                    label="Documents Requested"
                    options={[
                      "Certificate of Good Moral Character",
                      "Transcript of Records (TOR)",
                      "Certification, Authentication, Verification (CAV) / APOSTILE",
                    ]}
                    selectedValues={formData.documentsRequested}
                    onChange={handleInputChange}
                  />

                  {showCertificationDropdown && (
                    <DropdownGroup
                      name="certification"
                      label="For Certification, please specify"
                      value={formData.certification}
                      onChange={handleInputChange}
                      options={[
                        "None",
                        "Certification of Enrollment",
                        "Certification of Grades",
                      ]}
                    />
                  )}

                  <DropdownGroup
                    name="purposeOfRequest"
                    label="Purpose of Request"
                    value={formData.purposeOfRequest}
                    onChange={handleInputChange}
                    options={["For Admission", "For Employment", "For Scholarship", "Other"]}
                  />
                </div>
              )}

              {/* STEP 5: Payment & Copies */}
              {currentStep === 5 && (
                <div className="space-y-6 animate-fadeIn">
                  <InputGroup
                    name="receiptNumber"
                    label="Official Receipt Number"
                    value={formData.receiptNumber}
                    onChange={handleInputChange}
                  />
                  <InputGroup
                    name="dateOfPayment"
                    label="Date of Payment"
                    type="date"
                    value={formData.dateOfPayment}
                    onChange={handleInputChange}
                  />
                  <InputGroup
                    name="numberOfCopies"
                    label="Number of Copies / Notes"
                    value={formData.numberOfCopies}
                    onChange={handleInputChange}
                  />
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
                type={currentStep === 5 ? "submit" : "button"}
                onClick={currentStep < 5 ? nextStep : undefined}
                className="bg-pup-yellow hover:bg-[#eeb61b] text-pup-maroon font-bold py-2 px-6 rounded shadow-md w-32"
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
