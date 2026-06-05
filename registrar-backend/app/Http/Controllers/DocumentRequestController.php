<?php

namespace App\Http\Controllers;

use App\Models\DocumentRequest;
use App\Models\SystemUser;
use App\Contracts\DocumentRequestServiceInterface;
use App\Services\DocumentRequestService;
use Illuminate\Http\Request;
use App\Services\CashierService;
use Illuminate\Support\Facades\Auth;

/**
 * Document request HTTP controller.
 *
 * Responsibilities: validate input, authorize, delegate to DocumentRequestService, return JSON.
 * Business logic lives entirely in DocumentRequestService.
 */
class DocumentRequestController extends Controller
{
    private const RELATIONS = [
        'user',
        'studentProfile',
        'academicRecord',
        'alumniProfile',
        'alumniAcademicRecord',
        'status',
        'requestPurpose',
        'documents.documentType',
        'certificates.certificationType',
    ];

    // or-validation: CashierService injected
    public function __construct(
        private DocumentRequestServiceInterface $requestService,
        private CashierService                  $cashierService,
    ) {}

    // -------------------------------------------------------------------------
    // GET /document-requests
    // -------------------------------------------------------------------------
    public function index()
    {
        /** @var SystemUser $user */
        $user  = Auth::user();
        $query = DocumentRequest::with(self::RELATIONS);

        if (!$user instanceof SystemUser) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$user->isStaff()) {
            // Students / alumni: return ALL of their own requests so the
            // frontend dashboard never silently loses older records.
            // Their volume is low enough that a full ->get() is safe.
            return response()->json([
                'data' => $query
                    ->where('user_id', $user->user_id)
                    ->orderByDesc('requested_at')
                    ->get(),
            ], 200);
        }

        // Staff: potentially thousands of rows — keep pagination.
        return response()->json($query->orderByDesc('requested_at')->paginate(20), 200);
    }

    // -------------------------------------------------------------------------
    // GET /document-requests/{id}
    // -------------------------------------------------------------------------
    public function show(DocumentRequest $documentRequest)
    {
        $this->authorize('view', $documentRequest);
        return response()->json($documentRequest->load(self::RELATIONS), 200);
    }

    // -------------------------------------------------------------------------
    // POST /document-requests
    // -------------------------------------------------------------------------
    public function store(Request $request)
    {
        $this->authorize('create', DocumentRequest::class);

        $validated = $request->validate([
            'request_purpose_id'                 => 'required|integer|exists:request_purpose,request_purpose_id',
            'or_number'                          => 'nullable|string|max:50',
            'receipt_date'                       => 'nullable|date',
            'documents'                          => 'nullable|array',
            'documents.*.document_type_id'       => 'required|integer|exists:document_type,document_type_id',
            'documents.*.number_of_copies'       => 'required|integer|min:1|max:10',
            'certificates'                       => 'nullable|array',
            'certificates.*.certificate_type_id' => 'required|integer|exists:certificate_type,certificate_type_id',
            'certificates.*.number_of_copies'    => 'nullable|integer|min:1|max:10',
        ]);

        if (empty($validated['documents']) && empty($validated['certificates'])) {
            return response()->json([
                'message' => 'At least one document or certificate must be requested.',
            ], 422);
        }

        // or-validation: single-use check
        if (!empty($validated['or_number'])) {
            if ($this->cashierService->isOrAlreadyUsed($validated['or_number'])) {
                $message = 'This OR number has already been used for a previous request. Each Official Receipt can only be used once.';
                return response()->json([
                    'message' => $message,
                    'errors'  => ['or_number' => [$message]],
                ], 422);
            }
        }

        // or-validation: verify OR before creating request
        if (!empty($validated['or_number'])) {
            /** @var \App\Models\SystemUser $user */
            $user = Auth::user();

            // Resolve the customer name from the user's profile.
            // Students and alumni have separate profile tables;
            // admins submitting on behalf of a student are not expected
            // to hit this path (walk-in requests bypass OR validation).
            $profile = $user->studentProfile ?? $user->alumniProfile ?? null;

            if ($profile) {
                $customerName = $this->cashierService->formatCustomerName(
                    $profile->last_name  ?? '',
                    $profile->first_name ?? '',
                    $profile->middle_name ?? '',
                    $profile->suffix ?? '',
                );

                $verification = $this->cashierService->verifyPayment(
                    $validated['or_number'],
                    $customerName,
                );

                if (!$verification['valid']) {
                    $reason = $verification['reason'] ?? 'NOT_FOUND';

                    $message = match ($reason) {
                        'NOT_FOUND' => 'The OR number could not be found. Please check your Official Receipt and try again.',
                        'API_ERROR' => 'Payment verification is temporarily unavailable. Please try again later.',
                        default     => 'Payment verification failed. Please contact the registrar\'s office.',
                    };

                    return response()->json([
                        'message' => $message,
                        'errors'  => ['or_number' => [$message]],
                    ], 422);
                }
            }
        }

        $documentRequest = $this->requestService->createRequest(Auth::user(), $validated);

        return response()->json($documentRequest->load(self::RELATIONS), 201);
    }

    // -------------------------------------------------------------------------
    // PUT /document-requests/{documentRequest}
    // -------------------------------------------------------------------------
    public function update(Request $request, DocumentRequest $documentRequest)
    {
        $this->authorize('update', $documentRequest);

        $validated = $request->validate([
            'status_id'    => 'sometimes|integer|exists:request_status,status_id',
            'or_number'    => 'sometimes|nullable|string|max:50',
            'receipt_date' => 'sometimes|nullable|date',
        ]);

        $documentRequest = $this->requestService->updateRequest($documentRequest, $validated);

        return response()->json($documentRequest->load(self::RELATIONS), 200);
    }

    // -------------------------------------------------------------------------
    // DELETE /document-requests/{documentRequest}
    // -------------------------------------------------------------------------
    public function destroy(DocumentRequest $documentRequest)
    {
        $this->authorize('delete', $documentRequest);
        $documentRequest->delete();
        return response()->json(['message' => 'Request deleted successfully'], 200);
    }
}