<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by UserProvisioningService::provision() specifically when a user
 * authenticated successfully with the IdP but has no role in RIS and no
 * matching OGOS record — the "not registered in RIS" business rejection.
 *
 * This used to be a bare \RuntimeException, which SsoCallbackController
 * caught to render the "not registered" 403 + logout_url response. The
 * problem: Laravel's \Illuminate\Database\QueryException also extends
 * \RuntimeException, so a genuine DB error (e.g. a NOT NULL constraint
 * violation during provisioning) was caught by the same branch — showing
 * the user a raw SQL error dressed up as "you're not registered," and (as
 * of the revoke-on-rejection fix in SsoAuthService) incorrectly revoking a
 * perfectly valid IdP session over what was actually a server bug.
 *
 * Catching this specific class instead of \RuntimeException lets genuine
 * infrastructure failures fall through to the generic 500 handler where
 * they belong, while this one intentional business rejection still gets
 * its dedicated 403 response.
 */
class UnregisteredAccountException extends RuntimeException {}
