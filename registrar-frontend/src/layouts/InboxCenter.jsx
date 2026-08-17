import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useLocation } from 'react-router-dom';
import VoiceSearchInput from '../components/VoiceSearchInput.jsx';
import { useNotificationsContext as useNotifications } from '../context/NotificationsContext';
import { useTheme } from '../context/ThemeContext';
import { InboxListSkeleton, InboxPreviewSkeleton } from '../components/LoadingSkeleton';
import { EnvelopeOpenIcon } from '@heroicons/react/24/outline';
import ClaimTicket from '../components/ClaimTicket';
// CATEGORY_MAP lives in src/constants/notificationCategories.js
// InboxCenter only uses the .category label from each entry.
import { CATEGORY_MAP } from '../constants/notificationCategories';

const formatTime = (isoString) => {
  if (!isoString) return '';
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(isoString).toLocaleDateString();
};

// -------------------------------------------------------
// Map a raw API notification → inbox display shape
// -------------------------------------------------------
const toMailItem = (n) => {
  const type = n.type || '';
  const title = n.title || '';

  let dotColor = null;
  if (
    type === 'request_forfeited' ||
    title.toLowerCase().includes('forfeited')
  ) {
    dotColor = 'bg-red-500';
  } else if (
    type.startsWith('reminder_') ||
    title.toLowerCase().includes('reminder')
  ) {
    dotColor = 'bg-yellow-500';
  } else if (
    type === 'request_submitted' ||
    type === 'announcement_sent' ||
    type === 'announcement_published' ||
    title.toLowerCase().includes('announcement') ||
    title.toLowerCase().includes('submitted')
  ) {
    dotColor = 'bg-blue-500';
  } else if (
    type === 'ready_to_claim' ||
    type === 'request_completed' ||
    type === 'admin_new_request' ||
    title.toLowerCase().includes('ready') ||
    title.toLowerCase().includes('completed') ||
    title.toLowerCase().includes('new request') ||
    title.toLowerCase().includes('new document request')
  ) {
    dotColor = 'bg-green-500';
  }

  return {
    id: n.id,
    from: n.title,
    email: 'no-reply@ris.local',
    subject: n.title,
    preview: n.message,
    category: CATEGORY_MAP[n.type]?.category ?? 'Notification',
    time: n.created_at,
    unread: n.is_unread ?? !n.read_at,
    dotColor,
    // Keep original for markAsRead and requirements checklist
    _raw: n,
  };
};

const InboxCenter = () => {
  const location = useLocation();
  const incomingNotificationId = location.state?.selectedNotificationId;
  const { isDark } = useTheme();

  const {
    notifications,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    markAsRead,
    dismiss,
  } = useNotifications();

  // Derive inbox list from real notifications
  const emails = useMemo(() => notifications.map(toMailItem), [notifications]);

  const [searchText, setSearchText] = useState('');
  const [selectedId, setSelectedId] = useState(incomingNotificationId ?? null);

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

  // ── Infinite-scroll setup ───────────────────────────────────────────────
  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { root, threshold: 0, rootMargin: '0px 0px 100px 0px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

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

              {/* IntersectionObserver sentinel — fires loadMore when the
                  user scrolls to the bottom of the list. scrollRef is the
                  container; sentinelRef is the invisible div at the bottom. */}
              <div
                ref={scrollRef}
                className="max-h-[60vh] lg:max-h-[calc(72vh-130px)] overflow-y-auto"
              >
                {loading ? (
                  <InboxListSkeleton isDark={isDark} count={6} />
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
                        className={`w-full text-left px-4 py-3 border-b border-gray-200 transition-colors ${isActive
                            ? (isDark ? 'bg-[#3a3b3c] text-[#e4e6eb] border-[#3e4042]' : 'bg-gray-100 text-gray-900')
                            : (isDark ? 'hover:bg-[#3a3b3c] text-[#e4e6eb] border-[#3e4042]' : 'hover:bg-gray-50 text-gray-800')
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {mail.dotColor && (
                              <span className={`w-2 h-2 rounded-full shrink-0 shadow shadow-black/30 ${mail.dotColor}`} />
                            )}
                            <p className="font-semibold text-sm truncate">{mail.from}</p>
                          </div>
                          <span className={`text-[11px] shrink-0 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
                            {formatTime(mail.time)}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 line-clamp-2 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>{mail.preview}</p>
                      </button>
                    );
                  })
                )}

                {/* Sentinel: observed by IntersectionObserver below.
                    When it enters the viewport, loadMore() is called. */}
                <div ref={sentinelRef} aria-hidden="true" />

                {loadingMore && (
                  <div className="opacity-50">
                    <InboxListSkeleton isDark={isDark} count={2} />
                  </div>
                )}
              </div>
            </aside>

            {/* ── RIGHT PANEL: preview / compose ── */}
            <section className={`flex flex-col max-h-[70vh] lg:max-h-[calc(72vh)] ${isDark ? 'bg-[#242526]' : 'bg-white'}`}>
              {loading ? (
                <InboxPreviewSkeleton isDark={isDark} />
              ) : selectedMail ? (
                <>
                  <header className={`px-4 md:px-6 py-4 border-b ${isDark ? 'border-[#3e4042] bg-[#242526]' : 'border-gray-200 bg-white'}`}>
                    <p className={`text-[11px] uppercase tracking-[0.2em] font-black ${isDark ? 'text-pup-yellow/70' : 'text-[#6D0000]/55'}`}>
                      Selected Inbox Message
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedMail.dotColor && (
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 shadow shadow-black/30 ${selectedMail.dotColor}`} />
                      )}
                      <h3 className={`text-lg md:text-xl font-bold leading-tight ${isDark ? 'text-[#e4e6eb]' : 'text-gray-900'}`}>
                        {selectedMail.subject}
                      </h3>
                    </div>
                    <p className={`text-sm mt-1 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}`}>
                      Date and Time: {formatTime(selectedMail.time)}
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
                            <span className={`font-semibold ${isDark ? 'text-[#e4e6eb]' : 'text-gray-900'}`}>Title:</span>{' '}
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
                          <p className={`text-[11px] font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-pup-yellow' : 'text-amber-700'}`}>
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

                      {/* ── Claim ticket ──
                            QR Code Claiming Policy v1.0 §3.2 access point 3
                            (inbox). uuid/claim_code are populated on both
                            the request_submitted notification (so the
                            ticket is available from day one, same as the
                            submit pop-up) and again on ready_to_claim (see
                            DocumentRequestService — submitRequest() and
                            notifyOwnerOfStatusChange()), so this renders on
                            whichever of those two messages the student
                            opens. Gating on field presence here — rather
                            than on selectedMail's type string — keeps this
                            in sync with the backend automatically if that
                            trigger list ever changes. ClaimTicket itself
                            also no-ops on missing props, so this is a
                            belt-and-suspenders check, not the only guard. */}
                      {selectedMail._raw?.uuid && selectedMail._raw?.claim_code && (
                        <div className={`rounded-lg border px-4 py-4 ${isDark ? 'border-[#3e4042] bg-[#242526]' : 'border-gray-200 bg-white'}`}>
                          <p className={`text-[11px] font-semibold uppercase tracking-widest mb-3 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
                            Your Claim Ticket
                          </p>
                          <div className="flex justify-center">
                            <ClaimTicket
                              uuid={selectedMail._raw.uuid}
                              claimCode={selectedMail._raw.claim_code}
                            />
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8">
                  <div className={`w-24 h-24 mb-6 flex items-center justify-center rounded-full transition-colors ${isDark ? 'bg-[#3a3b3c]/40' : 'bg-gray-100'}`}>
                    <EnvelopeOpenIcon className={`w-12 h-12 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'}`} />
                  </div>

                  <h3 className={`text-lg font-bold mb-2 tracking-tight ${isDark ? 'text-[#e4e6eb]' : 'text-gray-800'}`}>
                    No Message Selected
                  </h3>

                  <p className={`text-sm text-center max-w-xs leading-relaxed ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
                    Select a conversation from the sidebar to read its contents and view your requirements checklist.
                  </p>
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