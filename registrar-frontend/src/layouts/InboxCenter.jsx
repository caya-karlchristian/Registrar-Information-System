import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useLocation } from 'react-router-dom';
import VoiceSearchInput from '../components/VoiceSearchInput.jsx';
import { useNotificationsContext as useNotifications } from '../context/NotificationsContext';
import { useTheme } from '../context/ThemeContext';

// -------------------------------------------------------
// Maps backend trigger_event → human-readable category
// -------------------------------------------------------
const CATEGORY_MAP = {
  request_submitted:          'Submitted',
  payment_verified:           'Payment',
  payment_invalid:            'Payment',
  status_updated:             'Update',
  request_processing:         'Processing',
  action_needed:              'Action',
  ready_to_claim:             'Ready',
  request_completed:          'Completed',
  request_forfeited:          'Forfeited',
  reminder_claim:             'Reminder',
  reminder_final_warning:     'Warning',
  request_closed:             'Closed',
  request_auto_archived:      'Archived',
  admin_new_request:          'Important',
  admin_payment_verification: 'Payment',
  admin_incomplete_request:   'Incomplete',
  admin_deadline_warning:     'Deadline',
};

const formatTime = (isoString) => {
  if (!isoString) return '';
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(isoString).toLocaleDateString();
};

// -------------------------------------------------------
// Map a raw API notification → inbox display shape
// -------------------------------------------------------
const toMailItem = (n) => ({
  id:      n.id,
  from:    n.title,
  email:   'no-reply@ris.local',
  subject: n.title,
  preview: n.message,
  category: CATEGORY_MAP[n.type] ?? 'Notification',
  time:    n.created_at,
  unread:  n.is_unread ?? !n.read_at,
  // Keep original for markAsRead and requirements checklist
  _raw: n,
});

const InboxCenter = () => {
  const location = useLocation();
  const incomingNotificationId = location.state?.selectedNotificationId;
  const { isDark } = useTheme();

  const {
    notifications,
    loading,
    markAsRead,
    dismiss,
  } = useNotifications();

  // Derive inbox list from real notifications
  const emails = useMemo(() => notifications.map(toMailItem), [notifications]);

  const [searchText,      setSearchText]      = useState('');
  const [selectedId,      setSelectedId]      = useState(incomingNotificationId ?? null);

  // Auto-select first email once loaded (or the one coming from toast/modal click)
  useEffect(() => {
    if (!selectedId && emails.length > 0) {
      setSelectedId(emails[0].id);
    }
  }, [emails]);

  // Auto-select incoming notification from toast/bell click
  useEffect(() => {
    if (incomingNotificationId) {
      setSelectedId(incomingNotificationId);
    }
  }, [incomingNotificationId]);

  const filteredEmails = useMemo(() => {
    const key = searchText.trim().toLowerCase();
    if (!key) return emails;
    return emails.filter(
      (m) =>
        m.from.toLowerCase().includes(key) ||
        m.subject.toLowerCase().includes(key) ||
        m.preview.toLowerCase().includes(key)
    );
  }, [emails, searchText]);

  const selectedMail = emails.find((m) => m.id === selectedId) ?? filteredEmails[0] ?? null;

  useEffect(() => {
    if (!selectedMail) return;
  }, [selectedMail?.id]);

  const handleSelectMail = async (mailId) => {
    setSelectedId(mailId);
    // Mark as read on the backend
    const mail = emails.find((m) => m.id === mailId);
    if (mail?.unread) {
      await markAsRead(mailId);
    }
  };

  return (
    <>
      <div className="w-full max-w-6xl mx-auto px-4">
        <div className={`overflow-hidden rounded-xl border shadow-sm ${isDark ? 'border-[#3e4042] bg-[#242526]' : 'border-gray-200 bg-white'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] min-h-[70vh]">

            {/* ── LEFT PANEL: inbox list ── */}
            <aside className={`border-r ${isDark ? 'border-[#3e4042] bg-[#242526]' : 'border-gray-200 bg-white'}`}>
              <div className={`px-4 py-4 border-b ${isDark ? 'border-[#3e4042]' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className={`text-lg font-bold ${isDark ? 'text-[#e4e6eb]' : 'text-gray-900'}`}>Inbox</h2>
                </div>
                <p className={`text-xs mt-1 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>Select a message to view preview details.</p>
              </div>

              <div className={`p-3 border-b ${isDark ? 'border-[#3e4042]' : 'border-gray-200'}`}>
                <VoiceSearchInput
                  value={searchText}
                  onChange={setSearchText}
                  placeholder="Search"
                  language="en-US"
                />
              </div>

              <div className="max-h-[60vh] lg:max-h-[calc(72vh-130px)] overflow-y-auto">
                {loading ? (
                  <div className={`p-8 text-center text-sm animate-pulse ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'}`}>
                    Loading notifications…
                  </div>
                ) : filteredEmails.length === 0 ? (
                  <div className={`p-8 text-center text-sm ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
                    No messages found.
                  </div>
                ) : (
                  filteredEmails.map((mail) => {
                    const isActive = selectedMail?.id === mail.id;
                    return (
                      <button
                        key={mail.id}
                        onClick={() => handleSelectMail(mail.id)}
                        className={`w-full text-left px-4 py-3 border-b border-gray-200 transition-colors ${
                          isActive
                            ? (isDark ? 'bg-[#3a3b3c] text-[#e4e6eb] border-[#3e4042]' : 'bg-gray-100 text-gray-900')
                            : (isDark ? 'hover:bg-[#3a3b3c] text-[#e4e6eb] border-[#3e4042]' : 'hover:bg-gray-50 text-gray-800')
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm truncate">{mail.from}</p>
                          <span className={`text-[11px] shrink-0 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
                            {formatTime(mail.time)}
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-[#e4e6eb]' : 'text-gray-700'}`}>{mail.subject}</p>
                        <p className={`text-xs mt-1 line-clamp-2 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>{mail.preview}</p>
                        {mail.unread && !isActive && (
                          <span className={`inline-block mt-2 text-[10px] font-semibold ${isDark ? 'text-[#e4e6eb]' : 'text-gray-700'}`}>
                            Unread
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            {/* ── RIGHT PANEL: preview / compose ── */}
            <section className={`flex flex-col ${isDark ? 'bg-[#242526]' : 'bg-white'}`}>
              {selectedMail ? (
                <>
                  <header className={`px-4 md:px-6 py-4 border-b ${isDark ? 'border-[#3e4042] bg-[#242526]' : 'border-gray-200 bg-white'}`}>
                    <p className={`text-[11px] uppercase tracking-[0.2em] font-black ${isDark ? 'text-pup-yellow/70' : 'text-[#6D0000]/55'}`}>
                      Selected Inbox Message
                    </p>
                    <h3 className={`text-lg md:text-xl font-bold leading-tight mt-1 ${isDark ? 'text-[#e4e6eb]' : 'text-gray-900'}`}>
                      {selectedMail.subject}
                    </h3>
                    <p className={`text-sm mt-1 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}`}>
                      Date: {formatTime(selectedMail.time)}
                    </p>
                  </header>

                  <div className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-4 ${isDark ? 'bg-[#1a1b1e]' : 'bg-gray-50'}`}>
                    <div className="space-y-4">

                        {/* ── Message body ── */}
                        <div className={`rounded-lg border px-4 py-4 ${isDark ? 'border-[#3e4042] bg-[#242526]' : 'border-gray-200 bg-white'}`}>
                          <p className={`text-[11px] font-semibold uppercase tracking-widest mb-2 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
                            Message Preview
                          </p>
                          <div className="space-y-2">
                            <p className={`text-sm ${isDark ? 'text-[#b0b3b8]' : 'text-gray-700'}`}>
                              <span className={`font-semibold ${isDark ? 'text-[#e4e6eb]' : 'text-gray-900'}`}>Sender:</span>{' '}
                              {selectedMail.from}
                            </p>
                            <p className={`text-sm ${isDark ? 'text-[#b0b3b8]' : 'text-gray-700'}`}>
                              <span className={`font-semibold ${isDark ? 'text-[#e4e6eb]' : 'text-gray-900'}`}>Date:</span>{' '}
                              {formatTime(selectedMail.time)}
                            </p>
                            <p className={`text-sm leading-relaxed ${isDark ? 'text-[#b0b3b8]' : 'text-gray-700'}`}>
                              <span className={`font-semibold ${isDark ? 'text-[#e4e6eb]' : 'text-gray-900'}`}>Message:</span>{' '}
                              {selectedMail.preview}
                            </p>
                          </div>
                        </div>

                        {/* ── Requirements checklist (request_submitted only) ── */}
                        {selectedMail._raw?.requirements?.length > 0 && (
                          <div className={`rounded-lg border px-4 py-4 ${isDark ? 'border-[#5d4c17] bg-[#1a1b1e]' : 'border-amber-200 bg-amber-50'}`}>
                            <p className={`text-[11px] font-semibold uppercase tracking-widest mb-3 ${isDark ? 'text-pup-yellow' : 'text-amber-700'}`}>
                              Requirements Checklist
                            </p>
                            <p className={`text-xs mb-4 ${isDark ? 'text-[#e4e6eb]' : 'text-amber-800'}`}>
                              Please prepare the following for each item in your request before visiting the Registrar's Office.
                            </p>
                            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                              {selectedMail._raw.requirements.map((req, idx) => (
                                <div key={idx} className={`rounded-md border px-3 py-3 ${isDark ? 'border-[#3e4042] bg-[#242526]' : 'border-amber-200 bg-white'}`}>
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <p className={`text-sm font-semibold ${isDark ? 'text-[#e4e6eb]' : 'text-gray-900'}`}>{req.item}</p>
                                    <div className="flex gap-2 shrink-0">
                                      {req.copies > 1 && (
                                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDark ? 'bg-[#3a3b3c] text-[#e4e6eb]' : 'bg-gray-100 text-gray-600'}`}>
                                          {req.copies}x copies
                                        </span>
                                      )}
                                      {req.process_days && (
                                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDark ? 'bg-[#3a3b3c] text-pup-yellow' : 'bg-blue-100 text-blue-700'}`}>
                                          {req.process_days}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <p className={`text-xs leading-relaxed whitespace-pre-line ${isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}`}>
                                    {req.requirements}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                  </div>
                </>
              ) : (
                <div className={`h-full flex items-center justify-center ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
                  <div className="text-center px-4">
                    <ArrowLeftIcon className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'}`} />
                    <p className="font-medium">
                      {loading
                        ? 'Loading your notifications…'
                        : 'Select a message from the inbox to view details.'}
                    </p>
                  </div>
                </div>
              )}
            </section>

          </div>
        </div>
      </div>
    </>
  );
};

export default InboxCenter;
