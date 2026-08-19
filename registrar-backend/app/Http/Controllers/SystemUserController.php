<?php

namespace App\Http\Controllers;

use App\Exceptions\IdpException;
use App\Http\Requests\SystemUser\StoreSystemUserRequest;
use App\Http\Requests\SystemUser\UpdateSystemUserRequest;
use App\Http\Resources\UserResource;
use App\Models\SystemUser;
use App\Services\AdminUserService;
use Illuminate\Http\Request;

/**
 * System user management controller (admin / superadmin accounts only).
 *
 * Delegates all IdP + DB + audit-log coordination to AdminUserService.
 *
 * Work Item #2 — Admin Management Consolidation: this controller no
 * longer attaches policies to an account (the retired "Manage Access"
 * modal's PATCH /system-users/{id}/policy endpoint is gone) and update()
 * no longer accepts role_id (the retired "Edit User" Role dropdown).
 * role_assignments (via RoleAssignmentController/RoleAssignmentService)
 * is now the single place both a policy and a role are ever granted or
 * changed — see UpdateSystemUserRequest and AdminUserService::update()
 * for the corresponding validation/handling removal.
 *
 * Validation now lives in App\Http\Requests\SystemUser\* (see rules() in
 * each). Authorization now lives in SystemUserPolicy — the inline
 * `in_array($user->role_id, self::MANAGEABLE_ROLES)` checks that used to
 * live in every method here have been replaced with $this->authorize(),
 * matching the pattern DocumentRequestController already uses.
 */
class SystemUserController extends Controller
{
    private const MANAGEABLE_ROLES = [
        SystemUser::ROLE_ADMIN,
        SystemUser::ROLE_SUPER_ADMIN,
    ];

    public function __construct(
        private AdminUserService $adminUserService,
    ) {}

    // -------------------------------------------------------------------------
    // GET /system-users
    // -------------------------------------------------------------------------
    public function index()
    {
        $this->authorize('viewAny', SystemUser::class);

        $users = SystemUser::whereIn('role_id', self::MANAGEABLE_ROLES)
            ->with(['adminProfile', 'policy'])
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

        $this->authorize('view', $user);

        return new UserResource($user);
    }

    // -------------------------------------------------------------------------
    // POST /system-users
    // -------------------------------------------------------------------------
    public function store(StoreSystemUserRequest $request)
    {
        $this->authorize('create', SystemUser::class);

        $validated = $request->validated();

        try {
            // AdminUserService::create() only pre-registers the RIS record
            // ('Pending Activation', no IdP call) — see its docblock. The
            // actual IdP identity is created by hand, separately, in the
            // IdP's User Pool, and the two are linked automatically on
            // first SSO login (Sso\UserProvisioningService::provision()).
            $user = $this->adminUserService->create($validated, $request);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('SystemUserController: admin pre-registration failed', [
                'attempted_by' => $request->user()?->user_id,
                'target_email' => $validated['email'],
                'error'        => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to create the pending RIS record.',
            ], 500);
        }

        $user->load(['adminProfile', 'policy']);

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    // -------------------------------------------------------------------------
    // PUT /system-users/{id}
    // -------------------------------------------------------------------------
    public function update(UpdateSystemUserRequest $request, $id)
    {
        $user = SystemUser::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $this->authorize('update', $user);

        $validated = $request->validated();

        try {
            // Audit logging is handled inside AdminUserService::update()
            $user = $this->adminUserService->update($user, $validated, $request);
        } catch (IdpException $e) {
            return response()->json(['message' => 'Failed to sync with identity provider.', 'detail' => $e->getMessage()], 500);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update user.'], 500);
        }

        // AdminUserService::update() returns $user->fresh() from inside its
        // transaction, which drops any previously loaded relations — same
        // reason store() reloads them before building its resource.
        $user->load(['adminProfile', 'policy']);

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

        // Kept explicit (not folded into the policy) so this specific
        // message survives — see SystemUserPolicy::delete() docblock.
        if ($user->user_id === $request->user()->user_id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 403);
        }

        $this->authorize('delete', $user);

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