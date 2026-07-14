<?php

namespace App\Http\Controllers;

use App\Exceptions\PolicyException;
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
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                 => 'required|string|max:100|unique:policies,name',
            'permissions'          => 'required|array',
            'permissions.*'        => 'array',
        ]);

        $policy = $this->policyService->create($validated, $request);

        return (new PolicyResource($policy))->response()->setStatusCode(201);
    }

    // -------------------------------------------------------------------------
    // PUT /policies/{id}
    // -------------------------------------------------------------------------
    public function update(Request $request, $id)
    {
        $policy = Policy::find($id);
        if (!$policy) {
            return response()->json(['message' => 'Policy not found'], 404);
        }

        $validated = $request->validate([
            'name'                 => 'sometimes|string|max:100|unique:policies,name,' . $policy->policy_id . ',policy_id',
            'permissions'          => 'sometimes|array',
            'permissions.*'        => 'array',
        ]);

        $policy = $this->policyService->update($policy, $validated, $request);

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
