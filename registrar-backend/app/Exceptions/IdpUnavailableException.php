<?php

namespace App\Exceptions;

/**
 * IdpUnavailableException
 * =======================
 * Thrown by SsoAuthService when an IDP call fails because the IDP host
 * is unreachable (DNS failure, connection refused, timeout) — as opposed
 * to the IDP responding with a 4xx/5xx application error.
 *
 * AuthController catches this to trigger the local-auth fallback without
 * confusing a connectivity failure with a wrong-password rejection.
 */
class IdpUnavailableException extends IdpException
{
    // Inherits __construct(string $message, int $code = 0, ?\Throwable $previous = null)
    // No additional behaviour needed — type alone is the signal.
}
