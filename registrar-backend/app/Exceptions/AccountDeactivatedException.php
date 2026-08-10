<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by UserProvisioningService::provision() when an existing RIS
 * record has status === 'Deactivated'.
 *
 * Distinct from UnregisteredAccountException ("we've never heard of this
 * email") — this is "we know exactly who this is, and RIS has explicitly
 * cut their access." Kept as its own class (rather than reusing
 * UnregisteredAccountException with a different message) so callers can
 * tell the two rejection reasons apart if they ever need to — e.g. a
 * future admin-facing "why was this login rejected" log — without
 * parsing message strings.
 *
 * RIS is the source of truth for whether someone can use RIS: this
 * check fires regardless of what the IdP or OCMS currently believe
 * about the account. A still-valid IdP identity, or an unrelated OCMS
 * profile, never overrides a local 'Deactivated' status.
 */
class AccountDeactivatedException extends RuntimeException {}
