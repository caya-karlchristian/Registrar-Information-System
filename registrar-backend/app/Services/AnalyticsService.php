<?php

namespace App\Services;

use App\Enums\RequestStatusEnum;
use App\Models\DocumentRequest;
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
    // Archive / soft-delete exclusion
    // -------------------------------------------------------------------------

    /**
     * Apply the "active requests only" predicate to a raw query builder
     * touching document_request (directly or via join).
     *
     * DocumentRequest registers two automatic exclusion mechanisms —
     * ExcludeArchivedScope (is_archived = false) and Laravel's SoftDeletes
     * (deleted_at IS NULL) — but both are Eloquent global scopes, so they
     * only apply to queries built through the DocumentRequest model.
     * Every query in this service that goes through DB::table(...) instead
     * (for JOIN/aggregate shapes Eloquent can't express as cleanly) bypasses
     * both scopes entirely, silently letting archived/deleted requests back
     * into aggregate reports.
     *
     * Centralised here — once, near the data — rather than repeating
     * ->where('is_archived', false)->whereNull('deleted_at') at every call
     * site, which is the exact copy-paste-dependent pattern that let this
     * gap exist in the first place. is_archived is indexed (dr_is_archived_idx,
     * see migration 2026_07_13_000000_add_archiving_to_document_request), so
     * this is a cheap, indexed filter, not a new table scan.
     *
     * @param  \Illuminate\Database\Query\Builder  $query
     * @param  string  $alias  Table/alias document_request was joined as.
     */
    private function excludeArchived(\Illuminate\Database\Query\Builder $query, string $alias = 'document_request'): \Illuminate\Database\Query\Builder
    {
        return $query
            ->where("{$alias}.is_archived", false)
            ->whereNull("{$alias}.deleted_at");
    }

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

        // Raw DB::table() query (not RequestHistory::), since averaging
        // needs a join back to document_request to reach is_archived /
        // deleted_at at all — request_history carries neither column
        // itself. Uses business_minutes (calendar-aware, per-segment
        // duration), not minutes_processed (cumulative wall-clock time
        // since requested_at, re-counted on every status change) — see
        // processingTime()'s doc block for the full explanation of why
        // these two columns aren't interchangeable.
        $avgProcessing = $this->excludeArchived(
            DB::table('request_history as rh')
                ->join('document_request as dr', 'rh.request_id', '=', 'dr.request_id')
                ->whereBetween('rh.changed_at', [$from, $to])
                ->whereNotNull('rh.business_minutes'),
            'dr'
        )->avg('rh.business_minutes');

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

        // Processing-time-per-document-type subquery, built with the query
        // builder (rather than a hand-written DB::raw string) so the date
        // range and archive exclusion can be bound/applied the same way as
        // everywhere else instead of living outside the query builder's
        // reach. Two bugs fixed here vs. the previous version:
        //   1. business_minutes, not minutes_processed — see processingTime()
        //      for the full explanation of why these differ.
        //   2. This subquery previously had no whereBetween('changed_at', ...)
        //      at all, so avg_processing_min silently ignored the selected
        //      date range and always computed an all-time average regardless
        //      of whether "Today," "This Month," or "This Year" was picked.
        $processingTimeByType = $this->excludeArchived(
            DB::table('request_history as rh')
                ->join('request_document as rd2', 'rh.request_id', '=', 'rd2.request_id')
                ->join('document_request as dr2', 'rh.request_id', '=', 'dr2.request_id')
                ->whereBetween('rh.changed_at', [$from, $to])
                ->whereNotNull('rh.business_minutes'),
            'dr2'
        )
            ->select(
                'rd2.document_type_id',
                DB::raw('ROUND(AVG(rh.business_minutes), 1) as avg_minutes')
            )
            ->groupBy('rd2.document_type_id');

        $rows = $this->excludeArchived(
            DB::table('request_document as rd')
                ->join('document_type as dt', 'rd.document_type_id', '=', 'dt.document_type_id')
                ->join('document_request as dr', 'rd.request_id', '=', 'dr.request_id')
                ->leftJoinSub($processingTimeByType, 'pt', 'pt.document_type_id', '=', 'dt.document_type_id')
                ->whereBetween('dr.requested_at', [$from, $to]),
            'dr'
        )
            ->select(
                'dt.document_type_id',
                'dt.document_name',
                // Renamed from total_requests: this counts request_document
                // line items, not distinct requests — a request with 2
                // document types is counted once per type here. That's
                // legitimate (each type was genuinely requested), but the
                // old name invited "why doesn't this match Total Requests"
                // confusion against overview()'s distinct-request count.
                DB::raw('COUNT(rd.request_document_id) as total_documents'),
                DB::raw('SUM(rd.number_of_copies) as total_copies'),
                'pt.avg_minutes as avg_processing_min'
            )
            ->groupBy('dt.document_type_id', 'dt.document_name', 'pt.avg_minutes')
            ->orderByDesc('total_documents')
            ->get();

        return $rows->map(fn ($row) => [
            'document_type_id'   => $row->document_type_id,
            'document_name'      => $row->document_name,
            'total_documents'    => (int) $row->total_documents,
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

        $query = DB::table('document_request as dr')
            ->join('request_status as rs', 'dr.status_id', '=', 'rs.status_id')
            ->whereBetween('dr.requested_at', [$from, $to]);

        return $this->excludeArchived($query, 'dr')
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

        // Uses business_minutes, not minutes_processed — same reasoning as
        // by_admin below: minutes_processed is cumulative wall-clock time
        // since requested_at (re-counted on every transition), while
        // business_minutes is the calendar-aware, per-segment duration.
        // Also joins document_request so excludeArchived() has a table to
        // filter on — this query previously had no path to is_archived /
        // deleted_at at all, so archived/deleted requests' processing times
        // silently skewed the "Processing Time" chart.
        $byDocTypeQuery = DB::table('request_history as rh')
            ->join('request_document as rd', 'rh.request_id', '=', 'rd.request_id')
            ->join('document_type as dt', 'rd.document_type_id', '=', 'dt.document_type_id')
            ->join('document_request as dr', 'rh.request_id', '=', 'dr.request_id')
            ->whereBetween('rh.changed_at', [$from, $to])
            ->whereNotNull('rh.business_minutes');

        $byDocType = $this->excludeArchived($byDocTypeQuery, 'dr')
            ->select(
                'dt.document_type_id',
                'dt.document_name',
                DB::raw('ROUND(MIN(rh.business_minutes), 1) as min_minutes'),
                DB::raw('ROUND(AVG(rh.business_minutes), 1) as avg_minutes'),
                DB::raw('ROUND(MAX(rh.business_minutes), 1) as max_minutes'),
                DB::raw('COUNT(*) as sample_count')
            )
            ->groupBy('dt.document_type_id', 'dt.document_name')
            ->orderBy('avg_minutes')
            ->get();

        // Staff Performance panel (per-admin Requests Handled / Avg
        // Processing Time). Two fixes vs. the naive version:
        //
        //   1. avg_minutes uses rh.business_minutes, NOT rh.minutes_processed.
        //      minutes_processed is cumulative wall-clock time since the
        //      request's original requested_at, recomputed on every single
        //      transition (see DocumentRequestService::recordStatusHistory's
        //      doc block) — so a request that sat untouched for days before
        //      an admin finally moved it gets that entire wait attributed to
        //      that admin, like a relay runner timed for the whole race
        //      instead of just their leg. business_minutes is the additive,
        //      per-segment duration (time since the *previous* status change,
        //      or since requested_at for the first transition) already
        //      computed and stored for this exact purpose — no new column or
        //      backfill needed, it just wasn't being read here yet.
        //
        //      business_minutes is also calendar-aware (office hours only,
        //      excludes weekends/holidays), which is what we want for a
        //      staff performance number: it doesn't penalize an admin for a
        //      request sitting overnight, only for time they actually held
        //      it during business hours.
        //
        //      whereNotNull('rh.business_minutes') below also takes care of
        //      "reset old records": business_minutes was added as a nullable
        //      column and is NULL on any history row written before that
        //      migration, so those rows simply drop out of this average
        //      instead of polluting it with the old cumulative numbers.
        //
        //   2. requests_handled counts COUNT(DISTINCT rh.request_id), not
        //      COUNT(*). Every request logs one history row per status
        //      transition, so COUNT(*) credited an admin once per step
        //      instead of once per request — a single 4-step request handled
        //      by one admin end-to-end was counted as 4 "requests handled".
        // Joins document_request so excludeArchived() has a table to filter
        // on — same gap as by_document_type above: this query had no path
        // to is_archived / deleted_at, so an admin's stats included work
        // done on requests that are now archived or soft-deleted.
        $byAdminQuery = DB::table('request_history as rh')
            ->join('users as u', 'rh.changed_by', '=', 'u.user_id')
            ->leftJoin('admin_profile as ap', 'u.user_id', '=', 'ap.user_id')
            ->join('document_request as dr', 'rh.request_id', '=', 'dr.request_id')
            ->whereBetween('rh.changed_at', [$from, $to])
            ->whereNotNull('rh.business_minutes');

        $byAdmin = $this->excludeArchived($byAdminQuery, 'dr')
            ->select(
                'u.user_id',
                'u.email',
                DB::raw("CONCAT(COALESCE(ap.first_name,''), ' ', COALESCE(ap.last_name,'')) as display_name"),
                DB::raw('ROUND(AVG(rh.business_minutes), 1) as avg_minutes'),
                DB::raw('COUNT(DISTINCT rh.request_id) as requests_handled')
            )
            ->groupBy('u.user_id', 'u.email', 'ap.first_name', 'ap.last_name')
            ->orderBy('avg_minutes')
            ->get();

        return [
            'by_document_type' => $byDocType,
            'by_admin'         => $byAdmin,
        ];
    }

    /**
     * Splits elapsed time into the two SLA clocks introduced alongside the
     * PendingSignature status (RequestStatusEnum::PendingSignature):
     *
     *   - registrar_time: business-hours-aware duration of segments where
     *     old_status_id = Processing — i.e. time the Registrar itself
     *     controlled, ending the moment they moved a request to either
     *     ReadyToClaim directly or PendingSignature. This is the fair
     *     number for the Registrar's own performance report; it no longer
     *     includes time spent waiting on an external signatory.
     *
     *   - signature_time: business-hours-aware duration of segments where
     *     old_status_id = PendingSignature — i.e. time an external signing
     *     office (dean, department head, etc.) held the request before it
     *     moved to ReadyToClaim. Grouped by document type only for now;
     *     once individual signing offices are tracked as their own entity
     *     (see the calendar-per-office note in DocumentRequestService::
     *     recordStatusHistory()), this can be grouped by office too.
     *
     * Both use business_minutes (calendar-aware: office hours only,
     * weekends/holidays excluded), not minutes_processed (raw wall-clock,
     * cumulative since requested_at) — see the doc block on migration
     * 2026_08_15_000000_add_pending_signature_status for why the two
     * columns mean different things and aren't interchangeable here.
     *
     * Requests that never went through PendingSignature simply have zero
     * matching rows in signature_time — this method doesn't assume every
     * request needs a signature, only reports on the ones that did.
     */
    public function signatureTurnaroundTime(array $range): array
    {
        [$from, $to] = $range;

        // Both queries below join document_request so excludeArchived() has
        // a table to filter on — neither had a path to is_archived /
        // deleted_at previously, so SLA turnaround stats included segments
        // from requests that are now archived or soft-deleted.
        $registrarTimeQuery = DB::table('request_history as rh')
            ->join('request_document as rd', 'rh.request_id', '=', 'rd.request_id')
            ->join('document_type as dt', 'rd.document_type_id', '=', 'dt.document_type_id')
            ->join('document_request as dr', 'rh.request_id', '=', 'dr.request_id')
            ->where('rh.old_status_id', RequestStatusEnum::Processing->value)
            ->whereBetween('rh.changed_at', [$from, $to])
            ->whereNotNull('rh.business_minutes');

        $registrarTime = $this->excludeArchived($registrarTimeQuery, 'dr')
            ->select(
                'dt.document_type_id',
                'dt.document_name',
                DB::raw('ROUND(MIN(rh.business_minutes), 1) as min_minutes'),
                DB::raw('ROUND(AVG(rh.business_minutes), 1) as avg_minutes'),
                DB::raw('ROUND(MAX(rh.business_minutes), 1) as max_minutes'),
                DB::raw('COUNT(*) as sample_count')
            )
            ->groupBy('dt.document_type_id', 'dt.document_name')
            ->orderBy('avg_minutes')
            ->get();

        $signatureTimeQuery = DB::table('request_history as rh')
            ->join('request_document as rd', 'rh.request_id', '=', 'rd.request_id')
            ->join('document_type as dt', 'rd.document_type_id', '=', 'dt.document_type_id')
            ->join('document_request as dr', 'rh.request_id', '=', 'dr.request_id')
            ->where('rh.old_status_id', RequestStatusEnum::PendingSignature->value)
            ->whereBetween('rh.changed_at', [$from, $to])
            ->whereNotNull('rh.business_minutes');

        $signatureTime = $this->excludeArchived($signatureTimeQuery, 'dr')
            ->select(
                'dt.document_type_id',
                'dt.document_name',
                DB::raw('ROUND(MIN(rh.business_minutes), 1) as min_minutes'),
                DB::raw('ROUND(AVG(rh.business_minutes), 1) as avg_minutes'),
                DB::raw('ROUND(MAX(rh.business_minutes), 1) as max_minutes'),
                DB::raw('COUNT(*) as sample_count')
            )
            ->groupBy('dt.document_type_id', 'dt.document_name')
            ->orderBy('avg_minutes')
            ->get();

        return [
            'registrar_time' => $registrarTime,
            'signature_time' => $signatureTime,
        ];
    }

    // -------------------------------------------------------------------------
    // Peak hours heatmap
    // -------------------------------------------------------------------------

    public function peakHours(array $range): array
    {
        [$from, $to] = $range;

        $rows = DocumentRequest::select(
                DB::raw(self::hourExpression('requested_at') . ' as hour'),
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

        $query = DB::table('document_request as dr')
            ->join('request_purpose as rp', 'dr.request_purpose_id', '=', 'rp.request_purpose_id')
            ->whereBetween('dr.requested_at', [$from, $to]);

        return $this->excludeArchived($query, 'dr')
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
     *
     * IMPORTANT: columns are stored in UTC (config('app.timezone')), but a
     * request made at 11:30 PM local time on the last day of the month is
     * still ~3:30 PM UTC the same day, and one made at 12:30 AM local time
     * on the 1st is ~4:30 PM UTC the day before. Near month boundaries that
     * can push a request into the wrong month bucket, so we convert to the
     * local display timezone first, same as hourExpression() below.
     */
    private static function monthExpression(string $column): string
    {
        $driver = DB::connection()->getDriverName();
        $local  = self::localExpression($column, $driver);

        return match ($driver) {
            'sqlite' => "strftime('%Y-%m', {$local})",
            'pgsql'  => "to_char({$local}, 'YYYY-MM')",
            default  => "DATE_FORMAT({$local}, '%Y-%m')",  // MySQL / MariaDB
        };
    }

    /**
     * Return a SQL expression for the local (display-timezone) hour of a
     * UTC-stored datetime column, as an integer 0-23.
     *
     * Bug this fixes: extracting HOUR()/strftime('%H', ...) directly off a
     * UTC column reports the *UTC* hour, not the hour the request actually
     * happened in for users/staff (Asia/Manila, UTC+8). A 1-2 PM local
     * request is stored as 5-6 AM UTC and would otherwise show up as if it
     * happened before dawn. We convert to the configured display timezone
     * first, then extract the hour.
     */
    private static function hourExpression(string $column): string
    {
        $driver = DB::connection()->getDriverName();
        $local  = self::localExpression($column, $driver);

        return match ($driver) {
            'sqlite' => "CAST(strftime('%H', {$local}) AS INTEGER)",
            'pgsql'  => "EXTRACT(HOUR FROM {$local})",
            default  => "HOUR({$local})",  // MySQL / MariaDB
        };
    }

    /**
     * Return a SQL expression that converts a UTC-stored datetime column to
     * the application's configured display timezone (config('app.display_timezone'),
     * default Asia/Manila). Centralised here so every "what local hour/day
     * did this happen on" query converts the same way, once.
     *
     * MySQL: CONVERT_TZ with a fixed UTC offset (e.g. '+08:00') rather than
     * a named zone, so this works even when the server's mysql.time_zone
     * tables haven't been loaded (common on managed DB hosts).
     */
    private static function localExpression(string $column, string $driver): string
    {
        $timezone   = config('app.display_timezone', 'Asia/Manila');
        $offsetSecs = self::utcOffsetSeconds($timezone);

        return match ($driver) {
            // SQLite modifiers want '+N minutes', not a '+HH:MM' string.
            'sqlite' => "datetime({$column}, '" . self::sqliteMinutesModifier($offsetSecs) . "')",
            'pgsql'  => "(({$column} AT TIME ZONE 'UTC') AT TIME ZONE '{$timezone}')",
            // Fixed offset (not a named zone) so this doesn't depend on the
            // mysql.time_zone_name tables being loaded on the DB host.
            default  => "CONVERT_TZ({$column}, '+00:00', '" . self::hhmmOffset($offsetSecs) . "')",
        };
    }

    /**
     * Current UTC offset in seconds for a timezone name. Computed from PHP's
     * timezone database rather than hardcoded so it stays correct if the
     * configured timezone ever observes DST.
     */
    private static function utcOffsetSeconds(string $timezone): int
    {
        $tz = new \DateTimeZone($timezone);

        return $tz->getOffset(new \DateTime('now', new \DateTimeZone('UTC')));
    }

    /** Format offset seconds as e.g. '+08:00', for MySQL CONVERT_TZ. */
    private static function hhmmOffset(int $offsetSecs): string
    {
        $sign = $offsetSecs < 0 ? '-' : '+';
        $abs  = abs($offsetSecs);

        return sprintf('%s%02d:%02d', $sign, intdiv($abs, 3600), intdiv($abs % 3600, 60));
    }

    /** Format offset seconds as e.g. '+480 minutes', for SQLite datetime(). */
    private static function sqliteMinutesModifier(int $offsetSecs): string
    {
        $minutes = intdiv($offsetSecs, 60);
        $sign    = $minutes < 0 ? '-' : '+';

        return sprintf('%s%d minutes', $sign, abs($minutes));
    }
}