<?php

namespace App\Services\Ogos;

use App\DTOs\Ogos\OgosAddressDTO;
use App\DTOs\Ogos\OgosPersonalInfoDTO;
use App\DTOs\Ogos\OgosStudentDTO;
use App\Exceptions\OgosException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Low-level HTTP client for the OGOS Registrar API.
 *
 * All response shapes confirmed against the live API on 2026-04-25.
 * Returns typed DTOs — raw arrays never leave this class.
 */
class OgosClient
{
    private string $baseUrl;
    private string $clientId;
    private string $clientSecret;

    private const TOKEN_CACHE_KEY      = 'ogos_access_token';
    private const REFRESH_CACHE_KEY    = 'ogos_refresh_token';
    private const TOKEN_MARGIN_SECONDS = 60;

    public function __construct()
    {
        $this->baseUrl      = rtrim(config('ogos.base_url'), '/');
        $this->clientId     = config('ogos.client_id');
        $this->clientSecret = config('ogos.client_secret');
    }

    // ── Endpoint methods ──────────────────────────────────────

    /** GET /integrations/students/{studentNumber} → flat student object */
    public function getStudentByNumber(string $studentNumber): OgosStudentDTO
    {
        return OgosStudentDTO::fromArray(
            $this->get("/integrations/students/{$studentNumber}")
        );
    }

    /** GET /integrations/students/profile?email= → flat student object */
    public function getStudentByEmail(string $email): OgosStudentDTO
    {
        return OgosStudentDTO::fromArray(
            $this->get('/integrations/students/profile', ['email' => $email])
        );
    }

    /** GET /integrations/students/{studentNumber}/personal-info */
    public function getStudentPersonalInfo(string $studentNumber): OgosPersonalInfoDTO
    {
        return OgosPersonalInfoDTO::fromArray(
            $this->get("/integrations/students/{$studentNumber}/personal-info")
        );
    }

    /**
     * GET /integrations/students/{studentNumber}/addresses
     * Response: data is a top-level array of address objects.
     *
     * @return OgosAddressDTO[]
     */
    public function getStudentAddresses(string $studentNumber): array
    {
        $data = $this->get("/integrations/students/{$studentNumber}/addresses");

        // data is already the array of address objects
        return OgosAddressDTO::collectionFromArray($data);
    }

    /**
     * GET /integrations/students/profiles
     * Response: data.students[] + data.meta pagination.
     *
     * @return OgosStudentDTO[]
     */
    public function listStudents(array $filters = []): array
    {
        $data     = $this->get('/integrations/students/profiles', $filters);
        $students = $data['students'] ?? [];

        return array_map(fn(array $s) => OgosStudentDTO::fromArray($s), $students);
    }

    // ── HTTP helpers ──────────────────────────────────────────

    /**
     * Authenticated GET. Returns the contents of `data` from the OGOS envelope.
     * Retries once on 401 after clearing the cached token.
     *
     * @throws OgosException
     */
    private function get(string $path, array $query = [], bool $isRetry = false): array
    {
        $response = $this->doGet($path, $query, $this->resolveToken());

        if ($response['status'] === 401 && !$isRetry) {
            Cache::forget(self::TOKEN_CACHE_KEY);
            Cache::forget(self::REFRESH_CACHE_KEY);
            $response = $this->doGet($path, $query, $this->authenticate());
        }

        if ($response['status'] === 404) {
            throw new OgosException("OGOS: not found [{$path}]", 404);
        }

        if ($response['status'] !== 200) {
            Log::error('OGOS request failed', [
                'path'   => $path,
                'status' => $response['status'],
                'body'   => substr($response['body'], 0, 500),
            ]);
            throw new OgosException(
                "OGOS returned {$response['status']} for {$path}",
                $response['status']
            );
        }

        $decoded = json_decode($response['body'], true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new OgosException("OGOS returned invalid JSON for {$path}", 502);
        }

        // Unwrap the standard { status, data } envelope
        return $decoded['data'] ?? $decoded;
    }

    private function doGet(string $path, array $query, string $token): array
    {
        $url = $this->baseUrl . $path . ($query ? '?' . http_build_query($query) : '');
        $ch  = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_HTTPHEADER     => [
                "Authorization: Bearer {$token}",
                'Accept: application/json',
            ],
        ]);
        $body    = curl_exec($ch);
        $status  = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);

        if ($curlErr) {
            throw new OgosException("OGOS connection error: {$curlErr}", 503);
        }

        return ['status' => $status, 'body' => $body];
    }

    // ── M2M token management ──────────────────────────────────

    private function resolveToken(): string
    {
        if ($token = Cache::get(self::TOKEN_CACHE_KEY)) {
            return $token;
        }

        if ($refresh = Cache::get(self::REFRESH_CACHE_KEY)) {
            try {
                return $this->refreshToken($refresh);
            } catch (OgosException) {
                // Refresh expired — fall through to full re-auth
            }
        }

        return $this->authenticate();
    }

    private function authenticate(): string
    {
        $ch = curl_init($this->baseUrl . '/auth/m2m/token');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS     => json_encode([
                'clientId'     => $this->clientId,
                'clientSecret' => $this->clientSecret,
            ]),
        ]);
        $body   = json_decode(curl_exec($ch), true);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($status !== 200 || empty($body['data'])) {
            throw new OgosException('OGOS M2M authentication failed.', 401);
        }

        $this->cacheTokens($body['data']);
        return $body['data']['accessToken'];
    }

    private function refreshToken(string $refreshToken): string
    {
        $ch = curl_init($this->baseUrl . '/auth/m2m/refresh');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS     => json_encode(['refreshToken' => $refreshToken]),
        ]);
        $body   = json_decode(curl_exec($ch), true);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($status !== 200 || empty($body['data'])) {
            throw new OgosException('OGOS refresh token rejected.', 401);
        }

        $this->cacheTokens($body['data']);
        return $body['data']['accessToken'];
    }

    private function cacheTokens(array $tokenData): void
    {
        $accessTtl = max(1, ($tokenData['expiresIn'] ?? 3600) - self::TOKEN_MARGIN_SECONDS);
        Cache::put(self::TOKEN_CACHE_KEY,   $tokenData['accessToken'],  $accessTtl);
        Cache::put(self::REFRESH_CACHE_KEY, $tokenData['refreshToken'], $accessTtl * 2);
    }
}