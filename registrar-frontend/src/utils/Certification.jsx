import React from "react";
import puplogoimage from "../assets/puplogoimage.png";
import Bagong_Pilipinas_Logo from "../assets/Bagong_Pilipinas_logo.png";

export const bold = (text) => (
  <span className="font-bold px-1">{text || "________________"}</span>
);

export const formatDateFormal = (dateString) => {
  if (!dateString) return "________________";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const CertHeader = () => (
  <div className="flex flex-row items-start justify-between border-b-2 border-gray-100 pb-3 mb-3 gap-4 text-left">
    <div className="flex flex-row items-start gap-3">
      <img src={puplogoimage} alt="PUP Logo" className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0" />
      <div>
        <p className="text-[5px] lg:text-[8px] font-medium font-serif uppercase">Republic of the Philippines</p>
        <p className="text-[9px] lg:text-[10px] font-bold font-serif leading-tight uppercase tracking-tight">Polytechnic University of the Philippines</p>
        <p className="text-[5px] lg:text-[9px] font-medium font-serif uppercase">office of the vice president for campuses</p>
        <p className="text-[9px] lg:text-[10px] font-bold font-serif">TAGUIG CAMPUS</p>
      </div>
    </div>
    <img src={Bagong_Pilipinas_Logo} alt="Bagong Pilipinas Logo" className="w-15 h-15 sm:w-14 sm:h-14 object-contain shrink-0" />
  </div>
);

export const CERT_CONFIG = {
  "Certification": {
    fields: ["fullName", "course", "educationLevel", "syAdmitted", "diplomaNum"],
    template: (data) => (
      <>
        This is to certify that {bold(data.fullName)} is a {bold(data.educationLevel)}
        of the Polytechnic University of the Philippines Taguig Campus and
        Received the degree of {bold(data.course)} on {bold(formatDateFormal(data.syAdmitted))}.
      </>
    ),
  },

  "Consular Certification": {
    fields: ["fullName", "course", "major", "dateGraduated", "diplomaNum"],
    renderBody: (data) => (
      <div className="text-[9px] sm:text-[10px] text-gray-800 leading-relaxed">
        <div className="text-right text-xs sm:text-sm text-gray-700 mb-4 font-serif italic">
          {formatDateFormal(data.date)}
        </div>
        <div className="mb-4 space-y-0.5">
          <p>The Consular Section</p>
          <p>Notarials and Authentication Unit</p>
          <p>Philippine Embassy</p>
          <p>P.O. Box 3215</p>
          <p>United Arab Emirates</p>
          <p>Fax +971 2 6390002</p>
          <p>Email: auhpe@philembassy.ae</p>
          <p>Website: www.abudhabipe.dfa.gov.ph</p>
        </div>
        <p className="mb-3">Gentlemen:</p>
        <div className="text-center mb-4">
          <h1 className="text-sm sm:text-base font-serif font-bold uppercase tracking-wide leading-snug">
            Certification of Completed Degree and Special Order
          </h1>
        </div>
        <div className="space-y-3 leading-[1.9] text-justify">
          <p>
            This is to Certify that {bold(data.fullName)} graduated from this University with a
            degree in {bold(data.course)}{data.major ? <> major in {bold(data.major)}</> : ""} on {bold(formatDateFormal(data.dateGraduated))}.
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
        <p className="mt-4 mb-8">Very truly yours,</p>
        <div className="mb-4">
          <p className="font-bold text-xs sm:text-sm uppercase font-serif text-gray-900">mhel p. garcia</p>
          <p className="text-[6px] lg:text-[8px]">Campus Registrar/Head of Registration Office</p>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-[6px] sm:text-[8px] tracking-tighter mb-1">Not valid without University Dry Seal</p>
          <p className="text-[6px] sm:text-[8px] tracking-tighter">Diploma No.: {bold(data.diplomaNum || "________________")}</p>
          <p className="text-[6px] sm:text-[8px] tracking-tighter mb-1">Date: {bold(formatDateFormal(data.date))}</p>
          <p className="text-[5px] sm:text-[7px] tracking-tighter">/shgsese2026</p>
        </div>
      </div>
    ),
  },
};