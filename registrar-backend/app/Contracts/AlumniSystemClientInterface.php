<?php

namespace App\Contracts;

use App\DTOs\Alumni\AlumniDTO;

/**
 * Contract for fetching alumni data.
 *
 * Two implementations exist:
 *   - AlumniSystemClient     — real HTTP calls to PUPTAPS (production)
 *   - FakeAlumniSystemClient — returns hardcoded dummy data (non-production)
 *
 * AppServiceProvider binds the correct one based on ALUMNI_MOCK env var.
 * The controller and anything else that needs alumni data depends only on
 * this interface — swapping implementations requires zero changes outside
 * AppServiceProvider.
 */
interface AlumniSystemClientInterface
{
    /**
     * Return a paginated list of alumni.
     * Never throws — returns empty list if source is unavailable.
     */
    public function tryListAlumni(array $filters = []): array;

    /**
     * Return a single alumni by ID or student number.
     * Returns null if not found or source is unavailable.
     */
    public function tryGetAlumni(string $id): ?AlumniDTO;
}
