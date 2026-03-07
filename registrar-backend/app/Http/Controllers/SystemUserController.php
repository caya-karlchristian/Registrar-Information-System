<?php

namespace App\Http\Controllers;

use App\Models\SystemUser;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use App\Services\AuditLogger;
use App\Models\AuditLog;

class SystemUserController extends Controller
{
    // -------------------------------------------------------
    // Super Admin can only create/manage admin-level accounts.
    // Students and alumni come from the guidance system (SSO).
    // -------------------------------------------------------
    private const MANAGEABLE_ROLES = [
        SystemUser::ROLE_ADMIN,
        SystemUser::ROLE_SUPER_ADMIN,
    ];

    // -------------------------------------------------------
    // GET /system-users
    // List all admin and super admin accounts
    // -------------------------------------------------------
    public function index()
    {
        $users = SystemUser::whereIn('role_id', self::MANAGEABLE_ROLES)
            ->get();

        return UserResource::collection($users);
    }

    // -------------------------------------------------------
    // GET /system-users/{id}
    // -------------------------------------------------------
    public function show($id)
    {
        $user = SystemUser::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        // Prevent Super Admin from viewing student/alumni accounts
        // through this endpoint — those have their own routes
        if (!in_array($user->role_id, self::MANAGEABLE_ROLES)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return new UserResource($user);
    }

    // -------------------------------------------------------
    // POST /system-users
    // Create a new admin or super admin account
    // -------------------------------------------------------
    public function store(Request $request)
    {
        $validated = $request->validate([
            'email'    => 'required|email|unique:users,email',
            'password' => ['required', Password::min(8)->mixedCase()->numbers()],
            'role_id'  => 'required|integer|in:3,4', // only admin or super_admin
        ]);

        $user = SystemUser::create([
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role_id'  => $validated['role_id'],
        ]);

        AuditLogger::log($request, $user, AuditLog::ACTION_ADMIN_CREATED);

        return (new UserResource($user))
            ->response()
            ->setStatusCode(201);
    }

    // -------------------------------------------------------
    // PUT /system-users/{id}
    // Update email, password, or role of an admin account
    // -------------------------------------------------------
    public function update(Request $request, $id)
    {
        $user = SystemUser::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        // Cannot modify student or alumni accounts through this endpoint
        if (!in_array($user->role_id, self::MANAGEABLE_ROLES)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'email'    => 'sometimes|email|unique:users,email,' . $user->user_id . ',user_id',
            'password' => ['sometimes', Password::min(8)->mixedCase()->numbers()],
            'role_id'  => 'sometimes|integer|in:3,4',
        ]);

        // Hash password only if it's being updated
        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);

        AuditLogger::log($request, $user, AuditLog::ACTION_ADMIN_UPDATED);

        return new UserResource($user);
    }

    // -------------------------------------------------------
    // DELETE /system-users/{id}
    // -------------------------------------------------------
    public function destroy(Request $request, $id)
    {
        $user = SystemUser::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        // Cannot delete student or alumni accounts through this endpoint
        if (!in_array($user->role_id, self::MANAGEABLE_ROLES)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Prevent Super Admin from deleting their own account
        if ($user->user_id === $request->user()->user_id) {
            return response()->json([
                'message' => 'You cannot delete your own account.'
            ], 403);
        }

        AuditLogger::log($request, $request->user(), AuditLog::ACTION_ADMIN_DELETED);

        $user->delete();

        return response()->json(['message' => 'User deleted successfully'], 200);
    }
}