<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class IdpService
{
    private string $baseUrl = 'https://identity-provider.isaxbsit2027.com';

    private function curl(string $url, array $options = []): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, array_replace([
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
        ], $options));

        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);

        return ['body' => $body, 'code' => $code, 'error' => $err];
    }

    private function getSuperAdminToken(): ?string
    {
        $login = $this->curl("{$this->baseUrl}/api/v1/auth/login", [
            CURLOPT_POST       => true,
            CURLOPT_POSTFIELDS => json_encode([
                'client_id' => env('SSO_CLIENT_ID'),
                'email'     => env('SSO_SUPERADMIN_EMAIL'),
                'password'  => env('SSO_SUPERADMIN_PASSWORD'),
            ]),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
        ]);

        if ($login['code'] !== 200) return null;

        $redirectUrl = trim($login['body'], '"');
        parse_str(parse_url($redirectUrl, PHP_URL_QUERY), $params);
        $code = $params['code'] ?? null;
        if (!$code) return null;

        $token = $this->curl("{$this->baseUrl}/api/v1/auth/token", [
            CURLOPT_POST       => true,
            CURLOPT_POSTFIELDS => json_encode([
                'client_id'     => env('SSO_CLIENT_ID'),
                'client_secret' => env('SSO_CLIENT_SECRET'),
                'code'          => $code,
            ]),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
        ]);

        $data = json_decode($token['body'], true);
        return $data['access_token'] ?? null;
    }

    public function createUser(array $data): array
    {
        $token = $this->getSuperAdminToken();
        if (!$token) return ['success' => false, 'error' => 'Could not authenticate with IdP.'];

        $res = $this->curl("{$this->baseUrl}/api/v1/users", [
            CURLOPT_POST       => true,
            CURLOPT_POSTFIELDS => json_encode([
                'email'       => $data['email'],
                'first_name'  => $data['first_name'],
                'last_name'   => $data['last_name'],
                'middle_name' => $data['middle_name'] ?? '',
                'password'    => $data['password'],
                'roles'       => $data['roles'],
                'status'      => 'active',
            ]),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json',
                'Authorization: Bearer ' . $token,
            ],
        ]);

        if ($res['code'] >= 400) {
            return ['success' => false, 'error' => $res['body']];
        }

        // Fetch user list to get their UUID
        $list = $this->curl("{$this->baseUrl}/api/v1/users?page=1", [
            CURLOPT_HTTPHEADER => [
                'Accept: application/json',
                'Authorization: Bearer ' . $token,
            ],
        ]);

        $idpId = null;
        if ($list['code'] === 200) {
            $users = json_decode($list['body'], true)['users'] ?? [];
            foreach ($users as $u) {
                if ($u['email'] === $data['email']) {
                    $idpId = $u['id'];
                    break;
                }
            }
        }

        return ['success' => true, 'idp_id' => $idpId];
    }

    public function deleteUser(string $idpUserId): bool
    {
        $token = $this->getSuperAdminToken();
        if (!$token) return false;

        $res = $this->curl("{$this->baseUrl}/api/v1/users/{$idpUserId}", [
            CURLOPT_CUSTOMREQUEST => 'DELETE',
            CURLOPT_HTTPHEADER    => [
                'Accept: application/json',
                'Authorization: Bearer ' . $token,
            ],
        ]);

        return $res['code'] < 400;
    }

    public function updateUserStatus(string $idpUserId, string $status): bool
    {
        $token = $this->getSuperAdminToken();
        if (!$token) return false;

        $res = $this->curl("{$this->baseUrl}/api/v1/users/{$idpUserId}/status", [
            CURLOPT_CUSTOMREQUEST => 'PATCH',
            CURLOPT_POSTFIELDS    => json_encode(['new_status' => $status]),
            CURLOPT_HTTPHEADER    => [
                'Content-Type: application/json',
                'Accept: application/json',
                'Authorization: Bearer ' . $token,
            ],
        ]);

        return $res['code'] < 400;
    }

    public function updateUserPassword(string $idpUserId, string $newPassword): bool
    {
        $token = $this->getSuperAdminToken();
        if (!$token) return false;

        $res = $this->curl("{$this->baseUrl}/api/v1/users/{$idpUserId}/password", [
            CURLOPT_CUSTOMREQUEST => 'PATCH',
            CURLOPT_POSTFIELDS    => json_encode(['new_password' => $newPassword]),
            CURLOPT_HTTPHEADER    => [
                'Content-Type: application/json',
                'Accept: application/json',
                'Authorization: Bearer ' . $token,
            ],
        ]);

        return $res['code'] < 400;
    }
}