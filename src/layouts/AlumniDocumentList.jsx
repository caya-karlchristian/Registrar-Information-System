import React, { useState, useRef } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const AlumniDocumentList = () => {
  const [openId, setOpenId] = useState(null);
  const contentRefs = useRef({}); // store refs for each accordion content

  const documents = [
  {
    id: "doc-1",
    title: "Student/Alumni Referral and Recommendation",
    desc: "Letter that recommends a PUP Student/Alumni to an industry for a full–time, part-time, summer employment or internship opportunities.",
    reqs: [
      "Duly Accomplished Student/ Alumni Request Form - (1) Original Copy"
    ],
  },
  {
    id: "doc-2",
    title: "Course/Subject Description",
    desc: "A Course/Subject Description is requested by the client to describe the content of the course taken by the student within the curriculum.",
    reqs: [
      "Student’s Request Letter - (1) Original Copy",
      "General Clearance showing the client is cleared of all accountabilities - (1) Original Copy",
      "2 (two) pcs. 2x2 picture in Formal Attire - (1) Original Copy",
      "Documentary stamp - (1) Original Copy",
      "Proof of payment - (1) Original Copy",
      "1 (one) Long Brown Envelope - (1) Original Copy",
      "Claiming: Authorization letter and ID if the claimant is an immediate family member. Special Power of Attorney (SPA) if the claimant is other than the immediate family. - (1) Original Copy"
    ],
  },
  {
    id: "doc-3",
    title: "Certificates of Attendance, Graduation, Medium of Instruction, General Weighted Average, Non Issuance of Special Order and Certified True Copy",
    desc: "A student/client can apply for these certifications as needed while a Certificate of Transfer Credential/Honorable Dismissal is a document certifying that a student has no pending accountabilities thereby he/she is honorably dismissed from the University.",
    reqs: [
      "Student’s Request Letter - (1) Original Copy",
      "General Clearance showing the client is cleared of all accountabilities - (1) Original Copy",
      "2 (two) 2x2 picture in Formal Attire (To be uploaded in ODRS)",
      "Official receipt for documentary stamp - (1) Original Copy",
      "Proof of payment - (1) Original Copy",
      "Long Brown Envelope - (1 pc)",
      "Claiming: Authorization letter and ID if the claimant is an immediate family member. Special Power of Attorney (SPA) if the claimant is other than the immediate family. - (1) Original Copy"
    ],
  },
  {
    id: "doc-4",
    title: "CAV/APOSTILLE (Certification, Authentication, Verification)",
    desc: "A graduated student/client can apply for the Certification, Verification, Authentication (CAV/Apostile) and submits a photocopy of his credentials to be certified and put in a sealed envelope for DFA, CHED or PRC.",
    reqs: [
      "Student’s Request Letter - (1) Original Copy",
      "General Clearance showing the client is cleared of all accountabilities - (1) Original Copy",
      "Letter request addressed to CHED Regional Director (for CAV-CHED only) - (1) Original Copy",
      "2 (two)2x2 picture in Formal Attire - (2 pcs)",
      "Official receipt for documentary stamp - (1) Original Copy",
      "Proof of payment - (1) Original Copy",
      "Long Brown Envelope - (1 pc)",
      "Claiming: Authorization letter and ID if claimant is immediate family member Special Power of Attorney (SPA) if the claimant is other than the immediate family."
    ],
  },
  {
    id: "doc-5",
    title: "Transcript of Records (TOR)",
    desc: "For process requests for credentials of students and alumni, transcript of Records (TOR) is one of the credentials requested. This is an official copy of a student’s academic subjects enrolled/taken with corresponding remarks/grade given by course faculty with signature of the University Registrar and counter signed by a student record staff.",
    reqs: [
        "FIRST COPY FOR NEW GRADUATE",
        "A.1. Accomplished and printed copy of the application and payment voucher from the Campus registrar. - Original Copy (Remarks: To be Printed by the Registrar)",
        "A.2. General Clearance showing the client is cleared of all accountabilities - Original Copy (Remarks: To be printed from SIS)",
        "A.3. Certificate of Candidacy - Original Copy (Remarks: To be printed from SIS)",
        "A.4. Certificate of Conferment of Degree (Dummy Diploma) - Original Copy (Remarks: Awarded during graduation ceremony)",
        "A.5. 2 (two) 2x2 picture in Academic Gown (Toga)",
        "A.6. 1pc Documentary stamp ",
        "A.7. Proof of payments(for applicants not covered by RA 10931 otherwise known as Universal Access to Quality Tertiary Education Act of 2017) - 1 Original Copy",
        "A.8. When claiming documents: 8.1 Authorization letter and ID if claimant is immediate family member Special Power of Attorney (SPA) if the claimant is other than the immediate family. - Original Copy (Remarks: To be submitted by the representative of the client)",
        "SECOND AND SUCCEEDING COPIES",
        "B.1. Letter of request by the student - Original Copy (Remarks: To be submitted to the Registrar’s Office)",
        "B.2. 2(two) 2x2 picture in formal attire (Remarks: To be submitted to the Admission and Registration Office)",
        "B.3. (1) Documentary Stamp",
        "B.4. Proof of payment - Original Copy",
        "B.5. Acknowledged/Signed Copy of Transfer and Credential/Honorable Dismissal - Original Copy (Remarks: School where applicant is presently enrolled)",
        "B.6. When claiming documents: Authorization letter and ID if claimant is immediate family member Special Power of Attorney (SPA) if the claimant is other than the immediate family. - (1) Original Copy (Remarks: To be submitted by the representative of the client)"
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

export default AlumniDocumentList;
