<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown whenever the OCMS Admin Hub API returns an unexpected status
 * or when the connection fails entirely.
 *
 * Callers should catch this and decide whether to surface a 503,
 * fall back to local data, or let it bubble as a 500.
 * Login flows must always catch it and degrade gracefully.
 */
class OcmsException extends RuntimeException {}
