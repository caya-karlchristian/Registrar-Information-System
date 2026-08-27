<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by UserProvisioningService::provision() when an existing RIS
 * record is still 'Pending Activation' but its pending_expires_at (14
 * days from creation) has already elapsed.
 *
 * BUG FIX (QA #11 — "Expired Status Not Auto-Tagged"):
 * ---------------------------------------------------------------------
 * provisioning:expire-stale only sweeps 'Pending Activation' ->
 * 'Expired' once a day (routes/console.php, dailyAt('08:15')). Before
 * this fix, UserProvisioningService::provision() only checked the raw
 * `status` column when deciding whether a first SSO login should
 * activate the account — so an invite that had already passed its
 * 14-day window, but hadn't been swept yet, could still be silently
 * activated for up to ~24h after it should have been rejected.
 *
 * Distinct from AccountDeactivatedException ("RIS explicitly cut this
 * account's access") — this is "the invite window closed before anyone
 * used it," a different reason with a different message, kept as its
 * own class for the same reason AccountDeactivatedException is kept
 * separate from UnregisteredAccountException: so callers/logs can tell
 * rejection reasons apart without parsing message strings.
 */
class AccountExpiredException extends RuntimeException {}
