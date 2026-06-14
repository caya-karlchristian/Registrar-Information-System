import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import DropdownGroup from '../components/DropDown';
import { getCertifications } from '../services/api';
import SuccessToast from './SuccessToast.jsx';
import ErrorToast from './ErrorToast.jsx';

const MonthRangeModal = ({ isOpen, onClose, onConfirm, maxMonths = 6, isDark, loading = false, documentTypes = [] }) => {
  const pad2 = (value) => String(value).padStart(2, '0');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [selectedDocType, setSelectedDocType] = useState(documentTypes?.[0] ?? 'All Documents');
  const [certifications, setCertifications] = useState([]);
  const [selectedCertification, setSelectedCertification] = useState('');
  const [certLoading, setCertLoading] = useState(false);
  const [toastError, setToastError] = useState('');
  const [toastSuccess, setToastSuccess] = useState('');

  useEffect(() => {
    if (documentTypes && documentTypes.length) {
      const t = setTimeout(() => setSelectedDocType(documentTypes[0]), 0);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [documentTypes]);

  useEffect(() => {
    // Only load certification options when the export type needs them.
    let t;
    if (selectedDocType === 'CERTIFICATION') {
      t = setTimeout(() => setCertLoading(true), 0);
      getCertifications()
        .then((res) => {
          const certs = Array.isArray(res?.data) ? res.data : [];
          setCertifications(certs);
          if (certs.length > 0) setSelectedCertification('All Certification');
        })
        .catch((err) => {
          console.error('Failed to fetch certifications:', err);
          setCertifications([]);
        })
        .finally(() => setCertLoading(false));
    } else {
      setCertifications([]);
      setSelectedCertification('');
    }
    return () => { if (t) clearTimeout(t); };
  }, [selectedDocType]);

  useEffect(() => {
    // Clear stale input when the modal reopens so the next export starts clean.
    if (isOpen) {
      setStart('');
      setEnd('');
      setToastError('');
      setCertifications([]);
      setSelectedCertification('');
      if (documentTypes && documentTypes.length) setSelectedDocType(documentTypes[0]);
    }
  }, [isOpen, documentTypes]);

  if (!isOpen) return null;

  const parseDate = (val) => {
    if (!val) return null;
    const [y, m] = String(val).split('-').map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m)) return null;
    const d = new Date(y, m - 1, 1, 0, 0, 0, 0);
    return { y, m, d: 1, raw: d };
  };

  // current month string (YYYY-MM) for input max
  const today = new Date();
  const todayMonthStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}`;

  const monthsBetweenInclusive = (a, b) => {
    if (!a || !b) return 0;
    return (b.y - a.y) * 12 + (b.m - a.m) + 1;
  };

  const handleConfirm = async () => {
    setToastError('');
    setToastSuccess('');
    if (!start || !end) { setToastError('Please select both start and end months.'); return; }
    if (selectedDocType === 'CERTIFICATION' && !selectedCertification) {
      setToastError('Please select a certification type.');
      return;
    }
    const s = parseDate(start);
    const e = parseDate(end);
    if (!s || !e) { setToastError('Please select valid start and end months.'); return; }
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    if (s.raw > todayEnd || e.raw > todayEnd) { setToastError('Selected months cannot be in the future.'); return; }
    const count = monthsBetweenInclusive(s, e);
    if (count <= 0) { setToastError('End month must be the same month or after start month.'); return; }
    if (count > maxMonths) { setToastError(`Range must not exceeds ${maxMonths} months.`); return; }

    // Pass the certification type only for certification exports.
    const params = selectedDocType === 'CERTIFICATION'
      ? [start, end, selectedDocType, selectedCertification]
      : [start, end, selectedDocType];

    try {
      // Support both sync and async onConfirm handlers
      const result = onConfirm(...params);
      if (result && typeof result.then === 'function') {
        await result;
      }
    } catch (err) {
      console.error('Export failed:', err);
      setToastError(err?.message || 'Export failed. Try Again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className={`relative z-50 w-full max-w-2xl my-4 sm:my-8 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-y-auto border flex flex-col max-h-[90vh] ${isDark ? 'bg-[#242526] border-[#3e4042] text-[#e4e6eb]' : 'bg-white border-[#800000]/20 text-gray-900'}`}>
        <div className={`px-6 py-6 border-b-4 shrink-0 ${isDark ? 'bg-[#1f1f1f] border-[#b98b00]' : 'bg-[#800000] border-[#FFD700]'}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl text-white font-black uppercase tracking-tighter">Export Monthly Report</h3>
            <button onClick={onClose} className="p-2 rounded hover:opacity-90 shrink-0">
              <XMarkIcon className={`w-6 h-6 ${isDark ? 'text-[#e4e6eb]' : 'text-white'}`} />
            </button>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto px-8 py-8 space-y-6 ${isDark ? 'text-[#e4e6eb]' : 'text-[#4a0000]'}`}>
          <p className="text-sm mb-4">Select the start and end month for the report (maximum {maxMonths} months).</p>

          <div>
            <DropdownGroup
              label="Document Type:"
              name="docType"
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              options={documentTypes ?? ['All Documents']}
              labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
            />
          </div>

          {selectedDocType === 'CERTIFICATION' && (
            <div >
              <DropdownGroup
                label="Certification Type"
                name="certType"
                value={selectedCertification}
                onChange={(e) => setSelectedCertification(e.target.value)}
                options={['All Certification', ...certifications.map((c) => c.certificate_name || c.name || c.id)]}
                disabled={certLoading}
                labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
              />
              {certLoading && <p className="text-xs text-gray-500 mt-1">Loading certifications...</p>}
            </div>
          )}

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}`}>Start month:</label>
              <input type="month" value={start} onChange={(e) => setStart(e.target.value)} max={todayMonthStr} className={`w-full p-2.5 rounded border text-sm ${isDark ? 'bg-[#3a3b3c] border-[#4e4f50] text-[#e4e6eb]' : 'bg-slate-50 border-slate-200 text-gray-800'}`} />
            </div>
            <div className="flex-1">
              <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}`}>End month:</label>
              <input type="month" value={end} onChange={(e) => setEnd(e.target.value)} className={`w-full p-2.5 rounded border text-sm ${isDark ? 'bg-[#3a3b3c] border-[#4e4f50] text-[#e4e6eb]' : 'bg-slate-50 border-slate-200 text-gray-800'}`} min={start || undefined} max={todayMonthStr} />
            </div>
          </div>

          
        </div>

        <div className={`px-8 py-6 border-t-2 shrink-0 flex justify-end gap-4 ${isDark ? 'bg-[#1f1f1f] border-[#3e4042]' : 'bg-gray-50 border-gray-200'}`}>
          <button
            onClick={onClose}
            disabled={loading}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded transition-colors duration-150 ${isDark ? 'text-[#f5c542] hover:bg-[#2a2a2a] disabled:opacity-50' : 'text-[#800000] hover:bg-gray-200 disabled:opacity-50'}`}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={
              `px-5 py-2 rounded-md font-bold text-xs uppercase tracking-widest transition-colors duration-150 shadow-sm ` +
              (!loading
                ? (isDark
                    ? 'bg-[#3a3b3c] hover:bg-[#4e4f50] text-[#e4e6eb] border border-[#4e4f50]'
                    : 'bg-[#800000] hover:bg-[#4a0000] text-[#FFD700]')
                : (isDark
                    ? 'bg-[#3a3b3c] text-[#8f949e] border border-[#4e4f50] cursor-not-allowed'
                    : 'bg-[#800000] text-white cursor-not-allowed'))
            }
          >
            {loading ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
      {/* Toasts */}
      <SuccessToast message={toastSuccess} onClose={() => setToastSuccess('')} />
      <ErrorToast message={toastError} onClose={() => setToastError('')} />
    </div>
  );
};

export default MonthRangeModal;
