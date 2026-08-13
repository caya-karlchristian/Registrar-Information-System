import React, { useRef } from 'react';
import {
  CheckCircleIcon,
  EyeIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/solid';
import { CheckIcon, ArrowUpIcon, ArrowDownIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import RequestDetailsModal from '../components/RequestDetailModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import LoadingOverlay from '../components/LoadingOverlay.jsx';
import LineLoading from '../components/LineLoading.jsx';
import CertificateModal from '../components/CertificateModal.jsx';
import VoiceSearchInput from '../components/VoiceSearchInput.jsx';
import DashboardDropdown from '../components/DashboardDropdown.jsx';
import { useTheme } from '../context/ThemeContext';
import { useStaffDashboard } from '../hooks/useStaffDashboard';
import {
  StatCard,
  Th,
  Td,
  StatusBadge,
  Pagination,
} from '../components/StaffDashboardComponents';

const ITEMS_PER_PAGE = 15;

const StaffDashboard = ({ viewMode = 'active', isEmbedded = false }) => {
  const { isDark } = useTheme();

  const {
    requests,
    filteredData,
    loading,
    actionLoading,
    filterStatus,
    setFilterStatus,
    searchTerm,
    setSearchTerm,
    updatingId,
    selectedRequest,
    setSelectedRequest,
    currentPage,
    setCurrentPage,
    sortOrder,
    setSortOrder,
    selectedIds,
    setSelectedIds,
    showDeleteConfirm,
    setShowDeleteConfirm,
    certRequest,
    setCertRequest,
    sortDropdownOpen,
    setSortDropdownOpen,
    statusDropdownOpen,
    setStatusDropdownOpen,
    filterClassification,
    setFilterClassification,
    classificationDropdownOpen,
    setClassificationDropdownOpen,
    printedCertificateIds,
    resolvedStatusIds,
    requestStatuses,
    handleStatusUpdate,
    handleSelectOne,
    handleDeleteSelected,
    confirmDeleteSelected,
    handleArchiveSelected,
    handleRestoreSelected,
    handleArchiveOne,
    handleRestoreOne,
    markCertificateAsPrinted,
  } = useStaffDashboard(viewMode);

  const sortDropdownRef = useRef(null);
  const statusDropdownRef = useRef(null);
  const classificationDropdownRef = useRef(null);

  const handleSort = (field) => {
    if (field === 'Date & Time') {
      setSortOrder(prev => prev === 'Recent Requests' ? 'Old Requests' : 'Recent Requests');
    } else if (field === 'Classification') {
      setSortOrder(prev => prev === 'Classification Asc' ? 'Classification Desc' : 'Classification Asc');
    } else if (field === 'Status') {
      setSortOrder(prev => prev === 'Status Asc' ? 'Status Desc' : 'Status Asc');
    }
  };

  const handleSelectAll = (e) => {
    const pageIds = currentItems.map(item => item.id);
    if (e.target.checked) {
      setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
    } else {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    }
  };
  
  const statusFilterOptions = [
    'All',
    ...requestStatuses
      .map(s => s?.status_name)
      .filter(Boolean)
      .filter((name, index, self) => self.indexOf(name) === index),
  ];

  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  const handleNextPage = () => currentPage < totalPages && setCurrentPage(prev => prev + 1);
  const handlePrevPage = () => currentPage > 1 && setCurrentPage(prev => prev - 1);

  const dashboardContent = (
    <>
      <LoadingOverlay isVisible={loading} message="Fetching Request Records..." />
      <LineLoading isVisible={actionLoading} />

      {/* ---------------- CARDS ---------------- */}
      {viewMode === 'archived' ? (
        <div className="grid grid-cols-1 gap-6 mb-8">
          <StatCard 
            title="Archived Requests" 
            count={requests.length} 
            color="blue" 
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="New Requests"       count={requests.filter(r => r.statusId === resolvedStatusIds.PENDING).length}    color="yellow" />
          <StatCard title="Processing"         count={requests.filter(r => r.statusName?.toLowerCase() === 'processing').length} color="blue" />
          <StatCard title="Awaiting Signature" count={requests.filter(r => r.statusId === resolvedStatusIds.PENDING_SIGNATURE).length} color="orange" />
          <StatCard title="Ready for Pickup"   count={requests.filter(r => r.statusId === resolvedStatusIds.READY).length}       color="green" />
        </div>
      )}

      {/* ---------------- TOOLBAR ---------------- */}
      <div className={isEmbedded ? "mb-6 flex flex-col md:flex-row gap-4 justify-between items-center w-full" : `p-4 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center ${isDark ? 'bg-[#242526] border border-[#3e4042]' : 'bg-white border border-gray-100'}`}>
        
        {selectedIds.length > 0 ? (
          <div className={`flex flex-wrap items-center gap-3 p-2 rounded-lg border w-full md:w-auto ${isDark ? 'bg-[#1f1f1f] border-[#3e4042]' : 'bg-blue-50/30 border-blue-100'}`}>
            <span className={`font-bold text-sm ml-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{selectedIds.length} Selected</span>
            <button 
              onClick={handleDeleteSelected}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
            >
              <TrashIcon className="w-4 h-4" /> Delete Selected
            </button>
            {viewMode === 'archived' ? (
              <button 
                onClick={handleRestoreSelected}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
              >
                <CheckIcon className="w-4 h-4" /> Restore Selected
              </button>
            ) : (
              <button 
                onClick={handleArchiveSelected}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
              >
                <ArchiveBoxIcon className="w-4 h-4" /> Archive Selected
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-1 items-center gap-3 w-full md:max-w-xl">
            <div className="flex-1">
              <VoiceSearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search"
                language="en-US"
              />
            </div>
            <div className="relative shrink-0">
              <DashboardDropdown
                isOpen={sortDropdownOpen}
                setIsOpen={setSortDropdownOpen}
                dropdownRef={sortDropdownRef}
                align="right"
                isIconButton
                trigger={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path>
                  </svg>
                }
                sections={[
                  {
                    title: 'Sort by',
                    items: [
                      { label: 'Date & Time', field: 'Date & Time' },
                      { label: 'Status', field: 'Status' },
                      { label: 'Classification', field: 'Classification' }
                    ].map(opt => {
                      let isSelected = false;
                      if (opt.field === 'Date & Time') {
                        isSelected = sortOrder === 'Recent Requests' || sortOrder === 'Old Requests';
                      } else if (opt.field === 'Classification') {
                        isSelected = sortOrder === 'Classification Asc' || sortOrder === 'Classification Desc';
                      } else if (opt.field === 'Status') {
                        isSelected = sortOrder === 'Status Asc' || sortOrder === 'Status Desc';
                      }
                      return {
                        label: opt.label,
                        isSelected,
                        onClick: () => {
                          if (opt.field === 'Date & Time') setSortOrder('Recent Requests');
                          else if (opt.field === 'Classification') setSortOrder('Classification Asc');
                          else if (opt.field === 'Status') setSortOrder('Status Asc');
                        }
                      };
                    })
                  },
                  {
                    title: 'Direction',
                    items: [
                      { label: 'Ascending', dir: 'asc', icon: ArrowUpIcon },
                      { label: 'Descending', dir: 'desc', icon: ArrowDownIcon }
                    ].map(opt => {
                      const isAsc = sortOrder === 'Old Requests' || sortOrder === 'Classification Asc' || sortOrder === 'Status Asc';
                      const isSelected = (opt.dir === 'asc' && isAsc) || (opt.dir === 'desc' && !isAsc);
                      return {
                        label: opt.label,
                        isSelected,
                        icon: opt.icon,
                        onClick: () => {
                          if (opt.dir === 'asc') {
                            if (sortOrder === 'Recent Requests') setSortOrder('Old Requests');
                            else if (sortOrder === 'Classification Desc') setSortOrder('Classification Asc');
                            else if (sortOrder === 'Status Desc') setSortOrder('Status Asc');
                          } else {
                            if (sortOrder === 'Old Requests') setSortOrder('Recent Requests');
                            else if (sortOrder === 'Classification Asc') setSortOrder('Classification Desc');
                            else if (sortOrder === 'Status Asc') setSortOrder('Status Desc');
                          }
                        }
                      };
                    })
                  }
                ]}
              />
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {(filterStatus !== 'All' || filterClassification !== 'All' || sortOrder !== 'Recent Requests' || searchTerm.trim() !== '') && (
            <button
              type="button"
              onClick={() => {
                setFilterStatus('All');
                setFilterClassification('All');
                setSortOrder('Recent Requests');
                setSearchTerm('');
                setSelectedIds([]);
                setSortDropdownOpen(false);
                setStatusDropdownOpen(false);
                setClassificationDropdownOpen(false);
              }}
              className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold transition-colors border shadow-sm flex items-center justify-center shrink-0
              ${isDark
                  ? 'bg-[#1f1f1f] text-[#b0b3b8] border-[#3e4042] hover:bg-[#2a2a2f] hover:text-[#e4e6eb]'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ---------------- TABLE ---------------- */}
      <div className={isEmbedded ? "overflow-x-auto w-full" : `rounded-xl shadow overflow-x-auto border ${isDark ? 'bg-[#242526] border-[#3e4042]' : 'bg-white border-gray-100'}`}>
        <table className={`min-w-full divide-y ${isDark ? 'divide-[#3e4042]' : 'divide-gray-100'}`}>
          <thead className={isDark ? 'bg-[#18191a]/80' : 'bg-gray-50'}>
            <tr>
              <th className="px-6 py-4 w-10 text-center">
                <input 
                  type="checkbox" 
                  className={`w-4 h-4 rounded cursor-pointer ${isDark ? 'border-[#4e4f50] text-blue-400 focus:ring-blue-400 bg-[#242526]' : 'border-gray-300 text-blue-600 focus:ring-blue-500'}`}
                  onChange={handleSelectAll}
                  checked={currentItems.length > 0 && selectedIds.length === currentItems.length}
                />
              </th>
              <Th center>#</Th>
              <Th center>Name</Th>
              <Th center>
                <DashboardDropdown
                  isOpen={classificationDropdownOpen}
                  setIsOpen={setClassificationDropdownOpen}
                  dropdownRef={classificationDropdownRef}
                  align="center"
                  trigger={<span>Classification</span>}
                  sections={[
                    {
                      title: 'Filter by Classification',
                      items: ['All', 'Student', 'Alumni'].map(option => ({
                        label: option,
                        isSelected: filterClassification === option,
                        onClick: () => setFilterClassification(option)
                      }))
                    }
                  ]}
                />
              </Th>
              <Th center>Document</Th>
              <Th center>
                <button
                  type="button"
                  onClick={() => handleSort('Date & Time')}
                  className="flex items-center justify-center gap-1 mx-auto text-xs uppercase font-bold hover:text-[#800000] dark:hover:text-[#FFC72C] transition-colors focus:outline-none"
                >
                  <span>Date & Time</span>
                  {sortOrder === 'Recent Requests' || sortOrder === 'Old Requests' ? (
                    sortOrder === 'Old Requests' ? <ChevronUpIcon className="w-3.5 h-3.5 text-blue-500" /> : <ChevronDownIcon className="w-3.5 h-3.5 text-blue-500" />
                  ) : (
                    <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400 opacity-50" />
                  )}
                </button>
              </Th>
              <Th center>No. of Copies</Th>
              <Th center>
                <DashboardDropdown
                  isOpen={statusDropdownOpen}
                  setIsOpen={setStatusDropdownOpen}
                  dropdownRef={statusDropdownRef}
                  align="center"
                  trigger={<span>Status</span>}
                  sections={[
                    {
                      title: 'Filter by Status',
                      items: statusFilterOptions.map(option => ({
                        label: option,
                        isSelected: filterStatus === option,
                        onClick: () => setFilterStatus(option)
                      }))
                    }
                  ]}
                />
              </Th>
              <Th center>Actions</Th>
            </tr>
          </thead>
          <tbody className={isDark ? 'divide-y divide-[#3e4042]' : 'divide-y divide-gray-100'}>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <svg
                      className={`w-12 h-12 ${isDark ? 'text-gray-600' : 'text-gray-300'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
                      />
                    </svg>
                    <div>
                      <div className={`text-base font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        No requests found
                      </div>
                      <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Try adjusting your search terms or active filters.
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              currentItems.map((req, idx) => (
                <tr key={req.id} className={`transition-colors ${isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-50'} ${selectedIds.includes(req.id) ? (isDark ? 'bg-blue-900/15' : 'bg-blue-50') : ''}`}>
                  <td className="px-6 py-4 text-center">
                    <input 
                      type="checkbox" 
                      className={`w-4 h-4 rounded cursor-pointer ${isDark ? 'border-[#4e4f50] bg-[#242526]' : 'border-gray-300'}`}
                      checked={selectedIds.includes(req.id)}
                      onChange={() => handleSelectOne(req.id)}
                    />
                  </td>
                  <Td center>
                    <span className="font-semibold text-xs text-gray-500 dark:text-gray-400">
                      {indexOfFirstItem + idx + 1}
                    </span>
                  </Td>
                  <Td>
                    <div className="font-bold text-center">{req.studentName}</div>
                  </Td>
                  <Td center>
                    <span className="text-xs font-bold tracking-wide">
                      {req.userType.toUpperCase()}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">
                        {req.documentDetailsArray[0]}
                      </span>

                      {req.documentDetailsArray.length > 1 && (
                        <span className={isDark ? 'text-xs text-[#b0b3b8]' : 'text-xs text-gray-400'}>
                          +{req.documentDetailsArray.length - 1} more
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td center>
                    <div className={isDark ? 'text-xs text-[#b0b3b8]' : 'text-xs text-gray-400'}>{req.date}</div>
                    <div className={isDark ? 'text-xs text-[#b0b3b8]' : 'text-xs text-gray-400'}>{req.time}</div>
                  </Td>
                  <Td center><span className={isDark ? 'font-semibold text-[#e4e6eb]' : 'font-semibold text-gray-700'}>{req.copies}</span></Td>
                  <Td center><StatusBadge status={req.statusName} /></Td>
                  <Td center>
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-1.5 sm:gap-2 min-w-0">
                      {!req.isArchived && req.isCertificate && req.statusId === resolvedStatusIds.PENDING && (
                        <button
                          title="Generate Certificate"
                          onClick={() => {
                            setCertRequest(req);
                          }}
                          className={isDark ? 'p-2 text-[#b0b3b8] hover:text-[#e4e6eb] hover:bg-[#3a3b3c] rounded-lg transition' : 'p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition'}
                        >
                          <ArrowDownTrayIcon className="w-5 h-5" />
                        </button>
                      )}
                      {!req.isArchived && req.statusId === resolvedStatusIds.PENDING && (
                        <button
                          disabled={updatingId === req.id || (req.isCertificate && !printedCertificateIds.includes(req.id))}
                          onClick={() => {
                            if (req.isCertificate && !printedCertificateIds.includes(req.id)) {
                              alert('Please generate and print the certificate first before sending it for signature.');
                              return;
                            }
                            handleStatusUpdate(req.id, resolvedStatusIds.PENDING_SIGNATURE);
                          }}
                          className={`flex items-center gap-1 px-3 py-1.5 text-white text-xs font-bold rounded-lg shadow transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${isDark ? 'bg-orange-900/20 hover:bg-orange-900/30 text-orange-400 border border-orange-600' : 'bg-orange-500 hover:bg-orange-700'}`}
                          title={
                            req.isCertificate && !printedCertificateIds.includes(req.id)
                              ? 'Print the certificate first before sending it for signature'
                              : "Registrar's part is done — send this to an external office for signature. Stops the registrar's own processing-time clock and starts tracking the signing office's turnaround separately."
                          }
                        >
                          <CheckCircleIcon className="w-4 h-4" /> Awaiting Signature
                        </button>
                      )}
                      {(!req.isArchived && (req.statusId === resolvedStatusIds.PENDING || req.statusId === resolvedStatusIds.PENDING_SIGNATURE)) && (
                        <button
                          disabled={updatingId === req.id || (req.isCertificate && !printedCertificateIds.includes(req.id))}
                          onClick={() => {
                            if (req.isCertificate && !printedCertificateIds.includes(req.id)) {
                              alert('Please generate and print the certificate first before marking this request as Ready to claim.');
                              return;
                            }
                            handleStatusUpdate(req.id, resolvedStatusIds.READY);
                          }}
                          className={`flex items-center gap-1 px-3 py-1.5 text-white text-xs font-bold rounded-lg shadow transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${isDark ? 'bg-blue-900/20 hover:bg-blue-900/30 text-blue-400 border border-blue-600' : 'bg-blue-500 hover:bg-blue-700'}`}
                          title={
                            req.isCertificate && !printedCertificateIds.includes(req.id)
                              ? 'Print certificate first'
                              : req.statusId === resolvedStatusIds.PENDING_SIGNATURE
                              ? 'Signature received — mark as Ready to claim'
                              : 'Mark as Ready to claim'
                          }
                        >
                          <CheckCircleIcon className="w-4 h-4" /> Ready
                        </button>
                      )}

                      {!req.isArchived && req.statusId === resolvedStatusIds.READY && (
                        <button
                          disabled={updatingId === req.id}
                          onClick={() => handleStatusUpdate(req.id, resolvedStatusIds.COMPLETED)}
                          className={`flex items-center gap-1 px-3 py-1.5 text-white text-xs font-bold rounded-lg shadow transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap ${isDark ? 'bg-green-900/20 hover:bg-green-900/30 text-green-400 border border-green-600' : 'bg-green-500 hover:bg-green-700'}`}
                        >
                          <CheckCircleIcon className="w-4 h-4" /> Done
                        </button>
                      )}              
                      {viewMode === 'archived' ? (
                        <button
                          disabled={updatingId === req.id}
                          onClick={() => handleRestoreOne(req.id)}
                          className={`flex items-center gap-1 px-3 py-1.5 text-white text-xs font-bold rounded-lg shadow transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap ${isDark ? 'bg-blue-900/20 hover:bg-blue-900/30 text-blue-400 border border-blue-600' : 'bg-blue-500 hover:bg-blue-700'}`}
                          title="Restore to Active Requests (original status kept)"
                        >
                          <CheckIcon className="w-4 h-4" /> Restore
                        </button>
                      ) : (
                        <button
                          disabled={updatingId === req.id}
                          onClick={() => handleArchiveOne(req.id)}
                          className={`flex items-center gap-1 px-3 py-1.5 text-white text-xs font-bold rounded-lg shadow transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap ${isDark ? 'bg-amber-900/20 hover:bg-amber-900/30 text-amber-400 border border-amber-600' : 'bg-amber-500 hover:bg-amber-700'}`}
                          title="Archive this request"
                        >
                          <ArchiveBoxIcon className="w-4 h-4" /> Archive
                        </button>
                      )}
                      <button
                        title="View Details"
                        onClick={() => setSelectedRequest(req.rawRequest)}
                        className={`flex items-center justify-center gap-1 px-3 py-1.5 ${isDark ? 'p-2text-[#b0b3b8] hover:text-[#e4e6eb] hover:bg-[#3a3b3c] rounded-lg transition' : 'p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition'}`}
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>                     
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ---------------- PAGINATION ---------------- */}
        <Pagination
          filteredCount={filteredData.length}
          indexOfFirstItem={indexOfFirstItem}
          indexOfLastItem={indexOfLastItem}
          currentPage={currentPage}
          totalPages={totalPages}
          handlePrevPage={handlePrevPage}
          handleNextPage={handleNextPage}
        />
      </div>
      <RequestDetailsModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />
      <DeleteConfirmModal
        open={showDeleteConfirm}
        count={selectedIds.length}
        loading={loading}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteSelected}
      />

      {certRequest && (
        <CertificateModal
          request={certRequest}
          onCertificatePrinted={markCertificateAsPrinted}
          onClose={() => setCertRequest(null)}
        />
      )}
    </>
  );

  if (isEmbedded) {
    return dashboardContent;
  }

  return (
    <div className={`relative ${isDark ? 'bg-[#18191a] text-[#e4e6eb]' : 'bg-[#F5F5F5] text-gray-900'}`}>
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 ${isDark ? 'text-[#e4e6eb]' : 'text-gray-900'}`}>
        {dashboardContent}
      </main>
    </div>
  );
};

export default StaffDashboard;