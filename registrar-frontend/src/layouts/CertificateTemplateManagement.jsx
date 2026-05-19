import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  getCertifications,
  getCertificationLayouts,
  updateCertificationLayout,
  uploadCertificationLayoutLogo,
} from "../services/api";
import DropDown from "../components/DropDown";
import {
  CERT_TEMPLATE_LAYOUT_CHANGED,
  DEFAULT_CERTIFICATE_LAYOUT,
  normalizeCertificateLayout,
  toLayoutPayload,
} from "../utils/certificateTemplateSettings.js";
import { CertFooter, CertHeader } from "../utils/helpers.jsx";
import { CERT_CONFIG } from "../utils/Certification.jsx";
import { useTheme } from "../context/ThemeContext";

const toCertificateRows = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

const toDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const hasPreviewDataUrl = (layout) => {
  if (!layout || typeof layout !== "object") return false;

  const values = [layout.headerLeftUrl, layout.headerRightUrl, ...(layout.footerUrls ?? [])];
  return values.some((value) => typeof value === "string" && value.startsWith("data:"));
};

const SAMPLE_FORM_DATA = {
  fullName: "Juan Santos Dela Cruz",
  course: "BS in Information Technology",
  latinHonors: "(Cum Laude)",
  dateGraduated: "2026-04-02",
  diplomaNum: "2026-001",
  educationLevel: "Graduate",
  date: "2026-04-02",
  gwa: "1.25",
  officialReceiptNum: "2026-000123",
  major: "Web and Mobile Development",
  eligibilityType: "Civil Service Professional",
  semesters: "2nd Semester",
  syAdmitted: "2022-08-01",
  lastSemesters: "2nd Semester",
  lastSy: "2025-08-01",
  units: "120",
  semestersNum: "8",
  ladderizedDegree: "BS in Information Systems",
  studentStatus: "Graduated",
  cavNum: "TG-008",
  cavSeries: "2026",
  amount: "620.00",
  nstpSerialNum: "C-13-113719-16",
};

const UploadDropZone = ({ label, multiple = false, onFiles, disabled = false }) => {
  const [dragOver, setDragOver] = useState(false);
  const { isDark } = useTheme();

  return (
    <div
      className={`rounded-lg border-2 border-dashed p-3 text-center transition ${
        dragOver
          ? isDark
            ? "border-[#b08a57] bg-[#2a2a2f]"
            : "border-[#7f3f33] bg-[#fff7f4]"
          : isDark
            ? "border-[#3e4042] bg-[#242526]"
            : "border-gray-300 bg-white"
      }`}
      onDragOver={(event) => {
        if (disabled) return;
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        if (disabled) return;
        event.preventDefault();
        setDragOver(false);
        const files = Array.from(event.dataTransfer.files || []);
        if (files.length) onFiles(files);
      }}
    >
      <p className={`text-xs font-semibold ${isDark ? 'text-[#e4e6eb]' : 'text-gray-700'}`}>{label}</p>
      <p className={`mt-1 text-xs ${isDark ? 'text-[#9a9a9a]' : 'text-gray-500'}`}>Drag and drop image file{multiple ? "s" : ""} here</p>
      <label
        className={`mt-2 inline-block rounded-md px-3 py-1.5 text-xs font-semibold text-white ${
          disabled
            ? "cursor-not-allowed bg-gray-400"
            : isDark
              ? "cursor-pointer bg-[#2a2a2f] hover:bg-[#353539] border border-[#3e4042]"
              : "cursor-pointer bg-[#5c2a21] hover:bg-[#492119]"
        }`}
      >
        Upload
        <input
          type="file"
          accept="image/*"
          multiple={multiple}
          className="hidden"
          disabled={disabled}
          onChange={(event) => {
            if (disabled) return;
            const files = Array.from(event.target.files || []);
            if (files.length) onFiles(files);
            event.target.value = "";
          }}
        />
      </label>
    </div>
  );
};

const CertificatePreviewCanvas = ({ layout, certId }) => {
  const { isDark } = useTheme();
  const certConfig = CERT_CONFIG[certId] || CERT_CONFIG[1];

  return (
    <div className={`mx-auto w-full max-w-187.5 p-8 shadow-2xl ring-1 ${isDark ? 'bg-[#242526] ring-[#3e4042]' : 'bg-white ring-black/5'}`}>
      <div className="flex min-h-180 flex-col">
        {!certConfig?.hideHeaderFooter && <CertHeader layout={layout} />}
        <div className="flex-1">{certConfig?.renderBody(SAMPLE_FORM_DATA)}</div>
        {!certConfig?.hideHeaderFooter && (
          <div className="mt-4">
            <CertFooter layout={layout} />
          </div>
        )}
      </div>
    </div>
  );
};

const PreviewModal = ({ isOpen, onClose, layout, certId }) => {
  const { isDark } = useTheme();
  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-9999 p-4 sm:p-8 ${isDark ? 'bg-black/75' : 'bg-black/55'}`}>
      <div className={`mx-auto flex h-full max-w-6xl flex-col rounded-2xl shadow-2xl ${isDark ? 'bg-[#242526] border border-[#3e4042]' : 'bg-white'}`}>
        <div className={`flex items-center justify-between border-b p-4 ${isDark ? 'border-[#3e4042]' : 'border-gray-200'}`}>
          <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#4b1f16]'}`}>Certificate Modal Preview</h3>
          <button
            onClick={onClose}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${isDark ? 'bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Close
          </button>
        </div>
        <div className={`flex-1 overflow-auto p-4 sm:p-8 ${isDark ? 'bg-[#18191a]' : 'bg-gray-100'}`}>
          <CertificatePreviewCanvas layout={layout} certId={certId} />
        </div>
      </div>
    </div>
  );
};

const CertificateTemplateManagement = () => {
  const { isDark } = useTheme();
  const [certifications, setCertifications] = useState([]);
  const [layoutsByCertId, setLayoutsByCertId] = useState({});
  const [selectedCertId, setSelectedCertId] = useState("");
  const [layout, setLayout] = useState({ ...DEFAULT_CERTIFICATE_LAYOUT });
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const autoSaveTimerRef = useRef(null);

  const dropdownCertifications = useMemo(() => {
    const byName = new Map();

    certifications.forEach((item) => {
      if (!item?.certificate_name) return;
      byName.set(item.certificate_name, item);
    });

    return Array.from(byName.values());
  }, [certifications]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [certResult, layoutResult] = await Promise.allSettled([getCertifications(), getCertificationLayouts()]);
        const certRows = certResult.status === "fulfilled" ? toCertificateRows(certResult.value?.data) : [];
        const layoutRows = layoutResult.status === "fulfilled" ? layoutResult.value?.data ?? [] : [];

        const layoutMap = {};
        layoutRows.forEach((row) => {
          layoutMap[row.certificate_type_id] = normalizeCertificateLayout(row);
        });

        setCertifications(certRows);
        setLayoutsByCertId(layoutMap);

        if (certRows.length) {
          const firstCertId = String(certRows[0].certificate_type_id);
          setSelectedCertId(firstCertId);
          setLayout(layoutMap[certRows[0].certificate_type_id] ?? { ...DEFAULT_CERTIFICATE_LAYOUT });
        } else {
          setSelectedCertId("");
          setLayout({ ...DEFAULT_CERTIFICATE_LAYOUT });
        }
      } catch (error) {
        console.error("Failed to load certification layouts:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const selectedCertification = useMemo(
    () => dropdownCertifications.find((item) => String(item.certificate_type_id) === selectedCertId),
    [dropdownCertifications, selectedCertId]
  );

  const certificateOptions = useMemo(
    () => dropdownCertifications.map((item) => item.certificate_name),
    [dropdownCertifications]
  );

  const selectedCertificateName = selectedCertification?.certificate_name ?? "";

  const isPersistedCertification = Boolean(selectedCertification);

  const handleCertChange = (event) => {
    const nextName = event.target.value;
    const nextCertification = dropdownCertifications.find((item) => item.certificate_name === nextName);
    const nextId = nextCertification ? String(nextCertification.certificate_type_id) : "";

    setSelectedCertId(nextId);

    setLayout(layoutsByCertId[nextId] ?? layoutsByCertId[Number(nextId)] ?? { ...DEFAULT_CERTIFICATE_LAYOUT });
  };

  const uploadSingleLogo = async (slot, file) => {
    if (!selectedCertId || !file) return;
    const certTypeId = selectedCertId;

    const formData = new FormData();
    formData.append("logo", file);
    formData.append("slot", slot);
    const response = await uploadCertificationLayoutLogo(certTypeId, formData);
    return response?.data?.data?.url;
  };

  const updateMainLogo = async (files) => {
    const [file] = files;
    if (!file) return;
    try {
      const previewUrl = await toDataUrl(file);
      setLayout((prev) => ({ ...prev, headerLeftUrl: previewUrl }));

      const logoUrl = await uploadSingleLogo("header_left", file);
      if (logoUrl) {
        setLayout((prev) => ({ ...prev, headerLeftUrl: logoUrl }));
      }
    } catch (error) {
      console.error("Failed to upload main logo:", error);
    }
  };

  const updateRightLogo = async (files) => {
    const [file] = files;
    if (!file) return;
    try {
      const previewUrl = await toDataUrl(file);
      setLayout((prev) => ({ ...prev, headerRightUrl: previewUrl }));

      const logoUrl = await uploadSingleLogo("header_right", file);
      if (logoUrl) {
        setLayout((prev) => ({ ...prev, headerRightUrl: logoUrl }));
      }
    } catch (error) {
      console.error("Failed to upload right logo:", error);
    }
  };

  const addFooterLogos = async (files) => {
    if (!selectedCertId || !files.length) return;
    try {
      const previewUrls = await Promise.all(files.map((file) => toDataUrl(file)));
      setLayout((prev) => ({
        ...prev,
        footerUrls: [...prev.footerUrls, ...previewUrls],
      }));

      const uploadedUrls = await Promise.all(files.map(async (file) => uploadSingleLogo("footer", file)));

      previewUrls.forEach((previewUrl, index) => {
        const uploadedUrl = uploadedUrls[index];
        if (!uploadedUrl) return;
        setLayout((prev) => ({
          ...prev,
          footerUrls: prev.footerUrls.map((url) => (url === previewUrl ? uploadedUrl : url)),
        }));
      });
    } catch (error) {
      console.error("Failed to upload footer logos:", error);
    }
  };

  const saveLayout = async () => {
    if (!selectedCertId) return;
    if (hasPreviewDataUrl(layout)) {
      console.warn("Skipping layout save until image uploads finish.");
      return;
    }

    try {
      setSaving(true);
      const certTypeId = selectedCertId;

      const payload = toLayoutPayload(layout);
      await updateCertificationLayout(certTypeId, payload);

      setLayoutsByCertId((prev) => ({
        ...prev,
        [certTypeId]: normalizeCertificateLayout(layout),
      }));

      window.dispatchEvent(
        new CustomEvent(CERT_TEMPLATE_LAYOUT_CHANGED, {
          detail: {
            certTypeId: Number(certTypeId),
            layout: normalizeCertificateLayout(layout),
          },
        })
      );
    } catch (error) {
      console.error("Failed to save certification layout:", error);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!selectedCertId || !isPersistedCertification || loading || saving) return;
    if (hasPreviewDataUrl(layout)) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const payload = toLayoutPayload(layout);
        await updateCertificationLayout(selectedCertId, payload);
        setLayoutsByCertId((prev) => ({
          ...prev,
          [selectedCertId]: normalizeCertificateLayout(layout),
        }));
      } catch (error) {
        console.error("Auto-save layout failed:", error);
      }
    }, 600);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [layout, selectedCertId, isPersistedCertification, loading, saving]);

  const resetLayout = () => {
    setLayout({ ...DEFAULT_CERTIFICATE_LAYOUT });
  };

  const removeFooterLogo = (index) => {
    setLayout((prev) => ({
      ...prev,
      footerUrls: prev.footerUrls.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className={`min-h-screen p-4 sm:p-6 ${isDark ? 'bg-[#18191a] text-[#e4e6eb]' : 'bg-transparent'}`}>
      <div className="mx-auto max-w-400 space-y-4">
        <header className={`rounded-xl border p-4 shadow-sm ${isDark ? 'border-[#3e4042] bg-[#242526]' : 'border-gray-200 bg-white'}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className={`text-xl font-bold sm:text-2xl ${isDark ? 'text-white' : 'text-[#4f2018]'}`}>Certificate Template Editor</h1>
              <p className={`text-sm ${isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}`}>Only logos are editable.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={resetLayout}
                className={`rounded-md border px-3 py-2 text-sm font-semibold ${isDark ? 'border-[#3e4042] bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539]' : 'border-gray-300 bg-gray-100 hover:bg-gray-200'}`}
              >
                Reset Logos
              </button>
              <button
                onClick={saveLayout}
                disabled={!selectedCertId || saving || hasPreviewDataUrl(layout)}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed ${isDark ? 'bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539] focus:ring-[#4e4f50] disabled:bg-[#2a2a2f]/50 border border-[#3e4042]' : 'bg-yellow-400 text-slate-900 hover:bg-yellow-500 focus:ring-yellow-200 disabled:bg-yellow-200'}`}
              >
                {saving ? "Saving..." : hasPreviewDataUrl(layout) ? "Waiting for upload..." : "Save Layout"}
              </button>
              <button
                onClick={() => setShowModal(true)}
                className={`rounded-md px-3 py-2 text-sm font-semibold text-white ${isDark ? 'bg-[#2a2a2f] hover:bg-[#353539] border border-[#3e4042]' : 'bg-[#5c2a21] hover:bg-[#4b2119]'}`}
              >
                Open Certificate Modal
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[350px_1fr]">
          <aside className={`rounded-xl border p-4 shadow-sm ${isDark ? 'border-[#3e4042] bg-[#242526]' : 'border-gray-200 bg-white'}`}>
            <h2 className={`mb-3 text-lg font-bold ${isDark ? 'text-white' : 'text-[#4f2018]'}`}>Logo Editor</h2>
            <div className="space-y-3">
              <div>
                <DropDown
                  label="Certificate Type"
                  name="certificateType"
                  value={selectedCertificateName}
                  onChange={handleCertChange}
                  options={certificateOptions}
                  labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-700'}
                />
              </div>

              <UploadDropZone label="Main Logo" onFiles={updateMainLogo} disabled={!selectedCertId} />
              <UploadDropZone label="Header Right Logo" onFiles={updateRightLogo} disabled={!selectedCertId} />

              <div className={`rounded-lg border p-3 ${isDark ? 'border-[#3e4042] bg-[#1f1f1f]' : 'border-gray-200 bg-gray-50'}`}>
                <p className={`text-xs font-semibold uppercase ${isDark ? 'text-[#b0b3b8]' : 'text-gray-700'}`}>Header Logo Size</p>
                <label className="mt-2 block text-sm">
                  <span className={`block ${isDark ? 'text-[#e4e6eb]' : 'text-gray-700'}`}>Size: {layout.headerLogoSize}px</span>
                  <input
                    type="range"
                    min="40"
                    max="220"
                    value={layout.headerLogoSize}
                    onChange={(event) => setLayout((prev) => ({ ...prev, headerLogoSize: Number(event.target.value) }))}
                    className="w-full"
                  />
                </label>
              </div>

              <UploadDropZone label="Footer Logos" multiple onFiles={addFooterLogos} disabled={!selectedCertId} />

              <div className={`rounded-lg border p-3 ${isDark ? 'border-[#3e4042] bg-[#1f1f1f]' : 'border-gray-200 bg-gray-50'}`}>
                <p className={`text-xs font-semibold uppercase ${isDark ? 'text-[#b0b3b8]' : 'text-gray-700'}`}>Footer Logo Size</p>
                <label className="mt-2 block text-sm">
                  <span className={`block ${isDark ? 'text-[#e4e6eb]' : 'text-gray-700'}`}>Size: {layout.footerLogoSize}px</span>
                  <input
                    type="range"
                    min="24"
                    max="160"
                    value={layout.footerLogoSize}
                    onChange={(event) => setLayout((prev) => ({ ...prev, footerLogoSize: Number(event.target.value) }))}
                    className="w-full"
                  />
                </label>
              </div>

              <div className="space-y-2">
                {layout.footerUrls.map((logoUrl, index) => (
                  <div key={`${logoUrl}-${index}`} className={`rounded-lg border p-3 ${isDark ? 'border-[#3e4042] bg-[#1f1f1f]' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="mb-2 flex items-center justify-between">
                      <p className={`text-xs font-semibold ${isDark ? 'text-[#b0b3b8]' : 'text-gray-700'}`}>Footer Logo {index + 1}</p>
                      <button
                        onClick={() => removeFooterLogo(index)}
                        className={`rounded border px-2 py-1 text-xs font-semibold ${isDark ? 'border-red-900/50 text-red-300 hover:bg-red-950/30' : 'border-red-300 text-red-700 hover:bg-red-50'}`}
                      >
                        Remove
                      </button>
                    </div>

                    <img src={logoUrl} alt={`Footer Logo ${index + 1}`} className="h-12 w-auto object-contain" />
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className={`rounded-2xl border p-4 sm:p-8 ${isDark ? 'border-[#3e4042] bg-[#18191a]' : 'border-gray-200 bg-gray-100'}`}>
            <div className={`mb-3 flex items-center justify-between rounded-lg px-4 py-3 ${isDark ? 'bg-[#242526]' : 'bg-white'}`}>
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Certificate Preview</h2>
            </div>
            <CertificatePreviewCanvas layout={layout} certId={Number(selectedCertId)} />
          </section>
        </div>

        <PreviewModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          layout={layout}
          certId={Number(selectedCertId)}
        />
      </div>
    </div>
  );
};

export default CertificateTemplateManagement;
