<?php

namespace App\Http\Controllers;

use App\Exceptions\IdpException;
use App\Exceptions\PolicyException;
use App\Http\Requests\SystemUser\AttachSystemUserPolicyRequest;
use App\Http\Requests\SystemUser\StoreSystemUserRequest;
use App\Http\Requests\SystemUser\UpdateSystemUserRequest;
use App\Http\Resources\UserResource;
use App\Models\SystemUser;
use App\Services\AdminUserService;
use App\Services\PolicyService;
use Illuminate\Http\Request;

/**
 * System user management controller (admin / superadmin accounts only).
 *
 * Delegates all IdP + DB + audit-log coordination to AdminUserService.
 * Policy attachment (User Management → "Manage Access") is delegated to
 * PolicyService, since it's a distinct concern from the account lifecycle
 * AdminUserService owns.
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
        private PolicyService $policyService,
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
            // AdminUserService::create() owns IdP + DB coordination.
            // Do not call IdpService here — it is a legacy duplicate.
            $user = $this->adminUserService->create($validated, $request);
        } catch (IdpException $e) {
            // Previously uncaught here beyond the JSON response — this
            // exception never reached Laravel's default exception handler
            // (which would've logged it), since it's caught and converted
            // to a response before that point. Log explicitly so admin
            // creation failures are traceable, with the actor who
            // attempted it, not just the eventual IdP-side transport
            // error logged in IdpClient::execRaw().
            \Illuminate\Support\Facades\Log::error('SystemUserController: admin creation failed', [
                'attempted_by' => $request->user()?->user_id,
                'target_email' => $validated['email'],
                'error'        => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to create user in identity provider.',
                'detail'  => $e->getMessage(),
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
    public function attachPolicy(AttachSystemUserPolicyRequest $request, $id)
    {
        $user = SystemUser::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $this->authorize('attachPolicy', $user);

        $validated = $request->validated();

        try {
            $user = $this->policyService->attachToUser($user, $validated['policy_id'] ?? null, $request);
        } catch (PolicyException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
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