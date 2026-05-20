#!/usr/bin/env python3
"""
fix_notifications_followup.py
==============================
Run from the project ROOT (the directory that contains
registrar-backend/ and registrar-frontend/).

NOTE: Run fix_notifications.py first if you haven't already.
      This script assumes those patches are applied.

Applies two follow-up fixes:

  FIX 1 – NotificationType cache observer
           The NotificationType cache introduced in fix_notifications.py
           has a 6-hour TTL but no invalidation trigger. If an admin edits
           a notification template title or message via the UI, the stale
           cached value bakes into every broadcast for up to 6 hours.

           This fix creates app/Observers/NotificationTypeObserver.php and
           registers it in AppServiceProvider::boot(). The observer calls
           Cache::forget("notif_type:{trigger_event}") on saved and deleted,
           so any admin edit takes effect on the very next send().

  FIX 2 – InboxCenter pagination
           The backend paginates at 20 per page but the frontend calls
           GET /notifications with no page parameter and never fetches
           further pages. Users with more than 20 notifications silently
           see only the first page forever.

           Backend: unchanged — paginate(20) is already correct.
           Frontend changes:
             • useNotifications: adds hasMore / loadMore / loadingMore state.
               Initial fetch loads page 1. loadMore() appends page 2, 3, …
               New real-time notifications are prepended as before.
             • InboxCenter: adds a "Load more" button at the bottom of the
               list, shown only when hasMore is true. Shows a spinner while
               loading. CATEGORY_MAP local copy is also removed and replaced
               with the shared import (it was missed in fix_notifications.py).

Usage:
    python3 fix_notifications_followup.py [--dry-run]
"""

import sys
import os
import shutil
import argparse
from pathlib import Path
from datetime import datetime

# ── helpers ──────────────────────────────────────────────────────────────────

DRY_RUN = False
BACKUP_SUFFIX = f".bak_notiffix2_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
_applied: list[str] = []
_skipped: list[str] = []


def log(msg: str) -> None:
    print(msg)


def backup(path: Path) -> None:
    dest = path.with_suffix(path.suffix + BACKUP_SUFFIX)
    if not DRY_RUN:
        shutil.copy2(path, dest)
    log(f"  📦 backed up → {dest.name}")


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write(path: Path, content: str) -> None:
    if not DRY_RUN:
        path.write_text(content, encoding="utf-8")


def replace_exact(path: Path, old: str, new: str, label: str) -> bool:
    content = read(path)
    if old not in content:
        return False
    updated = content.replace(old, new, 1)
    backup(path)
    write(path, updated)
    log(f"  ✅ {label}")
    _applied.append(label)
    return True


def create_file(path: Path, content: str, label: str) -> None:
    if path.exists():
        log(f"  ⏭  {label} — file already exists, skipping")
        _skipped.append(label)
        return
    if not DRY_RUN:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    log(f"  ✅ {label}")
    _applied.append(label)


def find_root() -> Path:
    cwd = Path.cwd()
    if (cwd / "registrar-backend").is_dir() and (cwd / "registrar-frontend").is_dir():
        return cwd
    parent = cwd.parent
    if (parent / "registrar-backend").is_dir() and (parent / "registrar-frontend").is_dir():
        return parent
    print("ERROR: Run this script from the project root directory")
    print("       (the folder that contains registrar-backend/ and registrar-frontend/)")
    sys.exit(1)


# ═══════════════════════════════════════════════════════════════════════════════
# FIX 1a — NotificationTypeObserver.php (new file)
# ═══════════════════════════════════════════════════════════════════════════════

OBSERVER_CONTENT = """\
<?php

namespace App\\Observers;

use App\\Models\\NotificationType;
use Illuminate\\Support\\Facades\\Cache;

/**
 * Invalidates the NotificationType cache whenever a type is created,
 * updated, or deleted via the admin UI or seeder.
 *
 * Context: NotificationService caches NotificationType lookups under the key
 * "notif_type:{trigger_event}" with a 6-hour TTL to avoid a DB hit on every
 * send(). Without this observer, an admin editing a notification template
 * title or message_template would have no effect for up to 6 hours because
 * every broadcast job would still read the stale cached value.
 *
 * With this observer, any write to notification_types immediately clears the
 * relevant cache key, so the next send() fetches the fresh value from DB and
 * re-populates the cache.
 *
 * Registered in AppServiceProvider::boot().
 */
class NotificationTypeObserver
{
    /**
     * Forget the cache key after any create or update.
     * 'saved' fires for both — no need to hook 'created' and 'updated' separately.
     */
    public function saved(NotificationType $type): void
    {
        Cache::forget("notif_type:{$type->trigger_event}");
    }

    /**
     * Forget the cache key when a type is soft- or hard-deleted.
     */
    public function deleted(NotificationType $type): void
    {
        Cache::forget("notif_type:{$type->trigger_event}");
    }

    /**
     * Forget the cache key when a soft-deleted type is restored.
     * Prevents the restored type from being shadowed by a stale null entry.
     */
    public function restored(NotificationType $type): void
    {
        Cache::forget("notif_type:{$type->trigger_event}");
    }
}
"""


# ═══════════════════════════════════════════════════════════════════════════════
# FIX 1b — Register observer in AppServiceProvider::boot()
# ═══════════════════════════════════════════════════════════════════════════════

def fix_observer(root: Path) -> None:
    observer_path = root / "registrar-backend/app/Observers/NotificationTypeObserver.php"
    provider_path = root / "registrar-backend/app/Providers/AppServiceProvider.php"

    log(f"\n[FIX 1] NotificationType cache observer")

    # 1a — create the observer file
    create_file(observer_path, OBSERVER_CONTENT,
                "FIX 1a: create app/Observers/NotificationTypeObserver.php")

    # 1b — register it in AppServiceProvider
    if not provider_path.exists():
        log("  ⚠️  AppServiceProvider.php not found — skipping registration")
        _skipped.append("FIX 1b: register observer in AppServiceProvider")
        return

    # Add the two use statements after the existing ones
    old_uses = """\
use App\\Contracts\\DocumentRequestServiceInterface;
use App\\Contracts\\NotificationServiceInterface;
use App\\Services\\AuditLogger;
use App\\Services\\DocumentRequestService;
use App\\Services\\NotificationService;
use Illuminate\\Support\\ServiceProvider;"""

    new_uses = """\
use App\\Contracts\\DocumentRequestServiceInterface;
use App\\Contracts\\NotificationServiceInterface;
use App\\Models\\NotificationType;
use App\\Observers\\NotificationTypeObserver;
use App\\Services\\AuditLogger;
use App\\Services\\DocumentRequestService;
use App\\Services\\NotificationService;
use Illuminate\\Support\\ServiceProvider;"""

    ok_uses = replace_exact(provider_path, old_uses, new_uses,
                             "FIX 1b-imports: add NotificationType + observer use statements")
    if not ok_uses:
        if "NotificationTypeObserver" in read(provider_path):
            log("  ⏭  FIX 1b-imports already applied")
            _skipped.append("FIX 1b-imports: use statements")
        else:
            log("  ⚠️  FIX 1b-imports: expected use block not found — inspect manually")
            _skipped.append("FIX 1b-imports: use statements")

    # Register in boot()
    old_boot = """\
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }"""

    new_boot = """\
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Invalidate the NotificationType cache whenever a type is saved or
        // deleted. Without this, admin edits to notification templates would
        // have no effect for up to 6 hours (the cache TTL in NotificationService).
        NotificationType::observe(NotificationTypeObserver::class);
    }"""

    ok_boot = replace_exact(provider_path, old_boot, new_boot,
                             "FIX 1b-boot: register NotificationTypeObserver")
    if not ok_boot:
        if "NotificationTypeObserver" in read(provider_path) and "observe(" in read(provider_path):
            log("  ⏭  FIX 1b-boot already applied")
            _skipped.append("FIX 1b-boot: observer registration")
        else:
            log("  ⚠️  FIX 1b-boot: expected boot() block not found — inspect manually")
            _skipped.append("FIX 1b-boot: observer registration")


# ═══════════════════════════════════════════════════════════════════════════════
# FIX 2a — useNotifications.js: add hasMore / loadMore / loadingMore
# ═══════════════════════════════════════════════════════════════════════════════

def fix_use_notifications_pagination(root: Path) -> None:
    path = root / "registrar-frontend/src/hooks/useNotifications.js"
    log(f"\n[FIX 2a] {path.relative_to(root)} — add loadMore pagination")

    if not path.exists():
        log("  ⚠️  file not found — skipping")
        _skipped.append("FIX 2a: useNotifications pagination")
        return

    # Add hasMore and loadingMore state, update fetchNotifications to track
    # pagination meta, and add the loadMore function.

    old_state = """\
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount]     = useState(0);
    const [loading, setLoading]             = useState(true);"""

    new_state = """\
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount]     = useState(0);
    const [loading, setLoading]             = useState(true);
    const [loadingMore, setLoadingMore]     = useState(false);
    const [hasMore, setHasMore]             = useState(false);
    const pageRef                           = useRef(1);"""

    ok_state = replace_exact(path, old_state, new_state,
                              "FIX 2a-state: add loadingMore, hasMore, pageRef")
    if not ok_state:
        if "loadingMore" in read(path):
            log("  ⏭  FIX 2a-state already applied")
            _skipped.append("FIX 2a-state: pagination state")
        else:
            log("  ⚠️  FIX 2a-state: expected state block not found — inspect manually")
            _skipped.append("FIX 2a-state: pagination state")

    # Update fetchNotifications to reset page and capture last_page
    old_fetch = """\
    const fetchNotifications = useCallback(async () => {
        try {
            const [notifRes, countRes] = await Promise.all([
                api.get('/notifications'),
                api.get('/notifications/unread-count'),
            ]);
            setNotifications(notifRes.data.data ?? []);
            setUnreadCount(countRes.data.count ?? 0);
        } catch (err) {
            console.error('[useNotifications] fetch failed:', err);
        } finally {
            setLoading(false);
        }
    }, []);"""

    new_fetch = """\
    const fetchNotifications = useCallback(async () => {
        try {
            // Reset to page 1 on every full refresh (login, user switch, refetch).
            pageRef.current = 1;
            const [notifRes, countRes] = await Promise.all([
                api.get('/notifications', { params: { page: 1 } }),
                api.get('/notifications/unread-count'),
            ]);
            const meta = notifRes.data.meta ?? {};
            setNotifications(notifRes.data.data ?? []);
            setUnreadCount(countRes.data.count ?? 0);
            // hasMore is true when the backend has at least one more page.
            setHasMore((meta.current_page ?? 1) < (meta.last_page ?? 1));
        } catch (err) {
            console.error('[useNotifications] fetch failed:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Append the next page of notifications to the existing list.
    // Keeps real-time items that arrived via WebSocket at the top untouched.
    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;
        try {
            setLoadingMore(true);
            const nextPage = pageRef.current + 1;
            const { data } = await api.get('/notifications', { params: { page: nextPage } });
            const meta = data.meta ?? {};
            // Deduplicate: WebSocket may have prepended items already on this page.
            setNotifications(prev => {
                const existingIds = new Set(prev.map(n => n.id));
                const fresh = (data.data ?? []).filter(n => !existingIds.has(n.id));
                return [...prev, ...fresh];
            });
            pageRef.current = nextPage;
            setHasMore((meta.current_page ?? nextPage) < (meta.last_page ?? nextPage));
        } catch (err) {
            console.error('[useNotifications] loadMore failed:', err);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore]);"""

    ok_fetch = replace_exact(path, old_fetch, new_fetch,
                              "FIX 2a-fetch: fetchNotifications resets page, captures meta; add loadMore")
    if not ok_fetch:
        if "loadMore" in read(path):
            log("  ⏭  FIX 2a-fetch already applied")
            _skipped.append("FIX 2a-fetch: fetchNotifications + loadMore")
        else:
            log("  ⚠️  FIX 2a-fetch: expected fetchNotifications block not found — inspect manually")
            _skipped.append("FIX 2a-fetch: fetchNotifications + loadMore")

    # Update the return value to expose hasMore, loadMore, loadingMore
    old_return = """\
    return { notifications, unreadCount, loading, markAsRead, markAllAsRead, dismiss, refetch: fetchNotifications };"""

    new_return = """\
    return {
        notifications,
        unreadCount,
        loading,
        loadingMore,
        hasMore,
        loadMore,
        markAsRead,
        markAllAsRead,
        dismiss,
        refetch: fetchNotifications,
    };"""

    ok_return = replace_exact(path, old_return, new_return,
                               "FIX 2a-return: expose hasMore, loadMore, loadingMore")
    if not ok_return:
        if "loadMore" in read(path) and "hasMore" in read(path):
            log("  ⏭  FIX 2a-return already applied")
            _skipped.append("FIX 2a-return: hook return value")
        else:
            log("  ⚠️  FIX 2a-return: expected return statement not found — inspect manually")
            _skipped.append("FIX 2a-return: hook return value")


# ═══════════════════════════════════════════════════════════════════════════════
# FIX 2b — InboxCenter.jsx: wire up loadMore button + fix CATEGORY_MAP
# ═══════════════════════════════════════════════════════════════════════════════

def fix_inbox_center(root: Path) -> None:
    path = root / "registrar-frontend/src/layouts/InboxCenter.jsx"
    log(f"\n[FIX 2b] {path.relative_to(root)} — Load more button + CATEGORY_MAP import")

    if not path.exists():
        log("  ⚠️  file not found — skipping")
        _skipped.append("FIX 2b: InboxCenter.jsx")
        return

    # Fix the local CATEGORY_MAP — it was missed in fix_notifications.py
    # because it only stores category labels, not colors (different shape).
    # Replace with a shared import from notificationCategories.js.
    # InboxCenter only uses the .category field, so CATEGORY_MAP[n.type]?.category works.
    old_category_map = """\
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
};"""

    new_category_map = """\
// CATEGORY_MAP lives in src/constants/notificationCategories.js
// InboxCenter only uses the .category label from each entry.
import { CATEGORY_MAP } from '../constants/notificationCategories';"""

    ok_map = replace_exact(path, old_category_map, new_category_map,
                           "FIX 2b-map: replace inline CATEGORY_MAP with shared import")
    if not ok_map:
        if "notificationCategories" in read(path):
            log("  ⏭  FIX 2b-map already applied")
            _skipped.append("FIX 2b-map: CATEGORY_MAP import")
        else:
            log("  ⚠️  FIX 2b-map: inline CATEGORY_MAP not found — inspect manually")
            _skipped.append("FIX 2b-map: CATEGORY_MAP import")

    # Update toMailItem to use .category from the shared map object
    # (the shared map entries are objects {category, color} not plain strings)
    old_to_mail = """\
  category: CATEGORY_MAP[n.type] ?? 'Notification',"""

    new_to_mail = """\
  category: CATEGORY_MAP[n.type]?.category ?? 'Notification',"""

    ok_mail = replace_exact(path, old_to_mail, new_to_mail,
                            "FIX 2b-toMailItem: use .category from shared map object")
    if not ok_mail:
        if "?.category" in read(path):
            log("  ⏭  FIX 2b-toMailItem already applied")
            _skipped.append("FIX 2b-toMailItem: .category accessor")
        else:
            log("  ⚠️  FIX 2b-toMailItem: expected line not found — inspect manually")
            _skipped.append("FIX 2b-toMailItem: .category accessor")

    # Destructure loadMore, hasMore, loadingMore from the context
    old_destructure = """\
  const {
    notifications,
    loading,
    markAsRead,
    dismiss,
  } = useNotifications();"""

    new_destructure = """\
  const {
    notifications,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    markAsRead,
    dismiss,
  } = useNotifications();"""

    ok_dest = replace_exact(path, old_destructure, new_destructure,
                            "FIX 2b-destructure: add loadMore/hasMore/loadingMore from context")
    if not ok_dest:
        if "loadMore" in read(path):
            log("  ⏭  FIX 2b-destructure already applied")
            _skipped.append("FIX 2b-destructure: context destructure")
        else:
            log("  ⚠️  FIX 2b-destructure: expected destructure block not found — inspect manually")
            _skipped.append("FIX 2b-destructure: context destructure")

    # Add the Load more button after the filteredEmails.map() closing paren,
    # inside the scrollable list div.
    # We target the closing tag of the scrollable div that wraps the email list.
    old_list_close = """\
                  filteredEmails.map((mail) => {
                    const isActive = selectedMail?.id === mail.id;
                    return (
                      <button
                        key={mail.id}
                        onClick={() => handleSelectMail(mail.id)}
                        className={`w-full text-left px-4 py-3 border-b border-gray-200 transition-colors ${\
                          isActive
                            ? (isDark ? 'bg-[#3a3b3c] text-[#e4e6eb] border-[#3e4042]' : 'bg-gray-100 text-gray-900')
                            : (isDark ? 'hover:bg-[#3a3b3c] text-[#e4e6eb] border-[#3e4042]' : 'hover:bg-gray-50 text-gray-800')
                        }`}
                      >
                        <div className=\"flex items-center justify-between gap-2\">
                          <p className=\"font-semibold text-sm truncate\">{mail.from}</p>
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
              </div>"""

    new_list_close = """\
                  filteredEmails.map((mail) => {
                    const isActive = selectedMail?.id === mail.id;
                    return (
                      <button
                        key={mail.id}
                        onClick={() => handleSelectMail(mail.id)}
                        className={`w-full text-left px-4 py-3 border-b border-gray-200 transition-colors ${\
                          isActive
                            ? (isDark ? 'bg-[#3a3b3c] text-[#e4e6eb] border-[#3e4042]' : 'bg-gray-100 text-gray-900')
                            : (isDark ? 'hover:bg-[#3a3b3c] text-[#e4e6eb] border-[#3e4042]' : 'hover:bg-gray-50 text-gray-800')
                        }`}
                      >
                        <div className=\"flex items-center justify-between gap-2\">
                          <p className=\"font-semibold text-sm truncate\">{mail.from}</p>
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

                {/* Load more — only shown when the backend has more pages */}
                {hasMore && (
                  <div className=\"px-4 py-3\">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className={`w-full text-xs font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 ${
                        isDark
                          ? 'bg-[#3a3b3c] text-[#e4e6eb] hover:bg-[#4a4b4c]'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {loadingMore ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </div>"""

    ok_btn = replace_exact(path, old_list_close, new_list_close,
                           "FIX 2b-button: add Load more button below notification list")
    if not ok_btn:
        if "Load more" in read(path):
            log("  ⏭  FIX 2b-button already applied")
            _skipped.append("FIX 2b-button: Load more button")
        else:
            log("  ⚠️  FIX 2b-button: expected list close block not found — inspect manually")
            _skipped.append("FIX 2b-button: Load more button")


# ═══════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════

def main() -> None:
    global DRY_RUN

    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would change without writing files")
    args = parser.parse_args()
    DRY_RUN = args.dry_run

    if DRY_RUN:
        log("🔍 DRY RUN — no files will be modified\n")

    root = find_root()
    log(f"📁 Project root: {root}\n")
    log("=" * 66)

    fix_observer(root)
    fix_use_notifications_pagination(root)
    fix_inbox_center(root)

    log("\n" + "=" * 66)
    log(f"\n✅ Applied : {len(_applied)}")
    for item in _applied:
        log(f"   • {item}")

    if _skipped:
        log(f"\n⏭  Skipped : {len(_skipped)}")
        for item in _skipped:
            log(f"   • {item}")

    log("""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next steps
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Backend — no migration needed. Rebuild and restart:
  docker compose build backend
  docker compose up -d backend

  Verify the observer is wired:
    docker compose exec backend php artisan tinker
    >>> \\App\\Models\\NotificationType::first()->update(['title' => 'Test']);
    >>> cache('notif_type:request_submitted');   // should be null
    >>> // re-trigger a send() and confirm it re-populates

Frontend — rebuild:
  cd registrar-frontend && npm run build
  (or let your dev server hot-reload)

  Verify pagination:
    Open InboxCenter as a user with >20 notifications.
    The "Load more" button should appear at the bottom of the list.
    Clicking it appends the next page without losing real-time items.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""")


if __name__ == "__main__":
    main()