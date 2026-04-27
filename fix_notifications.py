#!/usr/bin/env python3
"""
fix_notifications.py
====================
Applies all notification-system fixes to the Registrar Information System.

Run from the repo root (where registrar-backend/ and registrar-frontend/ live):
    python3 fix_notifications.py

What this script fixes
----------------------
BACKEND
  1. NotificationSent event  — restore ShouldBroadcastNow so broadcasts fire
                               immediately without a queue worker.
  2. NotificationService     — sendToAdmins() targets ROLE_ADMIN only (not super_admin),
                               sendToAllExcept() kept for other use cases,
                               add sendToAdminsOnly() alias that is explicit.
  3. SendBulkNotificationJob — already correct; add ROLE_SUPER_ADMIN exclusion guard
                               so a future accidental call can never spam super admins.
  4. channels.php            — re-add admin.notifications private channel so the
                               channel auth does not 403 if it is ever subscribed to
                               (defensive; harmless if unused).
  5. start.sh                — add `php artisan queue:work` as a supervised background
                               process so queued jobs (bulk notifications, etc.) are
                               actually processed. Uses a simple restart loop so the
                               worker auto-restarts on crash.
  6. docker-compose.yml      — add a dedicated `worker` service that runs the queue
                               worker in its own container (proper production pattern).

FRONTEND
  7. useNotifications.js     — remove dead admin.notifications channel subscription
                               that was causing a 403 on every staff login.

Each fix is idempotent: running the script twice produces the same result.
"""

import re
import sys
import shutil
import textwrap
from pathlib import Path

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

RESET  = "\033[0m"
GREEN  = "\033[32m"
YELLOW = "\033[33m"
RED    = "\033[31m"
CYAN   = "\033[36m"
BOLD   = "\033[1m"

def ok(msg):   print(f"  {GREEN}✔{RESET}  {msg}")
def skip(msg): print(f"  {YELLOW}–{RESET}  {msg} (already applied)")
def err(msg):  print(f"  {RED}✘{RESET}  {msg}"); sys.exit(1)
def info(msg): print(f"\n{BOLD}{CYAN}▶ {msg}{RESET}")

def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")

def write(path: Path, content: str):
    path.write_text(content, encoding="utf-8")

def backup(path: Path):
    """Create a .bak file if one does not already exist."""
    bak = path.with_suffix(path.suffix + ".bak")
    if not bak.exists():
        shutil.copy2(path, bak)

def replace_block(content: str, old: str, new: str) -> tuple[str, bool]:
    """Return (new_content, was_changed)."""
    if old not in content:
        return content, False
    return content.replace(old, new, 1), True

# ---------------------------------------------------------------------------
# Locate project roots
# ---------------------------------------------------------------------------

def find_root() -> Path:
    cwd = Path.cwd()
    # Accept either running from repo root or from inside registrar-backend/frontend
    for candidate in [cwd, cwd.parent]:
        if (candidate / "registrar-backend").is_dir() and \
           (candidate / "registrar-frontend").is_dir():
            return candidate
    err(
        "Cannot find registrar-backend/ and registrar-frontend/ directories.\n"
        "       Run this script from the repository root."
    )

# ---------------------------------------------------------------------------
# FIX 1 — NotificationSent: ShouldBroadcast → ShouldBroadcastNow
# ---------------------------------------------------------------------------

def fix_notification_sent_event(be: Path):
    info("FIX 1 — NotificationSent: use ShouldBroadcastNow (no queue worker needed)")
    path = be / "app/Events/NotificationSent.php"
    if not path.exists():
        err(f"File not found: {path}")

    backup(path)
    content = read(path)

    # Ensure the import exists
    old_import = "use Illuminate\\Contracts\\Broadcasting\\ShouldBroadcast;"
    new_import  = (
        "use Illuminate\\Contracts\\Broadcasting\\ShouldBroadcast;\n"
        "use Illuminate\\Contracts\\Broadcasting\\ShouldBroadcastNow;"
    )

    # If ShouldBroadcastNow import is already there, skip adding it
    if "ShouldBroadcastNow" not in content:
        content, changed = replace_block(content, old_import, new_import)
        if not changed:
            # The import line might already have been edited to ShouldBroadcastNow only
            pass

    # Swap the implements clause — only if it is exactly ShouldBroadcast (not already ShouldBroadcastNow)
    if "implements ShouldBroadcastNow" in content:
        skip("NotificationSent already implements ShouldBroadcastNow")
        return

    old_impl = "class NotificationSent implements ShouldBroadcast"
    new_impl  = "class NotificationSent implements ShouldBroadcastNow"

    content, changed = replace_block(content, old_impl, new_impl)
    if changed:
        write(path, content)
        ok("NotificationSent now implements ShouldBroadcastNow")
    else:
        skip("NotificationSent already implements ShouldBroadcastNow")

# ---------------------------------------------------------------------------
# FIX 2 — NotificationService: sendToAdmins targets ROLE_ADMIN only
# ---------------------------------------------------------------------------

def fix_notification_service(be: Path):
    info("FIX 2 — NotificationService: sendToAdmins() excludes super_admin, adds clear docblock")
    path = be / "app/Services/NotificationService.php"
    if not path.exists():
        err(f"File not found: {path}")

    backup(path)
    content = read(path)

    # The correct sendToAdmins body dispatches the bulk job with onlyRoleIds = [ROLE_ADMIN]
    # which already excludes super admins. Guard: if it already contains 'ROLE_ADMIN'
    # and 'onlyRoleIds' together, it is correct.
    if "onlyRoleIds:  [SystemUser::ROLE_ADMIN]" in content or \
       "onlyRoleIds: [SystemUser::ROLE_ADMIN]" in content:
        skip("sendToAdmins() already targets ROLE_ADMIN only via SendBulkNotificationJob")
        return

    # Pattern 1: old synchronous loop (from .bak) — replace with queued dispatch
    old_sync = textwrap.dedent("""\
        public static function sendToAdmins(
            string $triggerEvent,
            array  $data      = [],
            ?int   $requestId = null,
        ): void {
            $admins = SystemUser::where('role_id', SystemUser::ROLE_ADMIN)
                ->where('status', 'Activated')->get();

            foreach ($admins as $admin) {
                self::send(
                    recipient:    $admin,
                    triggerEvent: $triggerEvent,
                    data:         $data,
                    requestId:    $requestId,
                );
            }
        }""")

    # Pattern 2: queued but sending to everyone (wrong)
    old_queued_all = textwrap.dedent("""\
        public static function sendToAdmins(
            string $triggerEvent,
            array  $data      = [],
            ?int   $requestId = null,
        ): void {
            // Dispatch to queue — loop runs in background, HTTP response is instant.
            dispatch(new SendBulkNotificationJob(
                triggerEvent: $triggerEvent,
                data:         $data,
                onlyRoleIds:  [SystemUser::ROLE_ADMIN],
                requestId:    $requestId,
            ));
        }""")

    correct_body = textwrap.dedent("""\
        public static function sendToAdmins(
            string $triggerEvent,
            array  $data      = [],
            ?int   $requestId = null,
        ): void {
            // Dispatched to the queue so the HTTP response is never blocked by the
            // loop. onlyRoleIds = [ROLE_ADMIN] explicitly excludes super admins —
            // they are not operational staff and should not receive document-request
            // noise. Super admins use analytics / audit logs instead.
            dispatch(new SendBulkNotificationJob(
                triggerEvent: $triggerEvent,
                data:         $data,
                onlyRoleIds:  [SystemUser::ROLE_ADMIN],
                requestId:    $requestId,
            ));
        }""")

    changed = False
    for old in [old_sync, old_queued_all]:
        content, did = replace_block(content, old, correct_body)
        if did:
            changed = True
            break

    if changed:
        write(path, content)
        ok("sendToAdmins() updated — targets ROLE_ADMIN only via queued bulk job")
    else:
        # Fallback: patch whatever sendToAdmins block is present with a regex
        pattern = re.compile(
            r'(public static function sendToAdmins.*?^\s*\})',
            re.DOTALL | re.MULTILINE
        )
        if pattern.search(content):
            content = pattern.sub(correct_body, content, count=1)
            write(path, content)
            ok("sendToAdmins() patched via regex — targets ROLE_ADMIN only")
        else:
            err("Could not locate sendToAdmins() in NotificationService.php")

# ---------------------------------------------------------------------------
# FIX 3 — SendBulkNotificationJob: guard against accidentally including super_admin
# ---------------------------------------------------------------------------

def fix_bulk_notification_job(be: Path):
    info("FIX 3 — SendBulkNotificationJob: add super_admin safety guard")
    path = be / "app/Jobs/SendBulkNotificationJob.php"
    if not path.exists():
        err(f"File not found: {path}")

    backup(path)
    content = read(path)

    if "SUPER_ADMIN_GUARD" in content and "Unmatched" not in content:
        # Also verify brace balance as a sanity check
        if content.count("{") == content.count("}"):
            skip("SendBulkNotificationJob already has super_admin guard")
            return

    # Write the complete correct file — avoids any regex brace mangling.
    correct = textwrap.dedent("""\
        <?php

        namespace App\\Jobs;

        use App\\Models\\SystemUser;
        use App\\Services\\NotificationService;
        use Illuminate\\Bus\\Queueable;
        use Illuminate\\Contracts\\Queue\\ShouldQueue;
        use Illuminate\\Foundation\\Bus\\Dispatchable;
        use Illuminate\\Queue\\InteractsWithQueue;
        use Illuminate\\Queue\\SerializesModels;

        /*
        |--------------------------------------------------------------------------
        | SendBulkNotificationJob
        |--------------------------------------------------------------------------
        | Dispatched by NotificationService::sendToAdmins() and sendToAllExcept()
        | so that bulk notification loops run in the background queue worker
        | instead of blocking the HTTP response.
        |
        | Each individual NotificationService::send() call inside the job still
        | saves a DB row AND fires the per-user Reverb broadcast — the only thing
        | that moved off the request thread is the outer loop.
        |--------------------------------------------------------------------------
        */
        class SendBulkNotificationJob implements ShouldQueue
        {
            use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

            /**
             * Number of times the job may be attempted before it is marked failed.
             * 3 retries with exponential back-off gives resilience without hammering
             * the DB on a transient error.
             */
            public int $tries = 3;

            /**
             * @param  string      $triggerEvent    e.g. 'admin_new_request'
             * @param  array       $data            Placeholder values for the message template
             * @param  int[]       $excludedRoleIds Role IDs to skip (empty = send to everyone)
             * @param  int[]       $onlyRoleIds     Role IDs to target (empty = all minus excluded)
             * @param  int|null    $requestId       FK to document_requests (nullable)
             */
            public function __construct(
                public readonly string $triggerEvent,
                public readonly array  $data           = [],
                public readonly array  $excludedRoleIds = [],
                public readonly array  $onlyRoleIds     = [],
                public readonly ?int   $requestId       = null,
            ) {}

            public function handle(): void
            {
                // SUPER_ADMIN_GUARD — super admins are never a bulk-notification target.
                // They rely on audit logs and the analytics dashboard instead.
                // This guard applies even if the caller forgets to exclude them.
                $query = SystemUser::where('status', 'Activated')
                    ->where('role_id', '!=', SystemUser::ROLE_SUPER_ADMIN);

                // Caller-supplied role filters are applied on top of the base guard above.
                if (!empty($this->onlyRoleIds)) {
                    $query->whereIn('role_id', $this->onlyRoleIds);
                } elseif (!empty($this->excludedRoleIds)) {
                    $query->whereNotIn('role_id', $this->excludedRoleIds);
                }

                // cursor() streams rows one at a time — no full result set in memory,
                // safe for large user tables.
                foreach ($query->cursor() as $user) {
                    NotificationService::send(
                        recipient:    $user,
                        triggerEvent: $this->triggerEvent,
                        data:         $this->data,
                        requestId:    $this->requestId,
                    );
                }
            }
        }
        """)

    write(path, correct)
    ok("SendBulkNotificationJob: rewritten cleanly with super_admin guard (brace-safe)")


def fix_channels(be: Path):
    info("FIX 4 — channels.php: ensure admin.notifications channel is defined (defensive auth)")
    path = be / "routes/channels.php"
    if not path.exists():
        err(f"File not found: {path}")

    backup(path)
    content = read(path)

    if "admin.notifications" in content and "Broadcast::channel('admin.notifications'" in content:
        skip("admin.notifications channel already defined")
        return

    admin_channel_block = textwrap.dedent("""

        /*
        |--------------------------------------------------------------------------
        | PRIVATE CHANNEL: admin.notifications
        |--------------------------------------------------------------------------
        | Shared channel for all admin users.
        | Kept here as a defensive definition — channel auth will not 403
        | if the frontend accidentally subscribes. Only admin and super_admin
        | roles are authorised to join.
        | NotificationSent currently broadcasts to personal channels only;
        | this channel is available for future shared-admin broadcasts.
        |--------------------------------------------------------------------------
        */
        Broadcast::channel('admin.notifications', function (SystemUser $user) {
            return $user->isAdmin() || $user->isSuperAdmin();
        });
        """)

    content += admin_channel_block
    write(path, content)
    ok("admin.notifications channel definition added to channels.php")

# ---------------------------------------------------------------------------
# FIX 5 — start.sh: add supervised queue worker
# ---------------------------------------------------------------------------

def fix_start_sh(be: Path):
    info("FIX 5 — start.sh: add supervised queue worker process")
    path = be / "start.sh"
    if not path.exists():
        err(f"File not found: {path}")

    backup(path)
    content = read(path)

    worker_marker = "queue:work"
    if worker_marker in content:
        skip("start.sh already contains queue worker")
        return

    # The queue worker block to inject — runs as a supervised background loop
    # so the container does not exit if the worker crashes once.
    worker_block = textwrap.dedent("""
        # -----------------------------------------------------------------------
        # Queue Worker (supervised restart loop)
        # -----------------------------------------------------------------------
        # Runs in the background so PHP-FPM + Nginx can still start normally.
        # --sleep 3     : poll interval when queue is empty (seconds)
        # --tries 3     : max attempts per job before marking it failed
        # --timeout 120 : kill worker if a single job takes longer than 2 min
        # --max-time 3600: recycle the worker process every hour to prevent
        #                  memory creep (Laravel's recommended best practice)
        # The while loop auto-restarts the worker if it exits for any reason.
        # -----------------------------------------------------------------------
        (
          while true; do
            php artisan queue:work \\
              --sleep=3 \\
              --tries=3 \\
              --timeout=120 \\
              --max-time=3600 \\
              --queue=default 2>&1 | \\
            tee -a /var/log/laravel-worker.log
            echo "[queue-worker] Process exited, restarting in 5s..." >&2
            sleep 5
          done
        ) &
        """)

    # Inject before the nginx foreground command so the worker starts
    # after migrations and optimize but before the main process blocks.
    old_nginx_line = "\n# Start Nginx in foreground\nnginx -g \"daemon off;\""
    new_nginx_section = worker_block + "\n# Start Nginx in foreground\nnginx -g \"daemon off;\""

    content, changed = replace_block(content, old_nginx_line, new_nginx_section)
    if changed:
        write(path, content)
        ok("start.sh: supervised queue worker injected before nginx foreground")
    else:
        # Append worker block just before the last nginx line via regex
        content = re.sub(
            r'(nginx -g "daemon off;")',
            worker_block.rstrip() + "\n\\1",
            content,
            count=1
        )
        write(path, content)
        ok("start.sh: queue worker injected via regex fallback")

# ---------------------------------------------------------------------------
# FIX 6 — docker-compose.yml: add dedicated worker service
# ---------------------------------------------------------------------------

DOCKER_COMPOSE_PATHS = [
    "docker-compose.yml",
    "registrar-backend/docker-compose.yml",
]

def fix_docker_compose(root: Path):
    info("FIX 6 — docker-compose.yml: add dedicated `worker` service")

    path = None
    for rel in DOCKER_COMPOSE_PATHS:
        candidate = root / rel
        if candidate.exists():
            path = candidate
            break

    if path is None:
        err("docker-compose.yml not found. Checked: " + ", ".join(DOCKER_COMPOSE_PATHS))

    backup(path)
    content = read(path)

    # Correct placement puts worker at 2-space indent (inside services:).
    # A previous broken run may have inserted it at 0-indent (root level).
    if "ris_worker" in content or "container_name: ris_worker" in content:
        correctly_placed = bool(re.search(r'^ {2}worker:', content, re.MULTILINE))
        if correctly_placed:
            skip("docker-compose.yml already has ris_worker service (correctly indented)")
            return
        # Strip the malformed root-level block so we can re-insert correctly.
        # Match: optional comment lines, then "worker:\n", then all indented lines.
        content = re.sub(
            r'\n(?:[ \t]*#[^\n]*\n)*worker:\n(?:(?:[ \t]+[^\n]*)?\n)*',
            '\n',
            content,
        )
        write(path, content)
        ok("Stripped malformed root-level worker block — re-inserting at correct indent")

    worker_service = (
        "\n"
        "  # -------------------------------------------------------\n"
        "  # Queue Worker\n"
        "  # -------------------------------------------------------\n"
        "  # Runs SendBulkNotificationJob and any other queued work.\n"
        "  # Uses the same image as the backend — no extra build step.\n"
        "  # Scale independently: docker compose up --scale worker=2\n"
        "  # -------------------------------------------------------\n"
        "  worker:\n"
        "    image: ris_backend_image\n"
        "    container_name: ris_worker\n"
        "    restart: always\n"
        "    command: >\n"
        "      sh -c 'while true; do\n"
        "        php artisan queue:work\n"
        "          --sleep=3\n"
        "          --tries=3\n"
        "          --timeout=120\n"
        "          --max-time=3600\n"
        "          --queue=default;\n"
        "        echo \"[worker] exited, restarting in 5s...\";\n"
        "        sleep 5;\n"
        "      done'\n"
        "    environment:\n"
        "      APP_ENV: ${APP_ENV:-production}\n"
        "      APP_KEY: ${APP_KEY}\n"
        "      APP_DEBUG: ${APP_DEBUG:-false}\n"
        "      APP_URL: ${APP_URL}\n"
        "      DB_CONNECTION: mysql\n"
        "      DB_HOST: ${DB_HOST}\n"
        "      DB_PORT: 3306\n"
        "      DB_DATABASE: ${DB_DATABASE}\n"
        "      DB_USERNAME: ${DB_USERNAME}\n"
        "      DB_PASSWORD: ${DB_PASSWORD}\n"
        "      QUEUE_CONNECTION: database\n"
        "      REVERB_APP_ID: ${REVERB_APP_ID}\n"
        "      REVERB_APP_KEY: ${REVERB_APP_KEY}\n"
        "      REVERB_APP_SECRET: ${REVERB_APP_SECRET}\n"
        "      REVERB_HOST: reverb\n"
        "      REVERB_PORT: ${REVERB_PORT:-8080}\n"
        "      REVERB_SCHEME: ${REVERB_SCHEME:-http}\n"
        "      BROADCAST_CONNECTION: reverb\n"
        "    depends_on:\n"
        "      backend:\n"
        "        condition: service_started\n"
        "    networks:\n"
        "      - ris_network\n"
    )

    # Insert the worker block inside services:, just before the first
    # top-level key (volumes: or networks:) — keeping correct indentation.
    inserted = False
    for top_key in ["\nvolumes:", "\nnetworks:"]:
        if top_key in content:
            content = content.replace(top_key, worker_service + top_key, 1)
            write(path, content)
            ok(f"docker-compose.yml: `worker` service inserted before `{top_key.strip()}`")
            inserted = True
            break

    if not inserted:
        content += worker_service
        write(path, content)
        ok("docker-compose.yml: `worker` service appended to end of file")

def fix_use_notifications(fe: Path):
    info("FIX 7 — useNotifications.js: remove dead admin.notifications subscription")
    path = fe / "src/hooks/useNotifications.js"
    if not path.exists():
        err(f"File not found: {path}")

    backup(path)
    content = read(path)

    if "admin.notifications" not in content:
        skip("admin.notifications subscription already removed")
        return

    # Remove the isStaff subscription block
    patterns_to_remove = [
        # Block that adds the subscription
        textwrap.dedent("""\

                if (isStaff) {
                    echo.private('admin.notifications')
                        .listen('.NotificationSent', handleNewNotification);
                }"""),
        # Cleanup block
        textwrap.dedent("""\

                if (isStaff) echo.leave('admin.notifications');"""),
        # isStaff declaration (if it becomes unused after removing the above)
        # We leave it in case it's used elsewhere in the hook.
    ]

    changed = False
    for pattern in patterns_to_remove:
        if pattern in content:
            content = content.replace(pattern, "", 1)
            changed = True

    # Also handle single-line variants
    single_line_patterns = [
        "        if (isStaff) {\n            echo.private('admin.notifications')\n                .listen('.NotificationSent', handleNewNotification);\n        }\n",
        "        if (isStaff) echo.leave('admin.notifications');\n",
        "if (isStaff) echo.leave('admin.notifications');",
    ]
    for p in single_line_patterns:
        if p in content:
            content = content.replace(p, "", 1)
            changed = True

    # Regex fallback for any remaining admin.notifications references
    if "admin.notifications" in content:
        content = re.sub(
            r'\s*if\s*\(isStaff\)\s*\{[^}]*admin\.notifications[^}]*\}\s*',
            '\n',
            content,
            flags=re.DOTALL
        )
        content = re.sub(
            r'\s*if\s*\(isStaff\)\s*echo\.leave\([\'"]admin\.notifications[\'"]\);',
            '',
            content
        )
        if "admin.notifications" not in content:
            changed = True

    if changed:
        write(path, content)
        ok("useNotifications.js: admin.notifications subscription removed")
    else:
        err("Could not remove admin.notifications from useNotifications.js — check manually")

# ---------------------------------------------------------------------------
# FIX 8 — .env: ensure QUEUE_CONNECTION is set
# ---------------------------------------------------------------------------

def fix_env(be: Path):
    info("FIX 8 — registrar-backend/.env: ensure QUEUE_CONNECTION=database")
    path = be / ".env"
    if not path.exists():
        skip(".env not found — skipping (set QUEUE_CONNECTION=database manually)")
        return

    backup(path)
    content = read(path)

    if "QUEUE_CONNECTION=" in content:
        # Already set — make sure it is not 'sync'
        if "QUEUE_CONNECTION=sync" in content:
            content = content.replace("QUEUE_CONNECTION=sync", "QUEUE_CONNECTION=database")
            write(path, content)
            ok(".env: QUEUE_CONNECTION changed from sync → database")
        else:
            skip(".env: QUEUE_CONNECTION already set")
    else:
        # Append after SESSION_LIFETIME or at end
        insert_after = "SESSION_LIFETIME="
        lines = content.splitlines(keepends=True)
        inserted = False
        for i, line in enumerate(lines):
            if line.startswith(insert_after):
                lines.insert(i + 1, "\nQUEUE_CONNECTION=database\n")
                inserted = True
                break
        if not inserted:
            lines.append("\nQUEUE_CONNECTION=database\n")
        write(path, "".join(lines))
        ok(".env: QUEUE_CONNECTION=database added")

# ---------------------------------------------------------------------------
# Summary printer
# ---------------------------------------------------------------------------

def print_summary():
    print(f"""
{BOLD}{'=' * 65}{RESET}
{BOLD}  All fixes applied. Here is what changed and why:{RESET}
{'=' * 65}

  {BOLD}1. NotificationSent.php{RESET}
     ShouldBroadcast → ShouldBroadcastNow
     Broadcasts now fire immediately in the HTTP request thread,
     not via the queue. This fixes real-time push for single-user
     notifications (status changes, request confirmations).

  {BOLD}2. NotificationService.php — sendToAdmins(){RESET}
     Dispatches SendBulkNotificationJob with onlyRoleIds=[ROLE_ADMIN].
     Super admins are explicitly excluded — they are not operational
     staff and should not receive document-request notifications.

  {BOLD}3. SendBulkNotificationJob.php{RESET}
     Added a base WHERE role_id != ROLE_SUPER_ADMIN guard so that
     no bulk job can ever accidentally notify super admins, even if
     called without explicit role filters.

  {BOLD}4. routes/channels.php{RESET}
     Re-added admin.notifications private channel definition.
     Prevents 403 errors if the frontend ever subscribes to it.
     Auth requires isAdmin() || isSuperAdmin().

  {BOLD}5. start.sh{RESET}
     Added a supervised while-loop queue worker that starts in the
     background after migrations. Auto-restarts on crash. Logs to
     /var/log/laravel-worker.log inside the container.

  {BOLD}6. docker-compose.yml{RESET}
     Added a dedicated `worker` service (ris_worker) that runs
     queue:work in its own container. This is the proper production
     pattern: scale workers independently with --scale worker=N,
     restart without affecting the web container, and observe logs
     separately with `docker compose logs -f worker`.

  {BOLD}7. useNotifications.js{RESET}
     Removed the admin.notifications Echo subscription. Each admin
     already receives their own copy of every notification via their
     personal notifications.{{user_id}} channel thanks to
     SendBulkNotificationJob. The shared channel was causing a 403
     auth error on every staff login.

  {BOLD}8. registrar-backend/.env{RESET}
     Ensured QUEUE_CONNECTION=database so the queue driver matches
     the worker container setup.

{BOLD}Next steps{RESET}
  • Run migrations to create the jobs table if not already present:
      php artisan queue:table && php artisan migrate

  • Rebuild and restart containers:
      docker compose build backend
      docker compose up -d

  • Tail worker logs:
      docker compose logs -f worker

  • All original files are backed up with a .bak extension.
{'=' * 65}
""")

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    print(f"\n{BOLD}Registrar Notification System — Fix Script{RESET}")
    print("=" * 65)

    root = find_root()
    be   = root / "registrar-backend"
    fe   = root / "registrar-frontend"

    print(f"  Root : {root}")
    print(f"  BE   : {be}")
    print(f"  FE   : {fe}")

    fix_notification_sent_event(be)
    fix_notification_service(be)
    fix_bulk_notification_job(be)
    fix_channels(be)
    fix_start_sh(be)
    fix_docker_compose(root)
    fix_use_notifications(fe)
    fix_env(be)

    print_summary()

if __name__ == "__main__":
    main()