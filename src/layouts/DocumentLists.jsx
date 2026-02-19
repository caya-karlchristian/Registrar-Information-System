import React, { useState, useRef } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const DocumentLists = () => {
  const [openId, setOpenId] = useState(null);
  const contentRefs = useRef({}); // store refs for each accordion content

  const documents = [
    {
      id: "doc-1",
      title: "New Identification Card",
      desc: "This service is provided for students who are availing of a new identification card because they are transferees or shiftees. Old or resident students may also avail of this service if they wish to update the information in their old ID or if their IDs have been damaged or have become defective",
      reqs: [
        "Current Registration Card - (1) Original Copy", 
        "Form PUP-NRID-5-OFSS-007 - (1) Original Copy",
        "Proof of payment - (1) Original Copy",
        "Remarks: Copy the link to view the copy of new/application of ID",
        "drive.google.com/file/d/1LvhKZbFzsLnoJEvlK_tnSSy6ew5g256T/view"
      ],
    },
    {
      id: "doc-2",
      title: "Replacement of Lost Identification Card",
      desc: "This request is processed by the OSS for students who need replacement of their identification cards due to loss/theft.",
      reqs: [
        "Current Registration Card - (1) Original Copy", 
        "Application for Replacement of Lost Identification Card Form - (1) Original Copy", 
        "Attach with Parents/Guardian ID or Cedula (undergraduates only)",
        "Proof of payment - (1) Original Copy",
        "Remarks: Copy the link to view the copy of new/application of ID https://drive.google.com/file/d/150ijzdHofoMcJzc6L_fChnmM-HSe8GHo/view",
      ],
    },
    {
      id: "doc-3",
      title: "Consultation Service",
      desc: "It is a process that seeks and gives advice, opinion or information between clients and government services. This service includes guidance, counseling and psychological related interviews, test validation, and research.",
      reqs: [
        "Identification card/Registration certificate - (1) Original Copy",
        "Letter of Request noted by Faculty in charged/Chair/Dean - (1) Original Copy",
        "Appointment Slip - (1) Original Copy"
      ],
    },
    {
      id: "doc-4",
      title: "Counseling Service",
      desc: "It is a goal-oriented relationship between a professionally trained counselor and an individual seeking help for bringing about a meaningful awareness and understanding of the self and environment, improving planning and decision making, and formulating new ways of behaving, feeling, and thinking for problem resolution and/or development growth.",
      reqs: [
        "Identification card/Registration certificate - (1) Original Copy",
        "Referral Slip, Call Slip, and Appointment Slip - (1) Original Copy EACH",
        "Personal data sheet - (1) Original Copy"
      ],
    },
    {
      id: "doc-5",
      title: "Recommendation Letter",
      desc: "A document which assesses the student’s attributes, characteristics, and abilities. It is issued by the counselor or psychologist to the requesting student who is asking for recommendation for academic or employment purposes.",
      reqs: [
        "ID card or Registration certificate - (1) Original Copy",
        "Copy of Grades - (1) Photo Copy (from PUP SIS account)",
        "Referral Slip - (1) Original Copy",
        "Remarks: Proceed to the Office of the Student's Services or Office of Admission Services"
      ],
    },
    {
      id: "doc-6",
      title: "Student/Alumni Referral and Recommendation",
      desc: " Letter that recommends a PUP Student/Alumni to an industry for a full–time, part-time, summer employment or internship opportunities.",
      reqs: ["Duly Accomplished Student/ Alumni Request Form - (1) Original Copy"],
    },
    {
      id: "doc-7",
      title: "Permission to Conduct an Activity",
      desc: "The OSS processes requests for permits to conduct activities by the student councils, student publications and accredited student organizations’ for their meetings, assemblies, seminars, conferences, cultural presentations, and other activities.",
      reqs: [
        "Current Registration Card or ID Card (currently enrolled student); Alumni ID or TOR with picture (graduate) - (1) Original Copy",
        "Form PUP-RPCA-5-OFSS-003 - (1) Original Copy (Secure from Student Affairs)",
        "Remarks: The form can be secured from the Office of Student Affairs and Services",
        "Letter of Request - (1) Original Copy"
      ],
    },
    {
      id: "doc-8",
      title: "Application for Graduation SIS and Non-SIS",
      desc: "A student who has already completed all the academic requirements and cleared of all accountabilities can submit his application for graduation.",
      reqs: [
        "Accomplished printed copy of Application for Graduation (SIS Account) - (1) Original Copy",
        "Accomplished Application for Graduation (Non-SIS) - (1) Original Copy",
        "Remarks: Proof of payment, if not covered by RA 10931 covered otherwise known as Universal Access to Quality Tertiary Act of 2017"
      ],
    },
    {
      id: "doc-9",
      title: "Course/Subject Description",
      desc: "A Course/Subject Description is requested by the client to describe the content of the course taken by the student within the curriculum.",
      reqs: [
        "Student’s Request Letter - (1) Original Copy",
        "General Clearance showing the client is cleared of all accountabilities - (1) Original Copy",
        "2 (two) pcs. '2x2' picture in Formal Attire - (1) Original Copy",
        "Documentary stamp - (1) Original Copy",
        "Proof of payment - (1) Original Copy",
        "1 Long Brown Envelope",
        "Reminder: When claiming documents: Authorization letter and ID if the claimant is an immediate family member. Special Power of Attorney (SPA) if the claimant is other than the immediate family."
      ],
    },
    {
      id: "doc-10",
      title: "Correction of Entry of Grade, Completion of Incomplete Grade, Late Reporting of Grade",
      desc: "Correction of entry should be accomplished within a period of one semester upon receipt of grade and the Late Reporting of Grades Form should be accomplished within a period of one year. Incomplete (Inc) is temporarily given to a student who may pass the subject, but not yet complied with all its requirements. Such requirements shall be satisfied within one year from the end of the term; otherwise the grade shall be lapsed “No Credit (N) or a failing mark.",
      reqs: [
        "Accomplished Completion Form - (3) Original Copies (Download from PUP website)",
        "Photocopy of Class Record of the Faculty - 1 Photo Copy",
        "Notarized Affidavit for Change of Grade signed by Professor - Original Copy",
        "Proof of payment - (1) Original Copy",
        "Official Logbook - (1) Original Copy"
      ],
    },
    {
      id: "doc-11",
      title: "Course Accreditation (SHS to Bridge)",
      desc: "Subjects taken in another Senior High School shall be accredited to Bridge Course Subject only and zero units as required in the PUP curriculum.",
      reqs: [
        "Accomplished Course Accreditation Form (Download from PUP Website) - (1) Original Copy",
        "Curriculum Sheet used upon admission - (1) Original Copy",
        "Informative copy of grades for PUP SHS graduates - (1) Original Copy",
        "Form 138 or 137 for graduates from other Senior High School- (1) Original Copy"
      ],
    },
    {
      id: "doc-12",
      title: "Course Accreditation (Transferees)",
      desc: " Subjects taken in another university/college of recognized standing not exceeding 30 units including P.E. and NSTP shall be accredited provided they have the same subject description as those in the PUP curriculum. All subjects taken by transferees from branches and campuses of PUP are accredited provided the transferring student is enrolled in the same course. If not, only mandatory and general education subjects are accredited.",
      reqs: [
        "A. FOR TRANSFEREES FROM ANOTHER UNIVERSITY/COLLEGE:",
        "1. Accomplished Course Accreditation Form (Download from PUP Website)",
        "2. Curriculum Sheet upon Admission to PUP - (1) Original Copy",
        "3. Certified Copy of TOR with Remarks: 'Copy for PUP' - (1) Original Copy",
        "4. Subject Description taken from other school/university - (1) Original Copy",
        "5. Proof of Payment - (1) Original Copy",
        "B. FOR TRANSFEREES FROM PUP BRANCH/CAMPUS TO MAIN:",
        "1. Accomplished Accreditation Form (Download from PUP Website)",
        "2. Curriculum Sheet upon Admission to PUP - (1) Original Copy",
        "3. Certified Copy of TOR with Remarks: 'Copy for PUP' - (1) Original Copy"
      ],
    },
    {
      id: "doc-13",
      title: "Processing of Request for Credentials Service (Certificates of Attendance, Graduation, Medium of Instruction, General Weighted Average, Non Issuance of Special Order and Certified True Copy)",
      desc: "A student/client can apply for these certifications as needed while a Certificate of Transfer Credential/Honorable Dismissal is a document certifying that a student has no pending accountabilities thereby he/she is honorably dismissed from the University.",
      reqs: [
        "Student’s Request Letter - (1) Original Copy",
        "General Clearance showing the client is cleared of all accountabilities - (1) Original Copy",
        "2 (two) pcs of 2x2 pictures in Formal Attire (Uploaded to ODRS)",
        "Official receipt for documentary stamp - (1) Original Copy",
        "Proof of payment - (1) Original Copy",
        "1 Long Brown Envelope"
      ],
    },
    {
      id: "doc-14",
      title: "Processing of Request for Credentials Service (Certification, Authentication, Verification ) CAV/APOSTILE",
      desc: "A graduated student/client can apply for the Certification, Verification, Authentication (CAV/Apostile) and submits a photocopy of his credentials to be certified and put in a sealed envelope for DFA, CHED or PRC.",
      reqs: [
        "Student’s Request Letter - (1) Original Copy",
        "General Clearance showing the client is cleared of all accountabilities - (1) Original Copy",
        "Letter request addressed to CHED Regional Director (for CAV-CHED request only) - (1) Original Copy",
        "2 (two) pcs of 2x2 pictures in Formal Attire",
        "Proof of payment - (1) Original Copy",
        "1 Long Brown Envelope"
      ],
    },
    {
      id: "doc-15",
      title: "Transcript of Records (TOR)",
      desc: "For process requests for credentials of students and alumni, transcript of Records (TOR) is one of the credentials requested. This is an official copy of a student’s academic subjects enrolled/taken with corresponding remarks/grade given by course faculty with signature of the University Registrar and counter signed by a student record staff.",
      reqs: [
        "A. FIRST COPY (For New Graduates/Transferees):",
        "1. Accomplished and printed copy of the application and payment voucher from the Campus registrar. - (1) Original (To be Printed by the Registrar)",
        "2. General Clearance showing the client is cleared of all accountabilities - (1) Original Copy (Printed from SIS)",
        "3. Certificate of Candidacy - (1) Original (Printed from SIS)",
        "4. Certificate of Conferment of Degree (Dummy Diploma) - (1) Original Copy (Remarks: Awarded during graduation ceremony)",
        "5. 2 (two) pcs of 2x2 picture in Academic Gown/Toga ",
        "6. Documentary stamp - (1) Sample",
        "7. Proof of payment (if not covered by RA 10931) - (1) Original Copy",
        "Reminder: When claiming documents: 8.1 Authorization letter and ID if claimant is immediate family member Special Power of Attorney (SPA) if the claimant is other than the immediate family.",
        "B. SECOND AND SUCCEEDING COPIES:",
        "1. Letter of request by the student - (1) Original (To Registrar's Office)",
        "2. 2 (two) pcs of2x2 picture in Formal Attire (To be submitted to the Admission and Registration Office)",
        "3. Documentary Stamp - (1) Sample",
        "4. Proof of Payment - (1) Original Copy",
        "5. Acknowledged/Signed Copy of Transfer  - (1) Original (Remarks: School where applicant is presently enrolled)",
        "Reminder: .When claiming documents: a.Authorization letter and ID if claimant is immediate family member Special Power of Attorney (SPA) if the claimant is other than the immediate family."
      ],
    },
    {
      id: "doc-16",
      title: "Informative Copy of Grades",
      desc: "Processes certified true copy of complete academic records or informative copy of credits and grades previously taken, duly signed by the Campus Registrar and Campus Director.",
      reqs: [
        "Letter of request stating the purpose - (1) Original Copy",
        "Proof of payment - (1) Original Copy",
        "PUP School Identification Card - (1) Original Copy",
        "Authorization letter (if claimed by a representative) - (1) Original Copy"
      ],
    },
    {
      id: "doc-17",
      title: "Request for Leave of Absence (LOA)",
      desc: "A student intends to take a leave of absence exceeding one semester but not to exceed one academic year shall file a letter of intent with the Academic Head concerned for approval, stating the reason for leave. If the leave exceeds one academic year, he/she shall lose status as a student in residence",
      reqs: [
        "Letter of intent addressed to the Campus Registrar - (1) Original Copy",
        "Documents as proof (e.g., Medical Certificate, Employment Order) - (1) Original Copy",
        "Application for Change of Enrollment (ACE) if currently enrolled - (1) Original Copy"
      ],
    },
    {
      id: "doc-18",
      title: "Re-Admission",
      desc: "Students considered for re-admission depending on their previous scholastic performance, and the availability of slots. He/she must have complied with all other requirements for re-admission. If re-admitted within two (2) years, returning students shall be allowed to follow their old course of study or curriculum; otherwise they shall follow the curriculum existing at the time of their re-admission.",
      reqs: [
        "Accomplished re-admission form (To be uploaded in the ODRS) - (1) Original Copy",
        "Informative Copy of Grades/Transcript of Records - (1) Original Copy",
        "Curriculum Sheet - (1) Original Copy",
        "Latest Certificate of Registration - (1) Original Copy",
        "2 (two) pcs of 2x2 colored picture (White background with name) - (2) Samples",
        "Official Receipt for re-admission - (1) Original Copy",
        "Medical Clearance (PUP Clinic or Government Clinic) - (1) Original Copy"
      ],
    },
    {
      id: "doc-19",
      title: "Good Moral Character",
      desc: "Issued for scholarship, employment, further studies, or board exams.",
      reqs: [
        "Registration Card or Identification Card (for currently enrolled student); Alumni ID or TOR with picture (for graduate) - (1) Original Copy",
        "Form PUP-ACGM-5-OFSS-0007 (Secure from Student Affairs) - (1) Original Copy",
        "Proof of Payment - (1) Original Copy"
      ],
    }
  ];

  const toggleAccordion = (id) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans">
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-10">
        {/* --- HEADER --- */}
        <div className="mb-8 border-b-2 border-[#4a120e]/10 pb-6">
          <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">
            Document List <span className="text-[#4a120e]">&</span> Requirements
          </h1>
        </div>

        {/* --- FIXED GRID LAYOUT --- */}
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {documents.map((doc) => {
            const isOpen = openId === doc.id;
            const contentHeight = contentRefs.current[doc.id]?.scrollHeight || 0;

            return (
              <div
                key={doc.id}
                className={`transition-all duration-300 bg-white h-fit border rounded-[2rem] overflow-hidden ${
                  isOpen
                    ? 'border-[#4a120e] shadow-xl ring-1 ring-[#4a120e]/10'
                    : 'border-gray-200 shadow-sm hover:border-gray-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(doc.id)}
                  className={`w-full flex justify-between items-center p-7 text-left focus:outline-none transition-colors ${
                    isOpen ? 'bg-[#4a120e]/5' : 'bg-white'
                  }`}
                >
                  <h4
                    className={`text-base font-black tracking-tight leading-tight flex-1 pr-4 ${
                      isOpen ? 'text-[#4a120e]' : 'text-gray-800'
                    }`}
                  >
                    {doc.title}
                  </h4>

                  <span
                    className={`p-2 rounded-full transition-all duration-300 shrink-0 ${
                      isOpen
                        ? 'bg-[#4a120e] text-white rotate-180'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <ChevronDownIcon className="w-4 h-4" />
                  </span>
                </button>

                <div
                  ref={(el) => (contentRefs.current[doc.id] = el)}
                  style={{
                    maxHeight: isOpen ? `${contentHeight}px` : '0px',
                  }}
                  className="transition-all duration-500 ease-in-out overflow-hidden"
                >
                  <div className="px-7 pb-7 pt-0">
                    <div className="h-px bg-gray-100 mb-5" />
                    <div className="space-y-5">
                      <div>
                        <h5 className="text-[9px] font-black text-[#4a120e] uppercase tracking-[0.2em] mb-2">
                          Description
                        </h5>
                        <p className="text-gray-600 italic text-[13px] leading-relaxed">
                          {doc.desc}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-[1.5rem] p-5 border border-gray-100">
                        <h5 className="text-[9px] font-black text-[#4a120e] uppercase tracking-[0.2em] mb-4">
                          Requirements
                        </h5>
                        <ul className="space-y-3">
                          {doc.reqs.map((req, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-3 text-[12px] text-gray-700 font-bold"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-[#4a120e] mt-1.5 shrink-0" />
                              <span className="flex-1 leading-snug">{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </main>
      </div>
    </div>
  );
};

export default DocumentLists;
