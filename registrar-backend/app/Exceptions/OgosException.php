<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown whenever the OGOS API returns an unexpected status code
 * or when M2M authentication fails.
 *
 * Callers should catch this and decide whether to surface a 503,
 * fall back to local data, or let it bubble as a 500.
 */
class OgosException extends RuntimeException {}
