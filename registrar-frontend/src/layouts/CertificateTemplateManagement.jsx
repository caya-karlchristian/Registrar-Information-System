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
import SuccessToast from "../components/SuccessToast.jsx";
import ErrorToast from "../components/ErrorToast.jsx";
import ConfirmationModal from "../components/ConfirmationModal.jsx";

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
      className={`rounded-lg border-2 border-dashed p-3 text-center transition ${dragOver
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
      <p className={`mt-0.5 text-xs ${isDark ? 'text-[#9a9a9a]' : 'text-gray-500'}`}>Drag and drop image file{multiple ? "s" : ""} here</p>
      <p className={`text-[10px] ${isDark ? 'text-[#808080]' : 'text-gray-400'}`}>PNG, JPG, JPEG, SVG (MAX. 2MB)</p>
      <label
        className={`mt-2 inline-block rounded-md px-3 py-1.5 text-xs font-semibold text-white ${disabled
          ? "cursor-not-allowed bg-gray-400"
          : isDark
            ? "cursor-pointer bg-[#2a2a2f] hover:bg-[#353539] border border-[#3e4042]"
            : "cursor-pointer bg-[#5c2a21] hover:bg-[#492119]"
          }`}
      >
        Upload
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
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
    <div className="...">
      <div className="flex min-h-180 flex-col">
        {!certConfig?.hideHeaderFooter && <CertHeader layout={layout} />}
        <div className="flex-1">{certConfig?.renderBody(SAMPLE_FORM_DATA, layout)}</div>

        {!certConfig?.hideHeaderFooter && (
          <div className="mt-4">
            <CertFooter layout={layout} />
          </div>
        )}
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const autoSaveTimerRef = useRef(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const isUndoRedoActionRef = useRef(false);

  const pushToHistory = (currentLayout) => {
    const imageState = {
      headerLeftUrl: currentLayout.headerLeftUrl,
      headerRightUrl: currentLayout.headerRightUrl,
      footerUrls: [...currentLayout.footerUrls],
    };
    setPast((prev) => [...prev, imageState]);
    setFuture([]);
  };

  useEffect(() => {
    setPast([]);
    setFuture([]);
    isUndoRedoActionRef.current = false;
  }, [selectedCertId]);

  // Bulk apply checkbox states
  const [applyMainLogoToAll, setApplyMainLogoToAll] = useState(false);
  const [applyRightLogoToAll, setApplyRightLogoToAll] = useState(false);
  const [applyFooterLogosToAll, setApplyFooterLogosToAll] = useState(false);

  // Modal confirm state
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const validateFile = (file) => {
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
    const fileExtension = file.name ? file.name.split('.').pop().toLowerCase() : '';
    const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "svg"];

    const isValidType = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(fileExtension);

    if (!isValidType) {
      return "Invalid file type. Only PNG, JPG, JPEG, and SVG files are allowed.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File is too large. Maximum allowed size is 2MB.";
    }
    return null;
  };

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
        const layoutRows = layoutResult.status === "fulfilled" ? toCertificateRows(layoutResult.value?.data) : [];

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

  // Per the Archive Policy — Document & Certificate Management: archiving a
  // certificate automatically makes its template read-only, with no
  // separate "locked" step. is_archived is the single source of truth —
  // this flag just derives the UI lock state from it. The backend enforces
  // the same rule server-side (updateLayout/uploadLayoutLogo reject
  // archived certs with 423), so this is UX polish, not the real guard.
  const isLockedCertification = Boolean(selectedCertification?.is_archived);

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
    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      return;
    }
    const previousUrl = layout.headerLeftUrl;
    try {
      const previewUrl = await toDataUrl(file);
      setLayout((prev) => ({ ...prev, headerLeftUrl: previewUrl }));

      const logoUrl = await uploadSingleLogo("header_left", file);
      if (logoUrl) {
        pushToHistory(layout);
        setLayout((prev) => ({ ...prev, headerLeftUrl: logoUrl }));

        if (applyMainLogoToAll) {
          setSaving(true);
          try {
            const otherCerts = dropdownCertifications.filter(c => String(c.certificate_type_id) !== selectedCertId);
            const updatedLayouts = {};
            for (const cert of otherCerts) {
              const certId = cert.certificate_type_id;
              const currentLayout = layoutsByCertId[certId] ?? { ...DEFAULT_CERTIFICATE_LAYOUT };
              const updatedLayout = { ...currentLayout, headerLeftUrl: logoUrl };
              const payload = toLayoutPayload(updatedLayout);
              await updateCertificationLayout(certId, payload);
              updatedLayouts[certId] = normalizeCertificateLayout(updatedLayout);
            }
            setLayoutsByCertId((prev) => ({
              ...prev,
              ...updatedLayouts,
            }));
            setSaveSuccess(true);
            setSuccessMessage("Main logo applied to all templates successfully!");
            setTimeout(() => {
              setSaveSuccess(false);
              setSuccessMessage("");
            }, 2000);
          } catch (err) {
            console.error("Failed to apply main logo to all templates:", err);
            setErrorMessage("Logo uploaded, but failed to apply to all certificate templates.");
          } finally {
            setSaving(false);
          }
        }
      } else {
        setLayout((prev) => ({ ...prev, headerLeftUrl: previousUrl }));
        setErrorMessage("Failed to upload main logo. Please try again.");
      }
    } catch (error) {
      console.error("Failed to upload main logo:", error);
      setLayout((prev) => ({ ...prev, headerLeftUrl: previousUrl }));
      setErrorMessage("Failed to upload main logo. Please try again.");
    }
  };

  const updateRightLogo = async (files) => {
    const [file] = files;
    if (!file) return;
    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      return;
    }
    const previousUrl = layout.headerRightUrl;
    try {
      const previewUrl = await toDataUrl(file);
      setLayout((prev) => ({ ...prev, headerRightUrl: previewUrl }));

      const logoUrl = await uploadSingleLogo("header_right", file);
      if (logoUrl) {
        pushToHistory(layout);
        setLayout((prev) => ({ ...prev, headerRightUrl: logoUrl }));

        if (applyRightLogoToAll) {
          setSaving(true);
          try {
            const otherCerts = dropdownCertifications.filter(c => String(c.certificate_type_id) !== selectedCertId);
            const updatedLayouts = {};
            for (const cert of otherCerts) {
              const certId = cert.certificate_type_id;
              const currentLayout = layoutsByCertId[certId] ?? { ...DEFAULT_CERTIFICATE_LAYOUT };
              const updatedLayout = { ...currentLayout, headerRightUrl: logoUrl };
              const payload = toLayoutPayload(updatedLayout);
              await updateCertificationLayout(certId, payload);
              updatedLayouts[certId] = normalizeCertificateLayout(updatedLayout);
            }
            setLayoutsByCertId((prev) => ({
              ...prev,
              ...updatedLayouts,
            }));
            setSaveSuccess(true);
            setSuccessMessage("Header right logo applied to all templates successfully!");
            setTimeout(() => {
              setSaveSuccess(false);
              setSuccessMessage("");
            }, 2000);
          } catch (err) {
            console.error("Failed to apply right logo to all templates:", err);
            setErrorMessage("Logo uploaded, but failed to apply to all certificate templates.");
          } finally {
            setSaving(false);
          }
        }
      } else {
        setLayout((prev) => ({ ...prev, headerRightUrl: previousUrl }));
        setErrorMessage("Failed to upload right logo. Please try again.");
      }
    } catch (error) {
      console.error("Failed to upload right logo:", error);
      setLayout((prev) => ({ ...prev, headerRightUrl: previousUrl }));
      setErrorMessage("Failed to upload right logo. Please try again.");
    }
  };

  const addFooterLogos = async (files) => {
    if (!selectedCertId || !files.length) return;
    const invalidFile = files.find(file => validateFile(file));
    if (invalidFile) {
      const error = validateFile(invalidFile);
      setErrorMessage(error);
      return;
    }
    const previousFooterUrls = [...layout.footerUrls];
    try {
      const previewUrls = await Promise.all(files.map((file) => toDataUrl(file)));
      setLayout((prev) => ({
        ...prev,
        footerUrls: [...prev.footerUrls, ...previewUrls],
      }));

      const uploadedUrls = await Promise.all(files.map(async (file) => {
        try {
          return await uploadSingleLogo("footer", file);
        } catch {
          return null;
        }
      }));

      const allSuccess = uploadedUrls.every(url => !!url);
      if (allSuccess) {
        pushToHistory(layout);
        let finalFooterUrls = [];
        setLayout((prev) => {
          const updated = prev.footerUrls.map((url) => {
            const index = previewUrls.indexOf(url);
            return index !== -1 ? uploadedUrls[index] : url;
          });
          finalFooterUrls = updated;
          return { ...prev, footerUrls: updated };
        });

        if (applyFooterLogosToAll) {
          setSaving(true);
          try {
            const otherCerts = dropdownCertifications.filter(c => String(c.certificate_type_id) !== selectedCertId);
            const updatedLayouts = {};
            for (const cert of otherCerts) {
              const certId = cert.certificate_type_id;
              const currentLayout = layoutsByCertId[certId] ?? { ...DEFAULT_CERTIFICATE_LAYOUT };
              const updatedLayout = { ...currentLayout, footerUrls: finalFooterUrls };
              const payload = toLayoutPayload(updatedLayout);
              await updateCertificationLayout(certId, payload);
              updatedLayouts[certId] = normalizeCertificateLayout(updatedLayout);
            }
            setLayoutsByCertId((prev) => ({
              ...prev,
              ...updatedLayouts,
            }));
            setSaveSuccess(true);
            setSuccessMessage("Footer logos applied to all templates successfully!");
            setTimeout(() => {
              setSaveSuccess(false);
              setSuccessMessage("");
            }, 2000);
          } catch (err) {
            console.error("Failed to apply footer logos to all templates:", err);
            setErrorMessage("Logos uploaded, but failed to apply to all certificate templates.");
          } finally {
            setSaving(false);
          }
        }
      } else {
        setLayout((prev) => ({
          ...prev,
          footerUrls: previousFooterUrls,
        }));
        setErrorMessage("Failed to upload one or more footer logos. Please try again.");
      }
    } catch (error) {
      console.error("Failed to upload footer logos:", error);
      setLayout((prev) => ({
        ...prev,
        footerUrls: previousFooterUrls,
      }));
      setErrorMessage("Failed to upload footer logos. Please try again.");
    }
  };

  const saveLayout = async () => {
    if (!selectedCertId) return;
    if (isLockedCertification) {
      setErrorMessage("This certificate is archived — its template is read-only. Restore it first to make changes.");
      return;
    }
    if (hasPreviewDataUrl(layout)) {
      console.warn("Skipping layout save until image uploads finish.");
      return;
    }

    try {
      setSaving(true);
      setSaveSuccess(false);
      const certTypeId = selectedCertId;

      const payload = toLayoutPayload(layout);
      const response = await updateCertificationLayout(certTypeId, payload);

      // 1. Grab the fresh data straight from Laravel's response
      const freshDbData = response?.data?.data;

      // 2. Normalize it so it has the perfect absolute URLs
      const freshLayout = freshDbData
        ? normalizeCertificateLayout(freshDbData)
        : normalizeCertificateLayout(layout);

      // 3. Update the global dictionary
      setLayoutsByCertId((prev) => ({
        ...prev,
        [certTypeId]: freshLayout,
      }));

      // 4. Instantly update the screen with the final database URLs
      setLayout(freshLayout);

      // Broadcast to the rest of the app
      window.dispatchEvent(
        new CustomEvent(CERT_TEMPLATE_LAYOUT_CHANGED, {
          detail: {
            certTypeId: Number(certTypeId),
            layout: freshLayout,
          },
        })
      );

      setSaveSuccess(true);
      setSuccessMessage("Layout saved successfully!");
      setTimeout(() => {
        setSaveSuccess(false);
        setSuccessMessage("");
      }, 2000);

    } catch (error) {
      console.error("Failed to save certification layout:", error);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!selectedCertId || !isPersistedCertification || loading || saving || isLockedCertification) return;
    if (hasPreviewDataUrl(layout)) return;

    if (isUndoRedoActionRef.current) {
      isUndoRedoActionRef.current = false;
      return;
    }

    const savedLayout = layoutsByCertId[selectedCertId];
    if (savedLayout && JSON.stringify(layout) === JSON.stringify(savedLayout)) {
      return;
    }

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
  }, [layout, selectedCertId, isPersistedCertification, loading, saving, layoutsByCertId, isLockedCertification]);

  const resetLayout = () => {
    pushToHistory(layout);
    setLayout({ ...DEFAULT_CERTIFICATE_LAYOUT });
  };

  const undo = () => {
    if (past.length === 0) return;

    const previousImageState = past[past.length - 1];
    const newPast = past.slice(0, -1);

    const currentImageState = {
      headerLeftUrl: layout.headerLeftUrl,
      headerRightUrl: layout.headerRightUrl,
      footerUrls: [...layout.footerUrls],
    };

    setFuture((prevFuture) => [currentImageState, ...prevFuture]);
    setPast(newPast);

    isUndoRedoActionRef.current = true;
    setLayout((prev) => ({
      ...prev,
      headerLeftUrl: previousImageState.headerLeftUrl,
      headerRightUrl: previousImageState.headerRightUrl,
      footerUrls: previousImageState.footerUrls,
    }));
    setSaveSuccess(false);
  };

  const redo = () => {
    if (future.length === 0) return;

    const nextImageState = future[0];
    const newFuture = future.slice(1);

    const currentImageState = {
      headerLeftUrl: layout.headerLeftUrl,
      headerRightUrl: layout.headerRightUrl,
      footerUrls: [...layout.footerUrls],
    };

    setPast((prevPast) => [...prevPast, currentImageState]);
    setFuture(newFuture);

    isUndoRedoActionRef.current = true;
    setLayout((prev) => ({
      ...prev,
      headerLeftUrl: nextImageState.headerLeftUrl,
      headerRightUrl: nextImageState.headerRightUrl,
      footerUrls: nextImageState.footerUrls,
    }));
    setSaveSuccess(false);
  };

  const resetAllLayouts = async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);

      const defaultLayout = { ...DEFAULT_CERTIFICATE_LAYOUT };
      const payload = toLayoutPayload(defaultLayout);

      await Promise.all(
        dropdownCertifications.map(async (cert) => {
          const certId = cert.certificate_type_id;
          await updateCertificationLayout(certId, payload);
          setLayoutsByCertId((prev) => ({
            ...prev,
            [certId]: normalizeCertificateLayout(defaultLayout),
          }));
        })
      );

      setLayout(defaultLayout);
      setSuccessMessage("All certificate layouts reset to defaults.");
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (error) {
      console.error("Failed to reset all certificate layouts:", error);
      setErrorMessage("Failed to reset all layouts. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const removeFooterLogo = (index) => {
    pushToHistory(layout);
    setLayout((prev) => ({
      ...prev,
      footerUrls: prev.footerUrls.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className={`min-h-screen p-4 sm:p-6 rounded-2xl ${isDark ? 'bg-[#18191a] text-[#e4e6eb]' : 'bg-white'}`}>
      <div className="mx-auto max-w-400 space-y-4">
        <header className={`rounded-xl border p-4 shadow-sm ${isDark ? 'border-[#3e4042] bg-[#242526]' : 'border-gray-200 bg-white'}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className={`text-xl font-bold sm:text-2xl ${isDark ? 'text-white' : 'text-[#4f2018]'}`}>Certificate Template Editor</h1>
              <div className={`mt-1 text-xs  ${isDark ? 'text-[#b0b3b8]' : 'text-[#4f2018]'}`}>
                <span className="font-bold">Reminder:</span>
                <ul className="list-disc ml-5 mt-1 space-y-0.5">
                  <li>Only logos are editable.</li>
                  <li>Check the corresponding checkbox before uploading a logo to apply it to all certificates.</li>
                </ul>
              </div>            
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                id="btn-undo-logo"
                onClick={undo}
                disabled={past.length === 0}
                className={`rounded-md border px-3 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'border-[#3e4042] bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539]' :
                  'border-gray-300 bg-gray-100 hover:bg-gray-200'}`}
                title="Undo last logo change"
              >
                Undo
              </button>
              <button
                id="btn-redo-logo"
                onClick={redo}
                disabled={future.length === 0}
                className={`rounded-md border px-3 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'border-[#3e4042] bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539]' :
                  'border-gray-300 bg-gray-100 hover:bg-gray-200'}`}
                title="Redo logo change"
              >
                Redo
              </button>
              <button
                id="btn-reset-logos"
                onClick={resetLayout}
                disabled={isLockedCertification}
                className={`rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'border-[#3e4042] bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539]' :
                  'border-gray-300 bg-gray-100 hover:bg-gray-200'}`}
              >
                Reset Logos
              </button>
              <button
                id="btn-reset-all-logos"
                onClick={() => setIsResetConfirmOpen(true)}
                disabled={saving || loading || isLockedCertification}
                className={`rounded-md border px-3 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark
                    ? 'border-red-950 bg-red-950/20 text-red-400 hover:bg-red-950/30'
                    : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                Reset All Logos
              </button>
              <button
                id="btn-save-layout"
                onClick={saveLayout}
                disabled={!selectedCertId || saving || saveSuccess || hasPreviewDataUrl(layout) || isLockedCertification}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed ${saveSuccess
                  ? 'bg-green-500 text-white border-green-600' // Turns green when successful!
                  : isDark
                    ? 'bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539] focus:ring-[#4e4f50] disabled:bg-[#2a2a2f]/50 border border-[#3e4042]'
                    : 'bg-yellow-400 text-slate-900 hover:bg-yellow-500 focus:ring-yellow-200 disabled:bg-yellow-200'
                  }`}
              >
                {isLockedCertification ? "Archived — Read Only" : saving ? "Saving..." : saveSuccess ? "Saved!" : hasPreviewDataUrl(layout) ? "Waiting for upload..." : "Save Layout"}
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

              {isLockedCertification && (
                <div className={`rounded-lg border px-3 py-2 text-xs font-medium ${isDark ? 'border-yellow-900/50 bg-yellow-900/10 text-yellow-400' : 'border-yellow-300 bg-yellow-50 text-yellow-800'}`}>
                  This certificate is archived — the template is read-only. Restore it from the Archived Documents tab to make changes.
                </div>
              )}

              <UploadDropZone label="Main Logo" onFiles={updateMainLogo} disabled={!selectedCertId || isLockedCertification} />
              <label className="mt-1.5 mb-3 flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="checkbox-apply-main-logo"
                  type="checkbox"
                  checked={applyMainLogoToAll}
                  onChange={(e) => setApplyMainLogoToAll(e.target.checked)}
                  disabled={!selectedCertId || isLockedCertification}
                  className={`w-3.5 h-3.5 rounded border focus:ring-0 cursor-pointer disabled:cursor-not-allowed ${isDark
                    ? 'border-[#3e4042] bg-[#242526] text-yellow-500'
                    : 'border-gray-300 text-yellow-500'
                    }`}
                />
                <span className={`text-[11px] font-semibold ${isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}`}>
                  Apply main logo to all templates
                </span>
              </label>

              <UploadDropZone label="Header Right Logo" onFiles={updateRightLogo} disabled={!selectedCertId || isLockedCertification} />
              <label className="mt-1.5 mb-3 flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="checkbox-apply-right-logo"
                  type="checkbox"
                  checked={applyRightLogoToAll}
                  onChange={(e) => setApplyRightLogoToAll(e.target.checked)}
                  disabled={!selectedCertId || isLockedCertification}
                  className={`w-3.5 h-3.5 rounded border focus:ring-0 cursor-pointer disabled:cursor-not-allowed ${isDark
                    ? 'border-[#3e4042] bg-[#242526] text-yellow-500'
                    : 'border-gray-300 text-yellow-500'
                    }`}
                />
                <span className={`text-[11px] font-semibold ${isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}`}>
                  Apply right logo to all templates
                </span>
              </label>

              <div className={`rounded-lg border p-3 ${isDark ? 'border-[#3e4042] bg-[#1f1f1f]' : 'border-gray-200 bg-gray-50'}`}>
                <p className={`text-xs font-semibold uppercase ${isDark ? 'text-[#b0b3b8]' : 'text-gray-700'}`}>Header Logo Size</p>
                <label className="mt-2 block text-sm">
                  <span className={`block ${isDark ? 'text-[#e4e6eb]' : 'text-gray-700'}`}>Size: {layout.headerLogoSize}px</span>
                  <input
                    type="range"
                    min="40"
                    max="100"
                    value={layout.headerLogoSize}
                    onChange={(event) => setLayout((prev) => ({ ...prev, headerLogoSize: Number(event.target.value) }))}
                    className="w-full"
                  />
                </label>
              </div>

              <UploadDropZone label="Footer Logos" multiple onFiles={addFooterLogos} disabled={!selectedCertId || isLockedCertification} />
              <label className="mt-1.5 mb-3 flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="checkbox-apply-footer-logos"
                  type="checkbox"
                  checked={applyFooterLogosToAll}
                  onChange={(e) => setApplyFooterLogosToAll(e.target.checked)}
                  disabled={!selectedCertId || isLockedCertification}
                  className={`w-3.5 h-3.5 rounded border focus:ring-0 cursor-pointer disabled:cursor-not-allowed ${isDark
                    ? 'border-[#3e4042] bg-[#242526] text-yellow-500'
                    : 'border-gray-300 text-yellow-500'
                    }`}
                />
                <span className={`text-[11px] font-semibold ${isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}`}>
                  Apply footer logos to all templates
                </span>
              </label>

              <div className={`rounded-lg border p-3 ${isDark ? 'border-[#3e4042] bg-[#1f1f1f]' : 'border-gray-200 bg-gray-50'}`}>
                <p className={`text-xs font-semibold uppercase ${isDark ? 'text-[#b0b3b8]' : 'text-gray-700'}`}>Footer Logo Size</p>
                <label className="mt-2 block text-sm">
                  <span className={`block ${isDark ? 'text-[#e4e6eb]' : 'text-gray-700'}`}>Size: {layout.footerLogoSize}px</span>
                  <input
                    type="range"
                    min="24"
                    max="100"
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

          <section className={`rounded-2xl border p-4 sm:p-8 ${isDark ? 'border-[#3e4042] bg-[#353638]' : 'border-gray-200 bg-white'}`}>
            <CertificatePreviewCanvas layout={layout} certId={Number(selectedCertId)} />
          </section>
        </div>
        {successMessage && (
          <SuccessToast
            message={successMessage}
            onClose={() => setSuccessMessage("")}
          />
        )}
        {errorMessage && (
          <ErrorToast
            message={errorMessage}
            onClose={() => setErrorMessage("")}
          />
        )}
        <ConfirmationModal
          isOpen={isResetConfirmOpen}
          onClose={() => setIsResetConfirmOpen(false)}
          onConfirm={resetAllLayouts}
          title="Reset All Logos"
          message="Are you sure you want to reset the logos of ALL certificate templates back to their defaults?"
          type="confirm"
        />
      </div>
    </div>
  );
};

export default CertificateTemplateManagement;