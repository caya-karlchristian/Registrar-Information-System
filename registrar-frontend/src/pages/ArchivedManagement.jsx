import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import {
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  StarIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { CertHeader, CertFooter } from "../utils/helpers.jsx";
import { DEFAULT_CERTIFICATE_LAYOUT } from "../utils/certificateTemplateSettings.js";

const ArchivedManagement = ({ documents, certifications, layoutsByCertId, onRestoreDoc, onRestoreCert }) => {
  const { isDark } = useTheme();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all"); // "all" | "documents" | "certificates"
  const [selectedId, setSelectedId] = useState(null);
  const [checkedKeys, setCheckedKeys] = useState([]);

  const getItemKey = (item) => `${item.type}-${item.type === "document" ? item.document_type_id : item.certificate_type_id}`;

  // Get all archived items
  const archivedDocs = documents
    .filter((d) => d.is_archived)
    .map((d) => ({ ...d, type: "document" }));
  const archivedCerts = certifications
    .filter((c) => c.is_archived)
    .map((c) => ({ ...c, type: "certificate" }));

  // Merge lists
  const allArchived = [...archivedDocs, ...archivedCerts];

  // Filter items by type and search query
  const filteredItems = allArchived.filter((item) => {
    const matchesSearch = (item.document_name || item.certificate_name || "")
      .toLowerCase()
      .includes(search.toLowerCase());

    if (filterType === "documents") return matchesSearch && item.type === "document";
    if (filterType === "certificates") return matchesSearch && item.type === "certificate";
    return matchesSearch;
  });

  // Auto-select the first filtered item if none is selected
  const selectedItem = filteredItems.find(
    (item) =>
      (item.type === "document" && item.document_type_id === selectedId) ||
      (item.type === "certificate" && item.certificate_type_id === selectedId)
  ) || filteredItems[0];

  const handleRestore = () => {
    if (!selectedItem) return;

    if (selectedItem.type === "document") {
      onRestoreDoc(selectedItem.document_type_id);
    } else {
      onRestoreCert(selectedItem.certificate_type_id);
    }
    setSelectedId(null);
    setCheckedKeys([]);
  };

  const handleToggleCheck = (key) => {
    setCheckedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const filteredItemKeys = filteredItems.map(getItemKey);
  const isAllFilteredSelected = filteredItemKeys.length > 0 && 
    filteredItemKeys.every(k => checkedKeys.includes(k));

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      setCheckedKeys((prev) => prev.filter((k) => !filteredItemKeys.includes(k)));
    } else {
      setCheckedKeys((prev) => Array.from(new Set([...prev, ...filteredItemKeys])));
    }
  };

  const handleBulkRestore = () => {
    if (checkedKeys.length === 0) return;
    
    let restoredCount = 0;
    checkedKeys.forEach((key) => {
      const [type, id] = key.split("-");
      if (type === "document") {
        onRestoreDoc(id);
      } else {
        onRestoreCert(id);
      }
      restoredCount++;
    });

    setSuccessMsg(`Successfully restored ${restoredCount} archived items!`);
    setCheckedKeys([]);
    setSelectedId(null);
  };

  return (
    <div className={`font-sans rounded-2xl p-4 sm:p-6 w-full ${isDark ? 'bg-[#18191a] text-[#e4e6eb]' : 'bg-white text-gray-900'}`}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch">

        {/* Left Column - Archived Files List */}
        <div className={`lg:col-span-5 flex flex-col gap-4 p-4 rounded-2xl border ${isDark ? 'bg-[#242526] border-[#3e4042]' : 'bg-white border-gray-200'
          } shadow-sm`}>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-yellow-600 dark:text-[#F8BF1E]">
              Archived Files
            </h2>
            {checkedKeys.length > 0 && (
              <button
                onClick={handleBulkRestore}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#8B0000] hover:bg-[#3a0303] text-white flex items-center gap-1 shadow-sm transition-all cursor-pointer"
              >
                <ArrowPathIcon className="w-3.5 h-3.5" />
                Restore Selected ({checkedKeys.length})
              </button>
            )}
          </div>

          {/* Search box */}
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search archived"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full py-2 pl-9 pr-4 rounded-xl text-sm border focus:outline-none transition-all ${isDark
                  ? "bg-[#1a1b1c] border-[#3e4042] text-[#e4e6eb] focus:border-yellow-400"
                  : "bg-gray-50 border-gray-200 text-gray-900 focus:border-[#8B0000]"
                }`}
            />
            <MagnifyingGlassIcon className={`w-4 h-4 absolute left-3 top-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          </div>

          {/* Filter Pills */}
          <div className="flex justify-between items-center gap-2 text-xs font-semibold">
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType("all")}
                className={`px-3 py-1.5 rounded-full border transition-all cursor-pointer ${filterType === "all"
                    ? isDark
                      ? "bg-[#8B0000] text-white border-[#8B0000]"
                      : "bg-[#8B0000] text-white border-pup-dark-maroon"
                    : isDark
                      ? "border-[#3e4042] text-[#b0b3b8] hover:text-white"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType("documents")}
                className={`px-3 py-1.5 rounded-full border transition-all cursor-pointer ${filterType === "documents"
                    ? isDark
                      ? "bg-[#8B0000] text-white border-[#8B0000]"
                      : "bg-[#8B0000] text-white border-pup-dark-maroon"
                    : isDark
                      ? "border-[#3e4042] text-[#b0b3b8] hover:text-white"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
              >
                Documents
              </button>
              <button
                onClick={() => setFilterType("certificates")}
                className={`px-3 py-1.5 rounded-full border transition-all cursor-pointer ${filterType === "certificates"
                    ? isDark
                      ? "bg-[#8B0000] text-white border-[#8B0000]"
                      : "bg-[#8B0000] text-white border-pup-dark-maroon"
                    : isDark
                      ? "border-[#3e4042] text-[#b0b3b8] hover:text-white"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
              >
                Certificates
              </button>
            </div>

            {filteredItems.length > 0 && (
              <button
                onClick={handleToggleSelectAll}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] transition-all cursor-pointer ${
                  isAllFilteredSelected
                    ? isDark
                      ? "bg-[#8B0000] text-white border-transparent"
                      : "bg-pup-dark-maroon text-white border-transparent"
                    : isDark
                    ? "border-[#3e4042] text-[#b0b3b8] hover:text-white"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {isAllFilteredSelected ? "Deselect All" : "Select All"}
              </button>
            )}
          </div>

          {/* List items */}
          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[500px] pr-1">
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">
                No archived files found.
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedItem && (
                  (item.type === "document" && selectedItem.document_type_id === item.document_type_id) ||
                  (item.type === "certificate" && selectedItem.certificate_type_id === item.certificate_type_id)
                );

                const title = item.type === "document" ? item.document_name : item.certificate_name;
                const formattedDate = item.archived_on ? `Archived ${item.archived_on}` : "Archived Date N/A";

                return (
                  <div
                    key={getItemKey(item)}
                    onClick={() => setSelectedId(item.type === "document" ? item.document_type_id : item.certificate_type_id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                        ? "border-yellow-500 bg-yellow-500/5 dark:border-[#F8BF1E]/80 dark:bg-[#F8BF1E]/10 shadow-sm"
                        : isDark
                          ? "border-[#3e4042] bg-[#1a1b1c]/40 hover:border-gray-600"
                          : "border-gray-100 bg-gray-50/40 hover:border-gray-300"
                      }`}
                  >
                    <div className="flex items-center gap-3 max-w-[85%]">
                      {/* Checkbox Container to prevent click propagation */}
                      <div 
                        onClick={(e) => e.stopPropagation()} 
                        className="flex items-center shrink-0 pr-0.5"
                      >
                        <input
                          type="checkbox"
                          checked={checkedKeys.includes(getItemKey(item))}
                          onChange={() => handleToggleCheck(getItemKey(item))}
                          className={`w-4 h-4 rounded cursor-pointer accent-[#8B0000]`}
                        />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold leading-snug line-clamp-1">
                          {title}
                        </span>
                        <span className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {item.type === "document" ? "Document" : "Certificate"} · {formattedDate}
                        </span>
                      </div>
                    </div>
                    <div>
                      {item.type === "document" ? (
                        <DocumentTextIcon className="w-5 h-5 text-gray-400 shrink-0" />
                      ) : (
                        <ClipboardDocumentCheckIcon className="w-5 h-5 text-gray-400 shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column - Detail Pane */}
        <div className={`lg:col-span-7 flex flex-col gap-5 p-5 sm:p-6 rounded-2xl border ${isDark ? 'bg-[#242526] border-[#3e4042]' : 'bg-white border-gray-200'
          } shadow-sm justify-between`}>
          {!selectedItem ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <DocumentTextIcon className="w-12 h-12 stroke-[1.2] mb-3 text-gray-400" />
              <span>Select an archived file to view details</span>
            </div>
          ) : (
            <div className="flex flex-col gap-5">

              {/* Header Title and Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 dark:border-[#3e4042] pb-3">
                <h2 className="text-xl font-bold leading-tight">
                  {selectedItem.type === "document" ? selectedItem.document_name : selectedItem.certificate_name}
                </h2>
                <span className={`self-start shrink-0 px-3 py-1 rounded-full text-xs font-bold border ${isDark
                    ? "bg-[#1f1f1f] border-[#3e4042] text-gray-300"
                    : "bg-gray-100 border-gray-200 text-gray-600"
                  }`}>
                  Archived · {selectedItem.type === "document" ? "Document" : "Certificate"}
                </span>
              </div>

              {/* Metadata Box */}
              <div className={`flex flex-col gap-2 p-4 rounded-xl border text-sm ${isDark ? 'bg-[#1a1b1c]/80 border-[#3e4042]' : 'bg-gray-50 border-gray-200'
                }`}>
                <div>
                  <span className="text-gray-500">Archived on: </span>
                  <span className="font-bold">{selectedItem.archived_on || "N/A"}</span>
                </div>
              </div>

              {/* Dynamic Preview Section based on Type */}
              {selectedItem.type === "document" ? (
                <div className="flex flex-col gap-4">
                  {/* Document Description */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Document Description
                    </span>
                    <div className={`p-3 rounded-lg border text-sm min-h-20 ${isDark ? 'bg-[#1a1b1c]/50 border-[#3e4042]' : 'bg-gray-50/50 border-gray-100'
                      }`}>
                      {selectedItem.document_description}
                    </div>
                  </div>

                  {/* Requirements List */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      List of Requirements
                    </span>
                    <div className={`p-3 rounded-lg border text-sm min-h-20 ${isDark ? 'bg-[#1a1b1c]/50 border-[#3e4042]' : 'bg-gray-50/50 border-gray-100'
                      }`}>
                      {selectedItem.document_requirements}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Certificate template (read-only)
                  </span>

                  {/* Real Certificate Header/Footer Preview Card */}
                  <div className={`p-6 rounded-xl border border-dashed flex flex-col justify-between text-center relative min-h-60 ${isDark ? 'bg-[#1a1b1c]/40 border-[#3e4042]' : 'bg-gray-50/30 border-gray-300'
                    }`}>
                    {/* Header */}
                    <div className="w-full text-left">
                      <CertHeader layout={layoutsByCertId?.[selectedItem.certificate_type_id] || layoutsByCertId?.[Number(selectedItem.certificate_type_id)] || DEFAULT_CERTIFICATE_LAYOUT} />
                    </div>

                    {/* Empty/Body Space */}
                    <div className="flex-1 my-6 flex items-center justify-center">
                      <span className="text-xs text-gray-400 italic">Body template cleared</span>
                    </div>

                    {/* Footer */}
                    <div className="w-full text-left">
                      <CertFooter layout={layoutsByCertId?.[selectedItem.certificate_type_id] || layoutsByCertId?.[Number(selectedItem.certificate_type_id)] || DEFAULT_CERTIFICATE_LAYOUT} />
                    </div>
                  </div>
                </div>
              )}

              {/* Restore Button */}
              <div className="flex justify-end mt-4">
                <button
                  onClick={handleRestore}
                  className="px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow cursor-pointer bg-pup-dark-maroon hover:bg-[#3a0303] text-white flex items-center gap-2"
                >
                  <ArrowPathIcon className="w-4 h-4 stroke-[2.5]" />
                  Restore {selectedItem.type === "document" ? "Document" : "Certificate"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArchivedManagement;
