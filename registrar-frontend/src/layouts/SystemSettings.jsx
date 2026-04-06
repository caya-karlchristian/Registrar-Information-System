import { useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import InputGroup from "../components/InputGroup";
import VoiceTextareaInput from "../components/VoiceTextareaInput.jsx";

const PER_PAGE = 4;

const MOCK_ANNOUNCEMENTS = [
  { id: 1, title: "Enrollment Period",        
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.", 
    enabled: true  
  }
];

const EMPTY_FORM = {
  title:    "",
  content:  "",
};

const SystemSettings = () => {
  const [announcements, setAnnouncements] = useState(MOCK_ANNOUNCEMENTS);
  const [academicYear, setAcademicYear]   = useState("");
  const [currentPage, setCurrentPage]     = useState(1);
  const [selected, setSelected]           = useState(null);
  const [form, setForm]                   = useState(EMPTY_FORM);
  const [isAdding, setIsAdding]           = useState(true);

  const totalPages = Math.max(1, Math.ceil(announcements.length / PER_PAGE));
  const safePage   = Math.min(currentPage, totalPages);
  const paginated  = announcements.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCardClick = (ann) => {
    setSelected(ann);
    setIsAdding(false);
    setForm({
      title:    ann.title,
      content:  ann.content,
    });
  };

  const handleToggle = (id) => {
    setAnnouncements((prev) =>
      prev.map((a) => a.id === id ? { ...a, enabled: !a.enabled } : a)
    );
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (isAdding) {
      setAnnouncements((prev) => [
        ...prev,
        { id: Date.now(), title: form.title, content: form.content, enabled: true },
      ]);
    } else if (selected) {
      setAnnouncements((prev) =>
        prev.map((a) => a.id === selected.id ? { ...a, ...form } : a)
      );
    }
    setForm(EMPTY_FORM);
    setSelected(null);
    setIsAdding(true);
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
      <div className="flex flex-col lg:flex-row gap-8 items-start">

        {/* ── Left Panel ── */}
        <div className="w-full lg:w-105 shrink-0">

          <div className="mb-4">
            <InputGroup
              label="Set Academic Year"
              name="academicYear"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="e.g. 2025-2026"
              labelColor="text-gray-600"
            />
          </div>

          <div className="bg-gray-200 rounded-xl w-full lg:max-w-lg flex flex-col overflow-hidden shadow-sm lg:self-start lg:sticky lg:top-0 h-150">
            <div className="px-6 pt-5 pb-3 text-center">
              <h2 className="text-pup-dark-maroon font-bold text-lg">List of Announcements</h2>
              <hr className="mt-3 border-gray-300" />
            </div>

            <div className="px-4 pb-4 space-y-3 flex-1 overflow-y-auto">
              {paginated.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No announcements found.</p>
              ) : (
                paginated.map((ann) => (
                  <div
                    key={ann.id}
                    onClick={() => handleCardClick(ann)}
                    className={`bg-white rounded-xl px-4 py-4 shadow-sm cursor-pointer transition-all
                      ${selected?.id === ann.id ? "ring-2 ring-yellow-400" : "hover:shadow-md"}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-gray-800">{ann.title}</span>
                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-xs text-gray-500">Enable</span>
                        <button
                          type="button"
                          onClick={() => handleToggle(ann.id)}
                          className={`relative inline-flex w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none
                            ${ann.enabled ? "bg-gray-700" : "bg-gray-300"}`}
                        >
                          <span
                            className={`inline-block w-4 h-4 mt-1 rounded-full bg-white shadow transform transition-transform duration-200
                              ${ann.enabled ? "translate-x-5" : "translate-x-1"}`}
                          />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                      {ann.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-center gap-1 px-4 py-3 border-t border-gray-300">
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
        </div>

        <div className="lg:flex-1 w-full bg-gray-200 rounded-2xl p-6 mt-28 shadow-sm h-max">
          <form onSubmit={handleSave} className="flex flex-col gap-5">

            <h2 className="font-bold text-2xl">
              {isAdding ? "Announcement Creation" : "Edit Announcement"}
            </h2>

            <div>
              <InputGroup
                label="Announcement Title"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Text"
                required
                labelColor="text-gray-600"
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

            <div className="flex items-center gap-3 pt-1">
              {!isAdding && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold text-gray-600 border border-gray-300 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="px-8 py-2.5 rounded-full text-sm font-bold bg-pup-dark-maroon text-white hover:bg-[#3a0303] transition-all shadow"
              >
                {isAdding ? "Add Announcement" : "Save Changes"}
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
};

export default SystemSettings;