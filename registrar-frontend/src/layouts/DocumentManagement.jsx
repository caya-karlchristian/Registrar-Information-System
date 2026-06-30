import { useState, useEffect } from "react";
import {
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import InputGroup from "../components/InputGroup";
import ProcessPeriodInput from "../components/ProcessPeriodInput.jsx";
import VoiceTextareaInput from "../components/VoiceTextareaInput.jsx";
import VoiceSearchInput from "../components/VoiceSearchInput.jsx";
import { getDocumentTypes, createDocumentType, updateDocumentType, deleteDocumentType } from '../services/api';
import SuccessToast from "../components/SuccessToast.jsx";
import ErrorToast from "../components/ErrorToast.jsx";
import DeleteConfirmModal from "../components/DeleteConfirmModal.jsx";
import { useTheme } from "../context/ThemeContext";
import { DocumentSkeleton } from '../components/LoadingSkeleton'; // Import skeleton

//REMOVE THIS LATER, JUST FOR DEMO PURPOSES
const EXCLUSIVE_FOR = ["Student", "Alumni", "All"];

const ACCESS_MAP = { Student: 1, Alumni: 2, All: 3 };

const ACCESS_MAP_REVERSE = { 1: "Student", 2: "Alumni", 3: "All" };

const PER_PAGE = 9;

const EMPTY_FORM = {
  document_name:           "",
  document_description:    "",
  document_requirements:   "",
  document_process_period: "",
  access_id:           "",
};

const DocumentManagement = () => {
  const { isDark } = useTheme();
  const [search, setSearch]           = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected]       = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [isAdding, setIsAdding]       = useState(true);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, docId: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const res = await getDocumentTypes();
        setDocuments(res.data);
      } catch (err) {
        console.error("Failed to fetch documents:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, []);
  const filtered = documents.filter((d) =>
    d.document_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(currentPage, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleVoiceTextareaChange = (name) => (value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (doc) => {
  setSelected(doc);
  setIsAdding(false);
  setForm({
    document_name:           doc.document_name,
    document_description:    doc.document_description,
    document_requirements:   doc.document_requirements,
    document_process_period: doc.document_process_period,
    access_id: ACCESS_MAP_REVERSE[doc.access_id] ?? doc.access_id,
  });
};

  const handleAdd = () => {
    setSelected(null);
    setIsAdding(true);
    setForm(EMPTY_FORM);
  };

  const handleSave = async (e) => {
  e.preventDefault();
  const payload = {
    ...form,
    access_id: ACCESS_MAP[form.access_id] ?? form.access_id,
  };
  try {
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
      await deleteDocumentType(id);
      setDocuments((prev) => prev.filter((d) => d.document_type_id !== id));
      if (selected?.document_type_id === id) {
        setSelected(null);
        setIsAdding(true);
        setForm(EMPTY_FORM);
      }
      setDeleteModal({ isOpen: false, docId: null });
      setSuccessMsg("Document deleted successfully!");
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to delete document:");
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmDelete = (id) => {
    setDeleteModal({ isOpen: true, docId: id });
  };

  const handleCancel = () => {
    setSelected(null);
    setIsAdding(true);
    setForm(EMPTY_FORM);
  };

  const pageNumbers = () => {
    if (totalPages <= 6) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [1, 2, 3];
    if (safePage > 4) pages.push("...");
    if (safePage > 3 && safePage < totalPages - 2) pages.push(safePage);
    pages.push("...", totalPages - 1, totalPages);
    return [...new Set(pages)];
  };

  return (
    <div className={`font-sans mt-10 px-4 sm:px-6 ${isDark ? 'bg-[#18191a] text-[#e4e6eb]' : 'bg-[#F5F5F5]'}`}>

      {/* Top bar */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start mb-6">
        <div className="w-full lg:max-w-sm">
          <div className="w-full">
            <VoiceSearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setCurrentPage(1);
              }}
              placeholder="Search"
            />
          </div>
        </div>

        <div className="w-full lg:flex-1 flex justify-start lg:justify-end">
          <button
            onClick={handleAdd}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold shadow transition-all ${isDark ? 'bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539] border border-[#3e4042]' : 'bg-pup-dark-maroon text-white hover:bg-[#3a0303]'}`}
          >
            Add Document <PlusIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* Left — Document List */}
        <div className={`rounded-xl w-full lg:min-h-178 lg:max-w-sm flex flex-col overflow-hidden shadow-sm h-fit ${isDark ? 'bg-[#242526] border border-[#3e4042]' : 'bg-gray-200'}`}>
          <div className="px-6 pt-6 pb-3 text-center">
            <h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-pup-dark-maroon'}`}>List of Documents</h2>
            <hr className={`mt-3 ${isDark ? 'border-[#3e4042]' : 'border-gray-400'}`} />
          </div>

          <div className="px-3 py-2 mb-2 flex items-center justify-between">
            <span className={`font-bold text-sm ${isDark ? 'text-[#e4e6eb]' : 'text-gray-800'}`}>Document Name</span>
            <div className={`flex gap-2 ${isDark ? 'text-[#9a9a9a]' : 'text-gray-400'}`}>
              <PencilSquareIcon className="w-5 h-5" />
              <TrashIcon className="w-5 h-5" />
            </div>
          </div>

      
          {loading ? (
            <DocumentSkeleton isDark={isDark} count={7} />
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className={`w-16 h-16 mb-4 flex items-center justify-center rounded-full ${isDark ? 'bg-[#3a3b3c]/40' : 'bg-gray-100'}`}>
                <MagnifyingGlassIcon className={`w-8 h-8 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'}`} />
              </div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                No Documents Found
              </h3>
              <p className={`text-xs text-center px-4 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
                No documents match your search criteria.
              </p>
            </div>
          ) : (
            paginated.map((doc) => (
              <div
                key={doc.document_type_id}
                className={`flex items-center justify-between px-3 py-4 rounded-lg mb-1 transition-colors
                  ${selected?.document_type_id === doc.document_type_id ? (isDark ? 'bg-[#2a2a2f] shadow-sm border border-[#3e4042]' : 'bg-white shadow-sm') : (isDark ? 'hover:bg-[#2a2a2f]' : 'hover:bg-gray-100')}`}
              >
                <span className={`text-sm font-medium truncate flex-1 ${isDark ? 'text-[#e4e6eb]' : 'text-gray-700'}`}>{doc.document_name}</span>
                <div className="flex gap-2 ml-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(doc)}
                    className={`transition-colors ${isDark ? 'text-[#9a9a9a] hover:text-yellow-300' : 'text-gray-400 hover:text-yellow-500'}`}
                  >
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDelete(doc.document_type_id)}
                    className={`p-1 transition-colors ${isDark ? 'text-[#9a9a9a] hover:text-red-300' : 'text-gray-400 hover:text-red-600'}`}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}

          <div className={`flex items-center justify-center gap-1 px-4 py-3 border-t mt-auto ${isDark ? 'border-[#3e4042]' : 'border-gray-300'}`}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className={`flex items-center gap-1 text-xs px-2 py-1 disabled:opacity-40 ${isDark ? 'text-[#b0b3b8] hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <ChevronLeftIcon className="w-3 h-3" /> Previous
            </button>
            {pageNumbers().map((p, i) => (
              <button
                key={i}
                onClick={() => typeof p === "number" && setCurrentPage(p)}
                disabled={p === "..."}
                className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors
                  ${safePage === p ? "bg-yellow-400 text-white" : (isDark ? 'text-[#b0b3b8] hover:bg-[#2a2a2f]' : 'text-gray-500 hover:bg-gray-300')}
                  ${p === "..." ? "cursor-default pointer-events-none" : ""}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className={`flex items-center gap-1 text-xs px-2 py-1 disabled:opacity-40 whitespace-nowrap ${isDark ? 'text-[#b0b3b8] hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
            >
              Next <ChevronRightIcon className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right — Always visible form */}
        <form onSubmit={handleSave} className={`rounded-xl p-6 sm:p-10 py-4 lg:flex-1 w-full flex flex-col gap-5 shadow-sm h-fit ${isDark ? 'bg-[#242526] border border-[#3e4042]' : 'bg-gray-200'}`}>
          <h2 className={`font-bold text-xl mb-2 ${isDark ? 'text-white' : 'text-pup-dark-maroon'}`}>
            {isAdding ? "Add Document" : "Edit Document"}
          </h2>

          <InputGroup
            label="Document Name"
            name="document_name"
            value={form.document_name}
            onChange={handleChange}
            placeholder="e.g. ICOG"
            required
            labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold border transition-all duration-200 cursor-pointer ${
                      isActive
                        ? isDark
                          ? "bg-yellow-400 border-yellow-400 text-gray-900 shadow-md scale-[1.02]"
                          : "bg-pup-dark-maroon border-pup-dark-maroon text-white shadow-md scale-[1.02]"
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
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow ${isDark ? 'bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539] border border-[#3e4042]' : 'bg-pup-dark-maroon text-white hover:bg-[#3a0303]'}`}
            >
              {isAdding ? "Add Document" : "Save Changes"}
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
        onCancel={() => setDeleteModal({ isOpen: false, docId: null })}
        onConfirm={() => {
          if (deleteModal.docId) handleDelete(deleteModal.docId);
        }}
      />
    </div>
  );
}
export default DocumentManagement;