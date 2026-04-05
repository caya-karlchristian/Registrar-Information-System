<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\DocumentRequest;
use App\Models\RequestHistory;
use App\Models\RequestDocument;

class AnalyticsController extends Controller
{
    // -------------------------------------------------------
    // Shared date filter helper
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
            'all'   => now()->subYears(10),
            default => now()->startOfMonth(),   // 'month'
        };
        return [$from, $to];
    }

    // -------------------------------------------------------
    // GET /analytics/overview
    // Top-level KPI cards
    // -------------------------------------------------------
    public function overview(Request $request)
    {
        [$from, $to] = $this->dateRange($request);

        $total     = DocumentRequest::whereBetween('requested_at', [$from, $to])->count();
        $pending   = DocumentRequest::whereBetween('requested_at', [$from, $to])->where('status_id', 1)->count();
        $readyClaim= DocumentRequest::whereBetween('requested_at', [$from, $to])->where('status_id', 2)->count();
        $completed = DocumentRequest::whereBetween('requested_at', [$from, $to])->where('status_id', 3)->count();
        $forfeited = DocumentRequest::whereBetween('requested_at', [$from, $to])->where('status_id', 4)->count();

        $avgProcessing = RequestHistory::whereBetween('changed_at', [$from, $to])
            ->whereNotNull('minutes_processed')
            ->avg('minutes_processed');

        $completionRate = $total > 0
            ? round(($completed / $total) * 100, 1)
            : 0;

        $forfeitRate = $total > 0
            ? round(($forfeited / $total) * 100, 1)
            : 0;

        // Compare with previous period
        $periodLength = $from->diffInSeconds($to);
        $prevFrom     = $from->copy()->subSeconds($periodLength);
        $prevTo       = $from->copy();

        $prevTotal     = DocumentRequest::whereBetween('requested_at', [$prevFrom, $prevTo])->count();
        $prevCompleted = DocumentRequest::whereBetween('requested_at', [$prevFrom, $prevTo])->where('status_id', 3)->count();

        $volumeChange = $prevTotal > 0
            ? round((($total - $prevTotal) / $prevTotal) * 100, 1)
            : null;

        return response()->json([
            'total'           => $total,
            'pending'         => $pending,
            'ready_to_claim'  => $readyClaim,
            'completed'       => $completed,
            'forfeited'       => $forfeited,
            'avg_processing_minutes' => $avgProcessing ? round($avgProcessing, 1) : null,
            'completion_rate' => $completionRate,
            'forfeit_rate'    => $forfeitRate,
            'volume_change_pct' => $volumeChange,
            'prev_total'      => $prevTotal,
        ]);
    }

    // -------------------------------------------------------
    // GET /analytics/volume-trend
    // Monthly request counts for the past 12 months
    // Used by the area chart
    // -------------------------------------------------------
    public function volumeTrend(Request $request)
    {
        [$from, $to] = $this->dateRange($request);

        $rows = DocumentRequest::select(
                DB::raw("DATE_FORMAT(requested_at, '%Y-%m') as month"),
                DB::raw('COUNT(*) as total')
            )
            ->whereBetween('requested_at', [$from, $to])
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        // Fill in missing months between $from and $to with 0
        $filled = [];
        $cursor = $from->copy()->startOfMonth();
        while ($cursor->lte($to)) {
            $key   = $cursor->format('Y-m');
            $label = $cursor->format('M Y');
            $match = $rows->firstWhere('month', $key);
            $filled[] = [
                'month' => $key,
                'label' => $label,
                'total' => $match ? (int) $match->total : 0,
            ];
            $cursor->addMonth();
        }

        return response()->json($filled);
    }

    // -------------------------------------------------------
    // GET /analytics/by-document-type
    // Request counts + avg processing time per document type
    // Used by the bar chart
    // -------------------------------------------------------
    public function byDocumentType(Request $request)
    {
        [$from, $to] = $this->dateRange($request);

        $rows = DB::table('request_document as rd')
            ->join('document_type as dt', 'rd.document_type_id', '=', 'dt.document_type_id')
            ->join('document_request as dr', 'rd.request_id', '=', 'dr.request_id')
            ->whereBetween('dr.requested_at', [$from, $to])
            ->select(
                'dt.document_type_id',
                'dt.document_name',
                DB::raw('COUNT(rd.request_document_id) as total_requests'),
                DB::raw('SUM(rd.number_of_copies) as total_copies')
            )
            ->groupBy('dt.document_type_id', 'dt.document_name')
            ->orderByDesc('total_requests')
            ->get();

        // Attach avg processing time per doc type from request_history
        $processingTimes = DB::table('request_history as rh')
            ->join('request_document as rd', 'rh.request_id', '=', 'rd.request_id')
            ->whereNotNull('rh.minutes_processed')
            ->select(
                'rd.document_type_id',
                DB::raw('ROUND(AVG(rh.minutes_processed), 1) as avg_minutes')
            )
            ->groupBy('rd.document_type_id')
            ->pluck('avg_minutes', 'document_type_id');

        $result = $rows->map(function ($row) use ($processingTimes) {
            return [
                'document_type_id'   => $row->document_type_id,
                'document_name'      => $row->document_name,
                'total_requests'     => (int) $row->total_requests,
                'total_copies'       => (int) $row->total_copies,
                'avg_processing_min' => $processingTimes[$row->document_type_id] ?? null,
            ];
        });

        return response()->json($result);
    }

    // -------------------------------------------------------
    // GET /analytics/by-status
    // Request counts grouped by status
    // Used by the pie chart
    // -------------------------------------------------------
    public function byStatus(Request $request)
    {
        [$from, $to] = $this->dateRange($request);

        $rows = DB::table('document_request as dr')
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
            ->map(fn($r) => [
                'status_id'   => $r->status_id,
                'status_name' => $r->status_name,
                'total'       => (int) $r->total,
            ]);

        return response()->json($rows);
    }

    // -------------------------------------------------------
    // GET /analytics/processing-time
    // Min / avg / max processing time per document type
    // and per admin
    // -------------------------------------------------------
    public function processingTime(Request $request)
    {
        [$from, $to] = $this->dateRange($request);

        // By document type
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

        // By admin (processed_by)
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

        return response()->json([
            'by_document_type' => $byDocType,
            'by_admin'         => $byAdmin,
        ]);
    }

    // -------------------------------------------------------
    // GET /analytics/peak-hours
    // Request volume grouped by hour of day
    // Used by the heatmap
    // -------------------------------------------------------
    public function peakHours(Request $request)
    {
        [$from, $to] = $this->dateRange($request);

        $rows = DocumentRequest::select(
                DB::raw('HOUR(requested_at) as hour'),
                DB::raw('COUNT(*) as total')
            )
            ->whereBetween('requested_at', [$from, $to])
            ->groupBy('hour')
            ->orderBy('hour')
            ->pluck('total', 'hour');

        // Fill all 24 hours
        $hours = [];
        for ($h = 0; $h < 24; $h++) {
            $hours[] = [
                'hour'  => $h,
                'label' => sprintf('%02d:00', $h),
                'total' => (int) ($rows[$h] ?? 0),
            ];
        }

        return response()->json($hours);
    }

    // -------------------------------------------------------
    // GET /analytics/by-purpose
    // Request counts grouped by request purpose
    // -------------------------------------------------------
    public function byPurpose(Request $request)
    {
        [$from, $to] = $this->dateRange($request);

        $rows = DB::table('document_request as dr')
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
            ->map(fn($r) => [
                'purpose_id'   => $r->request_purpose_id,
                'purpose_name' => $r->purpose_name,
                'total'        => (int) $r->total,
            ]);

        return response()->json($rows);
    }
}
