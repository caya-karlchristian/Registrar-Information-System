<?php

namespace App\Services\Ocms;

use App\DTOs\Ocms\OcmsAdminProfileDTO;
use App\Exceptions\OcmsException;
use Illuminate\Support\Facades\Log;

/**
 * Low-level HTTP client for the OCMS Central Admin Profile Hub.
 *
 * Responsible for:
 *   - Fetching an admin's shared profile by their IDP user ID (admin_id)
 *   - Pushing profile updates back to the hub
 *
 * Returns typed DTOs — raw arrays never leave this class.
 * All OCMS HTTP calls live here. Nothing else should use curl for OCMS.
 *
 * Auth scheme: X-Client-ID / X-Client-Secret headers (confirm with
 * Innovision team — update if they use Bearer or Basic instead).
 */
class OcmsClient
{
    private string $baseUrl;
    private string $clientId;
    private string $clientSecret;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('ocms.base_url', ''), '/');
        $this->clientId     = (string) config('ocms.client_id', '');
        $this->clientSecret = (string) config('ocms.client_secret', '');    
    }

    // ── Endpoint methods ──────────────────────────────────────

    /**
     * Fetch an admin's shared profile from OCMS by their IDP user ID.
     *
     * Returns null when OCMS has no record for this admin (404) or
     * when OCMS is misconfigured/unreachable — callers must handle
     * null gracefully so login never breaks.
     *
     * @throws OcmsException on unexpected non-404 errors
     */
    public function getAdminProfile(string $adminId): ?OcmsAdminProfileDTO
    {
        if (empty($this->baseUrl)) {
            Log::warning('OcmsClient: OCMS_BASE_URL is not configured — skipping profile fetch.');
            return null;
        }

        [$body, $status, $error] = $this->get("/api/external/admins/{$adminId}");

        if ($error) {
            Log::warning('OcmsClient: connection error fetching admin profile', [
                'admin_id' => $adminId,
                'error'    => $error,
            ]);
            return null;
        }

        if ($status === 404) {
            Log::info('OcmsClient: no profile found in OCMS', ['admin_id' => $adminId]);
            return null;
        }

        if ($status !== 200) {
            Log::error('OcmsClient: getAdminProfile failed', [
                'admin_id'    => $adminId,
                'http_status' => $status,
                'body'        => substr((string) $body, 0, 500),
            ]);
            throw new OcmsException(
                "OCMS returned {$status} for admin-profiles/{$adminId}",
                $status
            );
        }

        if ($status === 429) {
            Log::warning('OcmsClient: rate limited by OCMS — skipping profile fetch', [
                'admin_id' => $adminId,
            ]);
            return null;
        }

        $decoded = json_decode($body, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new OcmsException("OCMS returned invalid JSON for admin-profiles/{$adminId}", 502);
        }

        return OcmsAdminProfileDTO::fromArray($decoded);
    }

    /**
     * Push updated profile fields to the OCMS hub.
     *
     * Does not throw — a failed OCMS push must never rollback a
     * successful local update. Logs a warning instead.
     *
     * @param string $adminId  IDP user ID
     * @param array  $payload  Only the fields you want to change (OCMS field names)
     */
    public function updateAdminProfile(string $adminId, array $payload): void
    {
        if (empty($this->baseUrl)) {
            return;
        }

        [$body, $status, $error] = $this->patch("/api/external/admin-profiles/{$adminId}", $payload);

        if ($error || $status < 200 || $status >= 300) {
            Log::warning('OcmsClient: updateAdminProfile failed', [
                'admin_id'    => $adminId,
                'http_status' => $status,
                'curl_error'  => $error ?: null,
                'body'        => substr((string) $body, 0, 300),
            ]);
        }
    }

    // ── Internal HTTP helpers ─────────────────────────────────

    private function get(string $path): array
    {
        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => $this->headers(),
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
        ]);

        return $this->execRaw($ch);
    }

    private function patch(string $path, array $payload): array
    {
        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => 'PATCH',
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_HTTPHEADER     => array_merge(
                $this->headers(),
                ['Content-Type: application/json']
            ),
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
        ]);

        return $this->execRaw($ch);
    }

    /**
     * Auth headers for every OCMS request.
     * Update if Innovision uses Bearer or Basic instead.
     */
    private function headers(): array
    {
        return [
            'Accept: application/json',
            'Authorization: Bearer ' . $this->clientSecret,
            'X-External-System: '    . $this->clientId,
        ];
    }

    /** Returns [$body, $status, $curlError] — matches IdpClient::execRaw() */
    private function execRaw(\CurlHandle $ch): array
    {
        $body   = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error  = curl_error($ch);
        curl_close($ch);

        return [$body, $status, $error];
    }
}
