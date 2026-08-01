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
 * routes/api.php, role:4 group). Attaching a policy to a specific admin
 * is handled by SystemUserController::attachPolicy(), since that action
 * mutates the user, not the policy.
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