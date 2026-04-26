<?php

namespace App\Http\Controllers;

use App\Exceptions\IdpException;
use App\Http\Resources\UserResource;
use App\Models\SystemUser;
use App\Services\AdminUserService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

/**
 * System user management controller (admin / superadmin accounts only).
 *
 * Delegates all IdP + DB + audit-log coordination to AdminUserService.
 */
class SystemUserController extends Controller
{
    private const MANAGEABLE_ROLES = [
        SystemUser::ROLE_ADMIN,
        SystemUser::ROLE_SUPER_ADMIN,
    ];

    public function __construct(private AdminUserService $adminUserService) {}

    // -------------------------------------------------------------------------
    // GET /system-users
    // -------------------------------------------------------------------------
    public function index()
    {
        $users = SystemUser::whereIn('role_id', self::MANAGEABLE_ROLES)
            ->with('adminProfile')
            ->paginate(20);

        return UserResource::collection($users);
    }

    // -------------------------------------------------------------------------
    // GET /system-users/{id}
    // -------------------------------------------------------------------------
    public function show($id)
    {
        $user = SystemUser::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if (!in_array($user->role_id, self::MANAGEABLE_ROLES)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return new UserResource($user);
    }

    // -------------------------------------------------------------------------
    // POST /system-users
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
        ]);

        // Map RIS role_id → IdP role name
        $idpRoleMap = [
            SystemUser::ROLE_ADMIN       => 'RIS:admin',
            SystemUser::ROLE_SUPER_ADMIN => 'RIS:superadmin',
        ];
        $idpRole = $idpRoleMap[$validated['role_id']];

        // Create in IdP first
        $idp = new IdpService();
        $idpResult = $idp->createUser([
            'email'       => $validated['email'],
            'first_name'  => $validated['first_name'],
            'middle_name' => $validated['middle_name'] ?? '',
            'last_name'   => $validated['last_name'],
            'password'    => $validated['password'],
            'roles'       => [$idpRole],
        ]);

        if (!$idpResult['success']) {
            return response()->json([
                'message' => 'Failed to create user in identity provider.',
                'detail'  => $idpResult['error'],
            ], 500);
        }

        try {
            // Audit logging is handled inside AdminUserService::create()
            $user = $this->adminUserService->create($validated, $request);
        } catch (IdpException $e) {
            return response()->json([
                'message' => 'Failed to create user in identity provider.',
                'detail'  => $e->getMessage(),
            ], 500);
        }

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    // -------------------------------------------------------------------------
    // PUT /system-users/{id}
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
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update user.'], 500);
        }

        return new UserResource($user);
    }

    // -------------------------------------------------------------------------
    // DELETE /system-users/{id}
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
        }

        // Audit logging is handled inside AdminUserService::delete()
        $this->adminUserService->delete($user, $request);

        return response()->json(['message' => 'User deleted successfully'], 200);
    }
}
