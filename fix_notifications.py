#!/usr/bin/env python3
"""
fix_notifications.py
====================
Run from the project ROOT (the directory that contains
registrar-backend/ and registrar-frontend/).

Applies five targeted fixes to the notification stack:

  FIX 1 – CRITICAL  viaQueues() → broadcastQueue() in NotificationSent.php
           Real cause of slow / missing real-time notifications.
           Laravel 12's BroadcastEvent wrapper job looks for broadcastQueue()
           on the event. viaQueues() is the Queueable-trait method for regular
           ShouldQueue jobs and is silently ignored for ShouldBroadcast events.
           Result: every broadcast job lands on the 'default' queue, which the
           general worker drains mixed with slow document-processing jobs.
           The dedicated broadcast-worker drains the 'broadcasts' queue —
           which has been empty the whole time.

  FIX 2 – HIGH      broadcastWith() lazy-load eliminated in NotificationSent.php
           SerializesModels strips eager-loaded relations before queuing.
           When BroadcastEvent runs, $notification->type is null and must be
           lazy-loaded, adding an extra DB round-trip per notification under
           load and silently failing if the connection is slow.
           Fix: pass title/trigger_event into the event constructor and use
           those scalar values in broadcastWith() instead.

  FIX 3 – HIGH      unbind('connected') race in useNotifications.js
           Calling unbind('connected') with no handler reference removes ALL
           'connected' listeners — including Pusher-js's own internal reconnect
           handler. On the "two users, same machine" test scenario this fires
           when the second tab mounts, blinding the first tab's connection to
           reconnect events. The fix stores the handler reference and unbinds
           only that specific listener.

  FIX 4 – MEDIUM    Return unread_count from mutation endpoints
           markAsRead and destroy both fire a second GET /notifications/unread-count
           after their mutation. The controller already has the count after the
           update. The fix returns it inline, cutting each interaction from two
           HTTP round-trips to one.

  FIX 5 – MEDIUM    CATEGORY_MAP deduplication
           NotificationModal.jsx and NotificationToast.jsx each maintain an
           identical CATEGORY_MAP. Adding a new trigger_event means editing two
           files and they can silently drift. The fix extracts the map to
           src/constants/notificationCategories.js and imports it in both.

Usage:
    python3 fix_notifications.py [--dry-run]

    --dry-run   Print what would change without writing any files.
"""

import sys
import os
import shutil
import textwrap
import argparse
from pathlib import Path
from datetime import datetime

# ── helpers ──────────────────────────────────────────────────────────────────

DRY_RUN = False
BACKUP_SUFFIX = f".bak_notiffix_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
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
    """
    Replace the first (and only expected) occurrence of `old` with `new`.
    Returns True if the replacement was made, False if `old` wasn't found
    (meaning the fix was already applied or the file changed).
    """
    content = read(path)
    if old not in content:
        return False
    if new in content and old not in content:
        # already patched
        return False
    updated = content.replace(old, new, 1)
    backup(path)
    write(path, updated)
    log(f"  ✅ {label}")
    _applied.append(label)
    return True


def already_contains(path: Path, needle: str) -> bool:
    return needle in read(path)


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


# ── root detection ────────────────────────────────────────────────────────────

def find_root() -> Path:
    cwd = Path.cwd()
    if (cwd / "registrar-backend").is_dir() and (cwd / "registrar-frontend").is_dir():
        return cwd
    # allow running from one level inside
    parent = cwd.parent
    if (parent / "registrar-backend").is_dir() and (parent / "registrar-frontend").is_dir():
        return parent
    print("ERROR: Run this script from the project root directory")
    print("       (the folder that contains registrar-backend/ and registrar-frontend/)")
    sys.exit(1)


# ═══════════════════════════════════════════════════════════════════════════════
# FIX 1 + 2  –  NotificationSent.php
#   Fix 1: viaQueues() → broadcastQueue()
#   Fix 2: eliminate lazy type relation in broadcastWith()
# ═══════════════════════════════════════════════════════════════════════════════

def fix_notification_sent(root: Path) -> None:
    path = root / "registrar-backend/app/Events/NotificationSent.php"
    log(f"\n[FIX 1+2] {path.relative_to(root)}")

    if not path.exists():
        log("  ⚠️  file not found — skipping")
        _skipped.append("FIX 1+2: NotificationSent.php")
        return

    # ── Fix 1: replace viaQueues() with broadcastQueue() ──────────────────────
    # viaQueues() is a Queueable-trait method for ShouldQueue regular jobs.
    # ShouldBroadcast events need broadcastQueue() — that's what BroadcastEvent
    # calls when it decides which queue to put the job on.
    old_via = """\
    // -------------------------------------------------------
    // WHICH QUEUE TO DISPATCH THE BROADCAST JOB ON
    // -------------------------------------------------------
    // Routing to a dedicated 'broadcasts' queue keeps WebSocket
    // pushes from being delayed by slow or long-running default-queue
    // jobs.  The broadcast-worker container drains this queue with a
    // short sleep (1 s) and timeout (30 s) for low latency.
    // -------------------------------------------------------
    public function viaQueues(): array
    {
        return ['broadcasts'];
    }"""

    new_via = """\
    // -------------------------------------------------------
    // WHICH QUEUE TO DISPATCH THE BROADCAST JOB ON
    // -------------------------------------------------------
    // broadcastQueue() is the method Laravel 10+ BroadcastEvent reads to
    // decide which queue the broadcast job lands on.
    // viaQueues() is the Queueable-trait method for regular ShouldQueue jobs
    // and is silently ignored for ShouldBroadcast events — using it was the
    // root cause of all broadcast jobs landing on 'default' instead of here.
    // The broadcast-worker container drains 'broadcasts' with --sleep=1 and
    // --timeout=30 for low-latency delivery.
    // -------------------------------------------------------
    public function broadcastQueue(): string
    {
        return 'broadcasts';
    }"""

    ok1 = replace_exact(path, old_via, new_via, "FIX 1: viaQueues() → broadcastQueue()")
    if not ok1:
        if "public function broadcastQueue" in read(path):
            log("  ⏭  FIX 1 already applied")
            _skipped.append("FIX 1: viaQueues() → broadcastQueue()")
        else:
            log("  ⚠️  FIX 1: expected block not found — inspect manually")
            _skipped.append("FIX 1: viaQueues() → broadcastQueue()")

    # ── Fix 2: pass title + trigger_event through constructor, use scalars ─────
    # SerializesModels strips loaded Eloquent relations before queuing.
    # When BroadcastEvent executes, $notification->type is unloaded, causing
    # either a lazy N+1 query or a null-dereference if the DB is slow.
    # We pass the two strings we need as plain constructor args instead.

    # Step 2a — update constructor to accept the extra scalars
    old_constructor = """\
    public function __construct(
        public readonly Notification $notification,
        public readonly SystemUser   $recipient,
    ) {}"""

    new_constructor = """\
    public function __construct(
        public readonly Notification $notification,
        public readonly SystemUser   $recipient,
        // Pass title and trigger_event as plain strings rather than reading
        // them from the relation inside broadcastWith().
        // SerializesModels strips loaded relations before queuing, so
        // $notification->type would be null (or trigger a lazy-load) when
        // BroadcastEvent runs. Scalars survive serialization untouched.
        public readonly string       $typeTitle        = '',
        public readonly string       $typeTriggerEvent = '',
    ) {}"""

    ok2a = replace_exact(path, old_constructor, new_constructor,
                         "FIX 2a: add typeTitle/typeTriggerEvent constructor args")
    if not ok2a:
        if "typeTriggerEvent" in read(path):
            log("  ⏭  FIX 2a already applied")
            _skipped.append("FIX 2a: constructor scalar args")
        else:
            log("  ⚠️  FIX 2a: expected constructor not found — inspect manually")
            _skipped.append("FIX 2a: constructor scalar args")

    # Step 2b — update broadcastWith() to use the scalar fields
    old_broadcast_with = """\
    public function broadcastWith(): array
    {
        $data = $this->notification->data ?? [];
        return [
            'id'           => $this->notification->id,
            'title'        => $this->notification->type->title,
            'message'      => $data['message'] ?? '',
            'type'         => $this->notification->type->trigger_event,
            'request_id'   => $this->notification->request_id,
            'read_at'      => $this->notification->read_at,
            'created_at'   => $this->notification->created_at->toISOString(),
            // Forward requirements checklist so the real-time toast/bell
            // can show it immediately without a follow-up REST call.
            'requirements' => $data['requirements'] ?? null,
            'announcement' => isset($data['announcement_id']) ? [
                'id'      => $data['announcement_id'],
                'title'   => $data['announcement_title'],
                'content' => $data['announcement_content'],
            ] : null,
        ];
    }"""

    new_broadcast_with = """\
    public function broadcastWith(): array
    {
        $data = $this->notification->data ?? [];
        return [
            'id'           => $this->notification->id,
            // Use the scalar fields passed at construction time instead of
            // accessing the relation. SerializesModels strips loaded relations
            // before the job is queued, so $notification->type would be null
            // (or fire a lazy load) when this runs inside BroadcastEvent.
            'title'        => $this->typeTitle,
            'message'      => $data['message'] ?? '',
            'type'         => $this->typeTriggerEvent,
            'request_id'   => $this->notification->request_id,
            'read_at'      => $this->notification->read_at,
            'created_at'   => $this->notification->created_at->toISOString(),
            // Forward requirements checklist so the real-time toast/bell
            // can show it immediately without a follow-up REST call.
            'requirements' => $data['requirements'] ?? null,
            'announcement' => isset($data['announcement_id']) ? [
                'id'      => $data['announcement_id'],
                'title'   => $data['announcement_title'],
                'content' => $data['announcement_content'],
            ] : null,
        ];
    }"""

    ok2b = replace_exact(path, old_broadcast_with, new_broadcast_with,
                         "FIX 2b: broadcastWith() uses scalar fields, no relation access")
    if not ok2b:
        if "$this->typeTitle" in read(path):
            log("  ⏭  FIX 2b already applied")
            _skipped.append("FIX 2b: broadcastWith() scalar fields")
        else:
            log("  ⚠️  FIX 2b: expected broadcastWith() block not found — inspect manually")
            _skipped.append("FIX 2b: broadcastWith() scalar fields")


# ═══════════════════════════════════════════════════════════════════════════════
# FIX 1+2 companion — NotificationService.php
# broadcast() call must now pass typeTitle and typeTriggerEvent
# ═══════════════════════════════════════════════════════════════════════════════

def fix_notification_service(root: Path) -> None:
    path = root / "registrar-backend/app/Services/NotificationService.php"
    log(f"\n[FIX 2c] {path.relative_to(root)} — pass scalar fields to NotificationSent")

    if not path.exists():
        log("  ⚠️  file not found — skipping")
        _skipped.append("FIX 2c: NotificationService.php broadcast call")
        return

    # Add Cache import alongside existing imports
    old_imports = """\
use Illuminate\\Support\\Facades\\DB;
use App\\Contracts\\NotificationServiceInterface;
use Illuminate\\Support\\Facades\\Log;"""

    new_imports = """\
use Illuminate\\Support\\Facades\\Cache;
use Illuminate\\Support\\Facades\\DB;
use App\\Contracts\\NotificationServiceInterface;
use Illuminate\\Support\\Facades\\Log;"""

    # Guard: if Cache facade is already imported, don't touch the imports block at all.
    if "use Illuminate\\Support\\Facades\\Cache;" in read(path):
        log("  ⏭  Cache import already present")
        _skipped.append("FIX 2c-import: Cache facade")
    else:
        ok_import = replace_exact(path, old_imports, new_imports,
                                   "FIX 2c-import: add Cache facade import")
        if not ok_import:
            log("  ⚠️  FIX 2c-import: expected imports block not found — inspect manually")
            _skipped.append("FIX 2c-import: Cache facade")

    # Update broadcast() call to pass the two new scalar constructor args,
    # and switch the NotificationType lookup to use the cache.
    old_send_inner = """\
            // Step 1: Find the notification template
            $type = NotificationType::where('trigger_event', $triggerEvent)
                ->where('is_active', true)
                ->first();

            if (! $type) {
                Log::warning(\"NotificationService: unknown trigger_event '{$triggerEvent}'\");
                return null;
            }

            // Step 2: Build the final message
            // Replace :placeholders in the template with actual values
            // e.g. \"Payment verified for request #:request_id\"
            //   → \"Payment verified for request #42\"
            $message = $this->buildMessage($type->message_template, $data);

            // Step 3 + 4: Save to DB and broadcast — atomically
            return DB::transaction(function () use (
                $recipient, $type, $message, $data, $requestId
            ) {
                $notification = Notification::create([
                    'notification_type_id' => $type->notification_type_id,
                    'notifiable_type'      => SystemUser::class,
                    'notifiable_id'        => $recipient->user_id,
                    'data'                 => array_merge($data, ['message' => $message]),
                    'request_id'           => $requestId,
                ]);

                // Load the type relation so broadcastWith() can access
                // $notification->type->title without an extra query
                $notification->load('type');

                // Fire the broadcast event — Reverb picks this up and
                // pushes it to the frontend over WebSockets instantly
                broadcast(new NotificationSent($notification, $recipient));

                return $notification;
            });"""

    new_send_inner = """\
            // Step 1: Find the notification template
            // Cache the lookup — notification types change only via seeder/admin,
            // so a 6-hour TTL is safe and avoids a DB hit on every send().
            $type = Cache::remember(
                "notif_type:{$triggerEvent}",
                now()->addHours(6),
                fn () => NotificationType::where('trigger_event', $triggerEvent)
                             ->where('is_active', true)
                             ->first()
            );

            if (! $type) {
                Log::warning(\"NotificationService: unknown trigger_event '{$triggerEvent}'\");
                return null;
            }

            // Step 2: Build the final message
            // Replace :placeholders in the template with actual values
            // e.g. \"Payment verified for request #:request_id\"
            //   → \"Payment verified for request #42\"
            $message = $this->buildMessage($type->message_template, $data);

            // Capture scalar values from the type NOW, before the transaction,
            // so we don't rely on a loaded relation inside the queued broadcast job.
            // SerializesModels strips loaded relations from the event before queuing.
            $typeTitle        = $type->title;
            $typeTriggerEvent = $type->trigger_event;

            // Step 3 + 4: Save to DB and broadcast — atomically
            return DB::transaction(function () use (
                $recipient, $type, $typeTitle, $typeTriggerEvent, $message, $data, $requestId
            ) {
                $notification = Notification::create([
                    'notification_type_id' => $type->notification_type_id,
                    'notifiable_type'      => SystemUser::class,
                    'notifiable_id'        => $recipient->user_id,
                    'data'                 => array_merge($data, ['message' => $message]),
                    'request_id'           => $requestId,
                ]);

                // Fire the broadcast event — Reverb picks this up and
                // pushes it to the frontend over WebSockets instantly.
                // We pass typeTitle + typeTriggerEvent as plain strings so
                // broadcastWith() never touches the relation (which would be
                // stripped by SerializesModels before the job runs).
                broadcast(new NotificationSent($notification, $recipient, $typeTitle, $typeTriggerEvent));

                return $notification;
            });"""

    ok_service = replace_exact(path, old_send_inner, new_send_inner,
                                "FIX 2c: pass scalar type fields, cache NotificationType lookup")
    if not ok_service:
        if "$typeTitle" in read(path):
            log("  ⏭  FIX 2c already applied")
            _skipped.append("FIX 2c: NotificationService send() update")
        else:
            log("  ⚠️  FIX 2c: expected send() block not found — inspect manually")
            _skipped.append("FIX 2c: NotificationService send() update")


# ═══════════════════════════════════════════════════════════════════════════════
# FIX 3  –  useNotifications.js — unbind race condition
# ═══════════════════════════════════════════════════════════════════════════════

def fix_use_notifications(root: Path) -> None:
    path = root / "registrar-frontend/src/hooks/useNotifications.js"
    log(f"\n[FIX 3+4] {path.relative_to(root)}")

    if not path.exists():
        log("  ⚠️  file not found — skipping")
        _skipped.append("FIX 3+4: useNotifications.js")
        return

    # ── Fix 3: save onConnected ref, unbind only that listener on cleanup ──────
    # unbind('connected') with no handler removes ALL 'connected' listeners,
    # including Pusher-js's own internal reconnect listener. On the two-tabs
    # same-machine scenario, the second tab's effect cleanup fires and strips
    # the first tab's connection from ever receiving reconnect events.
    old_subscribe_block = """\
        const subscribe = () => {
            console.info('[Echo] subscribing to', channelName);
            echo.private(channelName)
                .listen('.NotificationSent', handleNewNotification)
                .error((err) => {
                    console.error('[Echo] private channel auth failed:', err);
                });
        };

        const connectionState = echo.connector.pusher.connection.state;

        echo.connector.pusher.connection.bind('state_change', ({ current }) => {
            console.info(`[Echo] connection → ${current}`);
        });

        if (connectionState === 'connected') {
            subscribe();
        } else {
            const onConnected = () => {
                echo.connector.pusher.connection.unbind('connected', onConnected);
                if (!unsubscribed) subscribe();
            };
            echo.connector.pusher.connection.bind('connected', onConnected);
        }

        return () => {
            unsubscribed = true;
            echo.connector.pusher.connection.unbind('connected');
            echo.leave(channelName);
        };"""

    new_subscribe_block = """\
        const subscribe = () => {
            console.info('[Echo] subscribing to', channelName);
            echo.private(channelName)
                .listen('.NotificationSent', handleNewNotification)
                .error((err) => {
                    console.error('[Echo] private channel auth failed:', err);
                });
        };

        const connectionState = echo.connector.pusher.connection.state;

        echo.connector.pusher.connection.bind('state_change', ({ current }) => {
            console.info(`[Echo] connection → ${current}`);
        });

        // Store the onConnected handler outside the else block so the cleanup
        // function can unbind it by reference. Previously unbind('connected')
        // was called with no second argument, which removes ALL 'connected'
        // listeners — including Pusher-js's own internal reconnect handler.
        // On the two-tabs-same-machine scenario this caused the first tab's
        // connection to stop receiving reconnect events after the second tab
        // mounted or unmounted, making notifications appear only intermittently.
        let pendingConnectedHandler = null;

        if (connectionState === 'connected') {
            subscribe();
        } else {
            pendingConnectedHandler = () => {
                echo.connector.pusher.connection.unbind('connected', pendingConnectedHandler);
                pendingConnectedHandler = null;
                if (!unsubscribed) subscribe();
            };
            echo.connector.pusher.connection.bind('connected', pendingConnectedHandler);
        }

        return () => {
            unsubscribed = true;
            // Unbind only OUR listener by reference — never the bare
            // unbind('connected') which strips every listener on the connection.
            if (pendingConnectedHandler) {
                echo.connector.pusher.connection.unbind('connected', pendingConnectedHandler);
                pendingConnectedHandler = null;
            }
            echo.leave(channelName);
        };"""

    ok3 = replace_exact(path, old_subscribe_block, new_subscribe_block,
                        "FIX 3: unbind by handler reference, not bare unbind('connected')")
    if not ok3:
        if "pendingConnectedHandler" in read(path):
            log("  ⏭  FIX 3 already applied")
            _skipped.append("FIX 3: unbind handler reference")
        else:
            log("  ⚠️  FIX 3: expected subscription block not found — inspect manually")
            _skipped.append("FIX 3: unbind handler reference")

    # ── Fix 4: eliminate second GET /notifications/unread-count calls ──────────
    # markAsRead currently:  POST /read  →  GET /unread-count  (2 round trips)
    # dismiss currently:     DELETE      →  GET /unread-count  (2 round trips)
    # The controller will return unread_count in the mutation response.
    old_mark_as_read = """\
    const markAsRead = useCallback(async (id) => {
        try {
            await api.post(`/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
            );
            const { data } = await api.get('/notifications/unread-count');
            setUnreadCount(data.count ?? 0);
        } catch (err) {
            console.error('[useNotifications] markAsRead failed:', err);
        }
    }, []);"""

    new_mark_as_read = """\
    const markAsRead = useCallback(async (id) => {
        try {
            // Controller now returns unread_count — no need for a second fetch.
            const { data } = await api.post(`/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
            );
            setUnreadCount(data.unread_count ?? 0);
        } catch (err) {
            console.error('[useNotifications] markAsRead failed:', err);
        }
    }, []);"""

    ok4a = replace_exact(path, old_mark_as_read, new_mark_as_read,
                         "FIX 4a: markAsRead — remove second GET /unread-count")
    if not ok4a:
        if "data.unread_count" in read(path) and "markAsRead" in read(path):
            log("  ⏭  FIX 4a already applied")
            _skipped.append("FIX 4a: markAsRead single round-trip")
        else:
            log("  ⚠️  FIX 4a: expected markAsRead block not found — inspect manually")
            _skipped.append("FIX 4a: markAsRead single round-trip")

    old_dismiss = """\
    const dismiss = useCallback(async (id) => {
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(prev => prev.filter(n => n.id !== id));
            const { data } = await api.get('/notifications/unread-count');
            setUnreadCount(data.count ?? 0);
        } catch (err) {
            console.error('[useNotifications] dismiss failed:', err);
        }
    }, []);"""

    new_dismiss = """\
    const dismiss = useCallback(async (id) => {
        try {
            // Controller now returns unread_count — no need for a second fetch.
            const { data } = await api.delete(`/notifications/${id}`);
            setNotifications(prev => prev.filter(n => n.id !== id));
            setUnreadCount(data.unread_count ?? 0);
        } catch (err) {
            console.error('[useNotifications] dismiss failed:', err);
        }
    }, []);"""

    ok4b = replace_exact(path, old_dismiss, new_dismiss,
                         "FIX 4b: dismiss — remove second GET /unread-count")
    if not ok4b:
        if "data.unread_count" in read(path) and "dismiss" in read(path):
            log("  ⏭  FIX 4b already applied")
            _skipped.append("FIX 4b: dismiss single round-trip")
        else:
            log("  ⚠️  FIX 4b: expected dismiss block not found — inspect manually")
            _skipped.append("FIX 4b: dismiss single round-trip")


# ═══════════════════════════════════════════════════════════════════════════════
# FIX 4 companion — NotificationController.php
# Return unread_count from markAsRead and destroy
# ═══════════════════════════════════════════════════════════════════════════════

def fix_notification_controller(root: Path) -> None:
    path = root / "registrar-backend/app/Http/Controllers/NotificationController.php"
    log(f"\n[FIX 4c] {path.relative_to(root)} — return unread_count from mutations")

    if not path.exists():
        log("  ⚠️  file not found — skipping")
        _skipped.append("FIX 4c: NotificationController.php")
        return

    old_mark_as_read = """\
        $notification->markAsRead();

        return response()->json(['message' => 'Notification marked as read.']);
    }"""

    new_mark_as_read = """\
        $notification->markAsRead();

        return response()->json([
            'message'      => 'Notification marked as read.',
            // Return the updated count so the frontend doesn't need a second
            // GET /notifications/unread-count request after this mutation.
            'unread_count' => $this->notificationService->unreadCount($user),
        ]);
    }"""

    ok_mark = replace_exact(path, old_mark_as_read, new_mark_as_read,
                             "FIX 4c: markAsRead returns unread_count")
    if not ok_mark:
        if "unread_count" in read(path):
            log("  ⏭  FIX 4c (markAsRead) already applied")
            _skipped.append("FIX 4c: markAsRead unread_count")
        else:
            log("  ⚠️  FIX 4c (markAsRead): expected block not found — inspect manually")
            _skipped.append("FIX 4c: markAsRead unread_count")

    old_destroy = """\
        $notification->delete();

        return response()->json(['message' => 'Notification dismissed.']);
    }
}"""

    new_destroy = """\
        $notification->delete();

        return response()->json([
            'message'      => 'Notification dismissed.',
            // Return the updated count so the frontend doesn't need a second
            // GET /notifications/unread-count request after this mutation.
            'unread_count' => $this->notificationService->unreadCount($user),
        ]);
    }
}"""

    ok_destroy = replace_exact(path, old_destroy, new_destroy,
                                "FIX 4d: destroy returns unread_count")
    if not ok_destroy:
        if "unread_count" in read(path):
            log("  ⏭  FIX 4d (destroy) already applied")
            _skipped.append("FIX 4d: destroy unread_count")
        else:
            log("  ⚠️  FIX 4d (destroy): expected block not found — inspect manually")
            _skipped.append("FIX 4d: destroy unread_count")


# ═══════════════════════════════════════════════════════════════════════════════
# FIX 5  –  CATEGORY_MAP deduplication
# Create shared constants file; update imports in both components
# ═══════════════════════════════════════════════════════════════════════════════

CATEGORY_MAP_CONTENT = """\
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
  // Admin
  admin_new_request:           { category: 'Important',   color: 'bg-rose-600' },
  admin_payment_verification:  { category: 'Payment',     color: 'bg-pup-yellow' },
  admin_incomplete_request:    { category: 'Incomplete',  color: 'bg-rose-600' },
  admin_deadline_warning:      { category: 'Deadline',    color: 'bg-pup-yellow' },
};
"""


def fix_category_map(root: Path) -> None:
    constants_path = root / "registrar-frontend/src/constants/notificationCategories.js"
    modal_path     = root / "registrar-frontend/src/components/NotificationModal.jsx"
    toast_path     = root / "registrar-frontend/src/components/NotificationToast.jsx"

    log(f"\n[FIX 5] CATEGORY_MAP deduplication")

    # Create the shared file
    create_file(constants_path, CATEGORY_MAP_CONTENT,
                "FIX 5a: create src/constants/notificationCategories.js")

    # ── NotificationModal.jsx ──────────────────────────────────────────────────
    if not modal_path.exists():
        log("  ⚠️  NotificationModal.jsx not found — skipping")
        _skipped.append("FIX 5b: NotificationModal.jsx import")
    else:
        modal_old_map = """\
// -------------------------------------------------------
// Maps backend trigger_event → display category + color
// -------------------------------------------------------
const CATEGORY_MAP = {
  // Student/Alumni
  request_submitted:       { category: 'Submitted',   color: 'bg-blue-400' },
  payment_verified:        { category: 'Payment',     color: 'bg-green-400' },
  payment_invalid:         { category: 'Payment',     color: 'bg-rose-600' },
  status_updated:          { category: 'Update',      color: 'bg-blue-400' },
  request_processing:      { category: 'Processing',  color: 'bg-blue-400' },
  action_needed:           { category: 'Action',      color: 'bg-rose-600' },
  ready_to_claim:          { category: 'Ready',       color: 'bg-green-400' },
  request_completed:       { category: 'Completed',   color: 'bg-green-400' },
  request_forfeited:       { category: 'Forfeited',   color: 'bg-rose-600' },
  reminder_claim:          { category: 'Reminder',    color: 'bg-pup-yellow' },
  reminder_final_warning:  { category: 'Warning',     color: 'bg-rose-600' },
  request_closed:          { category: 'Closed',      color: 'bg-white/40' },
  request_auto_archived:   { category: 'Archived',    color: 'bg-white/40' },
  // Admin
  admin_new_request:          { category: 'Important', color: 'bg-rose-600' },
  admin_payment_verification: { category: 'Payment',   color: 'bg-pup-yellow' },
  admin_incomplete_request:   { category: 'Incomplete',color: 'bg-rose-600' },
  admin_deadline_warning:     { category: 'Deadline',  color: 'bg-pup-yellow' },
};"""

        modal_new_map = """\
// CATEGORY_MAP lives in src/constants/notificationCategories.js
// — edit it there; changes apply to both NotificationModal and NotificationToast.
import { CATEGORY_MAP } from '../constants/notificationCategories';"""

        ok5b = replace_exact(modal_path, modal_old_map, modal_new_map,
                             "FIX 5b: NotificationModal.jsx — replace inline map with import")
        if not ok5b:
            if "notificationCategories" in read(modal_path):
                log("  ⏭  FIX 5b already applied")
                _skipped.append("FIX 5b: NotificationModal.jsx import")
            else:
                log("  ⚠️  FIX 5b: CATEGORY_MAP block not found in NotificationModal.jsx — inspect manually")
                _skipped.append("FIX 5b: NotificationModal.jsx import")

    # ── NotificationToast.jsx ──────────────────────────────────────────────────
    if not toast_path.exists():
        log("  ⚠️  NotificationToast.jsx not found — skipping")
        _skipped.append("FIX 5c: NotificationToast.jsx import")
    else:
        toast_old_map = """\
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
};"""

        toast_new_map = """\
// CATEGORY_MAP lives in src/constants/notificationCategories.js
// — edit it there; changes apply to both NotificationModal and NotificationToast.
import { CATEGORY_MAP } from '../constants/notificationCategories';"""

        ok5c = replace_exact(toast_path, toast_old_map, toast_new_map,
                             "FIX 5c: NotificationToast.jsx — replace inline map with import")
        if not ok5c:
            if "notificationCategories" in read(toast_path):
                log("  ⏭  FIX 5c already applied")
                _skipped.append("FIX 5c: NotificationToast.jsx import")
            else:
                log("  ⚠️  FIX 5c: CATEGORY_MAP block not found in NotificationToast.jsx — inspect manually")
                _skipped.append("FIX 5c: NotificationToast.jsx import")


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

    fix_notification_sent(root)
    fix_notification_service(root)
    fix_use_notifications(root)
    fix_notification_controller(root)
    fix_category_map(root)

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

Backend — rebuild and restart:
  docker compose build backend
  docker compose up -d backend reverb worker broadcast-worker

  Or if you run artisan directly:
  php artisan cache:clear   ← clears the notif_type:* cache keys

Frontend — rebuild:
  cd registrar-frontend && npm run build
  (or let your dev server hot-reload automatically)

Verify the fix worked:
  1. Trigger a notification (submit a request, change a status).
  2. In the backend container logs you should see BroadcastEvent
     dispatched to the 'broadcasts' queue, not 'default'.
  3. The broadcast-worker container should log the job being picked up
     within ~1 second.
  4. Open two browser tabs (student + admin) on the same machine —
     both should receive their notifications in real time.

If you have Redis available, switching QUEUE_CONNECTION=redis gives
sub-second broadcast pickup vs the ~1-2 s database polling interval.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""")


if __name__ == "__main__":
    main()
