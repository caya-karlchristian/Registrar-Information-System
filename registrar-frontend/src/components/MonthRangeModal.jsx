import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import DropdownGroup from '../components/DropDown';
import { getCertifications } from '../services/api';
import { useReferenceData } from '../context/ReferenceDataContext';
import SuccessToast from './SuccessToast.jsx';
import ErrorToast from './ErrorToast.jsx';

const MonthRangeModal = ({ isOpen, onClose, onConfirm, maxMonths = null, isDark, loading = false, documentTypes = [] }) => {
  const pad2 = (value) => String(value).padStart(2, '0');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [selectedDocType, setSelectedDocType] = useState(documentTypes?.[0] ?? 'All Documents');
  const [certifications, setCertifications] = useState([]);
  const [selectedCertification, setSelectedCertification] = useState('');
  const [certLoading, setCertLoading] = useState(false);
  const [toastError, setToastError] = useState('');
  const [toastSuccess, setToastSuccess] = useState('');
  const [activePreset, setActivePreset] = useState('');
  const [preparedByName, setPreparedByName] = useState('MHEL P. GARCIA');
  const [preparedByTitle, setPreparedByTitle] = useState('Head of Registration Office');
  const [notedByName, setNotedByName] = useState('DR. MARISSA B. FERRER');
  const [notedByTitle, setNotedByTitle] = useState('Campus Director');

  const { signatories = [] } = useReferenceData();
  const [preparedSignatoryId, setPreparedSignatoryId] = useState('');
  const [notedSignatoryId, setNotedSignatoryId] = useState('');

  const handlePreparedSignatoryChange = (e) => {
    const val = e.target.value;
    if (val === 'Custom / Manual Input') {
      setPreparedSignatoryId('custom');
    } else {
      const selected = signatories.find(s => `${s.name} (${s.position})` === val);
      if (selected) {
        setPreparedSignatoryId(selected.signatory_id);
        setPreparedByName(selected.name);
        setPreparedByTitle(selected.position);
      }
    }
  };

  const handleNotedSignatoryChange = (e) => {
    const val = e.target.value;
    if (val === 'Custom / Manual Input') {
      setNotedSignatoryId('custom');
    } else {
      const selected = signatories.find(s => `${s.name} (${s.position})` === val);
      if (selected) {
        setNotedSignatoryId(selected.signatory_id);
        setNotedByName(selected.name);
        setNotedByTitle(selected.position);
      }
    }
  };


  const applyPreset = (preset) => {
    const today = new Date();

    if (preset === 'annual') {
      const startD = new Date(today);
      startD.setFullYear(startD.getFullYear() - 1);
      setStart(`${startD.getFullYear()}-${pad2(startD.getMonth() + 1)}`);
      setEnd(`${today.getFullYear()}-${pad2(today.getMonth() + 1)}`);
    } else if (preset === 'semi') {
      const startD = new Date(today);
      startD.setMonth(startD.getMonth() - 5);
      setStart(`${startD.getFullYear()}-${pad2(startD.getMonth() + 1)}`);
      setEnd(`${today.getFullYear()}-${pad2(today.getMonth() + 1)}`);
    } else if (preset === 'month') {
      setStart(`${today.getFullYear()}-${pad2(today.getMonth() + 1)}`);
      setEnd(`${today.getFullYear()}-${pad2(today.getMonth() + 1)}`);
    } else {
      setStart('');
      setEnd('');
    }
    setActivePreset(preset);
  };

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
      setActivePreset('');
      setToastError('');
      setCertifications([]);
      setSelectedCertification('');

      let prepDefaultId = 'custom';
      let prepDefaultName = 'MHEL P. GARCIA';
      let prepDefaultTitle = 'Head of Registration Office';

      let noteDefaultId = 'custom';
      let noteDefaultName = 'DR. MARISSA B. FERRER';
      let noteDefaultTitle = 'Campus Director';

      if (signatories && signatories.length > 0) {
        const matchPrep = signatories.find(s => s.name?.toLowerCase().includes('mhel') || s.name?.toLowerCase().includes('garcia'));
        if (matchPrep) {
          prepDefaultId = matchPrep.signatory_id;
          prepDefaultName = matchPrep.name;
          prepDefaultTitle = matchPrep.position;
        } else {
          prepDefaultId = signatories[0].signatory_id;
          prepDefaultName = signatories[0].name;
          prepDefaultTitle = signatories[0].position;
        }

        const matchNote = signatories.find(s => s.name?.toLowerCase().includes('marissa') || s.name?.toLowerCase().includes('ferrer'));
        if (matchNote) {
          noteDefaultId = matchNote.signatory_id;
          noteDefaultName = matchNote.name;
          noteDefaultTitle = matchNote.position;
        } else if (signatories.length > 1) {
          noteDefaultId = signatories[1].signatory_id;
          noteDefaultName = signatories[1].name;
          noteDefaultTitle = signatories[1].position;
        }
      }

      setPreparedSignatoryId(prepDefaultId);
      setPreparedByName(prepDefaultName);
      setPreparedByTitle(prepDefaultTitle);

      setNotedSignatoryId(noteDefaultId);
      setNotedByName(noteDefaultName);
      setNotedByTitle(noteDefaultTitle);

      if (documentTypes && documentTypes.length) setSelectedDocType(documentTypes[0]);
    }
  }, [isOpen, documentTypes, signatories]);

  if (!isOpen) return null;

  const parseDate = (val) => {
    if (!val) return null;
    const parts = String(val).split('-');
    if (parts.length < 2) return null;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    if (!Number.isFinite(y) || !Number.isFinite(m)) return null;
    const dateObj = new Date(y, m - 1, 1, 0, 0, 0, 0);
    return { y, m, d: 1, raw: dateObj };
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
    
    // If one is selected but not both, error. Both empty means "All Time".
    if ((start && !end) || (!start && end)) {
      setToastError('Please select both From and To months.');
      return;
    }
    if (selectedDocType === 'CERTIFICATION' && !selectedCertification) {
      setToastError('Please select a certification type.');
      return;
    }

    let s = null;
    let e = null;
    if (start && end) {
      s = parseDate(start);
      e = parseDate(end);
      if (!s || !e) { setToastError('Please select valid start and end months.'); return; }
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      if (s.raw > todayEnd || e.raw > todayEnd) { setToastError('Selected months cannot be in the future.'); return; }
      const count = monthsBetweenInclusive(s, e);
      if (count <= 0) { setToastError('End month must be the same month or after start month.'); return; }
      if (maxMonths && count > maxMonths) { setToastError(`Range must not exceeds ${maxMonths} months.`); return; }
    }

    const options = { preparedByName, preparedByTitle, notedByName, notedByTitle };
    // Pass the certification type only for certification exports.
    const params = selectedDocType === 'CERTIFICATION'
      ? [start, end, selectedDocType, selectedCertification, options]
      : [start, end, selectedDocType, null, options];

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
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className={`relative z-50 w-full max-w-2xl my-4 sm:my-8 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] 
        overflow-y-auto border flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200 
        ${isDark ? 'bg-[#242526] border-[#3e4042] text-[#e4e6eb]' : 'bg-white border-[#800000]/20 text-gray-900'}`}>
        <div className={`px-6 py-6 border-b-4 shrink-0 ${isDark ? 'bg-[#1f1f1f] border-[#b98b00]' : 'bg-[#800000] border-[#FFD700]'}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl text-white font-black uppercase tracking-tighter">Export Report</h3>
            <button onClick={onClose} className="p-2 rounded hover:opacity-90 shrink-0">
              <XMarkIcon className={`w-6 h-6 ${isDark ? 'text-[#e4e6eb]' : 'text-white'}`} />
            </button>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto px-8 py-8 space-y-6 ${isDark ? 'text-[#e4e6eb]' : 'text-[#4a0000]'}`}>
          <p className="text-sm mb-4">
            Select the start and end month for the report{maxMonths ? ` (maximum ${maxMonths} months)` : ''}.
          </p>

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

          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <label className={`text-[10px] font-semibold uppercase tracking-widest ${isDark ? 'text-[#6b6c6e]' : 'text-gray-400'}`}>From</label>
              <input
                type="month"
                value={start}
                onChange={(e) => { setStart(e.target.value); setActivePreset(''); }}
                max={todayMonthStr}
                className={`text-xs px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-colors ${isDark ? 'bg-[#2d2e30] border-[#4e4f50] text-[#e4e6eb] focus:ring-[#800000]/50' : 'bg-white border-gray-300 text-gray-700 focus:ring-[#800000]/30'}`}
              />
            </div>
            <span className={`mb-2 text-xs font-medium ${isDark ? 'text-[#6b6c6e]' : 'text-gray-400'}`}>→</span>
            <div className="flex flex-col gap-1 flex-1">
              <label className={`text-[10px] font-semibold uppercase tracking-widest ${isDark ? 'text-[#6b6c6e]' : 'text-gray-400'}`}>To</label>
              <input
                type="month"
                value={end}
                onChange={(e) => { setEnd(e.target.value); setActivePreset(''); }}
                min={start || undefined}
                max={todayMonthStr}
                className={`text-xs px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-colors ${isDark ? 'bg-[#2d2e30] border-[#4e4f50] text-[#e4e6eb] focus:ring-[#800000]/50' : 'bg-white border-gray-300 text-gray-700 focus:ring-[#800000]/30'}`}
              />
            </div>
          </div>

          {/* Signatory Options */}
          <div className="space-y-4 pt-4 border-t border-dashed border-gray-200 dark:border-[#3e4042]">
            <h4 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-[#800000]'}`}>
              Report Signatories
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Prepared By */}
              <div className="space-y-3">
                {signatories.length > 0 ? (
                  <DropdownGroup
                    label="Prepared By"
                    name="preparedSignatory"
                    value={preparedSignatoryId === 'custom' ? 'Custom / Manual Input' : (signatories.find(s => String(s.signatory_id) === String(preparedSignatoryId)) ? `${signatories.find(s => String(s.signatory_id) === String(preparedSignatoryId)).name} (${signatories.find(s => String(s.signatory_id) === String(preparedSignatoryId)).position})` : 'Custom / Manual Input')}
                    onChange={handlePreparedSignatoryChange}
                    options={[...signatories.map(s => `${s.name} (${s.position})`), 'Custom / Manual Input']}
                    labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
                  />
                ) : (
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[#e4e6eb]' : 'text-gray-600'}`}>Prepared By</label>
                )}

                {/* Conditional Custom Inputs for Prepared By */}
                {preparedSignatoryId === 'custom' && (
                  <div className="space-y-2 p-3 rounded-lg border border-gray-100 dark:border-[#3e4042] bg-gray-50/30 dark:bg-[#1a1b1c] animate-in slide-in-from-top-2 duration-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Custom Prepared Signatory</span>
                    <input
                      type="text"
                      value={preparedByName}
                      onChange={(e) => setPreparedByName(e.target.value)}
                      placeholder="Signatory Name"
                      className={`text-xs px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-colors w-full ${isDark ? 'bg-[#2d2e30] border-[#4e4f50] text-[#e4e6eb] focus:ring-[#800000]/50' : 'bg-white border-gray-300 text-gray-700 focus:ring-[#800000]/30'}`}
                    />
                    <input
                      type="text"
                      value={preparedByTitle}
                      onChange={(e) => setPreparedByTitle(e.target.value)}
                      placeholder="Title / Designation"
                      className={`text-xs px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-colors w-full ${isDark ? 'bg-[#2d2e30] border-[#4e4f50] text-[#e4e6eb] focus:ring-[#800000]/50' : 'bg-white border-gray-300 text-gray-700 focus:ring-[#800000]/30'}`}
                    />
                  </div>
                )}
              </div>

              {/* Noted By */}
              <div className="space-y-3">
                {signatories.length > 0 ? (
                  <DropdownGroup
                    label="Noted By"
                    name="notedSignatory"
                    value={notedSignatoryId === 'custom' ? 'Custom / Manual Input' : (signatories.find(s => String(s.signatory_id) === String(notedSignatoryId)) ? `${signatories.find(s => String(s.signatory_id) === String(notedSignatoryId)).name} (${signatories.find(s => String(s.signatory_id) === String(notedSignatoryId)).position})` : 'Custom / Manual Input')}
                    onChange={handleNotedSignatoryChange}
                    options={[...signatories.map(s => `${s.name} (${s.position})`), 'Custom / Manual Input']}
                    labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
                  />
                ) : (
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[#e4e6eb]' : 'text-gray-600'}`}>Noted By</label>
                )}

                {/* Conditional Custom Inputs for Noted By */}
                {notedSignatoryId === 'custom' && (
                  <div className="space-y-2 p-3 rounded-lg border border-gray-100 dark:border-[#3e4042] bg-gray-50/30 dark:bg-[#1a1b1c] animate-in slide-in-from-top-2 duration-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Custom Noted Signatory</span>
                    <input
                      type="text"
                      value={notedByName}
                      onChange={(e) => setNotedByName(e.target.value)}
                      placeholder="Signatory Name"
                      className={`text-xs px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-colors w-full ${isDark ? 'bg-[#2d2e30] border-[#4e4f50] text-[#e4e6eb] focus:ring-[#800000]/50' : 'bg-white border-gray-300 text-gray-700 focus:ring-[#800000]/30'}`}
                    />
                    <input
                      type="text"
                      value={notedByTitle}
                      onChange={(e) => setNotedByTitle(e.target.value)}
                      placeholder="Title / Designation"
                      className={`text-xs px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-colors w-full ${isDark ? 'bg-[#2d2e30] border-[#4e4f50] text-[#e4e6eb] focus:ring-[#800000]/50' : 'bg-white border-gray-300 text-gray-700 focus:ring-[#800000]/30'}`}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick-select presets */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className={`text-[10px] font-semibold uppercase tracking-widest mr-1 ${isDark ? 'text-[#6b6c6e]' : 'text-gray-400'}`}>
              Quick Range:
            </span>

            {[
              { label: 'Annual',      sublabel: '1 yr', preset: 'annual' },
              { label: 'Semi-Annual', sublabel: '6 mo', preset: 'semi'   },
              { label: 'This Month',  sublabel: '1 mo', preset: 'month'  },
              { label: 'All Time',    sublabel: '∞',    preset: 'all'    },
            ].map(({ label, sublabel, preset }) => {
              const isActive = activePreset === preset;
              return (
                <button
                  key={preset}
                  onClick={() => applyPreset(preset)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 border cursor-pointer
                    ${isActive
                      ? (isDark
                          ? 'bg-[#800000] border-[#9a0000] text-[#FFD700] shadow-sm'
                          : 'bg-[#800000] border-[#800000] text-[#FFD700] shadow-sm')
                      : (isDark
                          ? 'bg-[#2d2e30] border-[#3e4042] text-[#b0b3b8] hover:border-[#6b6c6e] hover:text-[#e4e6eb]'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-800')
                    }`}
                >
                  {label}
                  <span className={`text-[9px] font-normal px-1 py-0.5 rounded
                    ${isActive
                      ? 'bg-white/20 text-current'
                      : (isDark ? 'bg-[#3e4042] text-[#6b6c6e]' : 'bg-gray-100 text-gray-400')
                    }`}>
                    {sublabel}
                  </span>
                </button>
              );
            })}

            {/* Clear dates */}
            {(start || end) && (
              <button
                onClick={() => { setStart(''); setEnd(''); setActivePreset(''); }}
                className={`ml-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors border cursor-pointer
                  ${isDark
                    ? 'border-[#3e4042] text-[#6b6c6e] hover:text-[#b0b3b8] hover:border-[#6b6c6e]'
                    : 'border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'}`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            )}
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
                    ? 'bg-[#3a3b3c] text-[#8f949e] border-[#4e4f50] cursor-not-allowed'
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