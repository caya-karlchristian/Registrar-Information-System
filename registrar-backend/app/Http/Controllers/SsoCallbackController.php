<?php

namespace App\Http\Controllers;

use App\Models\SystemUser;
use App\Models\Alumni;
use App\Models\AlumniProfile;
use App\Models\StudentProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class SsoCallbackController extends Controller
{
    // -------------------------------------------------------
    // Role mapping — SSO role names → RIS role_id
    // -------------------------------------------------------
    private const ROLE_MAP = [
        'registrar:superadmin' => SystemUser::ROLE_SUPER_ADMIN,
        'registrar:admin'      => SystemUser::ROLE_ADMIN,
        'registrar:student'    => SystemUser::ROLE_STUDENT,
        'registrar:alumni_sis'    => SystemUser::ROLE_ALUMNI,
        'registrar:alumni_nonsis' => SystemUser::ROLE_ALUMNI,
    ];

    // -------------------------------------------------------
    // POST /api/auth/callback
    // Receives JWT from SSO, issues Sanctum token
    // -------------------------------------------------------
    public function handle(Request $request)
    {
        // Support both POST body and query string token
        $token = $request->input('token') ?? $request->query('token');

        if (!$token) {
            return response()->json(['message' => 'Token is required.'], 422);
        }

        // -------------------------------------------------------
        // Verify and decode the JWT
        // Replace SSO_PUBLIC_KEY in .env with the real key
        // when the role permissions group sends it
        // -------------------------------------------------------
        $publicKey = env('SSO_PUBLIC_KEY');

        if (!$publicKey) {
            return response()->json(['message' => 'SSO not configured.'], 503);
        }

        try {
            $decoded = JWT::decode($token, new Key($publicKey, 'RS256'));
        } catch (\Exception $e) {
            return response()->json(['message' => 'Invalid or expired token.'], 401);
        }

        // -------------------------------------------------------
        // Extract claims from JWT payload
        // Expected: email, name (fn mn ln), roles (array)
        // -------------------------------------------------------
        $email     = $decoded->email     ?? null;
        $firstName = $decoded->fn        ?? null;
        $middleName = $decoded->mn       ?? null;
        $lastName  = $decoded->ln        ?? null;
        $roles     = $decoded->roles     ?? [];
        $roles      = (array)($decoded->roles ?? []);

        if (!$email || empty($roles)) {
            return response()->json(['message' => 'Invalid token payload.'], 422);
        }

        // -------------------------------------------------------
        // Map SSO role to RIS role_id
        // Use the highest privilege role if multiple are present
        // -------------------------------------------------------
        $roleId = $this->resolveRoleId($roles);

        if (!$roleId) {
            return response()->json(['message' => 'No recognized role for this system.'], 403);
        }

        // -------------------------------------------------------
        // Determine if this is SIS or NON-SIS alumni
        // -------------------------------------------------------
        $isSisAlumni    = in_array('registrar:alumni_sis', (array) $roles);
        $isNonSisAlumni = in_array('registrar:alumni_nonsis', (array) $roles);

        DB::beginTransaction();
        try {
            // Find or create the user account
            $user = SystemUser::firstOrCreate(
                ['email' => $email],
                [
                    'password'  => bcrypt(Str::random(32)), // random — SSO users never use password login
                    'role_id'   => $roleId,
                    'status'    => 'Activated',
                    'created_at' => now(),
                ]
            );

            // Update role if it changed on the SSO side
            if ($user->role_id !== $roleId) {
                $user->update(['role_id' => $roleId]);
            }

            $needsOnboarding = false;

            // -------------------------------------------------------
            // Create profile if first login
            // -------------------------------------------------------
            if ($roleId === SystemUser::ROLE_STUDENT) {
                $exists = StudentProfile::where('user_id', $user->user_id)->exists();
                if (!$exists) {
                    StudentProfile::create([
                        'user_id'    => $user->user_id,
                        'first_name' => $firstName,
                        'middle_name' => $middleName,
                        'last_name'  => $lastName,
                    ]);
                    $needsOnboarding = true;
                }
            }

            if ($roleId === SystemUser::ROLE_ALUMNI) {
                $alumni = Alumni::where('user_id', $user->user_id)->first();
                if (!$alumni) {
                    $alumniTypeId = $isNonSisAlumni ? 2 : 1; // 1=SIS, 2=NON-SIS

                    $alumni = Alumni::create([
                        'user_id'       => $user->user_id,
                        'alumni_type_id' => $alumniTypeId,
                    ]);

                    AlumniProfile::create([
                        'alumni_id'  => $alumni->alumni_id,
                        'first_name' => $firstName,
                        'middle_name' => $middleName,
                        'last_name'  => $lastName,
                    ]);
                    $needsOnboarding = true;
                }
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to process SSO login.'], 500);
        }

        // Issue Sanctum token
        $sanctumToken = $user->createToken('sso')->plainTextToken;

        return response()->json([
            'token'           => $sanctumToken,
            'needs_onboarding' => $needsOnboarding,
            'data'            => [
                'user_id'   => $user->user_id,
                'email'     => $user->email,
                'role_id'   => $user->role_id,
                'role_name' => $user->role_name ?? null,
            ],
        ]);
    }

    // -------------------------------------------------------
    // Resolve the highest privilege role from the roles array
    // Priority: superadmin > admin > student > alumni
    // -------------------------------------------------------
    private function resolveRoleId(array $roles): ?int
    {
        $priority = [
            'registrar:superadmin'    => 4,
            'registrar:admin'         => 3,
            'registrar:student'       => 2,
            'registrar:alumni_sis'    => 1,
            'registrar:alumni_nonsis' => 1,
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
