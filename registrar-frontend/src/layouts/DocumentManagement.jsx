import { useState, useEffect } from "react";import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import DropDown from "../components/DropDown";
import InputGroup from "../components/InputGroup";
import { getDocumentTypes, createDocumentType, updateDocumentType, deleteDocumentType } from '../services/api';
import SuccessToast from "../components/SuccessToast.jsx";
import ErrorToast from "../components/ErrorToast.jsx";

//REMOVE THIS LATER, JUST FOR DEMO PURPOSES
const EXCLUSIVE_FOR = ["All", "Student", "Alumni"];
const PER_PAGE = 6;

// const MOCK_DOCUMENTS = [
//   { document_type_id: 1, document_name: "Transcript of Records",     document_description: "Official academic transcript", document_requirements: "Request form, ID",  document_process_period: "5 days",  exclusive_for: "Student" },
//   { document_type_id: 2, document_name: "Certificate of Enrollment", document_description: "Proof of enrollment",          document_requirements: "Request form",       document_process_period: "3 days",  exclusive_for: "Student" },
//   { document_type_id: 3, document_name: "Honorable Dismissal",       document_description: "Transfer document",            document_requirements: "Clearance, ID",      document_process_period: "7 days",  exclusive_for: "Student" },
//   { document_type_id: 4, document_name: "Diploma",                   document_description: "Graduation certificate",       document_requirements: "Clearance",          document_process_period: "10 days", exclusive_for: "Alumni"  },
//   { document_type_id: 5, document_name: "ICOG",                      document_description: "In Course of Graduation",      document_requirements: "Form, ID",           document_process_period: "3 days",  exclusive_for: "Student" },
//   { document_type_id: 6, document_name: "Good Moral Certificate",    document_description: "Character certificate",        document_requirements: "Request form, ID",   document_process_period: "3 days",  exclusive_for: "Student" },
// ];

const EMPTY_FORM = {
  document_name:           "",
  document_description:    "",
  document_requirements:   "",
  document_process_period: "",
  exclusive_for:           "",
};

const DocumentManagement = () => {
  const [search, setSearch]           = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected]       = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [isAdding, setIsAdding]       = useState(true);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

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

  const handleEdit = (doc) => {
    setSelected(doc);
    setIsAdding(false);
    setForm({
      document_name:           doc.document_name,
      document_description:    doc.document_description,
      document_requirements:   doc.document_requirements,
      document_process_period: doc.document_process_period,
      exclusive_for:           doc.exclusive_for,
    });
  };

  const handleAdd = () => {
    setSelected(null);
    setIsAdding(true);
    setForm(EMPTY_FORM);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (isAdding) {
        const res = await createDocumentType(form);
        setDocuments((prev) => [...prev, res.data]);
        setSuccessMsg("Document added successfully!"); 
      } else if (selected) {
        const res = await updateDocumentType(selected.document_type_id, form);
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
    try {
      await deleteDocumentType(id);
      setDocuments((prev) => prev.filter((d) => d.document_type_id !== id));
      if (selected?.document_type_id === id) {
        setSelected(null);
        setIsAdding(true);
        setForm(EMPTY_FORM);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to delete document:");
    }
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
    <div className="bg-[#F5F5F5] min-h-screen font-sans">

      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm w-95">
          <Bars3Icon className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="outline-none bg-transparent text-sm text-gray-700 w-full placeholder-gray-400"
          />
          <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
        </div>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-pup-dark-maroon text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow hover:bg-[#3a0303] transition-all"
        >
          Add Document <PlusIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* Left — Document List */}
        <div className="bg-gray-200 rounded-xl w-full lg:max-w-sm flex flex-col overflow-hidden shadow-sm lg:self-start lg:sticky lg:top-0 h-137.5">
          <div className="px-6 pt-6 pb-3 text-center">
            <h2 className="text-pup-dark-maroon font-bold text-lg">List of Documents</h2>
            <hr className="mt-3 border-gray-400" />
          </div>

          <div className="px-3 py-2 mb-2 flex items-center justify-between">
            <span className="font-bold text-gray-800 text-sm">Document Name</span>
            <div className="flex gap-2 text-gray-400">
              <PencilSquareIcon className="w-5 h-5" />
              <TrashIcon className="w-5 h-5" />
            </div>
          </div>

      
          {loading ? (
            <p className="text-center text-gray-400 text-sm py-8 animate-pulse">Loading...</p>
          ) : paginated.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No documents found.</p>
          ) : (
            paginated.map((doc) => (
              <div
                key={doc.document_type_id}
                className={`flex items-center justify-between px-3 py-4 rounded-lg mb-1 transition-colors
                  ${selected?.document_type_id === doc.document_type_id ? "bg-white shadow-sm" : "hover:bg-gray-100"}`}
              >
                <span className="text-sm text-gray-700 font-medium truncate flex-1">{doc.document_name}</span>
                <div className="flex gap-2 ml-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(doc)}
                    className="hover:text-yellow-500 text-gray-400 transition-colors"
                  >
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.document_type_id)}
                    className="p-1 hover:text-red-600 text-gray-400 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}

          <div className="flex items-center justify-center gap-1 px-4 py-3 border-t border-gray-300 mt-auto">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2 py-1 disabled:opacity-40"
            >
              <ChevronLeftIcon className="w-3 h-3" /> Previous
            </button>
            {pageNumbers().map((p, i) => (
              <button
                key={i}
                onClick={() => typeof p === "number" && setCurrentPage(p)}
                disabled={p === "..."}
                className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors
                  ${safePage === p ? "bg-yellow-400 text-white" : "text-gray-500 hover:bg-gray-300"}
                  ${p === "..." ? "cursor-default pointer-events-none" : ""}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2 py-1 disabled:opacity-40"
            >
              Next <ChevronRightIcon className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right — Always visible form */}
        <form onSubmit={handleSave} className="bg-gray-200 rounded-xl p-6 py-4 lg:w-200 w-full flex flex-col overflow-hidden shadow-sm lg:self-start lg:sticky lg:top-0 h-137.5">
          <h2 className="text-pup-dark-maroon font-bold text-xl mb-2">
            {isAdding ? "Add Document" : "Edit Document"}
          </h2>

          <InputGroup
            label="Document Name"
            name="document_name"
            value={form.document_name}
            onChange={handleChange}
            placeholder="e.g. ICOG"
            required
            labelColor="text-gray-600"
          />

          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Document Description</label>
            <textarea
              name="document_description"
              value={form.document_description}
              onChange={handleChange}
              placeholder="Text"
              rows={3}
              className="w-full px-3 py-3 bg-white rounded-lg text-sm text-gray-700
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFC72C]
                transition-all duration-200 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1.5">List of Requirements</label>
            <textarea
              name="document_requirements"
              value={form.document_requirements}
              onChange={handleChange}
              placeholder="Text"
              rows={3}
              className="w-full px-3 py-3 bg-white rounded-lg text-sm text-gray-700
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFC72C]
                transition-all duration-200 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputGroup
              label="Process Period"
              name="document_process_period"
              value={form.document_process_period}
              onChange={handleChange}
              placeholder="e.g. 3 days"
              labelColor="text-gray-600"
            />
            <DropDown
              label="Exclusive For"
              name="exclusive_for"
              value={form.exclusive_for}
              onChange={handleChange}
              options={EXCLUSIVE_FOR}
              labelColor="text-gray-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {!isAdding && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-2.5 mt-9 rounded-full text-sm font-bold bg-pup-dark-maroon text-white hover:bg-[#3a0303] transition-all shadow"
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
    </div>
  );
}
export default DocumentManagement;