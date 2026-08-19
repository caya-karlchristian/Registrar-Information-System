<?php

namespace App\Http\Controllers;

use App\Exceptions\PolicyException;
use App\Http\Requests\Policy\StorePolicyRequest;
use App\Http\Requests\Policy\UpdatePolicyRequest;
use App\Http\Resources\PolicyResource;
use App\Models\Policy;
use App\Services\PolicyService;
use Illuminate\Http\Request;

/**
 * Manages reusable admin permission policies (superadmin only — see
 * routes/api.php, role:4 group).
 *
 * Work Item #2 — Admin Management Consolidation: attaching/editing a
 * policy on a specific admin account is no longer handled here or by
 * SystemUserController (the old attachPolicy() endpoint is retired) —
 * it's now exclusively RoleAssignmentController::editPolicy(), since
 * role_assignments is the single source of truth for both an admin's
 * role and their policy.
 */
class PolicyController extends Controller
{
    public function __construct(private PolicyService $policyService) {}

    // -------------------------------------------------------------------------
    // GET /policies
    // -------------------------------------------------------------------------
    public function index()
    {
        return PolicyResource::collection($this->policyService->list());
    }

    // -------------------------------------------------------------------------
    // POST /policies
    // -------------------------------------------------------------------------
    public function store(StorePolicyRequest $request)
    {
        $policy = $this->policyService->create($request->validated(), $request);

        return (new PolicyResource($policy))->response()->setStatusCode(201);
    }

    // -------------------------------------------------------------------------
    // PUT /policies/{id}
    // -------------------------------------------------------------------------
    public function update(UpdatePolicyRequest $request, $id)
    {
        $policy = Policy::find($id);
        if (!$policy) {
            return response()->json(['message' => 'Policy not found'], 404);
        }

        $policy = $this->policyService->update($policy, $request->validated(), $request);

        return new PolicyResource($policy);
    }

    // -------------------------------------------------------------------------
    // DELETE /policies/{id}
    // -------------------------------------------------------------------------
    public function destroy(Request $request, $id)
    {
        $policy = Policy::find($id);
        if (!$policy) {
            return response()->json(['message' => 'Policy not found'], 404);
        }

        try {
            $this->policyService->delete($policy, $request);
        } catch (PolicyException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['message' => 'Policy deleted successfully'], 200);
    }
}