import { useNavigate, useLocation } from 'react-router-dom';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { useToast } from '../context/NotificationToastContext';

// -------------------------------------------------------
// CATEGORY_MAP — mirrors NotificationModal.jsx exactly
// -------------------------------------------------------
const CATEGORY_MAP = {
    request_submitted:          { category: 'Submitted',   color: 'bg-blue-400' },
    payment_verified:           { category: 'Payment',     color: 'bg-green-400' },
    payment_invalid:            { category: 'Payment',     color: 'bg-rose-600' },
    status_updated:             { category: 'Update',      color: 'bg-blue-400' },
    request_processing:         { category: 'Processing',  color: 'bg-blue-400' },
    action_needed:              { category: 'Action',      color: 'bg-rose-600' },
    ready_to_claim:             { category: 'Ready',       color: 'bg-green-400' },
    request_completed:          { category: 'Completed',   color: 'bg-green-400' },
    request_forfeited:          { category: 'Forfeited',   color: 'bg-rose-600' },
    reminder_claim:             { category: 'Reminder',    color: 'bg-pup-yellow' },
    reminder_final_warning:     { category: 'Warning',     color: 'bg-rose-600' },
    request_closed:             { category: 'Closed',      color: 'bg-white/40' },
    request_auto_archived:      { category: 'Archived',    color: 'bg-white/40' },
    admin_new_request:          { category: 'Important',   color: 'bg-rose-600' },
    admin_payment_verification: { category: 'Payment',     color: 'bg-pup-yellow' },
    admin_incomplete_request:   { category: 'Incomplete',  color: 'bg-rose-600' },
    admin_deadline_warning:     { category: 'Deadline',    color: 'bg-pup-yellow' },
};

// -------------------------------------------------------
// SingleToast
// -------------------------------------------------------
const SingleToast = ({ toast, onDismiss }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const meta = CATEGORY_MAP[toast.type] ?? { category: 'Notification', color: 'bg-blue-400' };

    const handleClick = () => {
        onDismiss(toast.id);

        if (!toast.request_id) return;

        const roleRoot      = location.pathname.split('/')[1];
        const validRoles    = ['student', 'alumni', 'staff', 'super-admin'];
        const targetRole    = validRoles.includes(roleRoot) ? roleRoot : 'student';

        navigate(`/${targetRole}/inbox`, {
            state: { selectedNotificationId: toast.id, notification: toast },
        });
    };

    return (
        <div
            className="
                flex items-start gap-3 w-full
                bg-pup-dark-maroon border border-white/10
                rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]
                px-4 py-3 cursor-pointer
                animate-in slide-in-from-right-4 fade-in duration-300
                hover:border-white/20 transition-colors group
            "
            onClick={handleClick}
        >
            {/* Color dot */}
            <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ring-4 ring-black/20 ${meta.color}`} />

            {/* Text */}
            <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-pup-yellow mb-0.5">
                    {meta.category}
                </p>
                <p className="text-[12px] font-bold text-white leading-snug truncate">
                    {toast.title}
                </p>
                <p className="text-[11px] text-white/60 leading-normal line-clamp-2 mt-0.5">
                    {toast.message}
                </p>
            </div>

            {/* Dismiss button */}
            <button
                onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
                className="shrink-0 mt-0.5 p-0.5 rounded-full hover:bg-white/10 transition-colors"
            >
                <XMarkIcon className="w-3.5 h-3.5 text-white/40 hover:text-white/80 transition-colors" />
            </button>
        </div>
    );
};

// -------------------------------------------------------
// NotificationToast — the fixed stack container
// Positioned bottom-right, renders up to 3 toasts
// -------------------------------------------------------
const NotificationToast = () => {
    const { toasts, dismissToast } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-26 lg:top-30 md:top-30 right-3 lg:right-5 md:right-5 z-9999 flex flex-col gap-2 w-[min(340px,calc(100vw-2rem))] pointer-events-none">
            {toasts.map(toast => (
                <div key={toast.id} className="pointer-events-auto">
                    <SingleToast toast={toast} onDismiss={dismissToast} />
                </div>
            ))}
        </div>
    );
};

export default NotificationToast;
