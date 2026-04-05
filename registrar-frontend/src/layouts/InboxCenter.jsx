import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { useLocation } from 'react-router-dom';
import ErrorToast from '../components/ErrorToast.jsx';
import VoiceSearchInput from '../components/VoiceSearchInput.jsx';
import InputGroup from '../components/InputGroup.jsx';
import VoiceTextareaInput from '../components/VoiceTextareaInput.jsx';
import SuccessToast from '../components/SuccessToast.jsx';

// Note: This is a simulated inbox for demonstration purposes. In a real application, data would be fetched from an API.
const defaultInbox = [
  {
    id: 1,
    from: 'Juan Dela Cruz',
    email: 'juan.delacruz@student.pup.edu.ph',
    subject: 'Transcript of Records Request',
    preview: 'Submitted a new Transcript of Records request and attached payment reference.',
    category: 'Important',
    time: '2m ago',
    unread: true,
    thread: [
      {
        id: '1-a',
        sender: 'Juan Dela Cruz',
        isMe: false,
        text: 'Good day. I submitted my Transcript of Records request and attached my payment details. Please confirm if you received it.',
        time: 'Today, 8:41 AM',
      },
    ],
  },
  {
    id: 2,
    from: 'Maria Garcia',
    email: 'maria.garcia@alumni.pup.edu.ph',
    subject: 'Overdue Good Moral Certificate',
    preview: 'Document "Good Moral Certificate" is now overdue. Requesting guidance on next steps.',
    category: 'Reminder',
    time: '1h ago',
    unread: true,
    thread: [
      {
        id: '2-a',
        sender: 'Maria Garcia',
        isMe: false,
        text: 'My Good Moral Certificate request is overdue on the tracker. May I ask for the latest status and if any requirement is missing?',
        time: 'Today, 7:36 AM',
      },
    ],
  },
  {
    id: 3,
    from: 'System Update',
    email: 'no-reply@ris.local',
    subject: 'Weekly Analytics Report Available',
    preview: 'Weekly analytics report for February is now available in the dashboard.',
    category: 'System',
    time: '5h ago',
    unread: false,
    thread: [
      {
        id: '3-a',
        sender: 'System Update',
        isMe: false,
        text: 'The weekly analytics report for February is now available in your dashboard insights panel.',
        time: 'Today, 3:12 AM',
      },
    ],
  },
];

const InboxCenter = () => {
  const location = useLocation();
  const incomingNotification = location.state?.notification;
  const selectedNotificationId = location.state?.selectedNotificationId;

  // Initialize inbox with incoming notification 
  const initialInbox = useMemo(() => {
    if (!incomingNotification) return defaultInbox;

    // Prevent duplicate notification if it already exists in the default inbox
    const exists = defaultInbox.some((mail) => mail.id === incomingNotification.id);
    if (exists) return defaultInbox;

    //Checks if the incoming notification (NotificationModal.jsx)
    return [
      {
        id: incomingNotification.id,
        from: incomingNotification.title,
        email: 'no-reply@ris.local',
        subject: incomingNotification.title,
        preview: incomingNotification.message,
        category: incomingNotification.type,
        time: incomingNotification.created_at,
        unread: false,
        thread: [
          {
            id: `${incomingNotification.id}-a`,
            sender: incomingNotification.title,
            isMe: false,
            text: incomingNotification.message,
            time: 'Just now',
          },
        ],
      },
      ...defaultInbox,
    ];
  }, [incomingNotification]);

  const [emails, setEmails] = useState(initialInbox);
  const [searchText, setSearchText] = useState('');
  const [selectedId, setSelectedId] = useState(selectedNotificationId || initialInbox[0]?.id || null);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeStatus, setComposeStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [rightPanelMode, setRightPanelMode] = useState('preview');

  const openComposeMode = () => {
    setComposeTo('');
    setComposeSubject('');
    setComposeMessage('');
    setComposeStatus('');
    setErrorMessage('');
    setRightPanelMode('compose');
  };

  // Filter emails based on search text
  const filteredEmails = useMemo(() => {
    const key = searchText.trim().toLowerCase();
    if (!key) return emails;

    return emails.filter(
      (mail) =>
        mail.from.toLowerCase().includes(key) ||
        mail.subject.toLowerCase().includes(key) ||
        mail.preview.toLowerCase().includes(key)
    );
  }, [emails, searchText]);

  const selectedMail = emails.find((mail) => mail.id === selectedId) || filteredEmails[0] || null;

  useEffect(() => {
    if (!selectedMail) return;

    setRightPanelMode('preview');
    setComposeTo('');
    setComposeSubject('');
    setComposeMessage('');
    setComposeStatus('');
    setErrorMessage('');
  }, [selectedMail?.id]);

  const handleSelectMail = (mailId) => {
    setSelectedId(mailId);
    setRightPanelMode('preview');
    setEmails((prev) => prev.map((mail) => (mail.id === mailId ? { ...mail, unread: false } : mail)));
  };

  const handleComposeFieldChange = (e) => {
    const { name, value } = e.target;

    if (name === 'composeTo') setComposeTo(value);
    if (name === 'composeSubject') setComposeSubject(value);
  };

  const handleSendEmail = () => {
    if (!selectedMail) return;

    const toValue = composeTo.trim();
    const subjectValue = composeSubject.trim();
    const messageValue = composeMessage.trim();
    const gmailRegex = /^[^\s@]+@gmail\.com$/i;

    if (!gmailRegex.test(toValue)) {
      setErrorMessage('Please enter a valid Gmail address.');
      return;
    }

    if (!subjectValue || !messageValue) {
      setErrorMessage('Subject and message are required before sending.');
      return;
    }

    setErrorMessage('');
    setComposeStatus(`Email sent to ${toValue}.`);
    setComposeMessage('');
  };

  return (
    <>
    <SuccessToast message={composeStatus} onClose={() => setComposeStatus('')} />
      <ErrorToast message={errorMessage} onClose={() => setErrorMessage('')} />

      <div className="w-full max-w-6xl mx-auto px-4">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] min-h-[70vh]">
          <aside className="border-r border-gray-200 bg-white">
            <div className="px-4 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-gray-900 text-lg font-bold">Inbox</h2>
                <button
                  onClick={openComposeMode}
                  className="inline-flex items-center gap-1 rounded-md bg-pup-dark-maroon px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#510400]"
                >
                  <PaperAirplaneIcon className="w-3.5 h-3.5" />
                  Compose Email
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Select a message to view preview details.</p>
            </div>

            <div className="p-3 border-b border-gray-200">
              <VoiceSearchInput
                value={searchText}
                onChange={setSearchText}
                placeholder="Search "
                language="en-US"
              />
            </div>

            <div className="max-h-[60vh] lg:max-h-[calc(72vh-130px)] overflow-y-auto">
              {filteredEmails.map((mail) => {
                const isActive = selectedMail?.id === mail.id;

                return (
                  <button
                    key={mail.id}
                    onClick={() => handleSelectMail(mail.id)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-200 transition-colors ${
                      isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'hover:bg-gray-50 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm">{mail.from}</p>
                      <span className="text-[11px] text-gray-500">{mail.time}</span>
                    </div>
                    <p className="text-xs mt-0.5 text-gray-700">{mail.subject}</p>
                    <p className="text-xs mt-1 line-clamp-2 text-gray-500">{mail.preview}</p>
                    {mail.unread && !isActive && <span className="inline-block mt-2 text-[10px] font-semibold text-gray-700">Unread</span>}
                  </button>
                );
              })}

              {!filteredEmails.length && (
                <div className="p-8 text-center text-gray-500 text-sm">No messages found.</div>
              )}
            </div>
          </aside>

          <section className="flex flex-col bg-white">
            {selectedMail ? (
              <>
                {rightPanelMode === 'preview' && (
                  <header className="px-4 md:px-6 py-4 border-b border-gray-200 bg-white">
                    <p className="text-[11px] uppercase tracking-[0.2em] font-black text-[#6D0000]/55">Selected Inbox Message</p>
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 leading-tight mt-1">{selectedMail.subject}</h3>
                    <p className="text-sm text-gray-600 mt-1">From {selectedMail.from} | {selectedMail.time}</p>
                  </header>
                )}

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gray-50">
                  {rightPanelMode === 'preview' ? (
                    <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 mb-2">Message Preview</p>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-700"><span className="font-semibold text-gray-900">Sender:</span> {selectedMail.from}</p>
                        <p className="text-sm text-gray-700"><span className="font-semibold text-gray-900">Time:</span> {selectedMail.time}</p>
                        <p className="text-sm text-gray-700 leading-relaxed"><span className="font-semibold text-gray-900">Preview:</span> {selectedMail.preview}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden min-h-140">
                      <div className="px-4 py-3 bg-gray-100 text-gray-900 text-sm font-semibold">Compose Email</div>
                      <div className="px-4 md:px-5 py-4 space-y-3">
                        <InputGroup
                          label="To"
                          name="composeTo"
                          type="email"
                          value={composeTo}
                          onChange={handleComposeFieldChange}
                          placeholder="example@gmail.com"
                          labelColor="text-gray-600"
                          voiceEnabled
                          language="en-US"
                        />

                        <InputGroup
                          label="Subject"
                          name="composeSubject"
                          type="text"
                          value={composeSubject}
                          onChange={handleComposeFieldChange}
                          placeholder="Write subject"
                          labelColor="text-gray-600"
                          voiceEnabled
                          language="en-US"
                        />

                        <VoiceTextareaInput
                          id="compose-message"
                          label="Message"
                          value={composeMessage}
                          onChange={setComposeMessage}
                          placeholder="Type your message here..."
                          language="en-US"
                          minHeightClass="min-h-64"
                        />

                        <div className="flex items-center justify-between gap-3">
                          <button
                            onClick={handleSendEmail}
                            className="inline-flex items-center gap-1.5 rounded-md bg-pup-dark-maroon px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#510400]"
                          >
                            <PaperAirplaneIcon className="w-4 h-4" />
                            Send Email
                          </button>
                          <button
                            onClick={() => setRightPanelMode('preview')}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                          >
                            Back To Preview
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center px-4">
                  <ArrowLeftIcon className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                  <p className="font-medium">Select a message from the inbox to view details.</p>
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
