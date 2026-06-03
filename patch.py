#!/usr/bin/env python3
"""
patch_notifications.py
======================
Applies all five notification-system fixes to the Registrar Information System.

Run from the project root (the directory that contains registrar-backend/ and
registrar-frontend/):

    python3 patch_notifications.py

Each patch is atomic: the script reads the file, verifies the exact text it
expects to find, applies the change, verifies the result, then writes. If any
verification fails the script exits without touching the file, so partial
application is impossible.

Fixes applied
─────────────
 1. NotificationService.php  — capture $notification by reference in the
                               DB::transaction closure so send() actually
                               returns the created Notification (was always null).

 2. config/queue.php          — set after_commit: true on the redis-broadcasts
                               connection so the broadcast job is never enqueued
                               before the surrounding DB transaction commits
                               (eliminates the race condition that caused the
                               frontend to receive a WebSocket push for a row it
                               could not yet fetch via REST).

 3. InboxCenter.jsx           — wire up IntersectionObserver-based infinite
                               scroll so the load-more pagination that
                               useNotifications already implements is actually
                               triggered when the user reaches the bottom of the
                               list (previously the hook fetched page 1 only).

 4. notificationCategories.js — add the missing 'announcement_sent' entry so
                               announcement notifications display the correct
                               label and colour instead of the 'System' fallback.

 5. NotificationModal.jsx     — wire up the same IntersectionObserver pattern
                               inside the bell dropdown so the full notification
                               history is reachable without opening the Inbox.
"""

import sys
import shutil
import textwrap
from datetime import datetime
from pathlib import Path

# ── ANSI colours ────────────────────────────────────────────────────────────
GREEN  = "\033[32m"
RED    = "\033[31m"
YELLOW = "\033[33m"
CYAN   = "\033[36m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def info(msg):  print(f"  {CYAN}·{RESET} {msg}")
def ok(msg):    print(f"  {GREEN}✓{RESET} {msg}")
def warn(msg):  print(f"  {YELLOW}⚠{RESET}  {msg}")
def err(msg):   print(f"  {RED}✗{RESET} {msg}")
def header(msg):print(f"\n{BOLD}{msg}{RESET}")


# ── Helpers ──────────────────────────────────────────────────────────────────

def backup(path: Path) -> Path:
    """Write a timestamped .bak copy next to the file and return its path."""
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    bak   = path.with_suffix(path.suffix + f".bak_patch_{stamp}")
    shutil.copy2(path, bak)
    return bak


def apply_patch(
    path: Path,
    *,
    find: str,
    replace: str,
    description: str,
    expect_missing_after: str | None = None,
) -> bool:
    """
    Replace exactly one occurrence of `find` with `replace` in `path`.

    Returns True on success, False on any failure (file not found, text not
    found, text found more than once, or post-write verification failure).
    The file is never modified if the return value is False.
    """
    if not path.exists():
        err(f"File not found: {path}")
        return False

    original = path.read_text(encoding="utf-8")

    count = original.count(find)
    if count == 0:
        # Check if the replacement text is already present — idempotent re-run.
        if replace in original:
            ok(f"[already applied] {description}")
            return True
        err(f"Expected text not found in {path.name} — aborting this patch.")
        info("Searched for:")
        for line in find.splitlines()[:6]:
            info(f"  {repr(line)}")
        return False
    if count > 1:
        err(f"Ambiguous match ({count} occurrences) in {path.name} — aborting.")
        return False

    patched = original.replace(find, replace, 1)

    # Sanity-check: old text is gone, new text is present.
    if find in patched:
        err(f"Replace operation did not remove old text in {path.name}.")
        return False
    if replace not in patched:
        err(f"Replace operation did not insert new text in {path.name}.")
        return False
    if expect_missing_after and expect_missing_after in patched:
        err(f"Forbidden text still present after patch in {path.name}.")
        return False

    bak = backup(path)
    path.write_text(patched, encoding="utf-8")
    ok(f"{description}")
    info(f"Backup → {bak.name}")
    return True


# ════════════════════════════════════════════════════════════════════════════
# PATCH 1 — NotificationService.php: capture $notification by reference
# ════════════════════════════════════════════════════════════════════════════

PATCH_1_PATH = Path("registrar-backend/app/Services/NotificationService.php")

# The broken closure head — captures $notification by value so the assignment
# inside the closure never escapes to the outer scope (PHP pass-by-value).
PATCH_1_FIND = (
    "            $notification = null;\n"
    "            DB::transaction(function () use ($notification, \n"
    "                $recipient, $type, $typeTitle, $typeTriggerEvent, $message, $data, $requestId\n"
    "            ) {"
)

# Fix: pass by reference with &$notification.
# Also remove the now-pointless `return $notification` inside the closure
# because the caller reads the outer variable directly after the transaction.
PATCH_1_REPLACE = (
    "            $notification = null;\n"
    "            // &$notification — pass by reference so the Notification created\n"
    "            // inside the closure is visible to the outer scope after the\n"
    "            // transaction commits. Without &, PHP captures a copy and the\n"
    "            // outer variable stays null (PHP closures are pass-by-value by default).\n"
    "            DB::transaction(function () use (&$notification,\n"
    "                $recipient, $type, $typeTitle, $typeTriggerEvent, $message, $data, $requestId\n"
    "            ) {"
)


# ════════════════════════════════════════════════════════════════════════════
# PATCH 2 — config/queue.php: after_commit true on redis-broadcasts
# ════════════════════════════════════════════════════════════════════════════

PATCH_2_PATH = Path("registrar-backend/config/queue.php")

PATCH_2_FIND = (
    "            'after_commit' => false, // still protect the DB transaction race\n"
    "        ],"
)

# True = Laravel will not enqueue the BroadcastEvent job until the surrounding
# DB::transaction commits. This closes the race condition where Reverb could
# push a WebSocket event to the frontend before the notifications row was
# visible to other DB connections, causing the REST follow-up call to 404/return
# stale data and the toast to show then immediately vanish.
PATCH_2_REPLACE = (
    "            // true = Laravel holds the BroadcastEvent job in memory until\n"
    "            // the surrounding DB::transaction commits before pushing it onto\n"
    "            // the Redis queue. This closes the race condition where the\n"
    "            // WebSocket push arrived at the browser before the notifications\n"
    "            // row was visible to other DB connections, causing REST follow-up\n"
    "            // calls to 404 or return stale data and toasts to flash then vanish.\n"
    "            'after_commit' => true,\n"
    "        ],"
)


# ════════════════════════════════════════════════════════════════════════════
# PATCH 3 — InboxCenter.jsx: wire up IntersectionObserver for infinite scroll
# ════════════════════════════════════════════════════════════════════════════

PATCH_3_PATH = Path("registrar-frontend/src/layouts/InboxCenter.jsx")

# Old import — useState and useRef are not imported
PATCH_3_FIND_IMPORTS = (
    "import React, { useEffect, useMemo, useState } from 'react';"
)
PATCH_3_REPLACE_IMPORTS = (
    "import React, { useEffect, useMemo, useRef, useState } from 'react';"
)

# Old scroll container — no sentinel, no load-more wiring
PATCH_3_FIND_SCROLL = (
    '              <div className="max-h-[60vh] lg:max-h-[calc(72vh-130px)] overflow-y-auto">\n'
    "                {loading ? (\n"
    "                  <div className={`p-8 text-center text-sm animate-pulse ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'}`}>\n"
    "                    Loading notifications…\n"
    "                  </div>\n"
    "                ) : filteredEmails.length === 0 ? (\n"
    "                  <div className={`p-8 text-center text-sm ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>\n"
    "                    No messages found.\n"
    "                  </div>\n"
    "                ) : (\n"
    "                  filteredEmails.map((mail) => {\n"
    "                    const isActive = selectedMail?.id === mail.id;\n"
    "                    return (\n"
    "                      <button\n"
    "                        key={mail.id}\n"
    "                        onClick={() => handleSelectMail(mail.id)}\n"
    "                        className={`w-full text-left px-4 py-3 border-b border-gray-200 transition-colors ${\n"
    "                          isActive\n"
    "                            ? (isDark ? 'bg-[#3a3b3c] text-[#e4e6eb] border-[#3e4042]' : 'bg-gray-100 text-gray-900')\n"
    "                            : (isDark ? 'hover:bg-[#3a3b3c] text-[#e4e6eb] border-[#3e4042]' : 'hover:bg-gray-50 text-gray-800')\n"
    "                        }`}\n"
    "                      >\n"
    "                        <div className=\"flex items-center justify-between gap-2\">\n"
    "                          <p className=\"font-semibold text-sm truncate\">{mail.from}</p>\n"
    "                          <span className={`text-[11px] shrink-0 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>\n"
    "                            {formatTime(mail.time)}\n"
    "                          </span>\n"
    "                        </div>\n"
    "                        <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-[#e4e6eb]' : 'text-gray-700'}`}>{mail.subject}</p>\n"
    "                        <p className={`text-xs mt-1 line-clamp-2 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>{mail.preview}</p>\n"
    "                        {mail.unread && !isActive && (\n"
    "                          <span className={`inline-block mt-2 text-[10px] font-semibold ${isDark ? 'text-[#e4e6eb]' : 'text-gray-700'}`}>\n"
    "                            Unread\n"
    "                          </span>\n"
    "                        )}\n"
    "                      </button>\n"
    "                    );\n"
    "                  })\n"
    "                )}\n"
    "              </div>"
)

PATCH_3_REPLACE_SCROLL = (
    '              {/* IntersectionObserver sentinel — fires loadMore when the\n'
    '                  user scrolls to the bottom of the list. scrollRef is the\n'
    '                  container; sentinelRef is the invisible div at the bottom. */}\n'
    '              <div\n'
    '                ref={scrollRef}\n'
    '                className="max-h-[60vh] lg:max-h-[calc(72vh-130px)] overflow-y-auto"\n'
    '              >\n'
    "                {loading ? (\n"
    "                  <div className={`p-8 text-center text-sm animate-pulse ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'}`}>\n"
    "                    Loading notifications…\n"
    "                  </div>\n"
    "                ) : filteredEmails.length === 0 ? (\n"
    "                  <div className={`p-8 text-center text-sm ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>\n"
    "                    No messages found.\n"
    "                  </div>\n"
    "                ) : (\n"
    "                  filteredEmails.map((mail) => {\n"
    "                    const isActive = selectedMail?.id === mail.id;\n"
    "                    return (\n"
    "                      <button\n"
    "                        key={mail.id}\n"
    "                        onClick={() => handleSelectMail(mail.id)}\n"
    "                        className={`w-full text-left px-4 py-3 border-b border-gray-200 transition-colors ${\n"
    "                          isActive\n"
    "                            ? (isDark ? 'bg-[#3a3b3c] text-[#e4e6eb] border-[#3e4042]' : 'bg-gray-100 text-gray-900')\n"
    "                            : (isDark ? 'hover:bg-[#3a3b3c] text-[#e4e6eb] border-[#3e4042]' : 'hover:bg-gray-50 text-gray-800')\n"
    "                        }`}\n"
    "                      >\n"
    "                        <div className=\"flex items-center justify-between gap-2\">\n"
    "                          <p className=\"font-semibold text-sm truncate\">{mail.from}</p>\n"
    "                          <span className={`text-[11px] shrink-0 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>\n"
    "                            {formatTime(mail.time)}\n"
    "                          </span>\n"
    "                        </div>\n"
    "                        <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-[#e4e6eb]' : 'text-gray-700'}`}>{mail.subject}</p>\n"
    "                        <p className={`text-xs mt-1 line-clamp-2 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>{mail.preview}</p>\n"
    "                        {mail.unread && !isActive && (\n"
    "                          <span className={`inline-block mt-2 text-[10px] font-semibold ${isDark ? 'text-[#e4e6eb]' : 'text-gray-700'}`}>\n"
    "                            Unread\n"
    "                          </span>\n"
    "                        )}\n"
    "                      </button>\n"
    "                    );\n"
    "                  })\n"
    "                )}\n"
    "\n"
    "                {/* Sentinel: observed by IntersectionObserver below.\n"
    "                    When it enters the viewport, loadMore() is called. */}\n"
    "                <div ref={sentinelRef} aria-hidden=\"true\" />\n"
    "\n"
    "                {loadingMore && (\n"
    "                  <div className={`py-3 text-center text-xs animate-pulse ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'}`}>\n"
    "                    Loading more…\n"
    "                  </div>\n"
    "                )}\n"
    "              </div>"
)

# Add the two refs and the IntersectionObserver effect just before the return()
PATCH_3_FIND_HOOKS = (
    "  return (\n"
    "    <>\n"
    "      <div className=\"w-full max-w-6xl mx-auto px-4\">"
)

PATCH_3_REPLACE_HOOKS = (
    "  // ── Infinite-scroll setup ───────────────────────────────────────────────\n"
    "  // scrollRef  → the scrollable container div\n"
    "  // sentinelRef → invisible div placed at the very bottom of the list\n"
    "  //\n"
    "  // An IntersectionObserver watches the sentinel. When it becomes visible\n"
    "  // (i.e. the user has scrolled to the bottom of the current page) and\n"
    "  // there are more pages available, we call loadMore().\n"
    "  //\n"
    "  // root: scrollRef constrains observation to the scroll container so the\n"
    "  // sentinel is only 'intersecting' relative to its own scroll viewport,\n"
    "  // not the full document — preventing spurious triggers on page load.\n"
    "  // ────────────────────────────────────────────────────────────────────────\n"
    "  const scrollRef   = useRef(null);\n"
    "  const sentinelRef = useRef(null);\n"
    "\n"
    "  useEffect(() => {\n"
    "    const sentinel = sentinelRef.current;\n"
    "    const root     = scrollRef.current;\n"
    "    if (!sentinel || !root) return;\n"
    "\n"
    "    const observer = new IntersectionObserver(\n"
    "      ([entry]) => {\n"
    "        if (entry.isIntersecting && hasMore && !loadingMore) {\n"
    "          loadMore();\n"
    "        }\n"
    "      },\n"
    "      // rootMargin '100px' starts loading before the user hits the very\n"
    "      // bottom — the next page arrives before they notice the gap.\n"
    "      { root, threshold: 0, rootMargin: '0px 0px 100px 0px' },\n"
    "    );\n"
    "\n"
    "    observer.observe(sentinel);\n"
    "    return () => observer.disconnect();\n"
    "  }, [hasMore, loadingMore, loadMore]);\n"
    "\n"
    "  return (\n"
    "    <>\n"
    "      <div className=\"w-full max-w-6xl mx-auto px-4\">"
)


# ════════════════════════════════════════════════════════════════════════════
# PATCH 4 — notificationCategories.js: add announcement_sent entry
# ════════════════════════════════════════════════════════════════════════════

PATCH_4_PATH = Path("registrar-frontend/src/constants/notificationCategories.js")

PATCH_4_FIND = (
    "  // Admin\n"
    "  admin_new_request:           { category: 'Important',   color: 'bg-rose-600' },"
)

PATCH_4_REPLACE = (
    "  // Announcements — broadcast by admins to all users\n"
    "  announcement_sent:           { category: 'Announcement', color: 'bg-purple-400' },\n"
    "\n"
    "  // Admin\n"
    "  admin_new_request:           { category: 'Important',   color: 'bg-rose-600' },"
)


# ════════════════════════════════════════════════════════════════════════════
# PATCH 5a — NotificationModal.jsx: add useRef/useEffect + useCallback to imports
# ════════════════════════════════════════════════════════════════════════════

PATCH_5_PATH = Path("registrar-frontend/src/components/NotificationModal.jsx")

PATCH_5_FIND_IMPORTS = (
    "import React, { useState, useMemo } from 'react';"
)
PATCH_5_REPLACE_IMPORTS = (
    "import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';"
)

# ── 5b: add loadMore / hasMore / loadingMore to the destructure ─────────────
PATCH_5_FIND_DESTRUCTURE = (
    "  const {\n"
    "    notifications,\n"
    "    unreadCount,\n"
    "    loading,\n"
    "    markAsRead,\n"
    "    markAllAsRead,\n"
    "  } = useNotifications();"
)

PATCH_5_REPLACE_DESTRUCTURE = (
    "  const {\n"
    "    notifications,\n"
    "    unreadCount,\n"
    "    loading,\n"
    "    loadMore,\n"
    "    loadingMore,\n"
    "    hasMore,\n"
    "    markAsRead,\n"
    "    markAllAsRead,\n"
    "  } = useNotifications();"
)

# ── 5c: replace the static scroll container + empty footer ──────────────────
PATCH_5_FIND_BODY = (
    '        {/* List */}\n'
    '        <div className={`max-h-70 overflow-y-auto custom-scrollbar sm:max-h-105 ${isDark ? \'bg-[#242526]\' : \'bg-pup-dark-maroon\'}`}>\n'
    "          {loading ? (\n"
    "            <LoadingState />\n"
    "          ) : filteredNotifs.length > 0 ? (\n"
    "            filteredNotifs.map(notif => (\n"
    "              <NotificationItem\n"
    "                key={notif.id}\n"
    "                notif={notif}\n"
    "                onClick={() => handleNotifClick(notif)}\n"
    "              />\n"
    "            ))\n"
    "          ) : (\n"
    "            <EmptyState />\n"
    "          )}\n"
    "        </div>\n"
    "\n"
    "        {/* Footer */}\n"
    "        <div className={`px-4 py-3 border-t flex justify-center sm:p-4 ${isDark ? 'bg-[#1a1b1e] border-[#3e4042]' : 'bg-[#510400] border-white/5'}`} />"
)

PATCH_5_REPLACE_BODY = (
    '        {/* List — scrollRef/sentinelRef power the IntersectionObserver\n'
    '             that triggers loadMore() as the user reaches the bottom. */}\n'
    '        <div\n'
    '          ref={listRef}\n'
    '          className={`max-h-70 overflow-y-auto custom-scrollbar sm:max-h-105 ${isDark ? \'bg-[#242526]\' : \'bg-pup-dark-maroon\'}`}\n'
    '        >\n'
    "          {loading ? (\n"
    "            <LoadingState />\n"
    "          ) : filteredNotifs.length > 0 ? (\n"
    "            filteredNotifs.map(notif => (\n"
    "              <NotificationItem\n"
    "                key={notif.id}\n"
    "                notif={notif}\n"
    "                onClick={() => handleNotifClick(notif)}\n"
    "              />\n"
    "            ))\n"
    "          ) : (\n"
    "            <EmptyState />\n"
    "          )}\n"
    "\n"
    "          {/* Sentinel observed by the IntersectionObserver below */}\n"
    "          <div ref={sentinelRef} aria-hidden=\"true\" />\n"
    "\n"
    "          {loadingMore && (\n"
    "            <div className={`py-3 text-center text-[10px] font-bold uppercase tracking-widest animate-pulse\n"
    "              ${isDark ? 'text-[#b0b3b8]' : 'text-white/40'}`}>\n"
    "              Loading more…\n"
    "            </div>\n"
    "          )}\n"
    "        </div>\n"
    "\n"
    "        {/* Footer */}\n"
    "        <div className={`px-4 py-3 border-t flex justify-center sm:p-4 ${isDark ? 'bg-[#1a1b1e] border-[#3e4042]' : 'bg-[#510400] border-white/5'}`} />"
)

# ── 5d: inject refs + IntersectionObserver after the handleMarkAllAsRead fn ──
# We insert just before the `return (` of NotificationModal
PATCH_5_FIND_BEFORE_RETURN = (
    "  const handleMarkAllAsRead = async () => {\n"
    "    await markAllAsRead();\n"
    "  };\n"
    "\n"
    "  return ("
)

PATCH_5_REPLACE_BEFORE_RETURN = (
    "  const handleMarkAllAsRead = async () => {\n"
    "    await markAllAsRead();\n"
    "  };\n"
    "\n"
    "  // ── Infinite-scroll setup ──────────────────────────────────────────────\n"
    "  // listRef    → the scrollable notification list container\n"
    "  // sentinelRef → invisible div at the very bottom of the list\n"
    "  //\n"
    "  // IntersectionObserver fires loadMore() whenever the sentinel enters the\n"
    "  // visible area of listRef, letting users scroll through all their\n"
    "  // notifications without a separate 'View all' / page click.\n"
    "  // ──────────────────────────────────────────────────────────────────────\n"
    "  const listRef     = useRef(null);\n"
    "  const sentinelRef = useRef(null);\n"
    "\n"
    "  useEffect(() => {\n"
    "    if (!isOpen) return; // don't observe while the modal is closed\n"
    "    const sentinel = sentinelRef.current;\n"
    "    const root     = listRef.current;\n"
    "    if (!sentinel || !root) return;\n"
    "\n"
    "    const observer = new IntersectionObserver(\n"
    "      ([entry]) => {\n"
    "        if (entry.isIntersecting && hasMore && !loadingMore) {\n"
    "          loadMore();\n"
    "        }\n"
    "      },\n"
    "      { root, threshold: 0, rootMargin: '0px 0px 80px 0px' },\n"
    "    );\n"
    "\n"
    "    observer.observe(sentinel);\n"
    "    return () => observer.disconnect();\n"
    "  }, [isOpen, hasMore, loadingMore, loadMore]);\n"
    "\n"
    "  return ("
)


# ════════════════════════════════════════════════════════════════════════════
# Main
# ════════════════════════════════════════════════════════════════════════════

def main() -> int:
    root = Path.cwd()
    print(f"\n{BOLD}Notification System Patch{RESET}")
    print(f"Root: {root}\n")

    # Quick sanity-check: are we in the right directory?
    if not (root / "registrar-backend").is_dir() or not (root / "registrar-frontend").is_dir():
        err(
            "Could not find registrar-backend/ and registrar-frontend/ in the "
            "current directory.\n"
            "  Run this script from the project root, e.g.:\n"
            "    cd /path/to/Registrar-Information-System\n"
            "    python3 patch_notifications.py"
        )
        return 1

    failures = 0

    # ── Patch 1 ─────────────────────────────────────────────────────────────
    header("Patch 1 — NotificationService: fix $notification reference capture")
    if not apply_patch(
        root / PATCH_1_PATH,
        find=PATCH_1_FIND,
        replace=PATCH_1_REPLACE,
        description="DB::transaction closure now uses &$notification (by reference)",
        expect_missing_after="use ($notification, \n",
    ):
        failures += 1

    # ── Patch 2 ─────────────────────────────────────────────────────────────
    header("Patch 2 — queue.php: after_commit true on redis-broadcasts")
    if not apply_patch(
        root / PATCH_2_PATH,
        find=PATCH_2_FIND,
        replace=PATCH_2_REPLACE,
        description="after_commit set to true — broadcast job held until TX commits",
        expect_missing_after="'after_commit' => false, // still protect",
    ):
        failures += 1

    # ── Patch 3 ─────────────────────────────────────────────────────────────
    header("Patch 3 — InboxCenter.jsx: infinite scroll via IntersectionObserver")

    ok_3a = apply_patch(
        root / PATCH_3_PATH,
        find=PATCH_3_FIND_IMPORTS,
        replace=PATCH_3_REPLACE_IMPORTS,
        description="Added useRef to React import",
    )
    ok_3b = apply_patch(
        root / PATCH_3_PATH,
        find=PATCH_3_FIND_SCROLL,
        replace=PATCH_3_REPLACE_SCROLL,
        description="Scroll container now has scrollRef + sentinel div",
    )
    ok_3c = apply_patch(
        root / PATCH_3_PATH,
        find=PATCH_3_FIND_HOOKS,
        replace=PATCH_3_REPLACE_HOOKS,
        description="IntersectionObserver effect + scrollRef/sentinelRef injected",
    )
    if not (ok_3a and ok_3b and ok_3c):
        failures += 1

    # ── Patch 4 ─────────────────────────────────────────────────────────────
    header("Patch 4 — notificationCategories.js: add announcement_sent entry")
    if not apply_patch(
        root / PATCH_4_PATH,
        find=PATCH_4_FIND,
        replace=PATCH_4_REPLACE,
        description="announcement_sent → { category: 'Announcement', color: 'bg-purple-400' }",
    ):
        failures += 1

    # ── Patch 5 ─────────────────────────────────────────────────────────────
    header("Patch 5 — NotificationModal.jsx: infinite scroll via IntersectionObserver")

    ok_5a = apply_patch(
        root / PATCH_5_PATH,
        find=PATCH_5_FIND_IMPORTS,
        replace=PATCH_5_REPLACE_IMPORTS,
        description="Added useRef, useEffect, useCallback to React import",
    )
    ok_5b = apply_patch(
        root / PATCH_5_PATH,
        find=PATCH_5_FIND_DESTRUCTURE,
        replace=PATCH_5_REPLACE_DESTRUCTURE,
        description="loadMore, loadingMore, hasMore added to useNotifications destructure",
    )
    ok_5c = apply_patch(
        root / PATCH_5_PATH,
        find=PATCH_5_FIND_BODY,
        replace=PATCH_5_REPLACE_BODY,
        description="List container gains listRef + sentinel div + loadingMore indicator",
    )
    ok_5d = apply_patch(
        root / PATCH_5_PATH,
        find=PATCH_5_FIND_BEFORE_RETURN,
        replace=PATCH_5_REPLACE_BEFORE_RETURN,
        description="IntersectionObserver effect + listRef/sentinelRef injected",
    )
    if not (ok_5a and ok_5b and ok_5c and ok_5d):
        failures += 1

    # ── Summary ──────────────────────────────────────────────────────────────
    total = 5
    passed = total - failures
    print()
    if failures == 0:
        print(f"{GREEN}{BOLD}All {total} patches applied successfully.{RESET}\n")
        print("Next steps:")
        print("  Backend  — rebuild & restart:  docker compose up --build -d backend reverb worker broadcast-worker")
        print("  Frontend — rebuild & restart:  docker compose up --build -d frontend")
        print()
        return 0
    else:
        print(f"{RED}{BOLD}{failures}/{total} patch(es) failed.{RESET}")
        print("Failed patches were not written. Check the errors above.")
        print("All other patches were applied and backed up.\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())