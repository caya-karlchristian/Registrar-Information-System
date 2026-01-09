import React, { useState, useRef } from "react";
import axios from "../services/API.js"; // Make sure this is correctly cased
import InputGroup from "../components/InputGroup.jsx";
import CheckboxItem from "../components/Checkbox.jsx";
import DropdownGroup from "../components/DropDown.jsx";
import MultiSelectDropdown from "../components/MultiSelection.jsx";

const RequestForm = () => {
  const formRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showTermsError, setShowTermsError] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
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

  const nextStep = (e) => {
    e.preventDefault();

    if (currentStep === 1) {
      if (!formData.termsAgreed) { 
        setShowTermsError(true);
        return;
      }
      setShowTermsError(false);
    }

    if (formRef.current && !formRef.current.checkValidity()) {
      formRef.current.reportValidity();
      return;
    }

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
            ref={formRef}
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

            <div className="flex-1 px-10 md:px-20 py-4 text-white ">
              {/* STEP 1 */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-fadeIn text-[13px] text-justify lg:text-[15px]">
                  <p><strong>A.</strong> In compliance with the Data Privacy Act (DPA) of 2012, and its implementing rules 
                    and regulations (IRR), upon filling up this Google Form, I am hereby providing my 
                    consent and authorization to use my personal data for this request."
                  </p>

                  <p><strong>B.</strong> This request is only for ONSITE TRANSACTION with Official Receipt issued by the Cashier's Office</p>

                  <p><strong>C.</strong> All CERTIFICATIONS are processed within three (3) working days, while TOR is within 12 working days.</p>

                  <p><strong>D.</strong> REMINDERS: For TOR (first copy), please bring one documentary stamp, 
                    two colored 2x2 picture in academic grown,  PUP ID, and dummy diploma 
                    (in case of loss, please bring an affidavit of loss). 
                    For TOR (second copy), please bring one documentary stamp (violet), 
                    two colored 2x2 picture in formal attire with white background.
                    For Honorable Dismissal and other certifications, please bring one 
                    violet documentary stamp (or two brown documentary stamp) per requested document."</p>

                  <p><strong>E.</strong> In compliance with R.A. No. 10173 (Data Privacy Act of 2012), representative must submit 
                    a signed AUTHORIZATION LETTER if claimant is immediate family member or SPECIAL POWER OF ATTORNEY 
                    if claimant is other than immediate family member with original valid ID of both owner/student and 
                    representative upon claiming the requested documents.</p>

                  <p><strong> F.</strong>All documents unclaimed within 90 days on the date of request will be shredded automatically.</p>

                  <div className="mt-2 pt-4 border-t text-l border-white/10">
                    <CheckboxItem
                      name="termsAgreed"
                      checked={formData.termsAgreed}
                      onChange={handleCheckboxChange}
                      text="I have read, understood, and agree to the Terms & Conditions stated above."
                    />
                    {showTermsError && !formData.termsAgreed && (
                    <p className="text-red-400 text-xs font-semibold mt-1">
                      ⚠️ You must read the Terms & Conditions to proceed.
                    </p>
                  )}
                  </div>
                  </div>
                )}

              {/* STEP 2: Student Profile */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputGroup
                      name="firstName"
                      label="First Name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="e.g., Rose"
                      required
                    />
                    <InputGroup
                      name="middleName"
                      label="Middle Name"
                      value={formData.middleName}
                      onChange={handleInputChange}
                      placeholder="e.g., Dela Cruz"
                      required
                    />
                    <InputGroup
                      name="surname"
                      label="Surname"
                      value={formData.surname}
                      onChange={handleInputChange}
                      placeholder="e.g., Santos"
                      required
                    />
                    <InputGroup
                    name="dob"
                    label="Date of Birth"
                    type="date"
                    value={formData.dob}
                    onChange={handleInputChange}
                    required
                  />
                  </div>                 
                  <InputGroup
                    name="address"
                    label="Mailing Address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="House No., Street, Barangay, City"
                    required
                  />
                  <InputGroup
                    name="contactNumber"
                    label="Contact Number"
                    value={formData.contactNumber}
                    onChange={handleInputChange}
                    placeholder="09XXXXXXXXX"
                    required
                  />
                </div>
              )}

              {/* STEP 3: Student Records */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputGroup
                      name="yearAdmitted"
                      label="Admitted in PUP Taguig (S.Y.)"
                      value={formData.yearAdmitted}
                      onChange={handleInputChange}
                      placeholder="XXXX-XXXX"
                      required
                    />
                    <DropdownGroup
                      name="course"
                      label="Course"
                      value={formData.course}
                      onChange={handleInputChange}
                      required
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
                      required
                    />
                    <InputGroup
                      name="lastSYAttended"
                      label="Last S.Y. Attended"
                      value={formData.lastSYAttended}
                      onChange={handleInputChange}
                      placeholder="XXXX"
                      required
                    />
                  </div>
                  <InputGroup
                    name="studentNumber"
                    label="Student Number"
                    value={formData.studentNumber}
                    onChange={handleInputChange}
                    placeholder="e.g 2023-00101-TG-0"
                    required
                  />
                </div>
                
              )}

              {/* STEP 4: Documents Requested */}
              {currentStep === 4 && (
                <div className="space-y-6 animate-fadeIn">
                  <MultiSelectDropdown
                    name="documentsRequested"
                    label="Documents Requested"
                    required
                    options={[
                      "Certificate of Good Moral Character",
                      "Transcript of Records (TOR)",
                      "Certification, Authentication, Verification (CAV) / APOSTILE",
                      "Authentication/Certified True Copy - Local",
                      "Informative Copy of Grades",
                      "CAV - CHED",
                      "CAV - WES/CES",
                      "Cross-enrollment Fee",
                      "Re-admission Fee",
                      "Admission Fee for Transfer Students (From Private School)",
                      "Admission Fee for Transfer Students (From SUCs)",
                      "New Copy of Registration Card (With Affidavit of Loss)",
                      "Diploma",
                      "Admission Fee for Transfer Students (From SUCs)",
                      "Accreditation Fee",
                      "Completion Fee",
                      "Transcript of Records",
                      "Correction in Student Information System"
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
                      required
                      options={[
                        "None",
                        "Certification of Enrollment",
                        "Certification of Grades",
                        "Certificate of Registration (COR)",
                        "Certificate of Graduation",
                        "Certificate of Completion",
                        "Certification for Scholarship"
                      ]}
                    />
                  )}

                  <DropdownGroup
                    name="purposeOfRequest"
                    label="Purpose of Request"
                    value={formData.purposeOfRequest}
                    onChange={handleInputChange}
                    options={["For Admission", "For Employment", "For Scholarship", "Other"]}
                    required
                  />
                </div>
              )}

              {/* STEP 5: Payment & Copies */}
              {currentStep === 5 && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputGroup
                      name="receiptNumber"
                      label="Official Receipt Number"
                      value={formData.receiptNumber}
                      onChange={handleInputChange}
                      placeholder="XXXXXXXXX"
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
                  <InputGroup
                    name="numberOfCopies"
                    label="Number of Copies / Notes"
                    value={formData.numberOfCopies}
                    onChange={handleInputChange}
                    placeholder="e.g., 1"
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
                type="button"
                onClick={nextStep}
                className="font-bold py-2 px-6 rounded shadow-md w-32 ml-auto bg-pup-yellow hover:bg-[#eeb61b] text-pup-maroon"                  
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
