<?php
namespace App\Http\Controllers;

use App\Models\Alumni;
use App\Models\AlumniProfile;
use App\Models\StudentProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use App\Models\SystemUser;
use App\Http\Resources\UserResource;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Services\AuditLogger;
use App\Models\AuditLog;
use App\Services\Sso\IdpClient;


class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $email       = $request->input('email');
        $password    = $request->input('password');
        $clientId    = env('SSO_CLIENT_ID');
        $clientSecret = env('SSO_CLIENT_SECRET');
        $idpBaseUrl  = env('SSO_BASE_URL');

        if (!$clientId || !$clientSecret || !$idpBaseUrl) {
            return response()->json(['message' => 'SSO not configured.'], 503);
        }

        // Step 1 — Get code from IdP
        $ch = curl_init("{$idpBaseUrl}/api/v1/auth/login");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode([
                'client_id' => $clientId,
                'email'     => $email,
                'password'  => $password,
            ]),
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Accept: application/json'],
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
        ]);
        $loginBody = curl_exec($ch);
        $loginCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        Log::info('SSO: login attempt', ['http_code' => $loginCode, 'email' => $email]);

        if ($loginCode !== 200) {
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        // Response is a redirect URL string e.g. "http://localhost/auth/callback?code=xxx"
        $redirectUrl = trim($loginBody, '"');
        parse_str(parse_url($redirectUrl, PHP_URL_QUERY), $params);
        $code = $params['code'] ?? null;

        if (!$code) {
            Log::error('SSO: no code in redirect', ['body' => $loginBody]);
            return response()->json(['message' => 'SSO login failed. No code received.'], 500);
        }

        // Step 2 — Exchange code for access token
        $ch2 = curl_init("{$idpBaseUrl}/api/v1/auth/token");
        curl_setopt_array($ch2, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode([
                'client_id'     => $clientId,
                'client_secret' => $clientSecret,
                'code'          => $code,
            ]),
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Accept: application/json'],
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
        ]);
        $tokenBody   = curl_exec($ch2);
        $tokenCode   = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
        $tokenData   = json_decode($tokenBody, true);
        $accessToken = $tokenData['access_token'] ?? null;

        Log::info('SSO: token exchange', ['http_code' => $tokenCode]);

        if ($tokenCode !== 200 || !$accessToken) {
            return response()->json(['message' => 'Authentication failed.'], 401);
        }

        // Step 3 — Get profile from /me
        $ch3 = curl_init("{$idpBaseUrl}/api/v1/me");
        curl_setopt_array($ch3, [
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
        $meBody  = curl_exec($ch3);
        $meCode  = curl_getinfo($ch3, CURLINFO_HTTP_CODE);
        $profile = json_decode($meBody, true);

        Log::info('SSO: /me', ['http_code' => $meCode, 'body' => $meBody]);

        if ($meCode !== 200 || empty($profile['email'])) {
            return response()->json(['message' => 'Failed to fetch user profile.'], 500);
        }

        $profileEmail = $profile['email'];
        $firstName    = $profile['first_name']  ?? null;
        $middleName   = $profile['middle_name'] ?? null;
        $lastName     = $profile['last_name']   ?? null;
        $rolesRaw     = $profile['roles']       ?? [];
        $roles        = is_array($rolesRaw)
            ? $rolesRaw
            : array_filter(array_map('trim', explode(',', $rolesRaw)));

        // Step 4 — Resolve role
        $roleId = $this->resolveRoleId($roles);
        if (!$roleId) {
            $existing = SystemUser::where('email', $profileEmail)->first();
            $roleId   = $existing?->role_id;
        }
        if (!$roleId) {
            return response()->json(['message' => 'No recognized role for this system.'], 403);
        }

        // Step 5 — Find or create local user
        // Step 5 — Find or create local user + profile
DB::beginTransaction();
try {
    $user = SystemUser::firstOrCreate(
        ['email' => $profileEmail],
        [
            'password'   => bcrypt(Str::random(32)),
            'role_id'    => $roleId,
            'status'     => 'Activated',
        ]
    );

    if ($user->role_id !== $roleId) {
        $user->update(['role_id' => $roleId]);
    }

    // Create profile if missing
    if ($roleId === SystemUser::ROLE_STUDENT) {
        $exists = StudentProfile::where('user_id', $user->user_id)->exists();
        if (!$exists) {
            StudentProfile::create([
                'user_id'     => $user->user_id,
                'first_name'  => $firstName,
                'middle_name' => $middleName,
                'last_name'   => $lastName,
            ]);
        }
    }

    if ($roleId === SystemUser::ROLE_ALUMNI) {
        $alumni = Alumni::where('user_id', $user->user_id)->first();
        if (!$alumni) {
            $isNonSis = in_array('RIS:alumni_nonsis', $roles);
            $alumni = Alumni::create([
                'user_id'        => $user->user_id,
                'alumni_type_id' => $isNonSis ? 2 : 1,
            ]);
            AlumniProfile::create([
                'alumni_id'   => $alumni->alumni_id,
                'first_name'  => $firstName,
                'middle_name' => $middleName,
                'last_name'   => $lastName,
            ]);
        }
    }

    if (in_array($roleId, [SystemUser::ROLE_ADMIN, SystemUser::ROLE_SUPER_ADMIN])) {
        $exists = DB::table('admin_profile')->where('user_id', $user->user_id)->exists();
        if (!$exists) {
            DB::table('admin_profile')->insert([
                'user_id'     => $user->user_id,
                'first_name'  => $firstName,
                'middle_name' => $middleName,
                'last_name'   => $lastName,
            ]);
        }
    }

    DB::commit();
} catch (\Exception $e) {
    DB::rollBack();
    Log::error('SSO: DB error', ['error' => $e->getMessage()]);
    return response()->json(['message' => 'Login failed.'], 500);
}

        $user->update(['idp_access_token' => $accessToken]);

        AuditLogger::log($request, $user, AuditLog::ACTION_LOGIN);

        $sanctumToken = $user->createToken('login')->plainTextToken;
        return response()->json(['token' => $sanctumToken]);
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

    $roleMap = [
        'RIS:superadmin'    => SystemUser::ROLE_SUPER_ADMIN,
        'RIS:admin'         => SystemUser::ROLE_ADMIN,
        'RIS:student'       => SystemUser::ROLE_STUDENT,
        'RIS:alumni_sis'    => SystemUser::ROLE_ALUMNI,
        'RIS:alumni_nonsis' => SystemUser::ROLE_ALUMNI,
    ];

    $resolved = null;
    $highest  = 0;

    foreach ($roles as $role) {
        $level = $priority[$role] ?? 0;
        if ($level > $highest) {
            $highest  = $level;
            $resolved = $roleMap[$role] ?? null;
        }
    }

    return $resolved;
}

    public function me(Request $request)
    {
        $user = $request->user();
        $user->loadIdentityRelations();
        return new UserResource($user);
    }

    public function logout(Request $request)
{
    AuditLogger::log($request, $request->user(), AuditLog::ACTION_LOGOUT);
    $request->user()->tokens()->delete();

    // Call SSO logout to destroy the SSO session
    Http::post(env('SSO_BASE_URL') . '/api/v1/auth/logout', [
        'client_id' => env('SSO_CLIENT_ID'),
    ]);

    return response()->json(['message' => 'Logged out']);
}
}