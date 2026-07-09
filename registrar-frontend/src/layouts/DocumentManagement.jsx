import { useState, useEffect, useRef } from "react";
import {
  TrashIcon,
  PlusIcon,
  FolderIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";
import InputGroup from "../components/InputGroup";
import ProcessPeriodInput from "../components/ProcessPeriodInput.jsx";
import VoiceTextareaInput from "../components/VoiceTextareaInput.jsx";
import VoiceSearchInput from "../components/VoiceSearchInput.jsx";
import { getDocumentTypes, createDocumentType, updateDocumentType, deleteDocumentType, getCertifications, createCertification, updateCertification, deleteCertification } from '../services/api';
import SuccessToast from "../components/SuccessToast.jsx";
import ErrorToast from "../components/ErrorToast.jsx";
import DeleteConfirmModal from "../components/DeleteConfirmModal.jsx";
import { useTheme } from "../context/ThemeContext";

const EXCLUSIVE_FOR = ["Student", "Alumni", "All"];
const ACCESS_MAP = { Student: 1, Alumni: 2, All: 3 };
const ACCESS_MAP_REVERSE = { 1: "Student", 2: "Alumni", 3: "All" };

const EMPTY_FORM = {
  document_name: "",
  document_description: "",
  document_requirements: "",
  document_process_period: "",
  access_id: "",
};

const FOLDER_COLORS = [
  {
    folder: "text-[#8B0000] hover:text-[#700000] dark:text-[#a51a1a] dark:hover:text-[#be2323]",
    inner: "text-[#8B0000] dark:text-[#a51a1a]",
    bg: "bg-[#8B0000]/5 dark:bg-[#8B0000]/10",
    text: "text-[#8B0000] dark:text-red-200",
    activeRing: "ring-2 ring-[#8B0000] border-[#8B0000]",
  },
  {
    folder: "text-[#F8BF1E] hover:text-[#d3a010] dark:text-[#f9c738] dark:hover:text-[#fad360]",
    inner: "text-[#F8BF1E] dark:text-[#f9c738]",
    bg: "bg-[#F8BF1E]/5 dark:bg-[#F8BF1E]/10",
    text: "text-amber-800 dark:text-amber-200",
    activeRing: "ring-2 ring-[#F8BF1E] border-[#F8BF1E]",
  },
  {
    folder: "text-[#10b981] hover:text-[#059669] dark:text-[#34d399] dark:hover:text-[#6ee7b7]",
    inner: "text-[#10b981] dark:text-[#34d399]",
    bg: "bg-[#10b981]/5 dark:bg-[#10b981]/10",
    text: "text-[#065f46] dark:text-emerald-200",
    activeRing: "ring-2 ring-[#10b981] border-[#10b981]",
  },
];

const DocumentManagement = ({
  documents,
  setDocuments,
  certifications,
  setCertifications,
  loading,
  onArchiveDoc,
  onArchiveCert,
}) => {
  const { isDark } = useTheme();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [selectedType, setSelectedType] = useState("document"); // "document" or "certificate"
  const [form, setForm] = useState(EMPTY_FORM);
  const [isAdding, setIsAdding] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, docId: null, type: "document" });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Document Carousel Ref & State
  const docScrollRef = useRef(null);
  const [docActiveIndex, setDocActiveIndex] = useState(0);

  // Certificate Carousel Ref & State
  const certScrollRef = useRef(null);
  const [certActiveIndex, setCertActiveIndex] = useState(0);

  // Data fetching is handled by parent, this hook is a no-op but kept for lifecycle compatibility
  useEffect(() => {}, []);

  // Filter lists by search query and active status
  const filteredDocs = documents.filter((d) =>
    d.document_name.toLowerCase().includes(search.toLowerCase()) && !d.is_archived
  );
  const filteredCerts = certifications.filter((c) =>
    c.certificate_name.toLowerCase().includes(search.toLowerCase()) && !c.is_archived
  );

  const docTotalPages = Math.ceil(filteredDocs.length / 3);
  const certTotalPages = Math.ceil(filteredCerts.length / 3);

  // Document Scrolling handlers
  const scrollDocToPage = (pageIdx) => {
    if (docScrollRef.current) {
      const container = docScrollRef.current;
      const cards = container.children;
      const targetCardIdx = pageIdx * 3;
      if (cards && cards[targetCardIdx]) {
        cards[targetCardIdx].scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "start",
        });
        setDocActiveIndex(pageIdx);
      }
    }
  };

  const scrollDocLeft = () => {
    const newPage = Math.max(0, docActiveIndex - 1);
    scrollDocToPage(newPage);
  };

  const scrollDocRight = () => {
    const newPage = Math.min(docTotalPages - 1, docActiveIndex + 1);
    scrollDocToPage(newPage);
  };

  const handleDocScroll = (e) => {
    const container = e.target;
    const { scrollLeft, clientWidth, scrollWidth } = container;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0 || docTotalPages <= 1) return;

    const percentage = scrollLeft / maxScroll;
    const newPage = Math.min(
      docTotalPages - 1,
      Math.max(0, Math.round(percentage * (docTotalPages - 1)))
    );
    setDocActiveIndex(newPage);
  };

  // Certificate Scrolling handlers
  const scrollCertToPage = (pageIdx) => {
    if (certScrollRef.current) {
      const container = certScrollRef.current;
      const cards = container.children;
      const targetCardIdx = pageIdx * 3;
      if (cards && cards[targetCardIdx]) {
        cards[targetCardIdx].scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "start",
        });
        setCertActiveIndex(pageIdx);
      }
    }
  };

  const scrollCertLeft = () => {
    const newPage = Math.max(0, certActiveIndex - 1);
    scrollCertToPage(newPage);
  };

  const scrollCertRight = () => {
    const newPage = Math.min(certTotalPages - 1, certActiveIndex + 1);
    scrollCertToPage(newPage);
  };

  const handleCertScroll = (e) => {
    const container = e.target;
    const { scrollLeft, clientWidth, scrollWidth } = container;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0 || certTotalPages <= 1) return;

    const percentage = scrollLeft / maxScroll;
    const newPage = Math.min(
      certTotalPages - 1,
      Math.max(0, Math.round(percentage * (certTotalPages - 1)))
    );
    setCertActiveIndex(newPage);
  };

  // Reset scroll on search changes
  useEffect(() => {
    setDocActiveIndex(0);
    setCertActiveIndex(0);
    if (docScrollRef.current) docScrollRef.current.scrollLeft = 0;
    if (certScrollRef.current) certScrollRef.current.scrollLeft = 0;
  }, [search]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleVoiceTextareaChange = (name) => (value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditDoc = (doc) => {
    setSelected(doc);
    setSelectedType("document");
    setIsAdding(false);
    setForm({
      document_name: doc.document_name,
      document_description: doc.document_description ?? "",
      document_requirements: doc.document_requirements ?? "",
      document_process_period: doc.document_process_period ?? "",
      access_id: ACCESS_MAP_REVERSE[doc.access_id] ?? doc.access_id,
    });
  };

  const handleEditCert = (cert) => {
    setSelected(cert);
    setSelectedType("certificate");
    setIsAdding(false);
    setForm({
      document_name: cert.certificate_name,
      document_description: "",
      document_requirements: cert.certificate_requirements ?? "",
      document_process_period: cert.certificate_process_period ?? "",
      access_id: ACCESS_MAP_REVERSE[cert.access_id] ?? cert.access_id,
    });
  };

  const handleAddDoc = () => {
    setSelected(null);
    setSelectedType("document");
    setIsAdding(true);
    setForm(EMPTY_FORM);
  };

  const handleAddCert = () => {
    setSelected(null);
    setSelectedType("certificate");
    setIsAdding(true);
    setForm(EMPTY_FORM);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (selectedType === "document") {
        const payload = {
          ...form,
          access_id: ACCESS_MAP[form.access_id] ?? form.access_id,
        };
        if (isAdding) {
          const res = await createDocumentType(payload);
          setDocuments((prev) => [...prev, res.data]);
          setSuccessMsg("Document added successfully!");
        } else if (selected) {
          const res = await updateDocumentType(selected.document_type_id, payload);
          setDocuments((prev) =>
            prev.map((d) => d.document_type_id === selected.document_type_id ? res.data : d)
          );
          setSuccessMsg("Document updated successfully!");
        }
      } else {
        const payload = {
          certificate_name: form.document_name,
          certificate_requirements: form.document_requirements,
          certificate_process_period: form.document_process_period,
          access_id: ACCESS_MAP[form.access_id] ?? form.access_id,
        };
        if (isAdding) {
          const res = await createCertification(payload);
          setCertifications((prev) => [...prev, res.data]);
          setSuccessMsg("Certificate added successfully!");
        } else if (selected) {
          const res = await updateCertification(selected.certificate_type_id, payload);
          setCertifications((prev) =>
            prev.map((c) => c.certificate_type_id === selected.certificate_type_id ? res.data : c)
          );
          setSuccessMsg("Certificate updated successfully!");
        }
      }
      setForm(EMPTY_FORM);
      setSelected(null);
      setIsAdding(true);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "An unexpected error occurred.");
    }
  };

  const handleDelete = async (id) => {
    setDeleteLoading(true);
    try {
      if (deleteModal.type === "document") {
        await deleteDocumentType(id);
        setDocuments((prev) => prev.filter((d) => d.document_type_id !== id));
        if (selected?.document_type_id === id && selectedType === "document") {
          handleCancel();
        }
        setSuccessMsg("Document deleted successfully!");
      } else {
        await deleteCertification(id);
        setCertifications((prev) => prev.filter((c) => c.certificate_type_id !== id));
        if (selected?.certificate_type_id === id && selectedType === "certificate") {
          handleCancel();
        }
        setSuccessMsg("Certificate deleted successfully!");
      }
      setDeleteModal({ isOpen: false, docId: null, type: "document" });
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to delete.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmDelete = (id, type) => {
    setDeleteModal({ isOpen: true, docId: id, type });
  };

  const handleCancel = () => {
    setSelected(null);
    setIsAdding(true);
    setForm(EMPTY_FORM);
  };

  return (
    <div className={`font-sans rounded-2xl p-4 sm:px-6 ${isDark ? 'bg-[#18191a] text-[#e4e6eb]' : 'bg-white text-gray-900'}`}>      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
          background: transparent !important;
        }
        .no-scrollbar::-webkit-scrollbar-track {
          background: transparent !important;
          display: none !important;
        }
        .no-scrollbar::-webkit-scrollbar-thumb {
          background: transparent !important;
          display: none !important;
        }
        .no-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}</style>

      {/* Top bar */}
      <div className="flex flex-col py-5 lg:flex-row gap-4 sm:gap-6 items-start mb-6">
        <div className="w-full lg:max-w-sm">
          <div className="w-full">
            <VoiceSearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
              }}
              placeholder="Search"
            />
          </div>
        </div>

        <div className="w-full lg:flex-1 flex justify-start lg:justify-end gap-3 flex-wrap">
          <button
            onClick={handleAddDoc}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold shadow transition-all cursor-pointer ${isAdding && selectedType === "document"
                ? isDark
                  ? "bg-yellow-400 text-gray-900 border-2 border-yellow-400 shadow-md scale-102"
                  : "bg-pup-dark-maroon text-white border-2 border-pup-dark-maroon shadow-md scale-102"
                : isDark ? 'bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539] border border-[#3e4042]' : 'bg-pup-dark-maroon text-white hover:bg-[#3a0303]'
              }`}
          >
            Add Document <PlusIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handleAddCert}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold shadow transition-all cursor-pointer ${isAdding && selectedType === "certificate"
                ? isDark
                  ? "bg-yellow-400 text-gray-900 border-2 border-yellow-400 shadow-md scale-102"
                  : "bg-pup-dark-maroon text-white border-2 border-pup-dark-maroon shadow-md scale-102"
                : isDark ? 'bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539] border border-[#3e4042]' : 'bg-pup-dark-maroon text-white hover:bg-[#3a0303]'
              }`}
          >
            Add Certificate <PlusIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-6 w-full">

        {/* 2 in a Row Grid Wrapper */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full items-stretch">

          {/* List of Documents Container Box */}
          <div className="w-full bg-white dark:bg-[#242526] rounded-2xl p-4 border border-gray-200/80 dark:border-[#3e4042] shadow-sm flex flex-col justify-between gap-3">

            <div className="flex flex-col gap-3">
              <h3 className={`font-bold text-center text-sm tracking-wider w-full ${isDark ? 'text-[#e4e6eb]' : 'text-[#8B0000]'}`}>
                List of Documents
              </h3>

              <div className="relative w-full group/container">

                {/* Left Scroll Arrow */}
                {docTotalPages > 1 && (
                  <button
                    type="button"
                    onClick={scrollDocLeft}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white dark:bg-[#242526] border border-gray-200 dark:border-[#3e4042] flex items-center justify-center shadow-md text-gray-500 hover:text-[#8B0000] dark:hover:text-[#F8BF1E] transition-all opacity-0 group-hover/container:opacity-100"
                    title="Scroll Left"
                  >
                    <ChevronLeftIcon className="w-4 h-4 stroke-2" />
                  </button>
                )}

                <div
                  ref={docScrollRef}
                  onScroll={handleDocScroll}
                  className="flex flex-row overflow-x-auto items-center gap-4 px-4 scroll-px-4 py-3 pb-4 select-none w-full snap-x snap-mandatory scroll-smooth no-scrollbar"
                >
                  {loading ? (
                    <div className="py-6 text-center text-xs text-gray-500 w-full animate-pulse">
                      Loading documents...
                    </div>
                  ) : filteredDocs.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-500 w-full">
                      No documents found
                    </div>
                  ) : (
                    filteredDocs.map((doc, idx) => {
                      const style = FOLDER_COLORS[idx % FOLDER_COLORS.length];
                      const isSelected = selectedType === "document" && selected?.document_type_id === doc.document_type_id;

                      return (
                        <div
                          key={doc.document_type_id}
                          onClick={() => handleEditDoc(doc)}
                          className={`group relative shrink-0 w-[calc((100%-16px)/2)] h-28 md:w-[calc((100%-32px)/3)] p-2.5 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 snap-start ${isSelected
                              ? `${style.activeRing} ${style.bg} shadow-sm scale-102`
                              : "border-gray-200 dark:border-[#3e4042] bg-gray-50/40 dark:bg-[#1a1b1c] hover:border-gray-300 dark:hover:border-gray-600 hover:-translate-y-1 hover:shadow-sm"
                            }`}
                        >
                          {/* Archive button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onArchiveDoc(doc.document_type_id);
                              setSuccessMsg("Document archived successfully!");
                              if (selected?.document_type_id === doc.document_type_id) {
                                handleCancel();
                              }
                            }}
                            className="absolute top-1.5 right-8 p-1 rounded-full bg-white/80 dark:bg-black/40 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 z-10"
                            title="Archive Document"
                          >
                            <ArchiveBoxIcon className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button*/}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDelete(doc.document_type_id, "document");
                            }}
                            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-white/80 dark:bg-black/40 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-600 dark:hover:text-red-400 z-10"
                            title="Delete Document"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>

                          <div className="flex flex-col items-center justify-between flex-1 w-full pt-3">
                            <div className="relative w-10 h-10 flex items-center justify-center">
                              <FolderIcon className={`w-10 h-10 stroke-[1.5] transition-colors ${style.folder}`} />
                              <div className="absolute inset-0 flex items-center justify-center pt-1.5">
                                <DocumentTextIcon className={`w-4 h-4 stroke-[1.5] transition-colors ${style.inner}`} />
                              </div>
                            </div>
                            <div className="h-8 w-full flex items-center justify-center">
                              <span className={`text-[10px] font-bold tracking-tight leading-tight line-clamp-3 text-center w-full px-1 wrap-break-word ${isSelected ? style.text : (isDark ? "text-[#e4e6eb]" : "text-gray-700")
                                }`}>
                                {doc.document_name}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Right Scroll Arrow */}
                {docTotalPages > 1 && (
                  <button
                    type="button"
                    onClick={scrollDocRight}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white dark:bg-[#242526] border border-gray-200 dark:border-[#3e4042] flex items-center justify-center shadow-md text-gray-500 hover:text-[#8B0000] dark:hover:text-[#F8BF1E] transition-all opacity-0 group-hover/container:opacity-100"
                    title="Scroll Right"
                  >
                    <ChevronRightIcon className="w-4 h-4 stroke-2" />
                  </button>
                )}

              </div>
            </div>

            {docTotalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-1 select-none">
                {Array.from({ length: docTotalPages }).map((_, pageIdx) => {
                  const isActive = docActiveIndex === pageIdx;
                  return (
                    <button
                      key={pageIdx}
                      type="button"
                      onClick={() => scrollDocToPage(pageIdx)}
                      className={`transition-all duration-300 rounded-full cursor-pointer h-2 ${isActive
                          ? "w-6 bg-[#8B0000] dark:bg-[#F8BF1E]"
                          : "w-2 bg-[#8B0000]/25 dark:bg-[#F8BF1E]/25 hover:bg-[#8B0000]/50 dark:hover:bg-[#F8BF1E]/50"
                        }`}
                      title={`Go to page ${pageIdx + 1}`}
                    />
                  );
                })}
              </div>
            )}

          </div>

          {/* List of Certificates Container Box */}
          <div className="w-full bg-white dark:bg-[#242526] rounded-2xl p-4 border border-gray-200/80 dark:border-[#3e4042] shadow-sm flex flex-col justify-between gap-3">

            <div className="flex flex-col gap-3">
              <h3 className={`font-bold text-center text-sm tracking-wider w-full ${isDark ? 'text-[#e4e6eb]' : 'text-[#8B0000]'}`}>
                List of Certificates
              </h3>

              <div className="relative w-full group/container">

                {/* Left Scroll Arrow */}
                {certTotalPages > 1 && (
                  <button
                    type="button"
                    onClick={scrollCertLeft}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white dark:bg-[#242526] border border-gray-200 dark:border-[#3e4042] flex items-center justify-center shadow-md text-gray-500 hover:text-[#8B0000] dark:hover:text-[#F8BF1E] transition-all opacity-0 group-hover/container:opacity-100"
                    title="Scroll Left"
                  >
                    <ChevronLeftIcon className="w-4 h-4 stroke-2" />
                  </button>
                )}

                <div
                  ref={certScrollRef}
                  onScroll={handleCertScroll}
                  className="flex flex-row overflow-x-auto items-center gap-4 px-4 scroll-px-4 py-3 pb-4 select-none w-full snap-x snap-mandatory scroll-smooth no-scrollbar"
                >
                  {loading ? (
                    <div className="py-6 text-center text-xs text-gray-500 w-full animate-pulse">
                      Loading certificates...
                    </div>
                  ) : filteredCerts.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-500 w-full">
                      No certificates found
                    </div>
                  ) : (
                    filteredCerts.map((cert, idx) => {
                      const style = FOLDER_COLORS[idx % FOLDER_COLORS.length];
                      const isSelected = selectedType === "certificate" && selected?.certificate_type_id === cert.certificate_type_id;

                      return (
                        <div
                          key={cert.certificate_type_id}
                          onClick={() => handleEditCert(cert)}
                          className={`group relative shrink-0 w-[calc((100%-16px)/2)] h-28 md:w-[calc((100%-32px)/3)] p-2.5 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 snap-start ${isSelected
                              ? `${style.activeRing} ${style.bg} shadow-sm scale-102`
                              : "border-gray-200 dark:border-[#3e4042] bg-gray-50/40 dark:bg-[#1a1b1c] hover:border-gray-300 dark:hover:border-gray-600 hover:-translate-y-1 hover:shadow-sm"
                            }`}
                        >
                          {/* Archive button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onArchiveCert(cert.certificate_type_id);
                              setSuccessMsg("Certificate archived successfully!");
                              if (selected?.certificate_type_id === cert.certificate_type_id) {
                                handleCancel();
                              }
                            }}
                            className="absolute top-1.5 right-8 p-1 rounded-full bg-white/80 dark:bg-black/40 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 z-10"
                            title="Archive Certificate"
                          >
                            <ArchiveBoxIcon className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button*/}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDelete(cert.certificate_type_id, "certificate");
                            }}
                            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-white/80 dark:bg-black/40 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-600 dark:hover:text-red-400 z-10"
                            title="Delete Certificate"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>

                          <div className="flex flex-col items-center justify-between flex-1 w-full pt-3">
                            <div className="relative w-10 h-10 flex items-center justify-center">
                              <FolderIcon className={`w-10 h-10 stroke-[1.5] transition-colors ${style.folder}`} />
                              <div className="absolute inset-0 flex items-center justify-center pt-1.5">
                                <DocumentTextIcon className={`w-4 h-4 stroke-[1.5] transition-colors ${style.inner}`} />
                              </div>
                            </div>
                            <div className="h-8 w-full flex items-center justify-center">
                              <span className={`text-[10px] font-bold tracking-tight leading-tight line-clamp-2 text-center w-full px-1 wrap-break-word ${isSelected ? style.text : (isDark ? "text-[#e4e6eb]" : "text-gray-700")
                                }`}>
                                {cert.certificate_name}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Right Scroll Arrow */}
                {certTotalPages > 1 && (
                  <button
                    type="button"
                    onClick={scrollCertRight}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white dark:bg-[#242526] border border-gray-200 dark:border-[#3e4042] flex items-center justify-center shadow-md text-gray-500 hover:text-[#8B0000] dark:hover:text-[#F8BF1E] transition-all opacity-0 group-hover/container:opacity-100"
                    title="Scroll Right"
                  >
                    <ChevronRightIcon className="w-4 h-4 stroke-2" />
                  </button>
                )}

              </div>
            </div>

            {certTotalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-1 select-none">
                {Array.from({ length: certTotalPages }).map((_, pageIdx) => {
                  const isActive = certActiveIndex === pageIdx;
                  return (
                    <button
                      key={pageIdx}
                      type="button"
                      onClick={() => scrollCertToPage(pageIdx)}
                      className={`transition-all duration-300 rounded-full cursor-pointer h-2 ${isActive
                          ? "w-6 bg-[#8B0000] dark:bg-[#F8BF1E]"
                          : "w-2 bg-[#8B0000]/25 dark:bg-[#F8BF1E]/25 hover:bg-[#8B0000]/50 dark:hover:bg-[#F8BF1E]/50"
                        }`}
                      title={`Go to page ${pageIdx + 1}`}
                    />
                  );
                })}
              </div>
            )}

          </div>

        </div>

        <form onSubmit={handleSave} className={`rounded-xl p-6 sm:p-10 py-4 w-full flex flex-col gap-5 shadow h-fit ${isDark ? 'bg-[#242526] border border-[#3e4042]' : 'bg-white border border-gray-200'}`}>
          <h2 className={`font-bold text-xl mb-2 ${isDark ? 'text-white' : 'text-pup-dark-maroon'}`}>
            {isAdding
              ? (selectedType === "document" ? "Add Document" : "Add Certificate")
              : (selectedType === "document" ? "Edit Document" : "Edit Certificate")
            }
          </h2>

          <InputGroup
            label={selectedType === "document" ? "Document Name" : "Certificate Name"}
            name="document_name"
            value={form.document_name}
            onChange={handleChange}
            placeholder={selectedType === "document" ? "e.g. ICOG" : "e.g. Certificate of Enrollment"}
            required
            labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {selectedType === "document" ? (
              <>
                <VoiceTextareaInput
                  id="document_description"
                  label="Document Description"
                  value={form.document_description}
                  onChange={handleVoiceTextareaChange("document_description")}
                  placeholder="Text"
                  minHeightClass="min-h-48"
                  required
                  labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
                />
                <VoiceTextareaInput
                  id="document_requirements"
                  label="List of Requirements"
                  value={form.document_requirements}
                  onChange={handleVoiceTextareaChange("document_requirements")}
                  placeholder="Text"
                  minHeightClass="min-h-48"
                  required
                  labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
                />
              </>
            ) : (
              <div className="col-span-2">
                <VoiceTextareaInput
                  id="document_requirements"
                  label="List of Requirements"
                  value={form.document_requirements}
                  onChange={handleVoiceTextareaChange("document_requirements")}
                  placeholder="Text"
                  minHeightClass="min-h-48"
                  required
                  labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
                />
              </div>
            )}
          </div>

          <ProcessPeriodInput
            label="Process Period"
            name="document_process_period"
            value={form.document_process_period}
            onChange={handleChange}
            labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
            required
          />

          <div className="flex flex-col gap-1.5 w-full">
            <span className={`text-sm font-medium ${isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}`}>
              Exclusive For <span className="text-red-400">*</span>
            </span>
            <div className="flex gap-3">
              {EXCLUSIVE_FOR.map((option) => {
                const isActive = form.access_id === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, access_id: option }))}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold border transition-all duration-200 cursor-pointer ${isActive
                        ? isDark
                          ? "bg-yellow-400 border-yellow-400 text-gray-900 shadow-md scale-[1.02]"
                          : "bg-pup-dark-maroon border-pup-dark-maroon text-white shadow-sm scale-[1.02]"
                        : isDark
                          ? "bg-[#1f1f1f] border-[#3e4042] text-[#e4e6eb] hover:bg-[#2a2a2f] hover:text-white"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-3 pt-2">
            {!isAdding && (
              <button
                type="button"
                onClick={handleCancel}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${isDark ? 'text-[#b0b3b8] hover:bg-[#2a2a2f]' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow cursor-pointer ${isDark ? 'bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539] border border-[#3e4042]' : 'bg-pup-dark-maroon text-white hover:bg-[#3a0303]'}`}
            >
              {isAdding
                ? (selectedType === "document" ? "Add Document" : "Add Certificate")
                : "Save Changes"
              }
            </button>
            <SuccessToast
              message={successMsg}
              onClose={() => setSuccessMsg("")}
            />
            <ErrorToast
              message={errorMsg}
              onClose={() => setErrorMsg("")}
            />
          </div>
        </form>
      </div>
      <DeleteConfirmModal
        open={deleteModal.isOpen}
        count={1}
        loading={deleteLoading}
        onCancel={() => setDeleteModal({ isOpen: false, docId: null, type: "document" })}
        onConfirm={() => {
          if (deleteModal.docId) handleDelete(deleteModal.docId);
        }}
      />
    </div>
  );
}
export default DocumentManagement;