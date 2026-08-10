<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    // -------------------------------------------------------
    // GET /audit-logs
    //
    // Supports:
    //   ?search=juan          → searches email
    //   ?role=admin           → filter by role_name
    //   ?action=login         → filter by action
    //   ?browser=Chrome       → filter by browser
    //   ?per_page=20          → pagination (default 20)
    //
    // Example: GET /audit-logs?role=admin&action=login&per_page=50
    // -------------------------------------------------------
    public function index(Request $request)
    {
        $query = AuditLog::query()->orderByDesc('created_at');

        // Search by email
        if ($search = $request->query('search')) {
            $query->where('email', 'like', '%' . $search . '%');
        }

        // Filter by role
        if ($role = $request->query('role')) {
            $query->where('role_name', $role);
        }

        // Filter by action
        if ($action = $request->query('action')) {
            $query->where('action', $action);
        }

        // Filter by browser
        if ($browser = $request->query('browser')) {
            $query->where('browser', $browser);
        }

        $perPage = min((int) $request->query('per_page', 20), 100);

        $logs = $query->paginate($perPage);

        return response()->json([
            'data' => $logs->map(fn($log) => $this->format($log)),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
                'per_page'     => $logs->perPage(),
                'total'        => $logs->total(),
            ],
        ]);
    }

    // -------------------------------------------------------
    // GET /audit-logs/filters
    //
    // Returns the distinct values available for each filter
    // dropdown in your UI (Role, Action, Browser).
    // Call this once on page load to populate the dropdowns.
    // -------------------------------------------------------
    public function filters()
    {
        return response()->json([
            'roles'    => AuditLog::distinct()->pluck('role_name')->sort()->values(),
            'actions'  => AuditLog::distinct()->pluck('action')->sort()->values(),
            'browsers' => AuditLog::distinct()->whereNotNull('browser')
                                  ->pluck('browser')->sort()->values(),
        ]);
    }

    // -------------------------------------------------------
    // Format a single log entry for the frontend.
    // Matches your UI columns: User, Role, Action, Browser, Date, Time
    // -------------------------------------------------------
    private function format(AuditLog $log): array
    {
        return [
            'id'         => $log->id,
            'user'       => $log->email,
            'role'       => $log->role_name,
            'action'     => $this->formatAction($log->action),
            'browser'    => $log->browser ?? 'Unknown',
            'ip_address' => $log->ip_address,
            'date'       => $log->created_at->format('Y-m-d'),
            'time'       => $log->created_at->format('H:i:s'),
        ];
    }

    // -------------------------------------------------------
    // Convert action constants to readable labels for the UI.
    // e.g. 'admin_created' → 'Admin Created'
    // -------------------------------------------------------
    private function formatAction(string $action): string
    {
        return match ($action) {
            AuditLog::ACTION_LOGIN                  => 'Login',
            AuditLog::ACTION_LOGOUT                 => 'Logout',
            AuditLog::ACTION_ADMIN_CREATED          => 'Admin Created',
            AuditLog::ACTION_ADMIN_DELETED          => 'Admin Deleted',
            AuditLog::ACTION_ROLE_ASSIGNED          => 'Role Assigned',
            AuditLog::ACTION_ROLE_REVOKED           => 'Role Revoked',
            AuditLog::ACTION_ROLE_EXPIRED           => 'Role Expired',
            AuditLog::ACTION_ROLE_SWITCHED          => 'Role Switched',
            AuditLog::ACTION_REQUEST_STATUS_CHANGED => 'Request Status Changed',
            default                                 => ucwords(str_replace('_', ' ', $action)),
        };
    }
}