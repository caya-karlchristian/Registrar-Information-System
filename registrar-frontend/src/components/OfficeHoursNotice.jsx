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
 */
const OfficeHoursNotice = ({ isDark, small = false }) => {
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

  const containerClasses = `flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
    small ? 'gap-3 p-4 sm:p-5 rounded-xl border' : 'gap-4 p-6 rounded-2xl border'
  } ${
    isDark
      ? 'bg-[#1e1e1e] border-[#333333] shadow-[0_8px_30px_rgb(0,0,0,0.4)] text-zinc-400'
      : 'bg-white border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.06)] text-gray-700'
  }`;

  return (
    <div className={containerClasses} style={{ minWidth: '280px', maxWidth: small ? '420px' : '540px' }}>
      {/* Decorative top gold/maroon accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#800000] via-[#FFC72C] to-[#800000]" />

      {/* Details container */}
      <div className="flex flex-col gap-2 mt-1">
        <div className="flex flex-col gap-1 text-left">
          <span className={`font-extrabold uppercase tracking-[0.15em] text-[#8C6239] ${
            small ? 'text-[10px] sm:text-[11px]' : 'text-[11px]'
          }`}>
            OFFICE SCHEDULE
          </span>
          <h4 className={`font-black text-gray-900 dark:text-white mt-1 mb-1 ${
            small ? 'text-sm sm:text-base' : 'text-base'
          }`}>
            Office is {status.is_open ? (
              <span className="text-green-600">OPEN</span>
            ) : (
              <span className="text-red-600">CLOSED</span>
            )}
          </h4>
        </div>
        <p className={`leading-relaxed text-left text-gray-500 dark:text-zinc-400 ${
          small ? 'text-[10px] sm:text-[11px]' : 'text-[11px]'
        }`}>
          {status.is_open ? (
            '(Mon: Work From Home, Tue–Fri: 8:00 AM–8:00 PM). Your request has been received and processing will begin today.'
          ) : (
            <>
              (Mon: Work From Home, Tue–Fri: 8:00 AM–8:00 PM). Your request has already been received — processing will begin on{' '}
              <span className="font-bold text-gray-950 dark:text-white">{formatDateTime(status.next_open_at)}</span>.
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default OfficeHoursNotice;
