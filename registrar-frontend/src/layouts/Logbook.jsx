import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { useTheme } from '../context/ThemeContext';
import { getDocumentRequests, getDocumentTypes, getRequestHistory, getCertifications } from "../services/api"; 
import LoadingOverlay from "../components/LoadingOverlay"; 
import DropDown from '../components/DropDown';
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
  const rowsPerPage = 8;

  useEffect(() => {
    const fetchLogbookData = async () => {
      setLoading(true);
      try {
        const requests = [];
        let page = 1;
        let lastPage = 1;

        do {
          const response = await getDocumentRequests({ page });
          const payload = response?.data ?? {};
          const rows = toRows(payload);

          requests.push(...rows);
          lastPage = Number(payload?.last_page ?? 1) || 1;
          page += 1;
        } while (page <= lastPage);

        const [typesRes, historyRes, certRes] = await Promise.all([
          getDocumentTypes(),
          getRequestHistory(),
          getCertifications(),
        ]);

        const types = toRows(typesRes.data);
        const historyRows = toRows(historyRes.data);
        const certifications = toRows(certRes.data);
        const groupedHistory = historyRows.reduce((acc, item) => {
          const requestId = item?.request_id;
          if (!requestId) return acc;
          if (!acc[requestId]) acc[requestId] = [];
          acc[requestId].push(item);
          return acc;
        }, {});

        Object.keys(groupedHistory).forEach((requestId) => {
          groupedHistory[requestId].sort((a, b) => {
            const aTime = new Date(a?.changed_at || 0).getTime();
            const bTime = new Date(b?.changed_at || 0).getTime();
            return bTime - aTime;
          });
        });

        setData(requests);
        setDbDocTypes(types);
        setAvailableCertifications(certifications);
        setHistoryByRequestId(groupedHistory);
        setCurrentPage(1);
      } catch (error) {
        console.error('Error loading logbook records:', error);
        setData([]);
        setDbDocTypes([]);
        setAvailableCertifications([]);
        setHistoryByRequestId({});
      } finally {
        setLoading(false);
      }
    };
    fetchLogbookData();
  }, []);

  const activeDocMap = useMemo(() => {
    if (dbDocTypes.length > 0) {
      return Object.fromEntries(dbDocTypes.map(t => [t.document_type_id, t.document_name]));
    }
    return {};
  }, [dbDocTypes]);

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

  const getDocumentNames = (row) => {
    const documents = Array.isArray(row?.documents) ? row.documents : [];
    return documents
      .map((document) => document?.documentType?.document_name ?? document?.document_type?.document_name ?? document?.document_name ?? '')
      .filter(Boolean)
      .map((name) => String(name).trim())
      .filter(Boolean);
  };

  const getCertificationNames = (row) => {
    const certificates = Array.isArray(row?.certificates) ? row.certificates : [];
    return certificates
      .map((certificate) => certificate?.certification_type?.certificate_name ?? certificate?.certificate_name ?? certificate?.name ?? '')
      .filter(Boolean)
      .map((name) => String(name).trim())
      .filter(Boolean);
  };

  const selectedDocLabel = useMemo(() => {
    if (selectedExportOption === 'All Certification') return 'All Certification';
    return activeDocMap[selectedDocTypeId] || selectedExportOption || 'All Document';
  }, [selectedDocTypeId, activeDocMap, selectedExportOption]);

  const isCertificationMode = useMemo(() => {
    const sel = String(selectedExportOption || '').trim().toLowerCase();
    const label = String(selectedDocLabel || '').trim().toLowerCase();
    // show certification type selector only when user explicitly selected the CERTIFICATION document type
    return sel === 'certification' || label === 'certification' && sel !== 'all certification';
  }, [selectedExportOption, selectedDocLabel]);

  const [selectedCertificationLabel, setSelectedCertificationLabel] = useState('');

  useEffect(() => {
    if (isCertificationMode) {
      // default to first available certification when entering certification mode
      if (!selectedCertificationLabel) {
        setSelectedCertificationLabel(certificationOptions[0] || '');
      }
    } else {
      // when not in certification-specific mode, clear selection
      setSelectedCertificationLabel('');
    }
  }, [isCertificationMode, certificationOptions]);

  const filteredData = useMemo(() => {
    const completedOnly = data.filter(item =>
      String(item.status?.status_name).toLowerCase() === 'completed'
    );

    if (isCertificationMode) {
      const targetCertification = String(selectedCertificationLabel || 'All Certification').trim().toLowerCase();
      return completedOnly.filter((item) => {
        const certNames = getCertificationNames(item).map((name) => String(name).trim().toLowerCase());
        if (targetCertification === 'all certification') {
          return certNames.length > 0;
        }
        return certNames.includes(targetCertification);
      });
    }

    if (!selectedDocTypeId) return completedOnly;

    const targetId = Number(selectedDocTypeId);
    return completedOnly.filter(item =>
      item.documents?.some(d => Number(d.document_type_id) === targetId)
    );
  }, [selectedDocTypeId, data, isCertificationMode, selectedCertificationLabel]);

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

  const getExportSections = () => {
    if (isCertificationMode) {
      // when exporting all certification, include all known certification types even if they have no rows
      if (selectedCertificationLabel && selectedCertificationLabel !== 'All Certification') {
        return [{ title: selectedCertificationLabel, rows: sortedData }];
      }

      // build sections from available certification options (skip the 'All Certification' placeholder)
      const certNames = certificationOptions.filter(n => String(n || '').trim().toLowerCase() !== 'all certification');
      return certNames.map((name) => ({
        title: name,
        rows: sortedData.filter((row) => getCertificationNames(row).map(x => x.toLowerCase()).includes(String(name).trim().toLowerCase())),
      }));
    }

    if (selectedDocTypeId) {
      return [{ title: selectedDocLabel, rows: sortedData }];
    }

    // exporting all documents: include all known document types even if they have no rows
    const docNames = Object.values(activeDocMap)
      .map(n => String(n || '').trim())
      .filter(Boolean);

    // unique preserving order
    const uniqueDocNames = Array.from(new Set(docNames));

    return uniqueDocNames.map((name) => ({
      title: name,
      rows: sortedData.filter((row) => getDocumentNames(row).map(x => x.toLowerCase()).includes(String(name).trim().toLowerCase())),
    }));
  };

  const handleExportDocx = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      await logbookDocx(getExportSections(), pupLogoSrc, bpLogoSrc, historyByRequestId);
    } catch (e) {
      console.error('Export to DOCX failed', e);
    } finally {
      setExporting(false);
    }
  };

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

  const getFullName = (row) => {
    const p = row.student_profile || row.alumni_profile;
    if (!p) return 'Walk-in Client';
    const middle = p.middle_name ? ` ${p.middle_name.trim().charAt(0).toUpperCase()}.` : '';
    const lastName = toProperCase(p.last_name || '');
    const firstName = toProperCase(p.first_name || '');
    return `${lastName}, ${firstName}${middle}`.trim();
  };

  const getCourse = (row) => {
    return (
      row.student_profile?.academic_records?.[0]?.course ||
      row.student_profile?.course ||
      row.academic_record?.course ||
      row.alumni_academic_record?.course ||
      '---'
    );
  };

  const getEmail = (row) => {
    return row.user?.email || row.student_profile?.email || '---';
  };

  const formatDateLong = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric',
    });
  };

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

  const getProcessedAt = (row) => {
    const history = historyByRequestId[row.request_id] || (Array.isArray(row.history) ? row.history : []);
    if (history.length === 0) return null;
    return history[0]?.changed_at || null;
  };

  const getMinutesProcessed = (row) => {
    const history = historyByRequestId[row.request_id] || (Array.isArray(row.history) ? row.history : []);
    if (history.length === 0) return null;
    return history[0]?.minutes_processed ?? null;
  };

  const formatMinutesDuration = (minutesValue) => {
    if (minutesValue === null || minutesValue === undefined || minutesValue === '') return '---';

    const totalMinutes = Number(minutesValue);
    if (Number.isNaN(totalMinutes) || totalMinutes < 0) return '---';

    const wholeMinutes = Math.floor(totalMinutes);
    const days = Math.floor(wholeMinutes / 1440);
    const hours = Math.floor((wholeMinutes % 1440) / 60);
    const minutes = wholeMinutes % 60;
    const minuteLabel = minutes === 1 ? 'min' : 'mins';

    if (days > 0) return `${days}day${days > 1 ? 's' : ''} ${hours}hr${hours !== 1 ? 's' : ''} ${minutes}${minuteLabel}`;
    if (hours > 0) return `${hours}hr${hours !== 1 ? 's' : ''} ${minutes}${minuteLabel}`;

    return `${minutes}${minuteLabel}`;
  };

  const getClaimedAt = (row) => {
    const history = historyByRequestId[row.request_id] || (Array.isArray(row.history) ? row.history : []);
    if (history.length === 0) return null;
    const claimEntry = history.find((h) => h.new_status_id === 3);
    return claimEntry?.changed_at || null;
  };

  return (
    <div className={`relative min-h-screen font-sans text-left z-20 ${isDark ? 'bg-[#18191a] text-[#e4e6eb]' : 'bg-white text-gray-900'}`}>
      <LoadingOverlay isVisible={loading} message="Fetching Registrar Records" />

      <div className={`max-w-350 mx-auto shadow-md rounded-sm flex flex-col min-h-150 print:p-0 print:shadow-none ${isDark ? 'bg-[#242526]' : 'bg-white'}`}>

        <div className="p-4 sm:p-6 md:p-8 pb-0">
          <div className="mb-6 grid grid-cols-1 gap-4 print:hidden lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
              <div className="w-full">
                <DropDown
                  label="Document Type"
                  name="docType"
                  value={selectedExportOption}
                  labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-700'}
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
              {isCertificationMode && (
              <div className="w-full">
                <DropDown
                  label="Certification Type"
                  name="certificationType"
                  value={selectedCertificationLabel}
                  labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-700'}
                  onChange={(e) => {
                    setSelectedCertificationLabel(e.target.value);
                    setCurrentPage(1);
                  }}
                  options={certificationOptions}
                />
              </div>
            )}
            </div>
            <button
              onClick={handleExportDocx}
              disabled={loading || exporting || sortedData.length === 0}
              className={
                `px-5 py-2 rounded-md font-bold text-xs uppercase tracking-widest transition-colors duration-150 shadow-sm ` +
                (!exporting
                  ? (isDark
                      ? 'bg-[#3a3b3c] hover:bg-[#4e4f50] text-[#e4e6eb] border border-[#4e4f50]'
                      : 'bg-[#800000] hover:bg-[#4a0000] text-[#FFD700]')
                  : (isDark
                      ? 'bg-[#3a3b3c] text-[#8f949e] border border-[#4e4f50] cursor-not-allowed'
                      : 'bg-[#800000] text-white cursor-not-allowed'))
              }
            >
              {exporting ? 'Exporting...' : 'Export to DOCX'}
            </button>
          </div>

          <div className={`w-full text-center border-b pb-4 mb-0 ${isDark ? 'border-[#3e4042]' : 'border-gray-300'}`}>
            <h2 className={`text-lg sm:text-xl md:text-2xl font-black uppercase tracking-widest leading-tight ${isDark ? 'text-[#f5c542]' : 'text-[#4a0000]'}`}>
              Processing of Application for <br className="sm:hidden" /> {selectedDocLabel}
            </h2>
          </div>
        </div>

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
                <tr key={row.request_id || row.id} className={`border-b text-[11px] sm:text-[12px] transition-colors ${isDark ? 'border-[#3e4042] hover:bg-[#3a3b3c] text-[#b0b3b8]' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}>

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

        {/* Pagination Footer */}
        <div className={`px-4 sm:px-8 py-4 text-[11px] sm:text-sm flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden border-t ${isDark ? 'bg-[#242526] text-[#9a9a9a] border-[#3e4042]' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
          <span className="text-center sm:text-left">
            Showing {sortedData.length > 0 ? indexOfFirstItem + 1 : 0} to{" "}
            {Math.min(indexOfLastItem, sortedData.length)} of {sortedData.length} results
          </span>

          <div className="flex gap-4 items-center">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`p-1 rounded transition-colors ${currentPage === 1 ? (isDark ? 'text-[#4e4f50] cursor-not-allowed' : 'text-gray-300 cursor-not-allowed') : (isDark ? 'text-[#b0b3b8] hover:bg-[#3a3b3c]' : 'text-gray-600 hover:bg-gray-200')}`}
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>

            <span className={`text-xs font-semibold whitespace-nowrap ${isDark ? 'text-[#b0b3b8]' : 'text-gray-700'}`}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`p-1 rounded transition-colors ${(currentPage === totalPages || totalPages === 0) ? (isDark ? 'text-[#4e4f50] cursor-not-allowed' : 'text-gray-300 cursor-not-allowed') : (isDark ? 'text-[#b0b3b8] hover:bg-[#3a3b3c]' : 'text-gray-600 hover:bg-gray-200')}`}
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogbookRecords;
