import React, { useState,useRef } from 'react';
import InputGroup from '../components/InputGroup.jsx';
import CheckboxItem from '../components/Checkbox.jsx';
import DropdownGroup from '../components/DropDown.jsx';
import MultiSelectDropdown from '../components/MultiSelection.jsx';

const AlumniRequestForm = () => {
  const formRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showTermsError, setShowTermsError] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    termsAgreed: false,
    firstName: '',
    middleName: '',
    surname: '',
    dob: '',
    address: '',
    contactNumber: '',
    yearAdmitted: '',
    course: '',
    yearLevel: '',
    lastSYAttended: '',
    studentNumber: '',
    documentsRequested: [],
    purposeOfRequest: '',
    certification: '',
    noRequests: false,
    doneRequest: false,
    receiptNumber: '',
    dateOfPayment: '',
    numberOfCopies: '',
    forgotStudentNo: '',
  });

  // Helper to update text inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Helper to update checkboxes
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  // Function to go to next step
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

    if (currentStep < 6) setCurrentStep(currentStep + 1);
  };

  const prevStep = (e) => {
    e.preventDefault(); 
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form Submitted with Data:", formData);
    
    setIsSubmitted(true);
  };
  
  const handleConfirm = () => {
    window.location.reload();
  };

  const certificationDocuments = new Set([
    "Certificate of Good Moral Character",
    "Certification, Authentication, Verification (CAV) / APOSTILE",
    "Certificates of Attendance, Graduation, Medium of Instruction, General Weighted Average, Non Issuance of Special Order, and Certified True Copy"                 
  ]);

  const showCertificationDropdown = formData.documentsRequested.some(doc =>
    certificationDocuments.has(doc)
  );


  const stepProcess = {
            1: "Terms & Conditions",
            2: "Alumni Information",
            3: "Alumni Request",
            4: "TOR request",
            5: "Payment Details",
          };

  return (
    <div className="min-h-screen pb-20 ">
      
    {isSubmitted ? (
      <div className="max-w-5xl mx-auto">
        <div className="bg-pup-dark-maroon shadow-2xl border-t-4 border-pup-yellow h-[900px] lg:h-[750px] items-center justify-center text-center px-10 flex flex-col relative ">
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
        ref={formRef}
        onSubmit={handleSubmit}
        className="bg-pup-dark-maroon shadow-2xl border-t-4 border-pup-yellow h-[900px] lg:h-[750px] flex flex-col relative">
          
          <div className="flex flex-col items-center pt-8 pb-4">
            <div className="flex space-x-3 mb-2">
              {[1, 2, 3, 4, 5].map((step) => (
                <div 
                  key={step}
                  className={`w-4 h-4 rounded-full border border-pup-yellow ${
                    step <= currentStep ? 'bg-pup-yellow' : 'bg-white'
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

          <div className="flex-1 px-10 md:px-20 py-4 text-white">
            
            {/* STEP 1: TERMS & CONDITIONS */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fadeIn text-[13px] text-justify lg:text-[15px]">
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
                    {currentStep === 1 && showTermsError && !formData.termsAgreed && (                    <p className="text-red-400 text-xs font-semibold mt-1">
                      ⚠️ You must read the Terms & Conditions to proceed.
                    </p>
                  )}
                  </div>
                  </div>
                )}

            {currentStep === 2 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-6 w-full">
                    <DropdownGroup                    
                      name="yearAdmitted"
                      label="Admitted in PUP Taguig (S.Y.)"
                      value={formData.yearAdmitted}
                      onChange={handleInputChange}
                      options={[
                        "2000–2001",
                        "2001–2002",
                        "2002–2003",
                        "2003–2004",
                        "2004–2005",
                        "2005–2006",
                        "2006–2007",
                        "2007–2008",
                        "2008–2009",
                        "2009–2010",
                        "2010–2011",
                        "2011–2012",
                        "2012–2013",
                        "2013–2014",
                        "2014–2015",
                        "2015–2016",
                        "2016–2017",
                        "2017–2018",
                        "2018–2019",
                        "2019–2020",
                        "2020–2021",
                        "2021–2022",
                        "2022–2023",
                        "2023–2024",
                        "2024–2025",
                        "2025–2026",
                      ]}
                      required
                    />

                  <DropdownGroup 
                    name="course" 
                    label="Course" 
                    value={formData.course} 
                    onChange={handleInputChange} 
                    required
                    options={[
                      "BS in Electronics Engineering (BSECE)",
                      "BS in Information Technology (BSIT)",
                      "BS in Information Systems (BSIS)",
                      "BS in Accountancy (BSA)",
                      "BS in Business Administration (BSBA)",
                      "BS in Applied Mathematics (BSAM)",
                      "BS in Entrepreneurship (BSENTREP)",
                      "BS in Office Administration (BSOA)",
                      "Bachelor in Secondary Education (BSED)",
                      "BS in Hospitality Management (BSHM)",
                      "BS in Civil Engineering (BSCE)",
                    ]}
                  />

                  <DropdownGroup 
                    name="forgotStudentNo"  
                    label="Do you still remember your STUDENT NUMBER?"
                    value={formData.forgotStudentNo}
                    onChange={handleInputChange}
                    options={["Yes", "No"]}
                    required
                    />

                    {/* Show Last S.Y. Attended if Yes or No is selected */}
                    {formData.forgotStudentNo && (
                    <InputGroup
                        name="lastSYAttended"
                        label="Last S.Y. Attended"
                        value={formData.lastSYAttended}
                        onChange={handleInputChange}
                        placeholder="XXXX-XXXX"
                        pattern="^\d{4}-\d{4}$"
                        title="Format must be YYYY-YYYY"
                        required
                    />
                    )}

                    {/* Show Student Number ONLY if Yes */}
                    {formData.forgotStudentNo === "Yes" && (
                    <InputGroup
                        name="studentNumber"
                        label="Student Number"
                        value={formData.studentNumber}
                        onChange={handleInputChange}
                        className="uppercase"
                        placeholder="e.g 2023-00101-TG-0"
                        pattern="^\d{4}-\d{5}-TG-\d$"
                        title="Format must be YYYY-XXXXX-TG-X"
                        required
                    />
                    )}

                </div>
              </div>
            )}

            {(currentStep === 3) && (
              <div className="space-y-6 animate-fadeIn ">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-6 w-full mt-10">
                  <MultiSelectDropdown 
                    name="documentsRequested"
                    label="Documents Requested (You may select multiple)"
                    required
                    options={[
                      "Transcript of Records (TOR)",
                      "Certificate of Good Moral Character",
                      "Certification, Authentication, Verification (CAV) / APOSTILE",
                      "Certificates of Attendance, Graduation, Medium of Instruction, General Weighted Average, Non Issuance of Special Order, and Certified True Copy",
                      "Course/Subject Description",
                      "Academic Verification Results",
                      "Student/Alumni Referral and Recommendation Letter"
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
                      "Certification of Academic Standing",
                      "Certification of No Academic Standing",
                      "Certification of No Record",
                      "Other"
                      ]}
                    />
                  )}

                  <DropdownGroup 
                    name="purposeOfRequest" 
                    label="Purpose of Request"
                    value={formData.purposeOfRequest}
                    onChange={handleInputChange}
                    required
                    options={[
                      "For Admission",
                      "For Employment",
                      "For Scholarship",
                      "For Transfer",
                      "Other"
                    ]}
                  />

              </div>
              </div>
            )}

            {(currentStep === 4) && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-6 w-full mt-10">
                  <p className="text-sm text-justify lg:text-[15px]">For TOR request for further studies, 
                    please secure an HONORABLE DISMISSAL first. Once processed and submitted 
                    back to the University, you may request for TOR with copy for remarks. 
                    </p>

                  <CheckboxItem
                    text="No Request Yet"
                    name="noRequests"
                    checked={formData.noRequests}
                    onChange={handleCheckboxChange}
                  />

                  <CheckboxItem
                    text="Done Honorable Dismissal Request Done"
                    name="doneRequest"
                    checked={formData.doneRequest}
                    onChange={handleCheckboxChange}
                  />
              </div>
              </div>
            )}

            {/* STEP 6: SUBMIT */}
            {currentStep === 5 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-6 w-full mt-10">
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
                    type="date"
                    label="Date reflected on the Official Receipt"
                    value={formData.dateOfPayment}
                    onChange={handleInputChange}
                    placeholder='e.g 01/01/2024'
                    required
                  />
                  
                  <InputGroup
                    name="numberOfCopies"
                    label="Note (Number of copies or other queries/clarifications)"
                    value={formData.numberOfCopies}
                    onChange={handleInputChange}
                    placeholder='e.g 1'
                  />
                </div>
              </div>
            )}

          </div>

          {/* NAVIGATION BUTTONS */}
          <div className="mb-8 px-8 flex flex-col items-center mt-auto space-y-2">
            <div className="flex justify-between items-center w-full">
              {/* Back Button */}
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
                {currentStep < 5 ? (
                  <button
                    onClick={nextStep}
                    type="button"
                    className="font-bold py-2 px-6 rounded shadow-md w-full transition-transform active:scale-95 bg-pup-yellow hover:bg-[#eeb61b] text-pup-maroon" 
                  >
                    Next
                  </button>
              ) : (
                <button
                  type="submit"
                  className="bg-pup-yellow hover:bg-[#eeb61b] text-pup-maroon font-bold py-2 px-6 rounded shadow-md transition-transform active:scale-95 w-full"
                >
                  Submit
                </button>
              )}
            </div>
          </div>
          </div>   
        </form>
      </div>
    )} 
    </div>
  );
};


export default AlumniRequestForm;