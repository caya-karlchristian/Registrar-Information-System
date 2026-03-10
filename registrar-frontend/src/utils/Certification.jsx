import React from "react";
import {
  CertificateTitle,
  RegistrarDateTitle,
  FooterInfo,
  TextBlock,
  ReceiptInfo,
  RegistrarSignature,
  DirectorSignature,
  StandardCertLayout,
  CertParagraph,
  IssuedLine,
  IssuedLineAforementioned,
  PupLetterhead,
  EndorsementNoteBlock,
  bold,
} from "../utils/helpers.jsx";
import { formatDateFormal, formatDateOrdinal } from "./formatters.js";
import puplogoimage from "../assets/puplogoimage.png";

/** "syAdmitted is not yet fully functional - need update" */
export const CERT_CONFIG = {
  "Certificate of Graduation": {
    fields: ["fullName", "course", "latinHonors", "dateGraduated", "diplomaNum"],
    renderBody: (data) => (
      <StandardCertLayout date={data.date}>
        <CertParagraph>
          This is to certify that {bold(data.fullName)} is a {bold(data.educationLevel)} of the
          Polytechnic University of the Philippines Taguig Campus and received the degree of{" "}
          {bold(data.course)} {bold(data.latinHonors)} on {bold(formatDateFormal(data.dateGraduated))}.
        </CertParagraph>
        <IssuedLineAforementioned date={data.date} />
        <RegistrarSignature />
        <FooterInfo className="mt-4" diplomaNum={data.diplomaNum} date={bold(formatDateFormal(data.date))} />
      </StandardCertLayout>
    ),
  },

  "Certificate of GWA": {
    fields: ["fullName", "course", "gwa", "officialReceiptNum"],
    renderBody: (data) => (
      <StandardCertLayout date={data.date}>
        <CertParagraph>
          This is to certify that {bold(data.fullName)} is a {bold(data.educationLevel)} of the
          Polytechnic University of the Philippines Taguig Campus with the degree of{" "}
          {bold(data.course)} and obtained a General Weighted Average of {bold(data.gwa)}.
        </CertParagraph>
        <IssuedLineAforementioned date={data.date} />
        <RegistrarSignature />
        <ReceiptInfo officialReceiptNum={data.officialReceiptNum} date={bold(formatDateFormal(data.date))} />
      </StandardCertLayout>
    ),
  },

  "Certificate of Graduate Honor": {
    fields: ["fullName", "course", "latinHonors", "major", "eligibilityType", "officialReceiptNum", "dateGraduated"],
    renderBody: (data) => (
      <StandardCertLayout date={data.date}>
        <CertParagraph>
          This is to certify that {bold(data.fullName)} is a {bold(data.educationLevel)} of the
          Polytechnic University of the Philippines Taguig Campus with the degree of{" "}
          {bold(data.course)} {bold("major in")} {bold(data.major)} {bold(data.latinHonors)}{" "}
          on {bold(formatDateFormal(data.dateGraduated))}.
        </CertParagraph>
        <CertParagraph className="mb-10">
          This certification is issued this {formatDateFormal(data.date)} upon request of the
          aforementioned individual in support of their application for {bold(data.eligibilityType)}{" "}
          conferred by the Civil Service Commission
        </CertParagraph>
        <RegistrarSignature />
        <ReceiptInfo officialReceiptNum={data.officialReceiptNum} date={bold(formatDateFormal(data.date))} />
      </StandardCertLayout>
    ),
  },

  "Consular Certification": {
    fields: ["fullName", "course", "officialReceiptNum", "major", "dateGraduated"],
    renderBody: (data) => (
      <div className="text-[9px] sm:text-[10px] text-gray-800 leading-relaxed">
        <TextBlock className="text-left text-gray-700 print:text-[10pt]">{formatDateFormal(data.date)}</TextBlock>
        <TextBlock className="mb-4 print:text-[10pt]">
          <p>The Consular Section</p>
          <p>Notarials and Authentication Unit</p>
          <p>Philippine Embassy</p>
          <p>P.O. Box 3215</p>
          <p>United Arab Emirates</p>
          <p>Fax +971 2 6390002</p>
          <p>Email: auhpe@philembassy.ae</p>
          <p>Website: www.abudhabipe.dfa.gov.ph</p>
        </TextBlock>
        <TextBlock className="mb-5 print:text-[10pt]">Gentlemen:</TextBlock>
        <CertificateTitle title="Certification of Completed Degree and Special Order" />
        <div className="space-y-3 leading-[1.9] text-justify print:text-[11pt]">
          <p>
            This is to certify that {bold(data.fullName)} graduated from this University with a
            degree in {bold(data.course)} {bold("major in")} {bold(data.major)}{" "}
            on {bold(formatDateFormal(data.dateGraduated))}.
          </p>
          <p>
            As a State University, the Polytechnic University of the Philippines does not issue
            "Special Order" to its graduates.
          </p>
          <p>
            This Certification has been issued upon the request of the aforementioned name for
            whatever legal purpose it may serve.
          </p>
        </div>
        <TextBlock className="mt-6 mb-5 px-27 text-right print:text-[11pt]">Very truly yours,</TextBlock>
        <DirectorSignature />
        <ReceiptInfo officialReceiptNum={data.officialReceiptNum} date={bold(formatDateFormal(data.date))} />
      </div>
    ),
  },

  "Certificate of Enrollment - PRESENT": {
    fields: ["fullName", "course", "semesters", "syAdmitted", "diplomaNum"],
    renderBody: (data) => (
      <StandardCertLayout date={data.date}>
        <CertParagraph>
          This is to certify that {bold(data.fullName)} is enrolled in this Campus,{" "}
          {data.semesters} of S.Y {data.syAdmitted}, under our {bold(data.course)} program.
        </CertParagraph>
        <IssuedLine date={data.date} />
        <RegistrarSignature />
        <ReceiptInfo officialReceiptNum={data.officialReceiptNum} date={bold(formatDateFormal(data.date))} />
      </StandardCertLayout>
    ),
  },

  "Certificate of Enrollment - UNDERGRAD": {
    fields: ["fullName", "course", "semesters", "lastSemesters", "syAdmitted", "lastSy", "diplomaNum", "units", "semestersNum"],
    renderBody: (data) => (
      <StandardCertLayout date={data.date}>
        <CertParagraph>
          This is to certify that {bold(data.fullName)} was enrolled in this Campus,{" "}
          {data.semesters} of S.Y {data.syAdmitted}, until {data.lastSemesters} of S.Y{" "}
          {data.lastSy}, under our {bold(data.course)} with a total of {bold(data.units)}{" "}
          {bold("units")} for {bold(data.semestersNum)} {bold("semester")}.
        </CertParagraph>
        <IssuedLine date={data.date} />
        <DirectorSignature />
        <ReceiptInfo officialReceiptNum={data.officialReceiptNum} date={bold(formatDateFormal(data.date))} />
      </StandardCertLayout>
    ),
  },

  "Non Issuance of SO": {
    fields: ["fullName", "course", "major", "officialReceiptNum"],
    renderBody: (data) => (
      <StandardCertLayout date={data.date}>
        <CertParagraph className="mb-5">
          As a {bold("State University the Polytechnic University of the Philippines (PUP)")} does
          not issue "{bold("Special Order")}"" to its graduates.
        </CertParagraph>
        <CertParagraph className="mb-5">
          Pursuant to its Charter, the PUP Academic Council fixes the requirement for graduation
          and recommends to the Board of Regents students who are recipient of the degrees and who
          late received such recommendation.
        </CertParagraph>
        <CertParagraph className="mb-15">
          Issued this {formatDateOrdinal(data.date)} upon request of {bold(data.fullName)} a{" "}
          {bold(data.course)} {bold("major in")} {bold(data.major)} graduate of this University.
        </CertParagraph>
        <DirectorSignature />
        <ReceiptInfo className="mt-4" officialReceiptNum={data.officialReceiptNum} date={bold(formatDateFormal(data.date))} />
      </StandardCertLayout>
    ),
  },

  "Certificate of Ladderized Course": {
    fields: ["fullName", "course", "major", "ladderizedDegree", "officialReceiptNum"],
    renderBody: (data) => (
      <StandardCertLayout date={data.date}>
        <CertParagraph className="mb-5">
          This is to certify that {bold(data.fullName)} is a bonafide student of this University
          taking up the {bold(data.course)} {bold("major in")} {bold(data.major)}
        </CertParagraph>
        <CertParagraph className="mb-5">
          This also certifies that this course is under a ladderized program. Holders of this
          program have the opportunity to further their studies to {bold(data.ladderizedDegree)}{" "}
          when all the requirements have been met.
        </CertParagraph>
        <CertParagraph className="mb-15">
          This certification is being issued this upon request of the aforementioned name for
          whatever legal purpose it may serve.
        </CertParagraph>
        <RegistrarSignature />
        <ReceiptInfo className="mt-4" officialReceiptNum={data.officialReceiptNum} date={bold(formatDateFormal(data.date))} />
      </StandardCertLayout>
    ),
  },

  "CAV Request Letter": {
    hideHeaderFooter: true,
    fields: ["fullName", "course", "major", "studentStatus", "date"],
    renderBody: (data) => (
      <>
        <div className="text-right text-xs sm:text-sm text-gray-700 -mt-5">
          <p>{formatDateFormal(data.date)}</p>
          <p className="text-[10px] text-gray-500">Date</p>
        </div>
        <div className="mb-6 text-[12px] sm:text-[13px]">
          <p className="mb-2">CAV Request Letter</p>
          <p>Atty. Marco Cicero F. Domingo, CESE</p>
          <p>Director IV</p>
          <p>CHED-NCR</p>
        </div>
        <p className="mb-6 text-[12px] sm:text-[13px]">Madam:</p>
        <p className="indent-8 text-[12px] sm:text-[13px] leading-relaxed text-justify mb-6">
          I, <strong className="underline">{data.fullName || "___________________"}</strong>, would
          like to request your good office, for the authentication of my academic records in{" "}
          <strong className="underline">
            {data.course || "___________________"}
            {data.major ? ` major in ${data.major}` : ""}
          </strong>{" "}
          issued by Polytechnic University of the Philippines - Taguig. In this connection, I am
          submitting the following records through the Office of the Branch Registrar.
        </p>
        <ol className="list-decimal list-inside text-[12px] sm:text-[13px] ml-10 mb-6 space-y-1">
          <li>Certified True Copy of Transcript of Records</li>
          <li>Certified True Copy of Diploma</li>
          <li>Certification of Non-Issuance of Special Order</li>
        </ol>
        <p className="text-[12px] sm:text-[13px] mb-10">Thank you,</p>
        <div className="flex justify-end pr-4 sm:pr-8 -mt-4">
          <div className="text-center w-56">
            <p className="text-[12px] sm:text-[13px]">Respectfully yours,</p>
            <div className="mt-8 border-b border-gray-800 w-full" />
            <p className="text-[11px] sm:text-[12px] mt-1">Student</p>
            <p className="text-[10px] sm:text-[11px] text-gray-600">(Signature over printed name)</p>
          </div>
        </div>
        <div className="border-t-2 border-gray-800 text-center py-1 my-4">
          <p className="font-bold text-[12px] sm:text-[13px]">1<sup>st</sup> Endorsement</p>
        </div>
        <PupLetterhead date={data.date} />
        <p className="text-[12px] sm:text-[13px] leading-relaxed text-justify mb-4">
          Respectfully forwarded to the Director IV, Commission on Higher Education-National Capital
          Region, the request of
        </p>
        <div className="flex gap-4 mb-1">
          {[
            [data.fullName || "______________________________", "(Name of Student,"],
            [data.studentStatus || "______________________________", "Status"],
            [data.course || "______", "etc.)"],
          ].map(([value, label], i) => (
            <div key={i} className="flex-1 text-center">
              <p className="font-bold text-[12px] sm:text-[13px] border-b border-gray-800 pb-1">{value}</p>
              <p className="text-[10px] text-gray-600">{label}</p>
            </div>
          ))}
        </div>
        <p className="text-[12px] sm:text-[13px] leading-relaxed text-justify mb-8">
          for the Authentication of her record, recommending approval, with the certification that
          the documents forwarded herewith are true and authentic copies of the documents issued
          and/or kept by this institution
        </p>
        <div className="flex justify-end pr-4 sm:pr-8 mb-6">
          <div className="text-center">
            <p className="font-bold text-[12px] sm:text-[13px] uppercase">Marissa B. Ferrer, DEM, RP</p>
            <p className="text-[10px] sm:text-[11px]">Director</p>
          </div>
        </div>
        <EndorsementNoteBlock items={[
          "Certified True Copy of Transcript of Records",
          "Certified True Copy of Diploma",
          "Certification of Non-Issuance of Special Order",
        ]} />
      </>
    ),
  },

  "CAV": {
    fields: ["fullName", "course", "major", "syAdmitted", "dateGraduated", "cavNum", "cavSeries", "officialReceiptNum", "amount", "date"],
    renderBody: (data) => (
      <>
        <RegistrarDateTitle date={data.date} />
        <div className="mb-6 text-[10px] sm:text-[11px]">
          <p className="font-bold">CAV-PUP No. {data.cavNum}</p>
          <p className="text-[9px]">Series {data.cavSeries || new Date().getFullYear()}</p>
        </div>
        <CertificateTitle title="Certification, Authentication, and Verification" />
        <div className="space-y-4 text-[9px] sm:text-[9px] leading-relaxed text-justify print:text-[9pt]">
          <TextBlock>To Whom It May Concern:</TextBlock>
          <p className="indent-8">This is to certify that based on our record, mentioned below:</p>
          <div className="text-[10px] sm:text-[11px]">
            <table className="w-full">
              <thead className="sr-only"><tr><th>Field</th><th>Sep</th><th>Value</th></tr></thead>
              <tbody>
                {[
                  ["Name of Student", <span key="name-of-student" className="font-medium uppercase">{data.fullName || "___________________"}</span>],
                  ["Degree", <span key="degree" className="font-medium uppercase">{data.course || "___________________"}{data.major ? ` MAJOR IN ${data.major.toUpperCase()}` : ""}</span>],
                  ["Date of Admission/Enrollment", data.syAdmitted ? new Date(data.syAdmitted).getFullYear() : "___"],
                  ["Date of Graduation", data.dateGraduated ? formatDateFormal(data.dateGraduated) : "___________________"],
                  ["Mode of Study", "Conventional"],
                  ["Name of Institution", <span key="name-of-institution" className="font-medium uppercase">Polytechnic University of the Philippines – Taguig</span>],
                  ["Address", "Gen. Santos Avenue, Taguig City"],
                ].map(([label, value], i) => (
                  <tr key={i} className="align-top">
                    <td className="w-[45%] py-1">{label}</td>
                    <td className="w-[5%] py-1">:</td>
                    <td className="py-1">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="indent-8 text-justify">
            This is to certify further that the above institution is a duly authorized public higher
            education institution (HEI) created by virtue of P.D. No. 1341, hence it is exempted
            from the issuance of Special Order by the Commission on Higher Education.
          </p>
          <p className="indent-8 text-justify">
            This certification must not be honored if the copies of the student's Transcript of
            Record and Diploma presented are not duly authenticated/ certified by the Campus Registrar.
          </p>
          <p className="indent-8 text-justify mb-5">
            Issued upon request of{" "}
            <strong className="uppercase">{data.fullName || "___________________"}</strong>{" "}
            for whatever legal purpose it may serve.
          </p>
        </div>
        <DirectorSignature />
        <div className="text-[7px] sm:text-[8px] space-y-1">
          <p className="font-bold tracking-tight">NOT VALID WITHOUT UNIVERSITY DRY SEAL</p>
          <p className="tracking-tight">OR WITH ERASURE OR ALTERATION</p>
          <div className="mt-2 grid grid-cols-2 gap-x-2 text-[7px]" style={{ maxWidth: "260px" }}>
            {[
              ["PROCESSED BY", "S G. SESE"],
              ["REVIEWED BY", "M.P. GARCIA"],
              ["O.R. No.", data.officialReceiptNum || "___________"],
              ["Date Issued", data.date || "___________"],
              ["AMOUNT", `PHP ${data.amount || "___________"}`],
            ].map(([label, value], i) => (
              <React.Fragment key={i}>
                <p>{label}</p><p>: {value}</p>
              </React.Fragment>
            ))}
          </div>
        </div>
      </>
    ),
  },

  "Certification of NSTP-CWTS": {
    fields: ["fullName", "semesters", "syAdmitted", "nstpSerialNum", "officialReceiptNum", "date"],
    renderBody: (data) => (
      <>
        <RegistrarDateTitle date={data.date} />
        <CertificateTitle title="C E R T I F I C A T I O N" />
        <div className="space-y-4 text-[12px] sm:text-[13px] leading-relaxed text-justify px-2 sm:px-4 print:text-[12pt]">
          <TextBlock>To Whom It May Concern:</TextBlock>
          <CertParagraph>
            This is to certify that {bold(data.fullName || "___________________")} has completed{" "}
            {bold("NSTP CWTS")} in the {data.semesters || "___________________"}, S.Y.{" "}
            {data.syAdmitted ? new Date(data.syAdmitted).getFullYear() : "____"}-
            {data.syAdmitted ? new Date(data.syAdmitted).getFullYear() + 1 : "____"} in this
            University with Serial Number {bold(data.nstpSerialNum || "___________________")} in
            compliance with RA 9163.
          </CertParagraph>
          <CertParagraph className="mb-15">
            This certification has been issued upon the request of the aforementioned name for
            whatever legal purpose it may serve.
          </CertParagraph>
        </div>
        <RegistrarSignature />
        <ReceiptInfo officialReceiptNum={data.officialReceiptNum} date={bold(formatDateFormal(data.date))} />
      </>
    ),
  },

  "Certification of Medium of Instruction": {
    fields: ["fullName", "course", "dateGraduated", "officialReceiptNum", "date"],
    renderBody: (data) => (
      <>
        <RegistrarDateTitle date={data.date} />
        <CertificateTitle title="C E R T I F I C A T I O N" />
        <div className="space-y-4 text-[12px] sm:text-[13px] leading-relaxed text-justify px-2 sm:px-4 print:text-[12pt]">
          <TextBlock>To Whom It May Concern:</TextBlock>
          <CertParagraph>
            This is to certify that {bold(data.fullName || "___________________")} has attended
            tertiary education in this institution with a degree in{" "}
            {bold(`${data.course || "___________________"}${data.dateGraduated ? ` — Batch ${new Date(data.dateGraduated).getFullYear()} graduate` : ""}`)}.
          </CertParagraph>
          <CertParagraph>
            This certifies further that {bold("English language")} is the{" "}
            {bold("medium of instruction")} used in all courses offered by the University.
          </CertParagraph>
          <CertParagraph>
            This certification is issued this {formatDateOrdinal(data.date)} upon the request of
            the aforementioned name for whatever purpose it may serve.
          </CertParagraph>
        </div>
        <DirectorSignature />
        <ReceiptInfo officialReceiptNum={data.officialReceiptNum} date={bold(formatDateFormal(data.date))} />
      </>
    ),
  },

  "Endorsement Letter": {
    hideHeaderFooter: true,
    fields: ["fullName", "course", "major", "date"],
    renderBody: (data) => (
      <>
        <div className="text-right text-xs sm:text-sm text-gray-700 -mt-5">
          <p>{formatDateFormal(data.date)}</p>
        </div>
        <div className="mb-6 text-[12px] sm:text-[13px]">
          <p className="mb-2">The Head</p>
          <p>DFA Authentical Division</p>
          <p>Roxas Boulevard</p>
          <p>Pasay City</p>
        </div>
        <p className="mb-6 text-[12px] sm:text-[13px]">Dear Sir/Madame:</p>
        <p className="indent-6 text-[12px] sm:text-[13px] leading-relaxed text-justify mb-6">
          I, <strong className="underline">{data.fullName || "___________________"}</strong>, would
          like to request your good office, for the authentication of my academic records in{" "}
          <strong className="underline">
            {data.course || "___________________"}
            {data.major ? ` major in ${data.major}` : ""}
          </strong>{" "}
          issued by Polytechnic University of the Philippines - Taguig. In this connection, I am
          submitting the following records through the Office of the Branch Registrar.
        </p>
        <ol className="list-decimal list-inside text-[12px] sm:text-[13px] ml-10 mb-6 space-y-1">
          <li>Official Transcript of Records</li>
          <li>Diploma</li>
          <li>Certification of Enrollment (for undergraduate only)</li>
          <li>Certification of Clinical Experience (if applicable)</li>
          <li>Certified Copy of Special Order</li>
        </ol>
        <p className="text-[12px] sm:text-[13px] mb-10">Thank you,</p>
        <div className="flex justify-end pr-4 sm:pr-8 -mt-4">
          <div className="text-center w-56">
            <p className="text-[12px] sm:text-[13px]">Respectfully yours,</p>
            <div className="mt-8 border-b border-gray-800 w-full" />
            <p className="text-[11px] sm:text-[12px] mt-1">{data.fullName || "___________________"}</p>
          </div>
        </div>
        <div className="border-t-2 border-gray-800 text-center py-1 my-4">
          <p className="font-bold text-[12px] sm:text-[13px]">1<sup>st</sup> Endorsement</p>
        </div>
        <PupLetterhead date={data.date} />
        <p className="indent-6 text-[12px] sm:text-[13px] leading-relaxed text-justify mb-4">
          Respectfully forwarded to the Director, Authentication Department Region, the request of{" "}
          {data.fullName || "______________"} {bold("GRADUATED -")} {bold(data.course)} for the
          Authentication of her record, recommending approval, with the certification that the
          documents forwarded herewith are true and authentic copies of the documents issued and/or
          kept by this institution
        </p>
        <div className="flex justify-end pr-4 sm:pr-8 mb-6">
          <div className="text-center">
            <p className="font-bold text-[12px] sm:text-[13px] uppercase">Marissa B. Ferrer, DEM, RP</p>
            <p className="text-[10px] sm:text-[11px]">Director</p>
          </div>
        </div>
        <EndorsementNoteBlock items={[
          "Diploma",
          "Transcript of Records",
          "Certification of Graduation",
          "Certification of without Special Order",
          "Certification of Enrollment (for undergraduate only)",
          "Others__________________________________________",
        ]} />
      </>
    ),
  },

  "Certificate of Eligibility to Transfer": {
    hideHeaderFooter: true,
    fields: ["fullName", "date"],
    renderBody: (data) => (
      <>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <img src={puplogoimage} alt="PUP Logo" className="w-12 h-12 object-contain" />
            <div className="text-[8px] font-serif leading-tight text-center">
              <p>REPUBLIC OF THE PHILIPPINES</p>
              <p className="font-bold uppercase">Polytechnic University of the Philippines</p>
              <p>OFFICE OF THE VICE PRESIDENT FOR CAMPUSES</p>
              <p className="font-bold uppercase">Taguig Campus</p>
              <p>Office of the Campus Registrar</p>
            </div>
          </div>
          <div className="text-[7px] text-right font-serif">
            <p>PUP-HODI-5-UNRO-024</p>
            <p>REV.0</p>
            <p>May 15, 2018</p>
          </div>
        </div>
        <CertificateTitle title="Certificate of Eligibility to Transfer" />
        <div className="space-y-4 text-[12px] sm:text-[13px] leading-relaxed text-justify px-2 sm:px-4 print:text-[12pt]">
          <div className="text-right font-bold mb-2">{formatDateFormal(data.date)}</div>
          <p className="font-bold">TO WHOM IT MAY CONCERN:</p>
          <CertParagraph>
            This is to certify that {bold(data.fullName || "___________________")} is hereby granted{" "}
            {bold("CERTIFICATE OF ELIGIBILITY TO TRANSFER CREDENTIAL/HONORABLE DISMISSAL")} from
            this University effective {bold(formatDateFormal(data.date))}.
          </CertParagraph>
          <p className="text-[10px] italic">Note: Not valid without University's seal.</p>
        </div>
        <div className="mt-8 flex justify-end pr-4 sm:pr-8">
          <div className="text-center">
            <p className="font-bold text-[12px] sm:text-[13px] uppercase font-serif">Mhel P. Garcia</p>
            <p className="text-[10px] sm:text-[11px] font-serif italic">Campus Registrar</p>
          </div>
        </div>
        <div className="flex items-center gap-2 my-6">
          <span className="text-lg">✂</span>
          <div className="flex-1 border-t-2 border-dashed border-gray-400" />
        </div>
        <div className="text-center mb-4">
          <p className="font-bold text-[13px] sm:text-[14px] uppercase tracking-wide">Request Form</p>
        </div>
        <div className="flex gap-4 mb-4">
          <img src={puplogoimage} alt="PUP Logo" className="w-12 h-12 object-contain self-start" />
          <div className="flex-1 space-y-3 text-[11px] sm:text-[12px]">
            {["Name of School:", "Address:", "Date:"].map((label) => (
              <div key={label} className="flex items-end gap-2">
                <span>{label}</span>
                <div className="flex-1 border-b border-gray-800" />
              </div>
            ))}
          </div>
        </div>
        <div className="text-[11px] sm:text-[12px] space-y-3 font-serif">
          <p>The Campus Registrar</p>
          <p className="font-bold uppercase">Polytechnic University of the Philippines</p>
          <p>Taguig City</p>
          <p className="font-bold">Sir/Madam:</p>
          <p className="indent-8 text-justify">
            I have the honor to request to send us the Transcript of Records of Mr./Ms.{" "}
            <strong>{data.fullName || "___________________"}</strong>, who has been temporarily
            enrolled in this school for the _____________ semester/summer, _____________ upon
            presentation of his/her Certificate of Eligibility to Transfer/Honorable Dismissal.
          </p>
          <div className="flex justify-between items-end mt-6">
            <div>
              <p className="italic text-[10px]">This is to certify that I am actually</p>
              <p className="italic text-[10px]">Enrolled in the school mentioned above</p>
            </div>
            <div className="text-right space-y-6">
              <p>Very Respectfully,</p>
              <div className="border-t border-gray-800 pt-1 w-48">
                <p className="text-[10px] italic text-center">Registrar's Signature over printed name</p>
              </div>
              <div className="border-t border-gray-800 pt-1 w-48">
                <p className="text-[10px] italic text-center">Student's Signature over printed name</p>
              </div>
            </div>
          </div>
          <p className="text-[9px] mt-4">/shgsese2025</p>
        </div>
      </>
    ),
  },

  "Certification of Medium of Instruction with Units": {
    fields: ["fullName", "course", "dateGraduated", "semestersNum", "units", "officialReceiptNum", "date"],
    renderBody: (data) => (
      <>
        <RegistrarDateTitle date={data.date} />
        <CertificateTitle title="C E R T I F I C A T I O N" />
        <div className="space-y-4 text-[12px] sm:text-[13px] leading-relaxed text-justify px-2 sm:px-4 print:text-[12pt]">
          <TextBlock>To Whom It May Concern:</TextBlock>
          <CertParagraph>
            This is to certify that {bold(data.fullName || "___________________")} has attended
            tertiary education in this institution with a degree in{" "}
            {bold(`${data.course || "___________________"}${data.dateGraduated ? ` — Batch ${new Date(data.dateGraduated).getFullYear()} graduate` : ""}`)}.
          </CertParagraph>
          <CertParagraph>
            The {bold(data.course || "___________________")} is a{" "}
            {bold(`${data.semestersNum || "___"}-year degree program`)} with a total of{" "}
            {bold(`${data.units || "___"} academic units`)}.
          </CertParagraph>
          <CertParagraph>
            This certifies further that {bold("English language")} is the{" "}
            {bold("medium of instruction")} used in all courses offered by the University.
          </CertParagraph>
          <CertParagraph>
            This certification is issued this {formatDateOrdinal(data.date)} upon the request of
            the aforementioned name for whatever purpose it may serve.
          </CertParagraph>
        </div>
        <DirectorSignature />
        <ReceiptInfo officialReceiptNum={data.officialReceiptNum} date={bold(formatDateFormal(data.date))} />
      </>
    ),
  },
};