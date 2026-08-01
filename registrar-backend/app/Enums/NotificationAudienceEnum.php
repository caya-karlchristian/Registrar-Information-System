<?php

namespace App\Enums;

/**
 * Valid values for notification_types.audience.
 *
 * Backed by the same string values stored in the `audience` MySQL enum
 * column (see database/migrations/2026_04_01_000000_create_base_schema.php
 * and 2026_08_01_000000_add_super_admin_to_notification_types_audience.php).
 *
 * Using this enum in seeders/services instead of raw strings gives us
 * compile-time / IDE-level protection against the exact bug that motivated
 * this class: a typo'd or unregistered audience string doesn't fail loudly
 * in PHP, it gets silently truncated by MySQL (warning 1265) and only
 * surfaces later as a DB-level QueryException.
 */
enum NotificationAudienceEnum: string
{
    case StudentAlumni = 'student_alumni';
    case Admin         = 'admin';
    case Both          = 'both';
    case All           = 'all';
    case SuperAdmin    = 'super_admin';
}
