import { useState, useEffect, useCallback } from "react";
import { ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import InputGroup from "../components/InputGroup";
import VoiceTextareaInput from "../components/VoiceTextareaInput.jsx";
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { AnnouncementSkeleton } from '../components/LoadingSkeleton';
import SuccessToast from "../components/SuccessToast.jsx";
import ErrorToast from "../components/ErrorToast.jsx";
import ConfirmationModal from "../components/ConfirmationModal";

const PER_PAGE = 4;
const EMPTY_FORM = { title: "", content: "" };

const SystemSettings = () => {
  const { isDark } = useTheme();
  const [announcements, setAnnouncements] = useState([]);
  const [meta, setMeta]                   = useState({ current_page: 1, last_page: 1 });
  const [academicYear, setAcademicYear]   = useState("");
  const [currentPage, setCurrentPage]     = useState(1);
  const [selected, setSelected]           = useState(null);
  const [form, setForm]                   = useState(EMPTY_FORM);
  const [isAdding, setIsAdding]           = useState(true);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteModal, setDeleteModal] = useState({ isOpen: false });

  const fetchAnnouncements = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAnnouncements(page, PER_PAGE);
      setAnnouncements(res.data.data);
      setMeta({ current_page: res.data.current_page, last_page: res.data.last_page });
    } catch {
      setError("Failed to load announcements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements(currentPage);
  }, [currentPage, fetchAnnouncements]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCardClick = (ann) => {
    setSelected(ann);
    setIsAdding(false);
    setForm({ title: ann.title, content: ann.content });
  };

  const handleToggle = async (ann) => {
    try {
      const res = await updateAnnouncement(ann.id, { enabled: !ann.enabled });
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === ann.id ? res.data : a))
      );
    } catch {
      setErrorMsg("Failed to update announcement.");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (isAdding) {
        await createAnnouncement(form);
        setSuccessMsg("Announcement posted successfully!");
      } else {
        await updateAnnouncement(selected.id, form);
        setSuccessMsg("Changes saved successfully!");
      }
      setForm(EMPTY_FORM);
      setSelected(null);
      setIsAdding(true);
      fetchAnnouncements(currentPage);
    } catch {
      setErrorMsg("Failed to save announcement.");
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await deleteAnnouncement(selected.id);
      setForm(EMPTY_FORM);
      setSelected(null);
      setIsAdding(true);
      fetchAnnouncements(currentPage);
    } catch {
      setErrorMsg("Failed to delete announcement.");
    }
  };

  const handleCancel = () => {
    setSelected(null);
    setIsAdding(true);
    setForm(EMPTY_FORM);
  };

  const pageNumbers = () => {
    const total = meta.last_page;
    if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [1, 2, 3];
    if (meta.current_page > 4) pages.push("...");
    if (meta.current_page > 3 && meta.current_page < total - 2) pages.push(meta.current_page);
    pages.push("...", total - 1, total);
    return [...new Set(pages)];
  };

  return (
    <div className={`font-sans px-4 sm:px-6 py-8 flex justify-center ${isDark ? 'bg-[#18191a] text-[#e4e6eb]' : 'bg-[#F5F5F5]'}`}>
      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-6 sm:gap-8 items-start justify-center">
        {/* Left Panel */}
        <div className="w-full lg:w-105 shrink-0">
          <div className="mb-4">
            
          </div>
          <div className={`rounded-xl w-full lg:max-w-lg flex flex-col overflow-hidden shadow-sm lg:self-start lg:sticky lg:top-0 lg:h-150 ${isDark ? 'bg-[#242526] border border-[#3e4042]' : 'bg-gray-200'}`}>
            <div className="px-6 pt-5 pb-3 text-center">
              <h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-pup-dark-maroon'}`}>List of Announcements</h2>
              <hr className={`mt-3 ${isDark ? 'border-[#3e4042]' : 'border-gray-300'}`} />
            </div>
            <div className="px-4 pb-4 space-y-3 flex-1 overflow-y-auto">
              {error && <p className="text-center text-red-400 text-sm py-8">{error}</p>}
              
              {loading ? (
                <AnnouncementSkeleton isDark={isDark} count={4} />
              ) : announcements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className={`w-16 h-16 mb-4 flex items-center justify-center rounded-full ${isDark ? 'bg-[#3a3b3c]/40' : 'bg-gray-100'}`}>
                    <MagnifyingGlassIcon className={`w-8 h-8 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'}`} />
                  </div>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    No Announcements
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
                    Create your first announcement now.
                  </p>
                </div>
              ) : (
                announcements.map((ann) => (
                <div
                  key={ann.id}
                  onClick={() => handleCardClick(ann)}
                  className={`rounded-xl outline-offset-2 p-2 mt-3 px-4 py-4 shadow-sm cursor-pointer transition-all ${selected?.id === ann.id ? 'ring-2 ring-yellow-400' : 'hover:shadow-md'} ${isDark ? 'bg-[#1f1f1f] border border-[#3e4042]' : 'bg-white'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-bold ${isDark ? 'text-[#e4e6eb]' : 'text-gray-800'}`}>{ann.title}</span>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className={`text-xs ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>Enable</span>
                      <button
                        type="button"
                        onClick={() => handleToggle(ann)}
                        className={`relative inline-flex w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none
                          ${ann.enabled ? (isDark ? 'bg-green-900/20' : 'bg-gray-700') : (isDark ? 'bg-[#3e4042]' : 'bg-gray-300')}`}
                      >
                        <span className={`inline-block w-4 h-4 mt-1 rounded-full bg-white shadow transform transition-transform duration-200
                          ${ann.enabled ? "translate-x-5" : "translate-x-1"}`}
                        />
                      </button>
                    </div>
                  </div>
                  <p className={`text-xs leading-relaxed line-clamp-3 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>{ann.content}</p>
                </div>
              )))}
            </div>
            <div className={`flex items-center justify-center gap-1 px-4 py-3 border-t ${isDark ? 'border-[#3e4042]' : 'border-gray-300'}`}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={meta.current_page === 1}
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
                    ${meta.current_page === p ? 'bg-yellow-400 text-white' : (isDark ? 'text-[#b0b3b8] hover:bg-[#2a2a2f]' : 'text-gray-500 hover:bg-gray-300')}
                    ${p === "..." ? "cursor-default pointer-events-none" : ""}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(meta.last_page, p + 1))}
                disabled={meta.current_page === meta.last_page}
                className={`flex items-center gap-1 text-xs px-2 py-1 disabled:opacity-40 ${isDark ? 'text-[#b0b3b8] hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
              >
                Next <ChevronRightIcon className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className={`lg:flex-1 w-full rounded-2xl p-6 sm:p-8 mt-6 lg:mt-28 shadow-sm h-max ${isDark ? 'bg-[#242526] border border-[#3e4042]' : 'bg-gray-200'}`}>
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            <h2 className={`font-bold text-2xl ${isDark ? 'text-white' : ''}`}>
              {isAdding ? "Announcement Creation" : "Edit Announcement"}
            </h2>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div>
              <InputGroup
                label="Announcement Title"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Text"
                required
                labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
              />
            </div>
            <div>
              <VoiceTextareaInput
                id="content"
                label="Announcement Content"
                value={form.content}
                onChange={(value) => setForm((prev) => ({ ...prev, content: value }))}
                placeholder="Text"
                minHeightClass="min-h-50"
                required
              />
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              {!isAdding && (
                <>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className={`px-5 py-2.5 rounded-full text-sm font-semibold border transition-colors ${isDark ? 'text-[#b0b3b8] border-[#3e4042] hover:bg-[#2a2a2f]' : 'text-gray-600 border-gray-300 hover:bg-gray-100'}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteModal({ isOpen: true })}
                    className={`px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-colors 
                      ${isDark ? 'bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539] border border-[#3e4042]' : 'bg-pup-dark-maroon hover:bg-red-800'} border border-transparent`}
                  >
                    Delete
                  </button>
                </>
              )}
              <button
                type="submit"
                className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all shadow ${
                  isDark
                    ? 'bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539] border border-[#3e4042]'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}              >
                {isAdding ? "Add Announcement" : "Save Changes"}
              </button>
            </div>
          </form>
          <ConfirmationModal
            isOpen={deleteModal.isOpen}
            onClose={() => setDeleteModal({ isOpen: false })}
            onConfirm={handleDelete}
            title="Delete Announcement"
            message="This will permanently remove this announcement. This action cannot be undone."
            type="danger"
          />
          
          <SuccessToast 
            message={successMsg} 
            onClose={() => setSuccessMsg("")} 
          />
          
          <ErrorToast 
            message={errorMsg} 
            onClose={() => setErrorMsg("")} 
          />
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
