import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { getDocumentRequests, getDocumentTypes } from "../services/api"; 
import LoadingOverlay from "../components/LoadingOverlay"; 
import DropDown from '../components/DropDown';
import { logbookExcel } from '../utils/logbookExcel.js';
import pupLogoSrc from '../assets/puplogoimage.png';
import bpLogoSrc from '../assets/Bagong_Pilipinas_logo.png';
import { DOC_TYPE_MAP } from '../utils/constants';

const LogbookRecords = () => {
  const [data, setData] = useState([]);
  const [dbDocTypes, setDbDocTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDocTypeId, setSelectedDocTypeId] = useState("");
  const rowsPerPage = 8;

  useEffect(() => {
    const fetchLogbookData = async () => {
      setLoading(true);
      try {
        const [requestsRes, typesRes] = await Promise.all([
          getDocumentRequests(),
          getDocumentTypes()
        ]);
        const requests = requestsRes.data || [];
        const types = typesRes.data || [];
        
        setData(requests);
        setDbDocTypes(types);
        
        console.log('Logbook data loaded:', { requests: requests.length, types: types.length });
      } catch (error) {
        console.error('Error loading logbook records:', error);
        setData([]);
        setDbDocTypes([]);
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
    return DOC_TYPE_MAP;
  }, [dbDocTypes]);

  const docOptions = useMemo(() => Object.values(activeDocMap), [activeDocMap]);

  const filteredData = useMemo(() => {
    if (!selectedDocTypeId) return data;
    
    const targetId = Number(selectedDocTypeId);
    const filtered = data.filter(item =>
      item.documents?.some(d => Number(d.document_type_id) === targetId)
    );
    
    console.log('Filtered data:', { selectedId: targetId, total: data.length, filtered: filtered.length });
    return filtered;
  }, [selectedDocTypeId, data]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
  const indexOfFirstItem = (currentPage - 1) * rowsPerPage;
  const indexOfLastItem = currentPage * rowsPerPage;

  const currentData = useMemo(() => {
    return filteredData.slice(indexOfFirstItem, indexOfLastItem);
  }, [indexOfFirstItem, indexOfLastItem, filteredData]);

  const selectedDocLabel = useMemo(() => {
    return activeDocMap[selectedDocTypeId] || "[Document Type]";
  }, [selectedDocTypeId, activeDocMap]);

  const handleExportExcel = () => logbookExcel(filteredData, selectedDocLabel, pupLogoSrc, bpLogoSrc);

  const getFullName = (row) => {
    const p = row.student_profile;
    if (!p) return 'Walk-in Client';
    const middle = p.middle_name ? ` ${p.middle_name.charAt(0)}.` : '';
    return `${p.last_name}, ${p.first_name}${middle}`.trim();
  };

  const getCourse = (row) => {
    return (
      row.student_profile?.academic_records?.[0]?.course ||
      row.student_profile?.course ||
      row.academic_record?.course ||
      '---'
    );
  };

  const getEmail = (row) => {
    return row.user?.email || row.student_profile?.email || '---';
  };

  return (
    <div className="relative min-h-screen font-sans text-left z-20">
      <LoadingOverlay isVisible={loading} message="Fetching Registrar Records" />

      <div className="max-w-350 mx-auto bg-white shadow-md rounded-sm flex flex-col min-h-150 print:p-0 print:shadow-none">

        <div className="p-4 sm:p-6 md:p-8 pb-0">
          <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end mb-6 gap-4 print:hidden">
            <div className="flex flex-col gap-2 text-left w-full sm:w-auto">
              <div className="w-96">
                <DropDown
                  label="Document/Certification Type"
                  name="docType"
                  value={activeDocMap[selectedDocTypeId] || ''}
                  labelColor="text-gray-700"
                  onChange={(e) => {
                    const id = Object.keys(activeDocMap).find(key => activeDocMap[key] === e.target.value) || '';
                    setSelectedDocTypeId(id);
                    setCurrentPage(1);
                  }}
                  options={docOptions}
                />
              </div>
            </div>
            <button
              onClick={handleExportExcel}
              disabled={!selectedDocTypeId}
              className={`px-6 sm:px-8 py-2.5 rounded flex items-center justify-center gap-2 transition-all shadow-md font-bold uppercase text-xs w-full sm:w-auto ${
                !selectedDocTypeId ? 'bg-gray-300 cursor-not-allowed text-gray-500' : 'bg-pup-dark-maroon hover:bg-[#4a0000] text-white'
              }`}
            >
              <span>Export to Excel</span>
            </button>
          </div>

          <div className="w-full text-center border-b border-gray-300 pb-4 mb-0">
            <h2 className="text-[#4a0000] text-lg sm:text-xl md:text-2xl font-black uppercase tracking-widest leading-tight">
              Processing of Application for <br className="sm:hidden" /> {selectedDocLabel}
            </h2>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto px-4 sm:px-6 md:px-8">
          <table className="w-full border-collapse min-w-200">
            <thead>
              <tr className="border-b-2 border-gray-300 text-gray-400 uppercase text-center">
                <th className="py-4 px-2 text-[10px] font-black w-[12%]">Date/Time Requested</th>
                <th className="py-4 px-2 text-[10px] font-black w-[15%]">Client Name</th>
                <th className="py-4 px-2 text-[10px] font-black w-[12%]">Course</th>
                <th className="py-4 px-2 text-[10px] font-black w-[18%]">Email</th>
                <th className="py-4 px-2 text-[10px] font-black w-[12%]">Date/Time Processed</th>
                <th className="py-4 px-2 text-[10px] font-black w-[10%]">No. of Minutes Processed</th>
                <th className="py-4 px-2 text-[10px] font-black w-[13%]">Date Claimed</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((row) => (
                <tr key={row.request_id || row.id} className="border-b border-gray-200 hover:bg-gray-50 text-[11px] sm:text-[12px] text-gray-700 transition-colors">

                  {/* Date/Time Requested */}
                  <td className="p-3 sm:p-4 text-center">
                    {row.requested_at
                      ? new Date(row.requested_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'N/A'}
                  </td>

                  {/* Client Name */}
                  <td className="p-3 sm:p-4 text-center font-bold uppercase">
                    {getFullName(row)}
                  </td>

                  {/* Course - pending backend eager load of academic_record */}
                  <td className="p-3 sm:p-4 text-center">
                    {getCourse(row)}
                  </td>

                  {/* Email */}
                  <td className="p-3 sm:p-4 text-center truncate max-w-37.5">
                    {getEmail(row)}
                  </td>

                  {/* Date/Time Processed */}
                  <td className="p-3 sm:p-4 text-center">
                    {row.processed_at ? new Date(row.processed_at).toLocaleString() : '---'}
                  </td>

                  {/* Minutes Processed */}
                  <td className="p-3 sm:p-4 text-center font-mono">
                    {row.processing_minutes ?? '---'}
                  </td>

                  {/* Date Claimed */}
                  <td className="p-3 sm:p-4 text-center italic text-gray-400">
                    {row.claimed_at ? new Date(row.claimed_at).toLocaleDateString() : 'Pending'}
                  </td>

                </tr>
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
        <div className="px-4 sm:px-8 py-4 bg-gray-50 text-[11px] sm:text-sm text-gray-500 flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden border-t border-gray-200">
          <span className="text-center sm:text-left">
            Showing {filteredData.length > 0 ? indexOfFirstItem + 1 : 0} to{" "}
            {Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length} results
          </span>

          <div className="flex gap-4 items-center">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`p-1 rounded transition-colors ${
                currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>

            <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`p-1 rounded transition-colors ${
                currentPage === totalPages || totalPages === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200'
              }`}
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