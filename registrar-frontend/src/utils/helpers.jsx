import puplogoimage from "../assets/puplogoimage.png";
import Bagong_Pilipinas_Logo from "../assets/Bagong_Pilipinas_logo.png";
import certificate_footer from "../assets/certificate_footer.png";
import { formatDateFormal, formatDateOrdinal } from "./formatters.js";

// --- Reusable UI Components ---
export const TextBlock = ({ children, className = "" }) => <div className={`mb-4 ${className}`}>{children}</div>;
export const bold = (text) => <strong>{text}</strong>;

export const CertificateTitle = ({ title }) => (
  <div className="text-center mb-4 print:text-[20pt]">
    <h1 className="text-[15px] sm:text-[20px] font-bold uppercase tracking-wide leading-snug print:text-[18pt]">
      {title}
    </h1>
  </div>
);

export const SignatureBlock = ({ name, position }) => (
  <div className="mb-4 flex justify-end">
    <div className="inline-block text-center">
      <p className="font-bold px-10 text-xs sm:text-sm uppercase font-serif text-gray-900 print:text-[10pt]">
        {name}
      </p>
      <p className="text-[8px] lg:text-[10px] print:text-[8pt]">
        {position}
      </p>
    </div>
  </div>
);

export const FooterInfo = ({ diplomaNum, date }) => (
  <div className="mt-3 pt-3">
    <p className="text-[6px] sm:text-[8px] print:text-[8pt] tracking-tighter mb-1">
      Not valid without University Dry Seal
    </p>
    <p className="text-[6px] sm:text-[8px] print:text-[8pt] tracking-tighter">
      Diploma No.: {""}
      <span className="text-red-600 font-bold">
        {diplomaNum || "________________"}
      </span>
    </p>
    <p className="text-[6px] sm:text-[8px] print:text-[8pt] tracking-tighter mb-1">
      Date: {date}
    </p>
    <p className="text-[5px] sm:text-[7px] print:text-[8pt] tracking-tighter">/shgsese2026</p>
  </div>
);

export const ReceiptInfo = ({ officialReceiptNum, date }) => (
  <div className="mt-3 pt-3">
    <p className="text-[6px] sm:text-[8px] print:text-[8pt] tracking-tighter mb-1">
      Not valid without University Dry Seal
    </p>
    <p className="text-[6px] sm:text-[8px] print:text-[8pt] tracking-tighter">
      OR No.: {""}
      <span className="text-red-600 font-bold">
        {officialReceiptNum || "________________"}
      </span>
    </p>
    <p className="text-[6px] sm:text-[8px] print:text-[8pt] tracking-tighter mb-1">
      Date: {date}
    </p>
    <p className="text-[5px] sm:text-[7px] print:text-[8pt] tracking-tighter">/shgsese2026</p>
  </div>
);

export const CertHeader = () => (
  <div className="flex flex-row items-start justify-between border-b-2 border-gray-100 pb-3 mb-3 gap-4 text-left">
    <div className="flex flex-row items-start gap-3">
      <img src={puplogoimage} alt="PUP Logo" className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0" />
      <div>
        <p className="text-[5px] lg:text-[8px] print:text-[9pt] font-medium font-serif uppercase">Republic of the Philippines</p>
        <p className="text-[9px] lg:text-[10px] print:text-[12pt] font-bold font-serif leading-tight uppercase tracking-tight">
          Polytechnic University of the Philippines
        </p>
        <p className="text-[5px] lg:text-[9px] print:text-[9pt] font-medium font-serif uppercase">
          office of the vice president for campuses
        </p>
        <p className="text-[9px] lg:text-[10px] print:text-[12pt] font-bold font-serif">TAGUIG CAMPUS</p>
      </div>
    </div>
    <img src={Bagong_Pilipinas_Logo} alt="Bagong Pilipinas Logo" className="w-15 h-15 sm:w-14 sm:h-14 object-contain shrink-0" />
  </div>
);

export const RegistrarDateTitle = ({ date }) => (
  <>
    <TextBlock className="text-left text-[10px] -mt-2 print:text-[13pt]">
      Office of the Campus Registrar
    </TextBlock>

    <TextBlock className="text-right text-[10px] mt-5 print:text-[15pt]">
      {formatDateFormal(date)}
    </TextBlock>
  </>
);

export const CertFooter = () => (
  <div className="mt-2 pt-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4 shrink-0">
    <div className="space-y-1 text-left">
      <div className="text-[7px] lg:text-[6.5px] print:text-[8.5pt]">
        General Santos Avenue, Lower Bicutan, Taguig City, Philippines 1632<br />
        Direct Line: (02) 8837 5858 to 60 | Email: taguig@pup.edu.ph<br />
        Website: www.pup.edu.ph | Inquiries: https://bit.ly/PUPSINTA
      </div>
      <div className="text-[10px] font-serif tracking-tight uppercase print:text-[12pt]">THE COUNTRY'S 1st POLYTECHNIC</div>
    </div>
    <div className="shrink-0 items-center">
      <img src={certificate_footer} alt="Certificate Footer" className="footer-accreditation-img h-12 w-auto object-contain" />
    </div>
  </div>
);

export const RegistrarSignature = () => (
  <SignatureBlock
    name="Mhel P. Garcia"
    position="Campus Registrar/Head of Registration Office"
  />
);

export const DirectorSignature = () => (
  <SignatureBlock
    name="Marissa B. Ferrer, DEM, RPsy"
    position="Director"
  />
);

// ─── Composite Layouts ─────────────────────────────────────────────────────────

/** Standard cert wrapper: date header + "Certification" title + "To Whom It May Concern" */
export const StandardCertLayout = ({ date, children }) => (
  <>
    <RegistrarDateTitle date={date} />
    <CertificateTitle title="Certification" />
    <div className="space-y-3 text-[13px] sm:text-[13px] leading-[1.6] text-justify px-2 sm:px-4 print:text-[12pt]">
      <TextBlock className="mb-5 print:text-[13pt]">To Whom It May Concern:</TextBlock>
      {children}
    </div>
  </>
);

/** Standard cert body paragraph (indented, justified, line-height 1.9) */
export const CertParagraph = ({ children, className = "" }) => (
  <p className={`indent-6 leading-[1.9] text-justify print:text-[13pt] ${className}`}>
    {children}
  </p>
);

/** Closing line used by most certs */
export const IssuedLine = ({ date }) => (
  <CertParagraph className="mb-10">
    This certification is issued this {formatDateOrdinal(date)} upon request 
    the aforementioned name for whatever legal purpose it may serve.
  </CertParagraph>
);

/** Closing line variant used when "upon request of the aforementioned name" */
export const IssuedLineAforementioned = ({ date }) => (
  <CertParagraph className="mb-10">
    This certification is issued this {formatDateOrdinal(date)} upon request of the aforementioned
    name for whatever legal purpose it may serve.
  </CertParagraph>
);

// ─── PUP Letterhead (used in CAV Request Letter, Endorsement Letter) ───────────

export const PupLetterhead = ({ date }) => (
  <>
    <div className="flex items-center gap-3 mb-2">
      <img src={puplogoimage} alt="PUP Logo" className="w-10 h-10 object-contain" />
      <div className="text-[10px] leading-tight">
        <p>Republic of the Philippines</p>
        <p className="font-bold uppercase text-[11px]">Polytechnic University of the Philippines</p>
        <p className="uppercase">Taguig Campus</p>
      </div>
    </div>
    {date && (
      <div className="mb-4 text-[11px]">
        <p>{formatDateFormal(date)}</p>
      </div>
    )}
  </>
);

// ─── Endorsement shared document list ─────────────────────────────────────────

export const EndorsementNoteBlock = ({ items }) => (
  <div className="text-[11px] sm:text-[12px]">
    <p className="mb-2">Note: The following documents are attached:</p>
    <ol className="list-decimal list-inside ml-6 space-y-1">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ol>
  </div>
);