<?php

namespace App\Http\Controllers;

use App\Http\Requests\RoleAssignment\RevokeRoleAssignmentRequest;
use App\Http\Requests\RoleAssignment\SearchGrantableUsersRequest;
use App\Http\Requests\RoleAssignment\StoreRoleAssignmentRequest;
use App\Http\Resources\GrantableUserResource;
use App\Http\Resources\RoleAssignmentResource;
use App\Models\RoleAssignment;
use App\Services\RoleAssignmentService;
use Illuminate\Http\Request;

class RoleAssignmentController extends Controller
{
    public function __construct(private RoleAssignmentService $roleAssignmentService) {}

    /**
     * GET /role-assignments
     * Super Admin only. Optional ?user_id= filter for a specific
     * account's full role history (used by UserManagement.jsx's
     * planned "Roles" tab).
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', RoleAssignment::class);

        $query = RoleAssignment::query()
            ->with(['user', 'policy', 'grantedBy', 'revokedBy'])
            ->latest('created_at');

        if ($userId = $request->query('user_id')) {
            $query->where('user_id', $userId);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return RoleAssignmentResource::collection($query->paginate(20));
    }

    /**
     * GET /role-assignments/mine
     * Any authenticated user — their own currently-Active assignments
     * only. This is what the frontend switcher reads to know which
     * roles it can offer to assume; hard-scoped to the caller, same
     * pattern as AccessRequestController::mine().
     */
    public function mine(Request $request)
    {
        $assignments = $request->user()
            ->activeRoleAssignments()
            ->with(['policy'])
            ->get();

        return RoleAssignmentResource::collection($assignments);
    }

    /**
     * GET /role-assignments/search-users
     * Super Admin only — gated by the SAME permission as granting
     * itself (RoleAssignmentPolicy::grant), since finding a target is
     * only ever useful as a step toward granting them a role. This is
     * deliberately not part of SystemUserController — see
     * GrantableUserResource's docblock.
     */
    public function searchUsers(SearchGrantableUsersRequest $request)
    {
        $this->authorize('grant', RoleAssignment::class);

        $users = $this->roleAssignmentService->searchGrantableUsers($request->validated('q'));

        return GrantableUserResource::collection($users);
    }

    /**
     * POST /role-assignments
     * Super Admin only. Onboards a secondary role onto an existing
     * account — e.g. granting Admin (with a restricted policy) to
     * someone who already holds Student. Does not create a SystemUser;
     * user_id must already exist (see StoreRoleAssignmentRequest).
     */
    public function store(StoreRoleAssignmentRequest $request)
    {
        $this->authorize('grant', RoleAssignment::class);

        $assignment = $this->roleAssignmentService->grant($request->validated(), $request);

        return (new RoleAssignmentResource($assignment))->response()->setStatusCode(201);
    }

    /**
     * POST /role-assignments/{roleAssignment}/revoke
     * Super Admin only. Explicit offboarding — see
     * RoleAssignmentService::revoke() for why this also force-logs-out
     * the account rather than just flipping a status column.
     */
    public function revoke(RoleAssignment $roleAssignment, RevokeRoleAssignmentRequest $request)
    {
        // Kept explicit (not folded into the policy) so this specific
        // message survives — mirrors SystemUserController::destroy()'s
        // same-shaped self-target guard. Without this, a Super Admin
        // revoking their own assignment force-deletes every one of their
        // own active Sanctum tokens mid-request, logging themselves out
        // with no confirmation.
        if ($roleAssignment->user_id === $request->user()->user_id) {
            return response()->json(['message' => 'You cannot revoke your own role assignment.'], 403);
        }

        $this->authorize('revoke', $roleAssignment);

        $roleAssignment = $this->roleAssignmentService->revoke(
            $roleAssignment,
            $request->validated('reason'),
            $request
        );

        return new RoleAssignmentResource($roleAssignment);
    }
}