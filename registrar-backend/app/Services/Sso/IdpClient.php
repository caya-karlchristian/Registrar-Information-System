<?php

namespace App\Services\Sso;

use App\Exceptions\IdpException;

class IdpClient
{
    private string $baseUrl;
    private string $clientId;
    private string $clientSecret;

    public function __construct()
    {
        $this->baseUrl      = config('sso.base_url');
        $this->clientId     = config('sso.client_id');
        $this->clientSecret = config('sso.client_secret');
    }

    public function exchangeCode(string $code): string
    {
        $response = $this->post('/api/v1/auth/token', [
            'client_id'     => $this->clientId,
            'client_secret' => $this->clientSecret,
            'code'          => $code,
        ]);

        $accessToken = $response['access_token'] ?? null;

        if (!$accessToken) {
            throw new IdpException('No access token returned by identity provider.');
        }

        return $accessToken;
    }

    public function fetchUserProfile(string $accessToken): array
    {
        $response = $this->get('/api/v1/me', $accessToken);

        if (empty($response['email'])) {
            throw new IdpException('Invalid profile returned by identity provider.');
        }

        return $response;
    }

    private function post(string $path, array $payload): array
    {
        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Accept: application/json'],
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
        ]);

        [$body, $status, $error] = $this->exec($ch);

        if ($error || $status >= 400) {
            throw new IdpException('IdP token exchange failed: ' . ($error ?: $body));
        }

        return json_decode($body, true) ?? [];
    }

    private function get(string $path, string $token): array
    {
        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $token, 'Accept: application/json'],
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
        ]);

        [$body, $status] = $this->exec($ch);

        if ($status !== 200) {
            throw new IdpException('Failed to fetch user profile from identity provider.');
        }

        return json_decode($body, true) ?? [];
    }

    private function exec($ch): array
    {
        $body   = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error  = curl_error($ch);
        curl_close($ch);

        return [$body, $status, $error];
    }

    public function logout(string $accessToken): void
{
    // Decode user_id from JWT payload
    $parts = explode('.', $accessToken);
    $payload = json_decode(base64_decode(
        str_pad($parts[1], strlen($parts[1]) + (4 - strlen($parts[1]) % 4) % 4, '=')
    ), true);
    $userId = $payload['userId'] ?? $payload['sub'] ?? null;

    $url = $this->baseUrl . '/logout?' . http_build_query([
        'client_id' => $this->clientId,
        'user_id'   => $userId,
    ]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $accessToken,
            'Accept: application/json',
        ],
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
    ]);
    $this->exec($ch);
}
}