import React, { useState } from 'react';
import InputGroup from '../components/InputGroup.jsx';
import CheckboxItem from '../components/Checkbox.jsx';
import DropdownGroup from '../components/DropDown.jsx';

const RequestForm = () => {
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    privacyConsent: false,
    onsiteTransaction: false,
    certificationsAgreed: false,
    remindersAgreed: false,
    authLetterAgreed: false,
    unclaimedAgreed: false,
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
    yearGraduated: '',
    studentNumber: '',
    documentsRequested: [],
    purposeOfRequest: '',
    certification: '',
    termsAccepted: false,
    noRequests: false,
    doneRequest: false,
    receiptNumber: '',
    dateOfPayment: '',
    numberOfCopies: '',
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
    e.preventDefault(); // Prevent form refresh
    if (currentStep < 6) setCurrentStep(currentStep + 1);
  };

  const prevStep = (e) => {
    e.preventDefault(); 
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form Submitted with Data:", formData);
    alert("Request Submitted! Check console for data.");
  };

  const stepProcess = {
            1: "Terms & Conditions",
            2: "Student Profile",
            3: "Student Records",
            4: "Student Credentials",
            5: "TOR For Further Studies",
            6: "Student Request",
          };

  return (
    <div className="min-h-screen pb-20">
      
      <div className="max-w-5xl mx-auto">
        <form className="bg-pup-dark-maroon shadow-2xl border-t-4 border-pup-yellow h-[900px] lg:h-[750px] flex flex-col relative">
          
          <div className="flex flex-col items-center pt-8 pb-4">
            <div className="flex space-x-3 mb-2">
              {[1, 2, 3, 4, 5, 6].map((step) => (
                <div 
                  key={step}
                  className={`w-4 h-4 rounded-full border border-pup-yellow ${
                    step <= currentStep ? 'bg-pup-yellow' : 'bg-white'
                  }`}
                />
              ))}
            </div>
            <p className="text-pup-yellow font-bold text-sm tracking-wider">
              {currentStep} of 6 
            </p>

          <h2 className="text-white text-xl font-semibold mt-2">
            {stepProcess[currentStep]}
          </h2>

          </div>

          <div className="flex-1 px-30 md:px-16 py-4 text-white">
            
            {/* STEP 1: TERMS & CONDITIONS */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fadeIn text-[13px] text-justify">
                <CheckboxItem 
                  name="privacyConsent" 
                  checked={formData.privacyConsent} 
                  onChange={handleCheckboxChange}
                  text="In compliance In compliance with the Data Privacy Act (DPA) of 2012, 
                  and its implementing rules and regulations (IRR), upon filling up this 
                  Google Form, I am hereby providing my consent and authorization to use 
                  my personal data for this request. " 
                  className="checkbox-pup"
                />

                <CheckboxItem 
                  name="onsiteTransaction" 
                  checked={formData.onsiteTransaction} 
                  onChange={handleCheckboxChange}
                  text="This request is only for ONSITE TRANSACTION with Official Receipt issued by the Cashier's Office" 
                  className="checkbox-pup"
                />
                
                <CheckboxItem classname="checkbox-pup"
                  name="certificationsAgreed"
                  checked={formData.certificationsAgreed} 
                  onChange={handleCheckboxChange} 
                  text="All CERTIFICATIONS are processed within three (3) working days, while TOR is within 12 working days. TOR is within 12 working days." 
                />

                <CheckboxItem classname="checkbox-pup"
                  name="remindersAgreed"
                  checked={formData.remindersAgreed}
                  onChange={handleCheckboxChange}
                  text="REMINDERS: For TOR (first copy), please bring one documentary stamp, 
                  two colored 2x2 picture in academic grown,  PUP ID, and dummy diploma 
                  (in case of loss, please bring an affidavit of loss).
                  
                  For TOR (second copy), please bring one documentary stamp (violet), 
                  two colored 2x2 picture in formal attire with white background.
                  
                  For Honorable Dismissal and other certifications, please bring one 
                  violet documentary stamp (or two brown documentary stamp) per requested 
                  document."
                  />
                
                <CheckboxItem
                  name="authLetterAgreed"
                  checked={formData.authLetterAgreed}
                  onChange={handleCheckboxChange}
                  text="In compliance with R.A. No. 10173 (Data Privacy Act of 2012), 
                  representative must submit a signed AUTHORIZATION LETTER if claimant 
                  is immediate family member or SPECIAL POWER OF ATTORNEY if claimant 
                  is other than immediate family member with original valid ID of both 
                  owner/student and representative upon claiming the requested documents."
                />

                <CheckboxItem
                  name="unclaimedAgreed"
                  checked={formData.unclaimedAgreed}
                  onChange={handleCheckboxChange}
                  text="All documents unclaimed within 
                  90 days on the date of request will be shredded automatically."
                  classname="checkbox-pup"
                />

              </div>
            )}

            {/* STEP 2: STUDENT PROFILE */}
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

                <div className="w-full ">
                   <InputGroup 
                     label="Date of Birth"
                     type="date" 
                     name="dob"
                     value={formData.dob}
                     onChange={handleInputChange}
                     className="w-full p-2 rounded text-black bg-white focus:outline-none focus:ring-2 focus:ring-[#FFC72C]" 
                   />
                </div>

                <InputGroup name="address" label="Present/Permanent Mailing Address" value={formData.address} onChange={handleInputChange} />
                <InputGroup name="contactNumber" label="Contact Number" placeholder="09XXXXXXXXX" value={formData.contactNumber} onChange={handleInputChange} />
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-6 w-full">
                  
                  <InputGroup 
                    name="yearAdmitted" 
                    label="Admitted in PUP Taguig (S.Y.)" 
                    value={formData.yearAdmitted} 
                    onChange={handleInputChange} 
                    placeholder='XXXX-XXXX'
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
                      "BS in Hospitality Management",
                      "BS in Tourism Management",
                    ]}
                  />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <DropdownGroup
                    name="yearLevel"
                    label="For Undergraduate: Year Level "
                    value={formData.yearLevel}
                    onChange={handleInputChange}
                    options={[
                      "1st Year",
                      "2nd Year",
                      "3rd Year",
                      "4th Year",
                    ]}
                    placeholder="Select Year Level"
                  />

                  <InputGroup
                    name="lastSYAttended"
                    label="Last S.Y. Attended"
                    value={formData.lastSYAttended}
                    onChange={handleInputChange}
                    placeholder='XXXX-XXXX'
                  />
                </div>

                  <InputGroup
                    name="yearGraduated"
                    label="For Alumni: Year Graduated"
                    value={formData.yearGraduated}
                    onChange={handleInputChange}
                    placeholder='XXXX'
                  />

                  <InputGroup
                    name="studentNumber"
                    label="Student Number"
                    value={formData.studentNumber}
                    onChange={handleInputChange}
                    className="uppercase"
                    placeholder='e.g 2023-00101-TG-0'
                  />

                </div>
              </div>
            )}

            {(currentStep === 4) && (
              <div className="space-y-6 animate-fadeIn ">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-6 w-full mt-10">
                  <DropdownGroup 
                    name="documentsRequested" 
                    label="Documents Requested"
                    value={formData.documentsRequested}
                    onChange={handleInputChange}
                    options={[
                      "Certification of Enrollment",
                      "Certification of Grades",
                      "Certification of Academic Standing",
                      "Certification of No Academic Standing",
                      "Certification of No Record",
                      "Other"
                    ]}
                  />

                  <DropdownGroup 
                    name="certification" 
                    label="For Certification, please specify"
                    value={formData.certification}
                    onChange={handleInputChange}
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

                  <DropdownGroup 
                    name="purposeOfRequest" 
                    label="Purpose of Request"
                    value={formData.purposeOfRequest}
                    onChange={handleInputChange}
                    options={[
                      "For Admission",
                      "For Employment",
                      "For Scholarship",
                      "For Transfer",
                      "Other"
                    ]}
                  />

                  <CheckboxItem
                    text="Are you a graduate requesting for FIRST COPY of Diploma/TOR/Certificate of Graduation"
                    name="termsAccepted"
                    checked={formData.termsAccepted}
                    onChange={handleInputChange}
                  />

              </div>
              </div>
            )}

            {(currentStep === 5) && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-6 w-full mt-10">
                  <p className="text-sm text-justify">For TOR request for further studies, 
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
            {currentStep === 6 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-6 w-full mt-10">
                  <InputGroup
                    name="receiptNumber"
                    label="Official Receipt Number"
                    value={formData.receiptNumber}
                    onChange={handleInputChange}
                    placeholder='e.g 000-000000'
                  />
                  
                  <InputGroup
                    name="dateOfPayment"
                    type="date"
                    label="Date reflected on the Official Receipt"
                    value={formData.dateOfPayment}
                    onChange={handleInputChange}
                    placeholder='e.g 01/01/2024'
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
          <div className="p-8 flex justify-between items-center mt-auto">
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

            {/* Next / Submit Button */}
            <div className="w-32">
              {currentStep < 6 ? (
                <button 
                  onClick={nextStep}
                  type="button" // Important: type="button" prevents submit
                  className="bg-pup-yellow hover:bg-[#eeb61b] text-pup-maroon font-bold py-2 px-6 rounded shadow-md transition-transform active:scale-95 w-full"
                >
                  Next
                </button>
              ) : (
                // STEP 6: This is the actual SUBMIT button
                <button 
                  onClick={handleSubmit}
                  type="submit" 
                  className="bg-pup-yellow hover:bg-[#eeb61b] text-pup-maroon font-bold py-2 px-6 rounded shadow-md transition-transform active:scale-95 w-full "
                >
                  Submit
                </button>
              )}
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};


export default RequestForm;