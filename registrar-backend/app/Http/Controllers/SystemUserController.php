<?php

namespace App\Http\Controllers;

use App\Exceptions\IdpException;
use App\Exceptions\PolicyException;
use App\Exceptions\IdpException;
use App\Exceptions\PolicyException;
use App\Http\Resources\UserResource;
use App\Models\SystemUser;
use App\Services\AdminUserService;
use App\Services\PolicyService;
use App\Models\SystemUser;
use App\Services\AdminUserService;
use App\Services\PolicyService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

/**
 * System user management controller (admin / superadmin accounts only).
 *
 * Delegates all IdP + DB + audit-log coordination to AdminUserService.
 * Policy attachment (User Management → "Manage Access") is delegated to
 * PolicyService, since it's a distinct concern from the account lifecycle
 * AdminUserService owns.
 */

/**
 * System user management controller (admin / superadmin accounts only).
 *
 * Delegates all IdP + DB + audit-log coordination to AdminUserService.
 * Policy attachment (User Management → "Manage Access") is delegated to
 * PolicyService, since it's a distinct concern from the account lifecycle
 * AdminUserService owns.
 */
class SystemUserController extends Controller
{
    private const MANAGEABLE_ROLES = [
        SystemUser::ROLE_ADMIN,
        SystemUser::ROLE_SUPER_ADMIN,
    ];

    public function __construct(
        private AdminUserService $adminUserService,
        private PolicyService $policyService,
    ) {}

    // -------------------------------------------------------------------------
    public function __construct(
        private AdminUserService $adminUserService,
        private PolicyService $policyService,
    ) {}

    // -------------------------------------------------------------------------
    // GET /system-users
    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    public function index()
    {
        $users = SystemUser::whereIn('role_id', self::MANAGEABLE_ROLES)
            ->with(['adminProfile', 'policy'])
            ->paginate(20);

            ->with(['adminProfile', 'policy'])
            ->paginate(20);

        return UserResource::collection($users);
    }

    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // GET /system-users/{id}
    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    public function show($id)
    {
        $user = SystemUser::with(['adminProfile', 'policy'])->find($id);
        $user = SystemUser::with(['adminProfile', 'policy'])->find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if (!in_array($user->role_id, self::MANAGEABLE_ROLES)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return new UserResource($user);
    }

    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // POST /system-users
    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    public function store(Request $request)
    {
        $validated = $request->validate([
            'email'       => 'required|email|unique:users,email',
            'password'    => ['required', Password::min(8)->mixedCase()->numbers()],
            'role_id'     => 'required|integer|in:3,4',
            'first_name'  => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name'   => 'required|string|max:100',
            'suffix'      => 'nullable|string|max:20',
            // Optional — lets "Add Admin" attach a policy in the same step
            // instead of requiring a separate "Manage Access" action.
            // Only meaningful when role_id = 3 (admin); ignored otherwise.
            'policy_id'   => 'nullable|integer|exists:policies,policy_id',
        ]);

        try {
            // AdminUserService::create() owns IdP + DB coordination.
            // Do not call IdpService here — it is a legacy duplicate.
            $user = $this->adminUserService->create($validated, $request);
        } catch (IdpException $e) {
            // Optional — lets "Add Admin" attach a policy in the same step
            // instead of requiring a separate "Manage Access" action.
            // Only meaningful when role_id = 3 (admin); ignored otherwise.
            'policy_id'   => 'nullable|integer|exists:policies,policy_id',
        ]);

        try {
            // AdminUserService::create() owns IdP + DB coordination.
            // Do not call IdpService here — it is a legacy duplicate.
            $user = $this->adminUserService->create($validated, $request);
        } catch (IdpException $e) {
            return response()->json([
                'message' => 'Failed to create user in identity provider.',
                'detail'  => $e->getMessage(),
                'detail'  => $e->getMessage(),
            ], 500);
        }

        $user->load(['adminProfile', 'policy']);
        $user->load(['adminProfile', 'policy']);

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // PUT /system-users/{id}
    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    public function update(Request $request, $id)
    {
        $user = SystemUser::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if (!in_array($user->role_id, self::MANAGEABLE_ROLES)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'email'       => 'sometimes|email|unique:users,email,' . $user->user_id . ',user_id',
            'password'    => ['sometimes', Password::min(8)->mixedCase()->numbers()],
            'role_id'     => 'sometimes|integer|in:3,4',
            'status'      => 'sometimes|in:Activated,Deactivated',
            'first_name'  => 'sometimes|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name'   => 'sometimes|string|max:100',
            'suffix'      => 'nullable|string|max:20',
        ]);

        try {
            // Audit logging is handled inside AdminUserService::update()
            $user = $this->adminUserService->update($user, $validated, $request);
        } catch (IdpException $e) {
            return response()->json(['message' => 'Failed to sync with identity provider.', 'detail' => $e->getMessage()], 500);
        try {
            // Audit logging is handled inside AdminUserService::update()
            $user = $this->adminUserService->update($user, $validated, $request);
        } catch (IdpException $e) {
            return response()->json(['message' => 'Failed to sync with identity provider.', 'detail' => $e->getMessage()], 500);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update user.'], 500);
        }

        return new UserResource($user);
    }

    // -------------------------------------------------------------------------
    // PATCH /system-users/{id}/policy
    //
    // Attaches (or detaches, when policy_id is null) a permissions policy
    // to a single admin account. This is the server-side counterpart of
    // UserManagement.jsx's "Manage Access" → PolicyModal "Attach policy"
    // flow, which previously only wrote to localStorage.
    // -------------------------------------------------------------------------
    public function attachPolicy(Request $request, $id)
    {
        $user = SystemUser::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if (!in_array($user->role_id, self::MANAGEABLE_ROLES)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'policy_id' => 'nullable|integer|exists:policies,policy_id',
        ]);

        try {
            $user = $this->policyService->attachToUser($user, $validated['policy_id'] ?? null, $request);
        } catch (PolicyException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
        return new UserResource($user);
    }

    // -------------------------------------------------------------------------
    // PATCH /system-users/{id}/policy
    //
    // Attaches (or detaches, when policy_id is null) a permissions policy
    // to a single admin account. This is the server-side counterpart of
    // UserManagement.jsx's "Manage Access" → PolicyModal "Attach policy"
    // flow, which previously only wrote to localStorage.
    // -------------------------------------------------------------------------
    public function attachPolicy(Request $request, $id)
    {
        $user = SystemUser::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if (!in_array($user->role_id, self::MANAGEABLE_ROLES)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'policy_id' => 'nullable|integer|exists:policies,policy_id',
        ]);

        try {
            $user = $this->policyService->attachToUser($user, $validated['policy_id'] ?? null, $request);
        } catch (PolicyException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return new UserResource($user);
        return new UserResource($user);
    }

    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // DELETE /system-users/{id}
    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    public function destroy(Request $request, $id)
    {
        $user = SystemUser::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if (!in_array($user->role_id, self::MANAGEABLE_ROLES)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($user->user_id === $request->user()->user_id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 403);
            return response()->json(['message' => 'You cannot delete your own account.'], 403);
        }

        // Audit logging is handled inside AdminUserService::delete()
        try {
            $this->adminUserService->delete($user, $request);
        } catch (\Illuminate\Database\QueryException $e) {
            // MySQL error 1451 — FK constraint violation
            if ($e->getCode() === '23000') {
                return response()->json([
                    'message' => 'Cannot delete a user who still has associated requests, records, or history.',
                ], 409);
            }

            throw $e;
        }

        return response()->json(['message' => 'User deleted successfully'], 200);
    }
}