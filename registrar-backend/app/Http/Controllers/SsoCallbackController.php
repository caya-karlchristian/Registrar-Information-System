<?php

namespace App\Http\Controllers;

use App\Models\SystemUser;
use App\Models\Alumni;
use App\Models\AlumniProfile;
use App\Models\StudentProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SsoCallbackController extends Controller
{
    private const ROLE_MAP = [
        'RIS:superadmin'    => SystemUser::ROLE_SUPER_ADMIN,
        'RIS:admin'         => SystemUser::ROLE_ADMIN,
        'RIS:student'       => SystemUser::ROLE_STUDENT,
        'RIS:alumni_sis'    => SystemUser::ROLE_ALUMNI,
        'RIS:alumni_nonsis' => SystemUser::ROLE_ALUMNI,
    ];

    public function handle(Request $request)
    {
        $code = $request->input('code');

        if (!$code) {
            return response()->json(['message' => 'Authorization code is required.'], 422);
        }

        $clientId     = env('SSO_CLIENT_ID');
        $clientSecret = env('SSO_CLIENT_SECRET');
        $idpBaseUrl   = env('SSO_BASE_URL');

        if (!$clientId || !$clientSecret || !$idpBaseUrl) {
            return response()->json(['message' => 'SSO not configured.'], 503);
        }

        Log::info('SSO: code received', ['code' => substr($code, 0, 10)]);

        // -------------------------------------------------------
        // Step 1 — Exchange auth code for access token
        // -------------------------------------------------------
        $ch = curl_init("{$idpBaseUrl}/api/v1/auth/token");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode([
                'client_id'     => $clientId,
                'client_secret' => $clientSecret,
                'code'          => $code,
            ]),
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Accept: application/json',
            ],
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
        ]);

        $tokenBody = curl_exec($ch);
        $tokenCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $tokenErr  = curl_error($ch);

        Log::info('SSO: token exchange', [
            'http_code'  => $tokenCode,
            'curl_error' => $tokenErr,
            'body'       => $tokenBody,
        ]);

        if ($tokenErr || $tokenCode >= 400) {
            return response()->json([
                'message' => 'Failed to exchange code with identity provider.',
                'detail'  => $tokenErr ?: $tokenBody,
            ], 401);
        }

        $tokenData   = json_decode($tokenBody, true);
        $accessToken = $tokenData['access_token'] ?? null;

        if (!$accessToken) {
            return response()->json(['message' => 'No access token returned by identity provider.'], 401);
        }

        // -------------------------------------------------------
        // Step 2 — Fetch user profile from /me
        // -------------------------------------------------------
        $meCh = curl_init("{$idpBaseUrl}/api/v1/me");
        curl_setopt_array($meCh, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $accessToken,
                'Accept: application/json',
            ],
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
        ]);

        $meBody = curl_exec($meCh);
        $meCode = curl_getinfo($meCh, CURLINFO_HTTP_CODE);

        Log::info('SSO: /me response', [
            'http_code' => $meCode,
            'body'      => $meBody,
        ]);

        if ($meCode !== 200) {
            return response()->json(['message' => 'Failed to fetch user profile from identity provider.'], 401);
        }

        $profile    = json_decode($meBody, true);
        $email      = $profile['email']       ?? null;
        $firstName  = $profile['first_name']  ?? null;
        $middleName = $profile['middle_name'] ?? null;
        $lastName   = $profile['last_name']   ?? null;
        $roles      = $profile['roles']       ?? [];

        if (!$email) {
            return response()->json(['message' => 'Invalid profile returned by identity provider.'], 422);
        }

        // -------------------------------------------------------
        // Step 3 — Map SSO role to RIS role_id
        // -------------------------------------------------------
        $roleId = $this->resolveRoleId($roles);

        // If no role from IdP, fall back to existing local role
        if (!$roleId) {
            $existing = SystemUser::where('email', $email)->first();
            if ($existing) {
                $roleId = $existing->role_id;
            } else {
                return response()->json(['message' => 'No recognized role for this system.'], 403);
            }
        }

        $isSisAlumni    = in_array('RIS:alumni_sis', $roles);
        $isNonSisAlumni = in_array('RIS:alumni_nonsis', $roles);

        // -------------------------------------------------------
        // Step 4 — Find or create user + profile
        // -------------------------------------------------------
        DB::beginTransaction();
        try {
            $user = SystemUser::firstOrCreate(
                ['email' => $email],
                [
                    'password'   => bcrypt(Str::random(32)),
                    'role_id'    => $roleId,
                    'status'     => 'Activated',
                    'created_at' => now(),
                ]
            );

            if ($user->role_id !== $roleId) {
                $user->update(['role_id' => $roleId]);
            }

            $needsOnboarding = false;

            if ($roleId === SystemUser::ROLE_STUDENT) {
                $exists = StudentProfile::where('user_id', $user->user_id)->exists();
                if (!$exists) {
                    StudentProfile::create([
                        'user_id'     => $user->user_id,
                        'first_name'  => $firstName,
                        'middle_name' => $middleName,
                        'last_name'   => $lastName,
                    ]);
                    $needsOnboarding = true;
                }
            }

            if ($roleId === SystemUser::ROLE_ALUMNI) {
                $alumni = Alumni::where('user_id', $user->user_id)->first();
                if (!$alumni) {
                    $alumniTypeId = $isNonSisAlumni ? 2 : 1;

                    $alumni = Alumni::create([
                        'user_id'        => $user->user_id,
                        'alumni_type_id' => $alumniTypeId,
                    ]);

                    AlumniProfile::create([
                        'alumni_id'   => $alumni->alumni_id,
                        'first_name'  => $firstName,
                        'middle_name' => $middleName,
                        'last_name'   => $lastName,
                    ]);
                    $needsOnboarding = true;
                }
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('SSO: DB error', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to process SSO login.'], 500);
        }

        // -------------------------------------------------------
        // Audit log
        // -------------------------------------------------------
        \App\Models\AuditLog::create([
            'user_id'     => $user->user_id,
            'action'      => \App\Models\AuditLog::ACTION_LOGIN,
            'description' => "User {$user->email} logged in via SSO.",
            'created_at'  => now(),
        ]);

        $sanctumToken = $user->createToken('sso')->plainTextToken;

        return response()->json([
            'token'            => $sanctumToken,
            'needs_onboarding' => $needsOnboarding,
            'data'             => [
                'user_id'   => $user->user_id,
                'email'     => $user->email,
                'role_id'   => $user->role_id,
                'role_name' => $user->role_name ?? null,
            ],
        ]);
    }

    private function resolveRoleId(array $roles): ?int
    {
        $priority = [
            'RIS:superadmin'    => 4,
            'RIS:admin'         => 3,
            'RIS:student'       => 2,
            'RIS:alumni_sis'    => 1,
            'RIS:alumni_nonsis' => 1,
        ];

        $resolved = null;
        $highest  = 0;

        foreach ($roles as $role) {
            $level = $priority[$role] ?? 0;
            if ($level > $highest) {
                $highest  = $level;
                $resolved = self::ROLE_MAP[$role] ?? null;
            }
        }

        return $resolved;
    }
}   