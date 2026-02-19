import React, { useState, useEffect, useMemo } from 'react';
import { PrinterIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { getDocumentRequests } from "../services/API"; 
import LoadingOverlay from "../components/LoadingOverlay"; 

/* ---------------- DOCUMENT TYPE MAPPING ---------------- */
const documentTypeMap = {
  1: "Certificate of Good Moral Character",
  2: "Certification, Authentication, Verification (CAV) / APOSTILE",
  3: "Authentication/Certified True Copy - Local",
  4: "Informative Copy of Grades",
  5: "CAV - CHED",
  6: "CAV - WES/CES",
  7: "Cross-enrollment Fee",
  8: "Re-admission Fee",
  9: "Admission Fee for Transfer Students (From Private School)",
  10: "Admission Fee for Transfer Students (From SUCs)",
  11: "New Copy of Registration Card (With Affidavit of Loss)",
  12: "Diploma",
  13: "Accreditation Fee",
  14: "Completion Fee",
  15: "Transcript of Records",
  16: "Correction in Student Information System",
};

const LogbookRecords = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDocTypeId, setSelectedDocTypeId] = useState("");
  const rowsPerPage = 8; 

  useEffect(() => {
    const fetchLogbookData = async () => {
      setLoading(true);
      try {
        const res = await getDocumentRequests();
        setData(res.data);
      } catch (error) {
        console.error("Error loading logbook records:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogbookData();
  }, []);

  // 2. Filter logic
  const filteredData = useMemo(() => {
    if (!selectedDocTypeId) return data;
    const targetId = parseInt(selectedDocTypeId);
    return data.filter(item => 
      item.documents?.some(d => d.document_type_id === targetId) ||
      item.document_type_id === targetId
    );
  }, [selectedDocTypeId, data]);

  // 3. Pagination Logic Helpers
  const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
  const indexOfFirstItem = (currentPage - 1) * rowsPerPage;
  const indexOfLastItem = currentPage * rowsPerPage;

  const currentData = useMemo(() => {
    return filteredData.slice(indexOfFirstItem, indexOfLastItem);
  }, [indexOfFirstItem, indexOfLastItem, filteredData]);

  // 4. Dynamic Title Helper
  const selectedDocLabel = useMemo(() => {
    return documentTypeMap[selectedDocTypeId] || "[Document Type]";
  }, [selectedDocTypeId]);

  const handlePrint = () => window.print();

  return (
    <div className=" relative min-h-screen font-sans text-left z-20">
      <LoadingOverlay isVisible={loading} message="Fetching Registrar Records" />

      <div className="max-w-350 mx-auto bg-white shadow-md rounded-sm flex flex-col min-h-150 print:p-0 print:shadow-none">
        
        <div className="p-4 sm:p-6 md:p-8 pb-0">
          <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end mb-6 gap-4 print:hidden">
            <div className="flex flex-col gap-2 text-left w-full sm:w-auto">
              <label className="text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">Document/Certification Type</label>
              <select 
                className="border border-gray-300 rounded px-3 py-2 w-full sm:w-72 bg-gray-50 text-sm focus:outline-none focus:ring-1 focus:ring-maroon"
                value={selectedDocTypeId}
                onChange={(e) => {
                  setSelectedDocTypeId(e.target.value);
                  setCurrentPage(1); 
                }}
              >
                <option value="">Please select</option>
                {Object.entries(documentTypeMap).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
            
            <button 
              onClick={handlePrint}
              className="bg-pup-dark-maroon hover:bg-[#3a0000] text-white px-6 sm:px-8 py-2.5 rounded flex items-center justify-center gap-2 transition-all shadow-md font-bold uppercase text-xs w-full sm:w-auto"
            >
              <PrinterIcon className="h-4 w-4" />
              <span>Print Logbook</span>
            </button>
          </div>

          <div className="w-full text-center border-b border-gray-300 pb-4 mb-0">
            <h2 className="text-[#4a0000] text-lg sm:text-xl md:text-2xl font-black uppercase tracking-widest leading-tight">
              Processing of Application for <br className="sm:hidden" /> {selectedDocLabel}
            </h2>
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-x-auto px-4 sm:px-6 md:px-8">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b-2 border-gray-300 text-gray-400 uppercase text-center">
                <th className="py-4 px-2 text-[10px] font-black w-[12%]">Date/Time Requested</th>
                <th className="py-4 px-2 text-[10px] font-black w-[15%]">Client Name</th>
                <th className="py-4 px-2 text-[10px] font-black w-[12%]">Course/Year & Section</th>
                <th className="py-4 px-2 text-[10px] font-black w-[8%]">Gender</th>
                <th className="py-4 px-2 text-[10px] font-black w-[18%]">Email Address/Contact</th>
                <th className="py-4 px-2 text-[10px] font-black w-[12%]">Date/Time Processed</th>
                <th className="py-4 px-2 text-[10px] font-black w-[10%]">No. of Minutes Processed</th>
                <th className="py-4 px-2 text-[10px] font-black w-[13%]">Date Claimed</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((row) => (
                <tr key={row.request_id || row.id} className="border-b border-gray-200 hover:bg-gray-50 text-[11px] sm:text-[12px] text-gray-700 transition-colors">
                  <td className="p-3 sm:p-4 text-center">
                    {row.requested_at ? new Date(row.requested_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </td>
                  <td className="p-3 sm:p-4 text-center font-bold uppercase text-left">
                    {row.student_profile ? `${row.student_profile.first_name} ${row.student_profile.last_name}` : 'N/A'}
                  </td>
                  <td className="p-3 sm:p-4 text-center">
                    {row.academic_record ? `${row.academic_record.course} ${row.academic_record.section || ''}` : 'N/A'}
                  </td>
                  <td className="p-3 sm:p-4 text-center">{row.student_profile?.gender || '---'}</td>
                  <td className="p-3 sm:p-4 text-center lowercase text-blue-600 truncate max-w-[150px]">{row.student_profile?.email || '---'}</td>
                  <td className="p-3 sm:p-4 text-center">{row.processed_at ? new Date(row.processed_at).toLocaleString() : '---'}</td>
                  <td className="p-3 sm:p-4 text-center font-mono">{row.processing_minutes || '0'}</td>
                  <td className="p-3 sm:p-4 text-center italic text-gray-400">{row.claimed_at ? new Date(row.claimed_at).toLocaleDateString() : 'Pending'}</td>
                </tr>
              ))}
              
              {!loading && Array.from({ length: Math.max(0, rowsPerPage - currentData.length) }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-[45px] sm:h-[53px] border-b border-gray-100">
                  <td colSpan="8"></td>
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