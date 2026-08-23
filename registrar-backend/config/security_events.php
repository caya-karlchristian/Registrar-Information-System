<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Security Events — Retention & Alerting
    |--------------------------------------------------------------------------
    | audit_logs stays untouched/permanent (see PruneSecurityEvents docblock
    | and the plan doc's "Trade-off" section) — only this table is pruned.
    |
    | retention_days
    |   How long a security_events row is kept before PruneSecurityEvents
    |   deletes it. Config-driven per the plan (Phase 3h).
    |
    | alert_threshold / alert_window_minutes
    |   "N failed local-auth attempts in a window triggers a notification
    |   to SuperAdmins" (Phase 3e). Local-auth accounts are a small, known
    |   set (break-glass Super Admin accounts only — see
    |   SetLocalPasswordRequest), so this threshold is deliberately
    |   stricter/lower than what a typical public-login system would use.
    |   Tune via env without a code change if 5-in-10 proves too noisy or
    |   too loose once you have real data.
    |--------------------------------------------------------------------------
    */

    'retention_days'       => env('SECURITY_EVENTS_RETENTION_DAYS', 90),

    'alert_threshold'      => env('SECURITY_EVENTS_ALERT_THRESHOLD', 5),

    'alert_window_minutes' => env('SECURITY_EVENTS_ALERT_WINDOW_MINUTES', 10),
];
