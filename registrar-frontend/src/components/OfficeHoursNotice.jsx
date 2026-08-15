import React, { useEffect, useState } from 'react';
import { getBusinessHoursStatus } from '../services/api';

const formatDateTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila',
  });
};

/**
 * Tells the requester, right on the submission confirmation screen,
 * whether the Registrar is open right now and — if not — exactly when
 * processing on their request will begin.
 *
 * Fetches /business-hours/status itself on mount rather than receiving
 * it as a prop, so it can drop into any confirmation screen (student,
 * alumni) with zero changes to that screen's existing state/hooks. The
 * fetch happens the moment this renders, i.e. right at submission —
 * matching the "tell them immediately" decision, not a stale value
 * computed earlier in the form flow.
 *
 * Fails silently (renders nothing) on error — this is a supplementary
 * detail on top of an already-successful submission, not something
 * that should block or clutter the confirmation screen if the status
 * endpoint is unreachable.
 */
const OfficeHoursNotice = ({ isDark }) => {
  const [status, setStatus] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getBusinessHoursStatus()
      .then((res) => {
        if (!cancelled) setStatus(res.data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (failed || !status) return null;

  const baseClasses = 'w-full max-w-xl mx-auto rounded-xl border px-6 py-4 text-sm text-left leading-relaxed shadow-sm';

  if (status.is_open) {
    return (
      <div className={`${baseClasses} bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]`}>
        <strong>Our office is open right now</strong> (Mon–Fri, 8:00 AM–8:00 PM). Your request has been received and processing will begin today.
      </div>
    );
  }

  return (
    <div className={`${baseClasses} bg-[#FFFDF5] border-[#F5E3B5] text-[#78350F]`}>
      <strong>Our office is currently closed</strong> (open Mon–Fri, 8:00 AM–8:00 PM). Your request has already been received — processing will begin on{' '}
      <strong>{formatDateTime(status.next_open_at)}</strong>.
    </div>
  );
};

export default OfficeHoursNotice;
