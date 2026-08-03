<?php

namespace App\Http\Controllers;

use App\Http\Requests\AccessRequest\RejectAccessRequestRequest;
use App\Http\Requests\AccessRequest\StoreAccessRequestRequest;
use App\Http\Resources\AccessRequestResource;
use App\Http\Resources\UserResource;
use App\Models\AccessRequest;
use App\Services\AccessRequestService;
use Illuminate\Http\Request;

class AccessRequestController extends Controller
{
    public function __construct(private AccessRequestService $accessRequestService) {}

    /**
     * GET /access-requests
     * Super Admin only (AccessRequestPolicy::viewAny). Supports the same
     * status-filter convention as SystemUserController::index() for
     * frontend consistency.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', AccessRequest::class);

        $query = AccessRequest::query()
            ->with(['requestedBy.adminProfile', 'reviewedBy', 'requestedPolicy'])
            ->latest('created_at');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return AccessRequestResource::collection($query->paginate(20));
    }

    /**
     * POST /access-requests
     * Any admin with the 'access_requests' module (AccessRequestPolicy::create).
     * Creates a 'Requested' row only — never a SystemUser directly.
     */
    public function store(StoreAccessRequestRequest $request)
    {
        $this->authorize('create', AccessRequest::class);

        $accessRequest = $this->accessRequestService->store($request->validated(), $request);

        return (new AccessRequestResource($accessRequest))->response()->setStatusCode(201);
    }

    /**
     * POST /access-requests/{accessRequest}/approve
     * Super Admin only. Creates the SystemUser (Pending Activation, no
     * IdP call — identical to a direct AdminUserService::create()) and
     * marks this request Fulfilled.
     */
    public function approve(AccessRequest $accessRequest, Request $request)
    {
        $this->authorize('review', $accessRequest);

        $user = $this->accessRequestService->approve($accessRequest, $request);

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    /**
     * POST /access-requests/{accessRequest}/reject
     * Super Admin only.
     */
    public function reject(AccessRequest $accessRequest, RejectAccessRequestRequest $request)
    {
        $this->authorize('review', $accessRequest);

        $accessRequest = $this->accessRequestService->reject(
            $accessRequest,
            $request->validated('reason'),
            $request
        );

        return new AccessRequestResource($accessRequest);
    }
}
