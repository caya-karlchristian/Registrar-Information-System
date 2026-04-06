import puplogoimage from "../assets/puplogoimage.png";
import certificate_footer from "../assets/certificate_footer.png";
import { formatDateFormal, formatDateOrdinal } from "./formatters.js";

// --- Reusable UI Components ---
export const TextBlock = ({ children, className = "" }) => (
  <div
    className={`mb-4 ${className} cert-editable-block`}
    contentEditable
    suppressContentEditableWarning
    spellCheck
  >
    {children}
  </div>
);
export const bold = (text) => <strong>{text}</strong>;

/**
 * Displays value in bold, or a fill-in line if value is empty/falsy
 * Useful for certificates where blank fields need visual indicators
 */
export const fillOrLine = (value, lineLength = 20) => {
  if (value && String(value).trim()) {
    return <strong>{value}</strong>;
  }
  return <span className="border-b border-gray-800" style={{ display: 'inline-block', minWidth: `${lineLength * 0.15}in` }}>&nbsp;</span>;
};


export const CertificateTitle = ({ title }) => (
  <div className="text-center mb-6 print:mb-7">
    <h1 className="cert-title text-[12px] sm:text-[20px] md:text-[25px] font-bold uppercase tracking-[0.35em] sm:tracking-[0.5em] leading-tight text-black">
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

const SIGNATORY_MAP = {
  mhel: {
    name: "Mhel P. Garcia",
    position: "Campus Registrar/Head of Registration Office",
  },
  ferrer: {
    name: "Marissa B. Ferrer, DEM, RPsy",
    position: "Director",
  },
};

export const getSigneeInfo = (signee, fallbackKey = "mhel") => {
  const normalized = String(signee || "").toLowerCase();
  if (normalized.includes("ferrer")) return SIGNATORY_MAP.ferrer;
  if (normalized.includes("mhel") || normalized.includes("garcia")) return SIGNATORY_MAP.mhel;
  return SIGNATORY_MAP[fallbackKey] || SIGNATORY_MAP.mhel;
};

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

export const CertHeader = ({ layout }) => (
  <div className="cert-header border-b-2 border-gray-200 pb-4 mb-5">
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-start gap-3">
        <img
          src={layout?.headerLeftUrl || puplogoimage}
          alt="PUP Logo"
          className="object-contain shrink-0"
          style={{ width: `${layout?.headerLogoSize ?? 120}px`, height: `${layout?.headerLogoSize ?? 120}px` }}
        />
        <div className="cert-header-text pt-1 leading-tight text-black uppercase">
          <p className="text-[7px] sm:text-[9px] font-normal tracking-tight">REPUBLIC OF THE PHILIPPINES</p>
          <p className="text-[8px] sm:text-[15px] font-bold tracking-tight">
            Polytechnic University of the Philippines
          </p>
          <p className="text-[7px] sm:text-[9px] font-normal tracking-tight">
            OFFICE OF THE VICE PRESIDENT FOR CAMPUSES
          </p>
          <p className="text-[8px] sm:text-[15px] font-bold tracking-tight">TAGUIG CAMPUS</p>
        </div>
      </div>
      {layout?.headerRightUrl && (
        <img
          src={layout.headerRightUrl}
          alt="Header Right Logo"
          className="object-contain shrink-0"
          style={{ width: `${layout?.headerLogoSize ?? 120}px`, height: `${layout?.headerLogoSize ?? 120}px` }}
        />
      )}
    </div>
  </div>
);

export const RegistrarDateTitle = ({ date }) => (
  <>
    <TextBlock className="text-left cert-meta-line -mt-1 print:mt-0">
      Office of the Campus Registrar
    </TextBlock>

    <TextBlock className="text-right cert-meta-line mt-6 print:mt-7">
      {formatDateFormal(date)}
    </TextBlock>
  </>
);

export const CertFooter = ({ layout }) => (
  <div className="mt-2 pt-2 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-start print:items-start gap-4 shrink-0">
    <div className="space-y-1 text-left cert-footer-contact pt-0.5">
      <div className="text-[9px] sm:text-[10px] leading-tight">
        General Santos Avenue, Lower Bicutan, Taguig City, Philippines 1632<br />
        Direct Line: (02) 8837 5858 to 60 | Email: taguig@pup.edu.ph<br />
        Website: www.pup.edu.ph | Inquiries: https://bit.ly/PUPSINTA
      </div>
      <div className="cert-footer-tagline text-[10px] sm:text-[15px] font-bold tracking-tight leading-tight uppercase text-black font-serif">
        THE COUNTRY'S 1st POLYTECHNIC
      </div>
    </div>
    <div className="shrink-0 items-start flex flex-wrap justify-end gap-2 sm:pt-0.5 print:pt-0 print:self-start">
      {(layout?.footerUrls?.length ? layout.footerUrls : [certificate_footer]).map((footerLogoUrl, index) => (
        <img
          key={`${footerLogoUrl}-${index}`}
          src={footerLogoUrl}
          alt={`Certificate Footer ${index + 1}`}
          className="footer-accreditation-img w-auto object-contain"
          style={{ height: `${layout?.footerLogoSize ?? 45}px` }}
        />
      ))}
    </div>
  </div>
);

export const RegistrarSignature = ({ signee }) => {
  const signer = getSigneeInfo(signee, "mhel");
  return (
  <SignatureBlock
    name={signer.name}
    position={signer.position}
  />
  );
};

export const DirectorSignature = ({ signee }) => {
  const signer = getSigneeInfo(signee, "ferrer");
  return (
  <SignatureBlock
    name={signer.name}
    position={signer.position}
  />
  );
};

// ─── Composite Layouts ─────────────────────────────────────────────────────────

/** Standard cert wrapper: date header + "Certification" title + "To Whom It May Concern" */
export const StandardCertLayout = ({ date, children }) => (
  <>
    <RegistrarDateTitle date={date} />
    <CertificateTitle title="Certification" />
    <div className="cert-body px-2 sm:px-4">
      <TextBlock className="mb-5 cert-salutation">To Whom It May Concern:</TextBlock>
      {children}
    </div>
  </>
);

/** Standard cert body paragraph (indented, justified, line-height 1.9) */
export const CertParagraph = ({ children, className = "" }) => (
  <p
    className={`cert-paragraph indent-8 ${className} cert-editable-block`}
    contentEditable
    suppressContentEditableWarning
    spellCheck
  >
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

export const getTodayDate = () => {
  const today = new Date();
  const localDate = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000
  );
  return localDate.toISOString().split("T")[0];
};