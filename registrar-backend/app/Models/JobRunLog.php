<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * One row per invocation of a scheduled artisan command — see the
 * create_job_run_logs_table migration's docblock for why this table
 * exists and how it differs from AuditLog/SecurityEvent. Written by
 * every scheduled command via App\Console\Commands\Concerns\LogsJobRun,
 * read by SuperAdminAnalyticsService::scheduledJobsHealth() for the
 * SuperAdmin dashboard's "Scheduled Jobs Health" panel, and pruned on a
 * retention schedule by PruneJobRunLogs.
 */
class JobRunLog extends Model
{
    protected $table      = 'job_run_logs';
    protected $primaryKey = 'job_run_id';

    // No updated_at column — started_at/finished_at already capture the
    // two points in this row's lifecycle explicitly and unambiguously;
    // a generic updated_at would just duplicate finished_at.
    public $timestamps = false;

    protected $fillable = [
        'job_name',
        'status',
        'started_at',
        'finished_at',
        'duration_ms',
        'rows_affected',
        'error_message',
    ];

    protected $casts = [
        'started_at'    => 'datetime',
        'finished_at'   => 'datetime',
        'duration_ms'   => 'integer',
        'rows_affected' => 'integer',
    ];

    public const STATUS_RUNNING = 'running';
    public const STATUS_SUCCESS = 'success';
    public const STATUS_FAILED  = 'failed';

    /**
     * Canonical job_name => human-readable schedule label, for every
     * command registered in routes/console.php. This is the single
     * source of truth SuperAdminAnalyticsService::scheduledJobsHealth()
     * iterates over — a job that has NEVER produced a single row still
     * shows up on the dashboard as "no runs recorded" instead of just
     * being silently absent, which is itself an important signal (e.g.
     * the scheduler container never having been deployed with this
     * command registered).
     *
     * job_name values themselves are never hardcoded a second time
     * anywhere else — every command derives its own job_name at runtime
     * via $this->getName() (see LogsJobRun::startJobRun()), so this map
     * can only ever drift on the LABEL side, never silently stop
     * matching a real command's rows.
     */
    public const JOBS = [
        'notifications:shred-expired-requests'   => 'Hourly',
        'notifications:send-unclaimed-reminders' => 'Daily 08:05',
        'announcements:auto-disable-expired'     => 'Daily 08:10',
        'provisioning:expire-stale'              => 'Daily 08:15',
        'role-assignments:expire'                => 'Hourly',
        'audit:verify'                           => 'Daily 03:00',
        'break-glass:test'                       => 'Weekly',
        'security-events:prune'                  => 'Daily 08:25',
        'job-run-logs:prune'                     => 'Daily 08:30',
    ];
}
