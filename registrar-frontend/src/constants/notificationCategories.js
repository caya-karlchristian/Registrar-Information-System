// src/constants/notificationCategories.js
// -------------------------------------------------------
// Single source of truth for notification category labels
// and their badge colors. Both NotificationModal and
// NotificationToast import from here.
//
// To add a new trigger_event: add one entry here only.
// -------------------------------------------------------
export const CATEGORY_MAP = {
  // Student / Alumni
  request_submitted:          { category: 'Submitted',   color: 'bg-blue-400' },
  payment_verified:            { category: 'Payment',     color: 'bg-green-400' },
  payment_invalid:             { category: 'Payment',     color: 'bg-rose-600' },
  status_updated:              { category: 'Update',      color: 'bg-blue-400' },
  request_processing:          { category: 'Processing',  color: 'bg-blue-400' },
  action_needed:               { category: 'Action',      color: 'bg-rose-600' },
  ready_to_claim:              { category: 'Ready',       color: 'bg-green-400' },
  request_completed:           { category: 'Completed',   color: 'bg-green-400' },
  request_forfeited:           { category: 'Forfeited',   color: 'bg-rose-600' },
  reminder_claim:              { category: 'Reminder',    color: 'bg-pup-yellow' },
  reminder_final_warning:      { category: 'Warning',     color: 'bg-rose-600' },
  request_closed:              { category: 'Closed',      color: 'bg-white/40' },
  request_auto_archived:       { category: 'Archived',    color: 'bg-white/40' },
  // Announcements — broadcast by admins to all users
  announcement_sent:           { category: 'Announcement', color: 'bg-purple-400' },

  // Admin
  admin_new_request:           { category: 'Important',   color: 'bg-rose-600' },
  admin_payment_verification:  { category: 'Payment',     color: 'bg-pup-yellow' },
  admin_incomplete_request:    { category: 'Incomplete',  color: 'bg-rose-600' },
  admin_deadline_warning:      { category: 'Deadline',    color: 'bg-pup-yellow' },
};
