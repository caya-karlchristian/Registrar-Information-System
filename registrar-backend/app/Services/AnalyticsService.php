<?php

namespace App\Services;

use App\Enums\RequestStatusEnum;
use App\Models\DocumentRequest;
use App\Models\RequestHistory;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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

        // Single query — conditional aggregates replace separate COUNT calls.
        // Cancelled requests are intentionally excluded from these buckets.
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

        // Use the unconditional COUNT(*) as the total, not a hand-summed total
        // of the buckets above — those buckets deliberately omit cancelled
        // requests, so summing them would undercount total volume.
        $total = (int) $counts->total;
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
                DB::raw(self::monthExpression('requested_at') . ' as month'),
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
            ->join('users as u', 'rh.changed_by', '=', 'u.user_id')
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
                DB::raw(
            DB::connection()->getDriverName() === 'sqlite'
                ? "CAST(strftime('%H', requested_at) AS INTEGER) as hour"
                : 'HOUR(requested_at) as hour'
        ),
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

    // -------------------------------------------------------------------------
    // AI payload builder
    // -------------------------------------------------------------------------

    /**
     * Assemble a fully anonymised statistics payload for the AI narrative.
     *
     * Rules enforced here (the AI firewall):
     *  - No student/alumni names, emails, or IDs.
     *  - Admin display names are included in processing-time stats because
     *    they are staff performance metrics, not student PII. Remove if
     *    institutional policy requires it.
     *  - Only aggregated counts, averages, and rates are included.
     */
    public function buildAiPayload(array $range): array
    {
        $overview       = $this->overview($range);
        $volumeTrend    = $this->volumeTrend($range);
        $byDocType      = $this->byDocumentType($range);
        $byStatus       = $this->byStatus($range);
        $processingTime = $this->processingTime($range);
        $peakHours      = $this->peakHours($range);
        $byPurpose      = $this->byPurpose($range);

        // Strip admin user_id and email from processing stats — keep only
        // display_name and performance numbers.
        $adminPerf = collect($processingTime['by_admin'])->map(fn ($a) => [
            'name'             => trim($a->display_name) ?: 'Unknown',
            'avg_minutes'      => $a->avg_minutes,
            'requests_handled' => $a->requests_handled,
        ])->values()->all();

        // Peak hours — only top 5 busiest to keep payload compact
        $topHours = collect($peakHours)
            ->sortByDesc('total')
            ->take(5)
            ->map(fn ($h) => ['hour' => $h['label'], 'requests' => $h['total']])
            ->values()
            ->all();

        return [
            'report_period' => [
                'from' => $range[0]->toDateString(),
                'to'   => $range[1]->toDateString(),
            ],
            'overview'              => $overview,
            'monthly_volume_trend'  => $volumeTrend,
            'top_document_types'    => array_slice($byDocType, 0, 10),
            'status_breakdown'      => $byStatus,
            'processing_time' => [
                'by_document_type' => $processingTime['by_document_type'],
                'by_admin'         => $adminPerf,
            ],
            'peak_hours_top5'       => $topHours,
            'requests_by_purpose'   => $byPurpose,
        ];
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Return a SQL expression that formats a datetime column as 'YYYY-MM'.
     *
     * Portable across MySQL/MariaDB (default), SQLite (tests/local), and
     * PostgreSQL (future migration path).
     */
    private static function monthExpression(string $column): string
    {
        $driver = DB::connection()->getDriverName();

        return match ($driver) {
            'sqlite' => "strftime('%Y-%m', {$column})",
            'pgsql'  => "to_char({$column}, 'YYYY-MM')",
            default  => "DATE_FORMAT({$column}, '%Y-%m')",  // MySQL / MariaDB
        };
    }
}