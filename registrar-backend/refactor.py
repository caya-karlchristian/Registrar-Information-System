#!/usr/bin/env python3
"""
Registrar Backend Refactor Script
==================================
Run from your project root (the folder that contains `app/`):

    python3 refactor.py

What this script does
----------------------
1.  Creates app/Services/AnalyticsService.php        — extracts all raw SQL from AnalyticsController
2.  Creates app/Services/AnnouncementService.php     — wraps Announcement DB + notification side-effect
3.  Creates app/Http/Resources/NotificationResource.php — replaces inline transformation closure
4.  Rewrites app/Http/Controllers/AnalyticsController.php    — now a thin HTTP adapter
5.  Rewrites app/Http/Controllers/AnnouncementController.php — delegates to AnnouncementService
6.  Rewrites app/Http/Controllers/NotificationController.php — uses NotificationResource
7.  Rewrites app/Http/Controllers/AuthController.php         — moves IdP logout into SsoAuthService
8.  Rewrites app/Http/Controllers/SystemUserController.php   — moves audit calls into AdminUserService
9.  Rewrites app/Services/AdminUserService.php               — owns audit logging for user lifecycle
10. Rewrites app/Services/Sso/SsoAuthService.php             — owns IdP logout call
11. Rewrites app/Http/Controllers/CertificationTypeController.php — adds missing validation + fixes $request->all()
12. Rewrites app/Http/Controllers/DocumentTypeController.php       — replaces $request->all() with validated()
13. Rewrites app/Http/Controllers/StudentAcademicRecordController.php — replaces $request->all()
14. Fixes  app/Services/AdminUserService.php                 — array_filter null-value bug
15. Deletes all *.php.bak files

Safety
-------
- Every file that is rewritten is first backed up to  .refactor_backup/<relative_path>
- The script prints a summary of every action taken
- Nothing is irreversible: restore from .refactor_backup/ if needed
"""

import os
import shutil
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

BACKUP_DIR = Path(".refactor_backup")


def backup(path: Path) -> None:
    if path.exists():
        dest = BACKUP_DIR / path
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, dest)


def write(path: Path, content: str) -> None:
    backup(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"  [WRITE]  {path}")


def delete(path: Path) -> None:
    if path.exists():
        backup(path)
        path.unlink()
        print(f"  [DELETE] {path}")


def abort(msg: str) -> None:
    print(f"\n[ERROR] {msg}")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Guard: must be run from the project root
# ---------------------------------------------------------------------------

if not Path("app/Http/Controllers").is_dir():
    abort(
        "Cannot find app/Http/Controllers/. "
        "Run this script from your Laravel project root "
        "(the directory that contains app/, routes/, etc.)."
    )

print("\nRegistrar Backend Refactor")
print("=" * 48)
print(f"Backups will be saved to: {BACKUP_DIR.resolve()}\n")

# ===========================================================================
# 1. app/Services/AnalyticsService.php  (NEW)
# ===========================================================================

write(
    Path("app/Services/AnalyticsService.php"),
    r"""<?php

namespace App\Services;

use App\Enums\RequestStatusEnum;
use App\Models\DocumentRequest;
use App\Models\RequestHistory;
use Illuminate\Support\Facades\DB;

/**
 * Encapsulates all analytics queries.
 *
 * AnalyticsController becomes a thin HTTP adapter that validates
 * the date-range parameter and delegates here.
 */
class AnalyticsService
{
    // -------------------------------------------------------------------------
    // Overview KPIs
    // -------------------------------------------------------------------------

    public function overview(array $range): array
    {
        [$from, $to] = $range;

        // Single query — conditional aggregates replace 5 separate COUNT calls
        $counts = DocumentRequest::whereBetween('requested_at', [$from, $to])
            ->selectRaw('
                COUNT(*) as total,
                SUM(CASE WHEN status_id = ? THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status_id = ? THEN 1 ELSE 0 END) as ready_to_claim,
                SUM(CASE WHEN status_id = ? THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status_id = ? THEN 1 ELSE 0 END) as forfeited
            ', [
                RequestStatusEnum::Processing->value,
                RequestStatusEnum::ReadyToClaim->value,
                RequestStatusEnum::Completed->value,
                RequestStatusEnum::Forfeited->value,
            ])
            ->first();

        $total     = (int) $counts->total;
        $completed = (int) $counts->completed;
        $forfeited = (int) $counts->forfeited;

        $avgProcessing = RequestHistory::whereBetween('changed_at', [$from, $to])
            ->whereNotNull('minutes_processed')
            ->avg('minutes_processed');

        // Previous period comparison
        $periodLength = $from->diffInSeconds($to);
        $prevFrom     = $from->copy()->subSeconds($periodLength);
        $prevTo       = $from->copy();

        $prev = DocumentRequest::whereBetween('requested_at', [$prevFrom, $prevTo])
            ->selectRaw('
                COUNT(*) as total,
                SUM(CASE WHEN status_id = ? THEN 1 ELSE 0 END) as completed
            ', [RequestStatusEnum::Completed->value])
            ->first();

        $prevTotal = (int) $prev->total;

        return [
            'total'                  => $total,
            'pending'                => (int) $counts->pending,
            'ready_to_claim'         => (int) $counts->ready_to_claim,
            'completed'              => $completed,
            'forfeited'              => $forfeited,
            'avg_processing_minutes' => $avgProcessing ? round($avgProcessing, 1) : null,
            'completion_rate'        => $total > 0 ? round(($completed / $total) * 100, 1) : 0,
            'forfeit_rate'           => $total > 0 ? round(($forfeited / $total) * 100, 1) : 0,
            'volume_change_pct'      => $prevTotal > 0
                ? round((($total - $prevTotal) / $prevTotal) * 100, 1)
                : null,
            'prev_total'             => $prevTotal,
        ];
    }

    // -------------------------------------------------------------------------
    // Volume trend (monthly buckets)
    // -------------------------------------------------------------------------

    public function volumeTrend(array $range): array
    {
        [$from, $to] = $range;

        $rows = DocumentRequest::select(
                DB::raw("DATE_FORMAT(requested_at, '%Y-%m') as month"),
                DB::raw('COUNT(*) as total')
            )
            ->whereBetween('requested_at', [$from, $to])
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        $filled  = [];
        $cursor  = $from->copy()->startOfMonth();

        while ($cursor->lte($to)) {
            $key      = $cursor->format('Y-m');
            $match    = $rows->firstWhere('month', $key);
            $filled[] = [
                'month' => $key,
                'label' => $cursor->format('M Y'),
                'total' => $match ? (int) $match->total : 0,
            ];
            $cursor->addMonth();
        }

        return $filled;
    }

    // -------------------------------------------------------------------------
    // Requests by document type
    // -------------------------------------------------------------------------

    public function byDocumentType(array $range): array
    {
        [$from, $to] = $range;

        // Single JOIN query — processing time included directly
        $rows = DB::table('request_document as rd')
            ->join('document_type as dt', 'rd.document_type_id', '=', 'dt.document_type_id')
            ->join('document_request as dr', 'rd.request_id', '=', 'dr.request_id')
            ->leftJoin(
                DB::raw('(
                    SELECT rd2.document_type_id,
                           ROUND(AVG(rh.minutes_processed), 1) as avg_minutes
                    FROM   request_history rh
                    JOIN   request_document rd2 ON rh.request_id = rd2.request_id
                    WHERE  rh.minutes_processed IS NOT NULL
                    GROUP  BY rd2.document_type_id
                ) as pt'),
                'pt.document_type_id',
                '=',
                'dt.document_type_id'
            )
            ->whereBetween('dr.requested_at', [$from, $to])
            ->select(
                'dt.document_type_id',
                'dt.document_name',
                DB::raw('COUNT(rd.request_document_id) as total_requests'),
                DB::raw('SUM(rd.number_of_copies) as total_copies'),
                'pt.avg_minutes as avg_processing_min'
            )
            ->groupBy('dt.document_type_id', 'dt.document_name', 'pt.avg_minutes')
            ->orderByDesc('total_requests')
            ->get();

        return $rows->map(fn ($row) => [
            'document_type_id'   => $row->document_type_id,
            'document_name'      => $row->document_name,
            'total_requests'     => (int) $row->total_requests,
            'total_copies'       => (int) $row->total_copies,
            'avg_processing_min' => $row->avg_processing_min,
        ])->all();
    }

    // -------------------------------------------------------------------------
    // Requests by status
    // -------------------------------------------------------------------------

    public function byStatus(array $range): array
    {
        [$from, $to] = $range;

        return DB::table('document_request as dr')
            ->join('request_status as rs', 'dr.status_id', '=', 'rs.status_id')
            ->whereBetween('dr.requested_at', [$from, $to])
            ->select(
                'rs.status_id',
                'rs.status_name',
                DB::raw('COUNT(*) as total')
            )
            ->groupBy('rs.status_id', 'rs.status_name')
            ->orderBy('rs.status_id')
            ->get()
            ->map(fn ($r) => [
                'status_id'   => $r->status_id,
                'status_name' => $r->status_name,
                'total'       => (int) $r->total,
            ])
            ->all();
    }

    // -------------------------------------------------------------------------
    // Processing time (by doc type and by admin)
    // -------------------------------------------------------------------------

    public function processingTime(array $range): array
    {
        [$from, $to] = $range;

        $byDocType = DB::table('request_history as rh')
            ->join('request_document as rd', 'rh.request_id', '=', 'rd.request_id')
            ->join('document_type as dt', 'rd.document_type_id', '=', 'dt.document_type_id')
            ->whereBetween('rh.changed_at', [$from, $to])
            ->whereNotNull('rh.minutes_processed')
            ->select(
                'dt.document_type_id',
                'dt.document_name',
                DB::raw('ROUND(MIN(rh.minutes_processed), 1) as min_minutes'),
                DB::raw('ROUND(AVG(rh.minutes_processed), 1) as avg_minutes'),
                DB::raw('ROUND(MAX(rh.minutes_processed), 1) as max_minutes'),
                DB::raw('COUNT(*) as sample_count')
            )
            ->groupBy('dt.document_type_id', 'dt.document_name')
            ->orderBy('avg_minutes')
            ->get();

        $byAdmin = DB::table('request_history as rh')
            ->join('users as u', 'rh.processed_by', '=', 'u.user_id')
            ->leftJoin('admin_profile as ap', 'u.user_id', '=', 'ap.user_id')
            ->whereBetween('rh.changed_at', [$from, $to])
            ->whereNotNull('rh.minutes_processed')
            ->select(
                'u.user_id',
                'u.email',
                DB::raw("CONCAT(COALESCE(ap.first_name,''), ' ', COALESCE(ap.last_name,'')) as display_name"),
                DB::raw('ROUND(AVG(rh.minutes_processed), 1) as avg_minutes'),
                DB::raw('COUNT(*) as requests_handled')
            )
            ->groupBy('u.user_id', 'u.email', 'ap.first_name', 'ap.last_name')
            ->orderBy('avg_minutes')
            ->get();

        return [
            'by_document_type' => $byDocType,
            'by_admin'         => $byAdmin,
        ];
    }

    // -------------------------------------------------------------------------
    // Peak hours heatmap
    // -------------------------------------------------------------------------

    public function peakHours(array $range): array
    {
        [$from, $to] = $range;

        $rows = DocumentRequest::select(
                DB::raw('HOUR(requested_at) as hour'),
                DB::raw('COUNT(*) as total')
            )
            ->whereBetween('requested_at', [$from, $to])
            ->groupBy('hour')
            ->orderBy('hour')
            ->pluck('total', 'hour');

        $hours = [];
        for ($h = 0; $h < 24; $h++) {
            $hours[] = [
                'hour'  => $h,
                'label' => sprintf('%02d:00', $h),
                'total' => (int) ($rows[$h] ?? 0),
            ];
        }

        return $hours;
    }

    // -------------------------------------------------------------------------
    // Requests by purpose
    // -------------------------------------------------------------------------

    public function byPurpose(array $range): array
    {
        [$from, $to] = $range;

        return DB::table('document_request as dr')
            ->join('request_purpose as rp', 'dr.request_purpose_id', '=', 'rp.request_purpose_id')
            ->whereBetween('dr.requested_at', [$from, $to])
            ->select(
                'rp.request_purpose_id',
                'rp.purpose_name',
                DB::raw('COUNT(*) as total')
            )
            ->groupBy('rp.request_purpose_id', 'rp.purpose_name')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($r) => [
                'purpose_id'   => $r->request_purpose_id,
                'purpose_name' => $r->purpose_name,
                'total'        => (int) $r->total,
            ])
            ->all();
    }
}
""",
)

# ===========================================================================
# 2. app/Services/AnnouncementService.php  (NEW)
# ===========================================================================

write(
    Path("app/Services/AnnouncementService.php"),
    r"""<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\SystemUser;

/**
 * Owns the business logic for announcements.
 *
 * Creating an announcement has a side-effect (broadcast notification
 * to all non-superadmin users). That side-effect belongs here, not
 * in the controller, so the controller stays a thin HTTP adapter.
 */
class AnnouncementService
{
    public function create(array $validated, SystemUser $author): Announcement
    {
        $announcement = Announcement::create([
            'title'      => $validated['title'],
            'content'    => $validated['content'],
            'enabled'    => true,
            'created_by' => $author->user_id,
        ]);

        NotificationService::sendToAllExcept(
            excludedRoleIds: [SystemUser::ROLE_SUPER_ADMIN],
            triggerEvent:    'announcement_published',
            data: [
                'announcement_id'      => $announcement->id,
                'announcement_title'   => $announcement->title,
                'announcement_content' => $announcement->content,
            ],
        );

        return $announcement;
    }
}
""",
)

# ===========================================================================
# 3. app/Http/Resources/NotificationResource.php  (NEW)
# ===========================================================================

write(
    Path("app/Http/Resources/NotificationResource.php"),
    r"""<?php

namespace App\Http\Resources;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Transforms a single Notification model into the API shape.
 *
 * Previously this was an anonymous closure inside
 * NotificationController::index(). Extracting it here lets
 * it be reused, tested, and changed in one place.
 *
 * Requires the 'type' relation to be eager-loaded before use.
 */
class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var Notification $this */
        return [
            'id'         => $this->id,
            'title'      => $this->type->title,
            'message'    => $this->data['message'] ?? '',
            'type'       => $this->type->trigger_event,
            'request_id' => $this->request_id,
            'read_at'    => $this->read_at?->toISOString(),
            'created_at' => $this->created_at->toISOString(),
            'is_unread'  => is_null($this->read_at),
            'announcement' => isset($this->data['announcement_id']) ? [
                'id'      => $this->data['announcement_id'],
                'title'   => $this->data['announcement_title'],
                'content' => $this->data['announcement_content'],
            ] : null,
        ];
    }
}
""",
)

# ===========================================================================
# 4. AnalyticsController  (REWRITE — thin adapter)
# ===========================================================================

write(
    Path("app/Http/Controllers/AnalyticsController.php"),
    r"""<?php

namespace App\Http\Controllers;

use App\Services\AnalyticsService;
use Illuminate\Http\Request;

/**
 * Analytics HTTP adapter.
 *
 * Responsibilities: parse the ?range query param, delegate to
 * AnalyticsService, return JSON. No raw SQL lives here.
 */
class AnalyticsController extends Controller
{
    public function __construct(private AnalyticsService $analytics) {}

    // -------------------------------------------------------
    // Shared date-range parser
    // Accepts ?range=today|week|month|year|all (default: month)
    // Returns [Carbon $from, Carbon $to]
    // -------------------------------------------------------
    private function dateRange(Request $request): array
    {
        $to   = now();
        $from = match ($request->query('range', 'month')) {
            'today' => now()->startOfDay(),
            'week'  => now()->startOfWeek(),
            'year'  => now()->startOfYear(),
            'all'   => now()->subYears(100),   // full history, not arbitrary 10 yrs
            default => now()->startOfMonth(),
        };
        return [$from, $to];
    }

    public function overview(Request $request)
    {
        return response()->json($this->analytics->overview($this->dateRange($request)));
    }

    public function volumeTrend(Request $request)
    {
        return response()->json($this->analytics->volumeTrend($this->dateRange($request)));
    }

    public function byDocumentType(Request $request)
    {
        return response()->json($this->analytics->byDocumentType($this->dateRange($request)));
    }

    public function byStatus(Request $request)
    {
        return response()->json($this->analytics->byStatus($this->dateRange($request)));
    }

    public function processingTime(Request $request)
    {
        return response()->json($this->analytics->processingTime($this->dateRange($request)));
    }

    public function peakHours(Request $request)
    {
        return response()->json($this->analytics->peakHours($this->dateRange($request)));
    }

    public function byPurpose(Request $request)
    {
        return response()->json($this->analytics->byPurpose($this->dateRange($request)));
    }
}
""",
)

# ===========================================================================
# 5. AnnouncementController  (REWRITE — delegates to AnnouncementService)
# ===========================================================================

write(
    Path("app/Http/Controllers/AnnouncementController.php"),
    r"""<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Services\AnnouncementService;
use Illuminate\Http\Request;

/**
 * Announcement HTTP adapter.
 *
 * Creating an announcement also broadcasts a notification to all
 * non-superadmin users. That side-effect is owned by
 * AnnouncementService — this controller stays a thin HTTP layer.
 */
class AnnouncementController extends Controller
{
    public function __construct(private AnnouncementService $announcementService) {}

    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 4);

        return response()->json(
            Announcement::latest()->paginate($perPage)
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'   => 'required|string|max:255',
            'content' => 'required|string',
        ]);

        $announcement = $this->announcementService->create($validated, $request->user());

        return response()->json($announcement, 201);
    }

    public function show(Announcement $announcement)
    {
        return response()->json($announcement);
    }

    public function update(Request $request, Announcement $announcement)
    {
        $validated = $request->validate([
            'title'   => 'sometimes|string|max:255',
            'content' => 'sometimes|string',
            'enabled' => 'sometimes|boolean',
        ]);

        $announcement->update($validated);

        return response()->json($announcement);
    }

    public function destroy(Announcement $announcement)
    {
        $announcement->delete();

        return response()->json(['message' => 'Announcement deleted.']);
    }
}
""",
)

# ===========================================================================
# 6. NotificationController  (REWRITE — uses NotificationResource)
# ===========================================================================

write(
    Path("app/Http/Controllers/NotificationController.php"),
    r"""<?php

namespace App\Http\Controllers;

use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use App\Models\SystemUser;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Notification HTTP adapter.
 *
 * All response shaping is delegated to NotificationResource.
 */
class NotificationController extends Controller
{
    // -------------------------------------------------------
    // GET /notifications
    // -------------------------------------------------------
    public function index(Request $request): JsonResponse
    {
        /** @var SystemUser $user */
        $user = $request->user();

        $query = Notification::with('type')
            ->where('notifiable_type', SystemUser::class)
            ->where('notifiable_id', $user->user_id)
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'desc');

        if ($request->boolean('unread_only')) {
            $query->whereNull('read_at');
        }

        // NotificationResource::collection preserves pagination metadata
        return response()->json(
            NotificationResource::collection($query->paginate(20))
        );
    }

    // -------------------------------------------------------
    // GET /notifications/unread-count
    // -------------------------------------------------------
    public function unreadCount(Request $request): JsonResponse
    {
        /** @var SystemUser $user */
        $user = $request->user();

        return response()->json([
            'count' => NotificationService::unreadCount($user),
        ]);
    }

    // -------------------------------------------------------
    // POST /notifications/{id}/read
    // -------------------------------------------------------
    public function markAsRead(Request $request, string $id): JsonResponse
    {
        /** @var SystemUser $user */
        $user = $request->user();

        $notification = Notification::where('id', $id)
            ->where('notifiable_type', SystemUser::class)
            ->where('notifiable_id', $user->user_id)
            ->whereNull('deleted_at')
            ->firstOrFail();

        $notification->markAsRead();

        return response()->json(['message' => 'Notification marked as read.']);
    }

    // -------------------------------------------------------
    // POST /notifications/read-all
    // -------------------------------------------------------
    public function markAllAsRead(Request $request): JsonResponse
    {
        /** @var SystemUser $user */
        $user = $request->user();

        NotificationService::markAllAsRead($user);

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    // -------------------------------------------------------
    // DELETE /notifications/{id}
    // -------------------------------------------------------
    public function destroy(Request $request, string $id): JsonResponse
    {
        /** @var SystemUser $user */
        $user = $request->user();

        $notification = Notification::where('id', $id)
            ->where('notifiable_type', SystemUser::class)
            ->where('notifiable_id', $user->user_id)
            ->whereNull('deleted_at')
            ->firstOrFail();

        $notification->delete();

        return response()->json(['message' => 'Notification dismissed.']);
    }
}
""",
)

# ===========================================================================
# 7. AuthController  (REWRITE — IdP logout moved into SsoAuthService)
# ===========================================================================

write(
    Path("app/Http/Controllers/AuthController.php"),
    r"""<?php

namespace App\Http\Controllers;

use App\Exceptions\IdpException;
use App\Http\Resources\UserResource;
use App\Services\Sso\SsoAuthService;
use Illuminate\Http\Request;

/**
 * Authentication controller.
 *
 * Handles login (credential-based), logout, and /me.
 * All SSO orchestration — including IdP token revocation and
 * audit logging — is delegated to SsoAuthService.
 */
class AuthController extends Controller
{
    public function __construct(private SsoAuthService $ssoAuthService) {}

    // -------------------------------------------------------------------------
    // POST /api/login
    // -------------------------------------------------------------------------
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        try {
            $result = $this->ssoAuthService->loginWithCredentials(
                $request->input('email'),
                $request->input('password'),
                $request
            );

            return response()->json(['token' => $result['token']]);

        } catch (IdpException $e) {
            return response()->json(['message' => $e->getMessage()], $e->getCode() ?: 401);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }
    }

    // -------------------------------------------------------------------------
    // GET /api/me
    // -------------------------------------------------------------------------
    public function me(Request $request)
    {
        $user = $request->user();
        $user->loadIdentityRelations();
        return new UserResource($user);
    }

    // -------------------------------------------------------------------------
    // POST /api/logout
    // -------------------------------------------------------------------------
    public function logout(Request $request)
    {
        $logoutUrl = $this->ssoAuthService->logout($request->user(), $request);

        return response()->json(['logout_url' => $logoutUrl]);
    }
}
""",
)

# ===========================================================================
# 8. SystemUserController  (REWRITE — audit calls moved into AdminUserService)
# ===========================================================================

write(
    Path("app/Http/Controllers/SystemUserController.php"),
    r"""<?php

namespace App\Http\Controllers;

use App\Exceptions\IdpException;
use App\Http\Resources\UserResource;
use App\Models\SystemUser;
use App\Services\AdminUserService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

/**
 * System user management controller (admin / superadmin accounts only).
 *
 * Delegates all IdP + DB + audit-log coordination to AdminUserService.
 */
class SystemUserController extends Controller
{
    private const MANAGEABLE_ROLES = [
        SystemUser::ROLE_ADMIN,
        SystemUser::ROLE_SUPER_ADMIN,
    ];

    public function __construct(private AdminUserService $adminUserService) {}

    // -------------------------------------------------------------------------
    // GET /system-users
    // -------------------------------------------------------------------------
    public function index()
    {
        $users = SystemUser::whereIn('role_id', self::MANAGEABLE_ROLES)
            ->with('adminProfile')
            ->paginate(20);

        return UserResource::collection($users);
    }

    // -------------------------------------------------------------------------
    // GET /system-users/{id}
    // -------------------------------------------------------------------------
    public function show($id)
    {
        $user = SystemUser::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if (!in_array($user->role_id, self::MANAGEABLE_ROLES)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return new UserResource($user);
    }

    // -------------------------------------------------------------------------
    // POST /system-users
    // -------------------------------------------------------------------------
    public function store(Request $request)
    {
        $validated = $request->validate([
            'email'       => 'required|email|unique:users,email',
            'password'    => ['required', Password::min(8)->mixedCase()->numbers()],
            'role_id'     => 'required|integer|in:3,4',
            'first_name'  => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name'   => 'required|string|max:100',
            'suffix'      => 'nullable|string|max:20',
        ]);

        try {
            // Audit logging is handled inside AdminUserService::create()
            $user = $this->adminUserService->create($validated, $request);
        } catch (IdpException $e) {
            return response()->json([
                'message' => 'Failed to create user in identity provider.',
                'detail'  => $e->getMessage(),
            ], 500);
        }

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    // -------------------------------------------------------------------------
    // PUT /system-users/{id}
    // -------------------------------------------------------------------------
    public function update(Request $request, $id)
    {
        $user = SystemUser::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if (!in_array($user->role_id, self::MANAGEABLE_ROLES)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'email'       => 'sometimes|email|unique:users,email,' . $user->user_id . ',user_id',
            'password'    => ['sometimes', Password::min(8)->mixedCase()->numbers()],
            'role_id'     => 'sometimes|integer|in:3,4',
            'status'      => 'sometimes|in:Activated,Deactivated',
            'first_name'  => 'sometimes|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name'   => 'sometimes|string|max:100',
            'suffix'      => 'nullable|string|max:20',
        ]);

        try {
            // Audit logging is handled inside AdminUserService::update()
            $user = $this->adminUserService->update($user, $validated, $request);
        } catch (IdpException $e) {
            return response()->json(['message' => 'Failed to sync with identity provider.', 'detail' => $e->getMessage()], 500);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update user.'], 500);
        }

        return new UserResource($user);
    }

    // -------------------------------------------------------------------------
    // DELETE /system-users/{id}
    // -------------------------------------------------------------------------
    public function destroy(Request $request, $id)
    {
        $user = SystemUser::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if (!in_array($user->role_id, self::MANAGEABLE_ROLES)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($user->user_id === $request->user()->user_id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 403);
        }

        // Audit logging is handled inside AdminUserService::delete()
        $this->adminUserService->delete($user, $request);

        return response()->json(['message' => 'User deleted successfully'], 200);
    }
}
""",
)

# ===========================================================================
# 9. AdminUserService  (REWRITE — owns audit logging + fixes array_filter bug)
# ===========================================================================

write(
    Path("app/Services/AdminUserService.php"),
    r"""<?php

namespace App\Services;

use App\Exceptions\IdpException;
use App\Models\AuditLog;
use App\Models\SystemUser;
use App\Services\Sso\IdpClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

/**
 * Handles admin/superadmin account lifecycle.
 *
 * Owns IdP + DB coordination AND audit logging so controllers
 * stay thin HTTP adapters with no cross-cutting concerns.
 *
 * All mutations are wrapped in DB transactions so a failed IdP
 * call never leaves the local DB in a partial state.
 *
 * Bug fixed: array_filter() previously used the default callback
 * which drops all falsy values (0, '', false). Changed to an
 * explicit !== null check so legitimate falsy values are kept.
 */
class AdminUserService
{
    public function __construct(private IdpClient $idpClient) {}

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    /**
     * @throws IdpException|\Exception
     */
    public function create(array $validated, Request $request): SystemUser
    {
        $idpRoleMap = [
            SystemUser::ROLE_ADMIN       => 'RIS:admin',
            SystemUser::ROLE_SUPER_ADMIN => 'RIS:superadmin',
        ];

        $adminToken = $this->idpClient->getSuperAdminToken();

        $idpId = $this->idpClient->createUser([
            'email'       => $validated['email'],
            'first_name'  => $validated['first_name'],
            'middle_name' => $validated['middle_name'] ?? '',
            'last_name'   => $validated['last_name'],
            'password'    => $validated['password'],
            'roles'       => [$idpRoleMap[$validated['role_id']]],
        ], $adminToken);

        $user = DB::transaction(function () use ($validated, $idpId) {
            $user = SystemUser::create([
                'email'       => $validated['email'],
                'password'    => Hash::make($validated['password']),
                'role_id'     => $validated['role_id'],
                'status'      => 'Activated',
                'idp_user_id' => $idpId,
            ]);

            DB::table('admin_profile')->insert([
                'user_id'     => $user->user_id,
                'first_name'  => $validated['first_name'],
                'middle_name' => $validated['middle_name'] ?? null,
                'last_name'   => $validated['last_name'],
                'suffix'      => $validated['suffix'] ?? null,
            ]);

            return $user;
        });

        AuditLogger::log($request, $user, AuditLog::ACTION_ADMIN_CREATED);

        return $user;
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    /**
     * @throws \Exception
     */
    public function update(SystemUser $user, array $validated, Request $request): SystemUser
    {
        if ($user->idp_user_id) {
            $adminToken = $this->idpClient->getSuperAdminToken();

            if (isset($validated['status'])) {
                $idpStatus = $validated['status'] === 'Activated' ? 'active' : 'disabled';
                $this->idpClient->updateUserStatus($user->idp_user_id, $idpStatus, $adminToken);
            }

            if (isset($validated['password'])) {
                $this->idpClient->updateUserPassword($user->idp_user_id, $validated['password'], $adminToken);
            }
        }

        $user = DB::transaction(function () use ($user, $validated) {
            // FIX: was array_filter($arr) — default callback drops falsy values
            // like 0 or ''. Using !== null keeps all intentionally-set values.
            $userFields = array_filter([
                'email'    => $validated['email']    ?? null,
                'password' => isset($validated['password']) ? Hash::make($validated['password']) : null,
                'role_id'  => $validated['role_id']  ?? null,
                'status'   => $validated['status']   ?? null,
            ], fn ($v) => !is_null($v));

            $profileFields = array_filter([
                'first_name'  => $validated['first_name']  ?? null,
                'middle_name' => $validated['middle_name'] ?? null,
                'last_name'   => $validated['last_name']   ?? null,
                'suffix'      => $validated['suffix']      ?? null,
            ], fn ($v) => !is_null($v));

            if (!empty($userFields)) {
                $user->update($userFields);
            }

            if (!empty($profileFields)) {
                DB::table('admin_profile')
                    ->where('user_id', $user->user_id)
                    ->update($profileFields);
            }

            return $user->fresh();
        });

        AuditLogger::log($request, $user, AuditLog::ACTION_ADMIN_UPDATED);

        return $user;
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    public function delete(SystemUser $user, Request $request): void
    {
        // Audit BEFORE delete so we still have the actor context
        AuditLogger::log($request, $request->user(), AuditLog::ACTION_ADMIN_DELETED);

        if ($user->idp_user_id) {
            try {
                $adminToken = $this->idpClient->getSuperAdminToken();
                $this->idpClient->deleteUser($user->idp_user_id, $adminToken);
            } catch (\Exception $e) {
                Log::warning('AdminUserService: IdP delete failed', [
                    'user_id' => $user->user_id,
                    'error'   => $e->getMessage(),
                ]);
            }
        }

        $user->delete();
    }
}
""",
)

# ===========================================================================
# 10. SsoAuthService  (REWRITE — owns logout + audit log for login/logout)
# ===========================================================================

write(
    Path("app/Services/Sso/SsoAuthService.php"),
    r"""<?php

namespace App\Services\Sso;

use App\Exceptions\IdpException;
use App\Models\AuditLog;
use App\Models\SystemUser;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Orchestrates all SSO authentication flows.
 *
 * - loginWithCredentials: authenticates against the IdP, provisions
 *   the local user, issues a Sanctum token, and writes an audit log.
 * - logout: revokes the IdP token, deletes Sanctum tokens, writes
 *   an audit log, and returns the IdP logout URL for the frontend.
 *
 * AuthController stays a thin HTTP adapter — no IdP calls or
 * audit logs happen there.
 */
class SsoAuthService
{
    public function __construct(
        private IdpClient            $idpClient,
        private UserProvisioningService $provisioner,
    ) {}

    /**
     * Authenticate with email + password via the IdP.
     *
     * @return array{token: string, user: SystemUser}
     * @throws IdpException|\RuntimeException
     */
    public function loginWithCredentials(
        string  $email,
        string  $password,
        Request $request,
    ): array {
        $idpResponse = $this->idpClient->login($email, $password);

        $result = $this->provisioner->provision($idpResponse);

        /** @var SystemUser $user */
        $user = $result->user;

        if ($result->wasRejected()) {
            throw new \RuntimeException($result->rejectionReason(), 403);
        }

        // Persist IdP token on the local user for later logout
        $user->update([
            'idp_access_token' => $idpResponse['access_token'] ?? null,
            'idp_user_id'      => $idpResponse['user_id']      ?? $user->idp_user_id,
        ]);

        $token = $user->createToken('sanctum')->plainTextToken;

        AuditLogger::log($request, $user, AuditLog::ACTION_LOGIN);

        return ['token' => $token, 'user' => $user];
    }

    /**
     * Log the user out.
     *
     * Revokes the IdP session (best-effort), deletes all Sanctum tokens,
     * writes an audit log, and returns the IdP logout URL.
     *
     * @return string  The IdP logout URL to redirect the frontend to.
     */
    public function logout(SystemUser $user, Request $request): string
    {
        AuditLogger::log($request, $user, AuditLog::ACTION_LOGOUT);

        if ($user->idp_access_token) {
            try {
                $this->idpClient->logout($user->idp_access_token, $user->idp_user_id);
            } catch (\Exception $e) {
                // Non-fatal — local session is still cleared below
                Log::warning('SSO: logout call failed', ['error' => $e->getMessage()]);
            }
        }

        $user->tokens()->delete();

        return config('sso.base_url') . '/logout?' . http_build_query([
            'client_id' => config('sso.client_id'),
        ]);
    }
}
""",
)

# ===========================================================================
# 11. CertificationTypeController  (REWRITE — validation + no $request->all())
# ===========================================================================

write(
    Path("app/Http/Controllers/CertificationTypeController.php"),
    r"""<?php

namespace App\Http\Controllers;

use App\Models\CertificationType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Certification type management.
 *
 * All mutations use explicit validation — no mass assignment from
 * raw request data ($request->all() removed).
 */
class CertificationTypeController extends Controller
{
    private function certColumns(): array
    {
        return [
            'certificate_type_id',
            'certificate_name',
            'certificate_requirements',
            'certificate_process_period',
            'access_id',
            'layout_header_left_url',
            'layout_header_right_url',
            'layout_footer_urls',
            'layout_header_logo_size',
            'layout_footer_logo_size',
        ];
    }

    private function freshRecord(int $id): CertificationType
    {
        return CertificationType::query()
            ->select($this->certColumns())
            ->where('certificate_type_id', $id)
            ->first();
    }

    public function layouts()
    {
        return response()->json(
            CertificationType::query()
                ->select($this->certColumns())
                ->orderBy('certificate_name')
                ->get(),
            200
        );
    }

    public function index()
    {
        return response()->json(
            CertificationType::query()->select($this->certColumns())->get(),
            200
        );
    }

    public function show($id)
    {
        $cert = CertificationType::find($id);
        if (!$cert) {
            return response()->json(['message' => 'Certification type not found'], 404);
        }

        return response()->json($this->freshRecord($id), 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'certificate_name'           => 'required|string|max:255',
            'certificate_requirements'   => 'nullable|string',
            'certificate_process_period' => 'nullable|string|max:100',
            'access_id'                  => 'nullable|integer',
        ]);

        $cert = CertificationType::create($validated);

        return response()->json($this->freshRecord($cert->certificate_type_id), 201);
    }

    public function update(Request $request, $id)
    {
        $cert = CertificationType::find($id);
        if (!$cert) {
            return response()->json(['message' => 'Certification type not found'], 404);
        }

        $validated = $request->validate([
            'certificate_name'           => 'sometimes|string|max:255',
            'certificate_requirements'   => 'nullable|string',
            'certificate_process_period' => 'nullable|string|max:100',
            'access_id'                  => 'nullable|integer',
        ]);

        $cert->update($validated);

        return response()->json($this->freshRecord($id), 200);
    }

    public function destroy($id)
    {
        $cert = CertificationType::find($id);
        if (!$cert) {
            return response()->json(['message' => 'Certification type not found'], 404);
        }

        $cert->delete();

        return response()->json(['message' => 'Certification type deleted'], 200);
    }

    public function updateLayout(Request $request, $id)
    {
        $cert = CertificationType::find($id);
        if (!$cert) {
            return response()->json(['message' => 'Certification type not found'], 404);
        }

        $validated = $request->validate([
            'layout_header_left_url'  => 'nullable|string|max:2048',
            'layout_header_right_url' => 'nullable|string|max:2048',
            'layout_footer_urls'      => 'nullable|array',
            'layout_footer_urls.*'    => 'string|max:2048',
            'layout_header_logo_size' => 'nullable|integer|min:24|max:240',
            'layout_footer_logo_size' => 'nullable|integer|min:16|max:240',
        ]);

        if (array_key_exists('layout_footer_urls', $validated) && $validated['layout_footer_urls'] === null) {
            $validated['layout_footer_urls'] = [];
        }

        $cert->update($validated);

        return response()->json([
            'message' => 'Certification layout updated successfully',
            'data'    => $cert->fresh(),
        ], 200);
    }

    public function uploadLayoutLogo(Request $request, $id)
    {
        $cert = CertificationType::find($id);
        if (!$cert) {
            return response()->json(['message' => 'Certification type not found'], 404);
        }

        $validated = $request->validate([
            'logo' => 'required|image|max:4096',
            'slot' => 'nullable|in:header_left,header_right,footer',
        ]);

        $slot = $validated['slot'] ?? 'footer';
        $path = $request->file('logo')->store("certification-layouts/{$id}/{$slot}", 'public');

        return response()->json([
            'message' => 'Logo uploaded successfully',
            'data'    => [
                'slot' => $slot,
                'path' => $path,
                'url'  => Storage::url($path),
            ],
        ], 201);
    }
}
""",
)

# ===========================================================================
# 12. DocumentTypeController  (REWRITE — replace $request->all() with validated)
# ===========================================================================

write(
    Path("app/Http/Controllers/DocumentTypeController.php"),
    r"""<?php

namespace App\Http\Controllers;

use App\Models\DocumentType;
use Illuminate\Http\Request;

class DocumentTypeController extends Controller
{
    public function index()
    {
        return response()->json(DocumentType::all(), 200);
    }

    public function show($id)
    {
        $docType = DocumentType::find($id);
        if (!$docType) {
            return response()->json(['message' => 'Document type not found'], 404);
        }

        return response()->json($docType, 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'document_name'           => 'required|string|max:100',
            'document_description'    => 'nullable|string',
            'document_requirements'   => 'nullable|string',
            'document_process_period' => 'nullable|string|max:100',
            'access_id'               => 'nullable|integer',
        ]);

        $docType = DocumentType::create($validated);

        return response()->json($docType, 201);
    }

    public function update(Request $request, $id)
    {
        $docType = DocumentType::find($id);
        if (!$docType) {
            return response()->json(['message' => 'Document type not found'], 404);
        }

        $validated = $request->validate([
            'document_name'           => 'sometimes|string|max:100',
            'document_description'    => 'nullable|string',
            'document_requirements'   => 'nullable|string',
            'document_process_period' => 'nullable|string|max:100',
            'access_id'               => 'nullable|integer',
        ]);

        $docType->update($validated);

        return response()->json($docType, 200);
    }

    public function destroy($id)
    {
        $docType = DocumentType::find($id);
        if (!$docType) {
            return response()->json(['message' => 'Document type not found'], 404);
        }

        $docType->delete();

        return response()->json(['message' => 'Document type deleted'], 200);
    }
}
""",
)

# ===========================================================================
# 13. StudentAcademicRecordController  (REWRITE — replace $request->all())
# ===========================================================================

write(
    Path("app/Http/Controllers/StudentAcademicRecordController.php"),
    r"""<?php

namespace App\Http\Controllers;

use App\Models\StudentAcademicRecord;
use Illuminate\Http\Request;

class StudentAcademicRecordController extends Controller
{
    public function index()
    {
        return response()->json(
            StudentAcademicRecord::with('studentProfile')->paginate(50),
            200
        );
    }

    public function show($id)
    {
        $record = StudentAcademicRecord::with('studentProfile')->find($id);
        if (!$record) {
            return response()->json(['message' => 'Record not found'], 404);
        }

        return response()->json($record, 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'student_profile_id'       => 'required|integer|exists:student_profile,student_profile_id',
            'student_number'           => 'required|string|max:50',
            'course'                   => 'required|string|max:255',
            'year_level'               => 'nullable|string|max:50',
            'school_year_admitted'     => 'nullable|string|max:20',
            'last_school_year_attended'=> 'nullable|string|max:20',
            'has_honorable_dismissal'  => 'nullable|boolean',
            'graduation_date'          => 'nullable|date',
        ]);

        $record = StudentAcademicRecord::create($validated);

        return response()->json($record, 201);
    }

    public function update(Request $request, $id)
    {
        $record = StudentAcademicRecord::find($id);
        if (!$record) {
            return response()->json(['message' => 'Record not found'], 404);
        }

        $validated = $request->validate([
            'student_number'           => 'sometimes|string|max:50',
            'course'                   => 'sometimes|string|max:255',
            'year_level'               => 'nullable|string|max:50',
            'school_year_admitted'     => 'nullable|string|max:20',
            'last_school_year_attended'=> 'nullable|string|max:20',
            'has_honorable_dismissal'  => 'nullable|boolean',
            'graduation_date'          => 'nullable|date',
        ]);

        $record->update($validated);

        return response()->json($record, 200);
    }

    public function destroy($id)
    {
        $record = StudentAcademicRecord::find($id);
        if (!$record) {
            return response()->json(['message' => 'Record not found'], 404);
        }

        $record->delete();

        return response()->json(['message' => 'Record deleted'], 200);
    }
}
""",
)

# ===========================================================================
# 14. Delete all *.php.bak files
# ===========================================================================

print("\nRemoving *.php.bak files...")
bak_files = list(Path("app").rglob("*.php.bak")) + list(Path("routes").rglob("*.php.bak"))
if bak_files:
    for bak in bak_files:
        delete(bak)
else:
    print("  (none found)")

# ===========================================================================
# Done
# ===========================================================================

print("\n" + "=" * 48)
print("Refactor complete.")
print()
print("Files created / rewritten:")
print("  app/Services/AnalyticsService.php          (new)")
print("  app/Services/AnnouncementService.php       (new)")
print("  app/Http/Resources/NotificationResource.php(new)")
print("  app/Http/Controllers/AnalyticsController.php")
print("  app/Http/Controllers/AnnouncementController.php")
print("  app/Http/Controllers/NotificationController.php")
print("  app/Http/Controllers/AuthController.php")
print("  app/Http/Controllers/SystemUserController.php")
print("  app/Services/AdminUserService.php")
print("  app/Services/Sso/SsoAuthService.php")
print("  app/Http/Controllers/CertificationTypeController.php")
print("  app/Http/Controllers/DocumentTypeController.php")
print("  app/Http/Controllers/StudentAcademicRecordController.php")
print()
print("Next steps:")
print("  1. Run:  php artisan route:clear && php artisan config:clear")
print("  2. Run:  php artisan test   (if you have tests)")
print("  3. Spot-check SsoAuthService::loginWithCredentials() —")
print("     it assumes IdpClient::login() returns an array with")
print("     'access_token' and 'user_id' keys. Verify this matches")
print("     your actual IdpClient implementation.")
print("  4. Review the NotificationService static methods — consider")
print("     moving sendToAdmins() / sendToAllExcept() to queued jobs")
print("     (dispatch(new SendNotificationJob(...))) when you set up")
print("     a queue worker.")
print(f"  5. Originals backed up to: {BACKUP_DIR.resolve()}")
print()
