import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { useTheme } from '../context/ThemeContext';
import { getLogbookData, getDocumentTypes, getCertifications } from '../services/api'; // FE-3 migration: uses getLogbookData() from API
import {
  formatMinutesDuration,
  getProcessedAt,
  getMinutesProcessed,
  getFullName,
  getCourse,
  getEmail,
  getDocumentNames,
  getCertificationNames,
  formatDateLong,
  getClaimedAt,
} from '../utils/logbookHelpers.js';

import DropDown from '../components/DropDown';
import LogbookDateRangeModal from '../components/LogbookDateRangeModal';
import { LogbookSkeleton } from '../components/LoadingSkeleton';
import SuccessToast from '../components/SuccessToast.jsx';
import ErrorToast from '../components/ErrorToast.jsx';
import { logbookDocx } from '../utils/logbookDocx.js';
import pupLogoSrc from '../assets/puplogoimage.png';
import bpLogoSrc from '../assets/Bagong_Pilipinas_logo.png';

const toRows = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

const LogbookRecords = () => {
  const { isDark } = useTheme();
  const [data, setData] = useState([]);
  const [dbDocTypes, setDbDocTypes] = useState([]);
  const [availableCertifications, setAvailableCertifications] = useState([]);
  const [historyByRequestId, setHistoryByRequestId] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDocTypeId, setSelectedDocTypeId] = useState("");
  const [selectedExportOption, setSelectedExportOption] = useState('All Document');
  const [exporting, setExporting] = useState(false);
  const [toastSuccess, setToastSuccess] = useState('');
  const [toastError, setToastError] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activePreset, setActivePreset] = useState('');
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const rowsPerPage = 8;

  const handleApplyDateFilter = (start, end, preset) => {
    setDateFrom(start);
    setDateTo(end);
    setActivePreset(preset);
    setCurrentPage(1);
    setIsDateModalOpen(false);
  };

  // Load logbook data on mount
  useEffect(() => {
    const fetchLogbookData = async () => {
      setLoading(true);
      try {
        const [logbookRes, typesRes, certRes] = await Promise.all([
          getLogbookData(),
          getDocumentTypes(),
          getCertifications(),
        ]);

        const requests = toRows(logbookRes.data);
        const types = toRows(typesRes.data);
        const certifications = toRows(certRes.data);

        setData(requests);
        setDbDocTypes(types);
        setAvailableCertifications(certifications);
        setHistoryByRequestId({});
        setCurrentPage(1);
      } catch (error) {
        console.error('Error loading logbook records:', error);
        setData([]);
        setDbDocTypes([]);
        setAvailableCertifications([]);
        setHistoryByRequestId({});
        setToastError((error && (error.message || error.toString())) || 'Error loading logbook records.');
      } finally {
        setLoading(false);
      }
    };
    fetchLogbookData();
  }, []);

  // Map of document type id -> document name for quick lookups
  const activeDocMap = useMemo(() => {
    if (dbDocTypes.length > 0) {
      return Object.fromEntries(dbDocTypes.map(t => [t.document_type_id, t.document_name]));
    }
    return {};
  }, [dbDocTypes]);

  // Build document filter dropdown options
  const docOptions = useMemo(() => {
    const options = ['All Document'];
    const seen = new Set(['all document']);

    Object.values(activeDocMap).forEach((name) => {
      const normalized = String(name || '').trim();
      if (!normalized) return;
      const key = normalized.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      options.push(normalized);
    });

    if (Object.values(activeDocMap).some((name) => String(name || '').trim().toLowerCase() === 'certification')) {
      options.splice(1, 0, 'All Certification');
    }

    return options;
  }, [activeDocMap]);

  // List of distinct certification names
  const certificationOptions = useMemo(() => {
    const options = [];
    const seen = new Set();

    availableCertifications.forEach((cert) => {
      const normalized = String(cert?.certificate_name || '').trim();
      if (!normalized) return;
      const key = normalized.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      options.push(normalized);
    });

    return options;
  }, [availableCertifications]);

  // Label displayed for the currently selected document/export option
  const selectedDocLabel = useMemo(() => {
    if (selectedExportOption === 'All Certification') return 'All Certification';
    return activeDocMap[selectedDocTypeId] || selectedExportOption || 'All Document';
  }, [selectedDocTypeId, activeDocMap, selectedExportOption]);

  // Whether the UI is currently focused on certification-specific filters/exports
  const isCertificationMode = useMemo(() => {
    const sel = String(selectedExportOption || '').trim().toLowerCase();
    const label = String(selectedDocLabel || '').trim().toLowerCase();
    return sel === 'certification' || (label === 'certification' && sel !== 'all certification');
  }, [selectedExportOption, selectedDocLabel]);

  const [selectedCertificationLabel, setSelectedCertificationLabel] = useState('');

  useEffect(() => {
    if (isCertificationMode) {
      if (!selectedCertificationLabel) {
        setSelectedCertificationLabel(certificationOptions[0] || '');
      }
    } else {
      setSelectedCertificationLabel('');
    }
  }, [isCertificationMode, certificationOptions]);

  // Filter data
  const filteredData = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;

    const completedOnly = data.filter(item => {
      if (from || to) {
        const req = item.requested_at ? new Date(item.requested_at) : null;
        if (!req) return false;
        if (from && req < from) return false;
        if (to && req > to) return false;
      }
      return true;
    });

    if (isCertificationMode) {
      const targetCertification = String(selectedCertificationLabel || 'All Certification').trim().toLowerCase();
      return completedOnly.filter((item) => {
        const certNames = getCertificationNames(item).map((name) => String(name).trim().toLowerCase());
        if (targetCertification === 'all certification') return certNames.length > 0;
        return certNames.includes(targetCertification);
      });
    }

    if (!selectedDocTypeId) return completedOnly;

    const targetId = Number(selectedDocTypeId);
    return completedOnly.filter(item =>
      item.documents?.some(d => Number(d.document_type_id) === targetId)
    );
  }, [selectedDocTypeId, data, isCertificationMode, selectedCertificationLabel, dateFrom, dateTo]);

  // Sort filtered data by request timestamp (most recent first)
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aRequestedAt = new Date(a.requested_at || 0).getTime();
      const bRequestedAt = new Date(b.requested_at || 0).getTime();
      return bRequestedAt - aRequestedAt;
    });
  }, [filteredData]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage) || 1;
  const indexOfFirstItem = (currentPage - 1) * rowsPerPage;
  const indexOfLastItem = currentPage * rowsPerPage;

  const currentData = useMemo(() => {
    return sortedData.slice(indexOfFirstItem, indexOfLastItem);
  }, [indexOfFirstItem, indexOfLastItem, sortedData]);

  // Build sections for DOCX export
  const getExportSections = () => {
    if (isCertificationMode) {
      if (selectedCertificationLabel && selectedCertificationLabel !== 'All Certification') {
        return [{ title: selectedCertificationLabel, rows: sortedData }];
      }
      const certNames = certificationOptions.filter(n => String(n || '').trim().toLowerCase() !== 'all certification');
      return certNames.map((name) => ({
        title: name,
        rows: sortedData.filter((row) =>
          getCertificationNames(row).map(x => x.toLowerCase()).includes(String(name).trim().toLowerCase())
        ),
      }));
    }

    if (selectedDocTypeId) {
      return [{ title: selectedDocLabel, rows: sortedData }];
    }

    const docNames = Object.values(activeDocMap).map(n => String(n || '').trim()).filter(Boolean);
    const uniqueDocNames = Array.from(new Set(docNames));

    return uniqueDocNames.map((name) => ({
      title: name,
      rows: sortedData.filter((row) =>
        getDocumentNames(row).map(x => x.toLowerCase()).includes(String(name).trim().toLowerCase())
      ),
    }));
  };

  // Trigger DOCX export
  const handleExportDocx = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      const rangeLabel = (dateFrom && dateTo)
        ? `${dateFrom}_to_${dateTo}`
        : (dateFrom ? `from_${dateFrom}` : (dateTo ? `to_${dateTo}` : null));
      await logbookDocx(getExportSections(), pupLogoSrc, bpLogoSrc, historyByRequestId, rangeLabel);
      setToastSuccess('Exporting Report completed.');
    } catch (e) {
      console.error('Export to DOCX failed', e);
      setToastError((e && (e.message || e.toString())) || 'Exporting Report failed.');
    } finally {
      setExporting(false);
    }
  };

  // Convert text to Proper Case while preserving roman numerals and hyphenated parts
  const toProperCase = (value = '') => {
    return value
      .toString()
      .trim()
      .split(/\s+/)
      .map((token) => {
        if (/^[IVXLCDM]+$/i.test(token)) return token.toUpperCase();
        return token
          .toLowerCase()
          .replace(/(^|[-'])([a-z])/g, (_, separator, letter) => `${separator}${letter.toUpperCase()}`);
      })
      .join(' ');
  };

  // Format an ISO datetime value into long date + 24-hour time
  const formatDateTimeLong = (value) => {
    const datePart = formatDateLong(value);
    if (!datePart) return null;

    const timePart = new Date(value).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    return `${datePart} ${timePart}`;
  };

  if (loading) return <LogbookSkeleton isDark={isDark} />;

  return (
    <div className={`relative min-h-full font-sans text-left ${isDark ? 'bg-[#18191a] text-[#e4e6eb]' : 'bg-white text-gray-900'}`}>
      <div className={`max-w-350 mx-auto shadow-md rounded-sm flex flex-col min-h-150 print:p-0 print:shadow-none ${isDark ? 'bg-[#242526]' : 'bg-white'}`}>

        <div className="px-8 lg:mt-10">

          {/* ── Controls Panel ── */}
          <div className={`mb-6 print:hidden rounded-xl border p-4 sm:p-5 ${isDark ? 'bg-[#1e1f20] border-[#3e4042]' : 'bg-gray-50 border-gray-200'}`}>

            {/* Controls Row */}
            <div className="flex flex-wrap items-end gap-3 w-full">

              {/* Document Type dropdown */}
              <div className="w-full md:w-75 shrink-0">
                <DropDown
                  label="Document Type"
                  name="docType"
                  value={selectedExportOption}
                  labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
                  onChange={(e) => {
                    if (e.target.value === 'All Document' || e.target.value === 'All Certification') {
                      setSelectedDocTypeId('');
                      setSelectedExportOption(e.target.value);
                      setSelectedCertificationLabel('');
                      setCurrentPage(1);
                      return;
                    }
                    const id = Object.keys(activeDocMap).find(key => activeDocMap[key] === e.target.value) || '';
                    setSelectedDocTypeId(id);
                    setSelectedExportOption(e.target.value);
                    setSelectedCertificationLabel('');
                    setCurrentPage(1);
                  }}
                  options={docOptions}
                />
              </div>

              {/* Certification Type dropdown (conditional) */}
              {isCertificationMode && (
                <div className="w-full md:w-75 shrink-0">
                  <DropDown
                    label="Certification Type"
                    name="certificationType"
                    value={selectedCertificationLabel}
                    labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
                    onChange={(e) => {
                      setSelectedCertificationLabel(e.target.value);
                      setCurrentPage(1);
                    }}
                    options={certificationOptions}
                  />
                </div>
              )}

              {/* Vertical divider */}
              <div className={`hidden md:block self-stretch w-px mx-1 ${isDark ? 'bg-[#3e4042]' : 'bg-gray-200'}`} />
              
              {/* Date Filter Button */}
              <div className="w-full md:w-65 shrink-0 flex flex-col">
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}`}>
                  Date Range
                </label>
                <button
                  type="button"
                  onClick={() => setIsDateModalOpen(true)}
                  className={`
                    w-full flex items-center justify-between gap-2 pl-3 pr-3 py-3 rounded-lg text-sm font-medium 
                    shadow-sm focus:outline-none border transition-colors text-left cursor-pointer
                    ${isDark
                      ? 'bg-[#1f1f1f] text-[#e4e6eb] border-[#3e4042] hover:border-gray-200'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-200'
                    }
                  `}
                >
                  <span className="truncate">
                    {dateFrom && dateTo
                      ? `${dateFrom} to ${dateTo}`
                      : (dateFrom ? `From ${dateFrom}` : (dateTo ? `To ${dateTo}` : 'All Time'))}
                  </span>
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>

              {/* Export button */}
              <div className="w-full md:w-60 md:ml-auto shrink-0">
                <button
                  onClick={handleExportDocx}
                  disabled={loading || exporting || sortedData.length === 0}
                  className={`w-full flex items-center justify-center px-3 py-3 
                    rounded-lg text-sm font-black uppercase tracking-wide shadow 
                    transition-colors bg-[#800000] text-white hover:bg-[#6b0000]
                    ${isDark ? 'bg-[#3a3b3c] text-[#e4e6eb] hover:bg-[#4e4f50]' : 
                    'bg-[#800000] text-white hover:bg-[#6b0000]'}`}
                >
                  <span>{exporting ? 'Exporting…' : 'Export DOCX'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Original section heading ── */}
          <div className={`w-full text-center border-b pb-4 mb-0 ${isDark ? 'border-[#3e4042]' : 'border-gray-300'}`}>
            <h2 className={`text-lg sm:text-xl md:text-2xl font-black uppercase tracking-widest leading-tight ${isDark ? 'text-[#f5c542]' : 'text-[#4a0000]'}`}>
              Processing of Application for <br className="sm:hidden" /> {selectedDocLabel}
            </h2>
            <p className={`text-xs mt-1 font-medium ${isDark ? 'text-[#9a9a9a]' : 'text-gray-400'}`}>
              {sortedData.length} record{sortedData.length !== 1 ? 's' : ''}
              {(dateFrom || dateTo) && (
                <span> &mdash; {dateFrom && `from ${dateFrom}`}{dateFrom && dateTo && ' '}{dateTo && `to ${dateTo}`}</span>
              )}
            </p>
          </div>
        </div>

        {/* ── Original Table ── */}
        <div className="flex-1 overflow-x-auto px-4 sm:px-6 md:px-8">
          <table className="w-full min-w-225 border-collapse md:min-w-full">
            <thead>
              <tr className={`border-b-2 uppercase text-center ${isDark ? 'border-[#3e4042] text-[#9a9a9a]' : 'border-gray-300 text-gray-400'}`}>
                <th className="py-4 px-2 text-[10px] font-black w-[12%] whitespace-nowrap">Date/Time Requested</th>
                <th className="py-4 px-2 text-[10px] font-black w-[15%] whitespace-nowrap">Client Name</th>
                <th className="py-4 px-2 text-[10px] font-black w-[12%] whitespace-nowrap">Course</th>
                <th className="py-4 px-2 text-[10px] font-black w-[18%] whitespace-nowrap">Email</th>
                <th className="py-4 px-2 text-[10px] font-black w-[12%] whitespace-nowrap">Date/Time Processed</th>
                <th className="py-4 px-2 text-[10px] font-black w-[10%] whitespace-nowrap">No. of Minutes Processed</th>
                <th className="py-4 px-2 text-[10px] font-black w-[13%] whitespace-nowrap">Date Claimed</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((row) => (
                (() => {
                  const processedAt = getProcessedAt(row);
                  const claimedAt = getClaimedAt(row);

                  return (
                    <tr key={row.request_id || row.id} className={`border-b text-[11px] sm:text-[12px] transition-colors 
                    ${isDark ? 'border-[#3e4042] hover:bg-[#3a3b3c] text-[#b0b3b8]' : 
                    'border-gray-200 hover:bg-gray-50 text-gray-700'}`}>

                      <td className="p-3 sm:p-4 text-center whitespace-nowrap">
                        {formatDateLong(row.requested_at) || 'N/A'}
                      </td>

                      <td className="p-3 sm:p-4 text-center font-bold whitespace-nowrap">
                        {getFullName(row)}
                      </td>

                      <td className="p-3 sm:p-4 text-center whitespace-nowrap">
                        {getCourse(row)}
                      </td>

                      <td className="p-3 sm:p-4 text-center truncate max-w-55 whitespace-nowrap">
                        {getEmail(row)}
                      </td>

                      <td className="p-3 sm:p-4 text-center whitespace-nowrap">
                        {formatDateTimeLong(processedAt) || '---'}
                      </td>

                      <td className="p-3 sm:p-4 text-center whitespace-nowrap">
                        {formatMinutesDuration(getMinutesProcessed(row))}
                      </td>

                      <td className="p-3 sm:p-4 text-center italic text-gray-400 whitespace-nowrap">
                        {formatDateLong(claimedAt) || 'Pending'}
                      </td>

                    </tr>
                  );
                })()
              ))}

              {!loading && Array.from({ length: Math.max(0, rowsPerPage - currentData.length) }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-11.25 sm:h-13.25 border-b border-gray-100">
                  <td colSpan="7"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Original Pagination Footer ── */}
        <div className={`px-4 sm:px-8 py-4 text-[11px] sm:text-sm flex flex-col sm:flex-row justify-between 
          items-center gap-4 print:hidden border-t ${isDark ? 'bg-[#242526] text-[#9a9a9a] border-[#3e4042]' 
          : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
          <span className="text-center sm:text-left">
            Showing {sortedData.length > 0 ? indexOfFirstItem + 1 : 0} to{" "}
            {Math.min(indexOfLastItem, sortedData.length)} of {sortedData.length} results
          </span>

          <div className="flex gap-4 items-center">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`p-1 rounded transition-colors ${currentPage === 1 ? 
                (isDark ? 'text-[#4e4f50] cursor-not-allowed' : 'text-gray-300 cursor-not-allowed') 
                : (isDark ? 'text-[#b0b3b8] hover:bg-[#3a3b3c]' : 'text-gray-600 hover:bg-gray-200')}`}
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>

            <span className={`text-xs font-semibold whitespace-nowrap ${isDark ? 'text-[#b0b3b8]' : 'text-gray-700'}`}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`p-1 rounded transition-colors ${(currentPage === totalPages || totalPages === 0) 
                ? (isDark ? 'text-[#4e4f50] cursor-not-allowed' : 'text-gray-300 cursor-not-allowed') 
                : (isDark ? 'text-[#b0b3b8] hover:bg-[#3a3b3c]' : 'text-gray-600 hover:bg-gray-200')}`}
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <SuccessToast message={toastSuccess} onClose={() => setToastSuccess('')} />
        <ErrorToast message={toastError} onClose={() => setToastError('')} />

        <LogbookDateRangeModal
          isOpen={isDateModalOpen}
          onClose={() => setIsDateModalOpen(false)}
          onConfirm={handleApplyDateFilter}
          initialDateFrom={dateFrom}
          initialDateTo={dateTo}
          initialActivePreset={activePreset}
          isDark={isDark}
        />
      </div>
    </div>
  );
};

export default LogbookRecords;