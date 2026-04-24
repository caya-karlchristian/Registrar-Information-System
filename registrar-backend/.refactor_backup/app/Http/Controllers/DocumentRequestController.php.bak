<?php

namespace App\Http\Controllers;

// gawa ni aron stephen s. cordova year 2026
use App\Models\DocumentRequest;
use App\Models\SystemUser;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\RequestHistory;

class DocumentRequestController extends Controller
{

    private const RELATIONS = [
        'user',
        'studentProfile',
        'academicRecord',
        'alumniProfile',
        'alumniAcademicRecord',
        'status',
        'purpose',
        'documents.documentType',
        'certificates.certificationType',   // ← added
    ];

    // Maps status_id → trigger_event slug for notifications
    // null = no user-facing notification for that status
    private const STATUS_NOTIFICATION_MAP = [
        1 => 'request_processing',
        2 => 'ready_to_claim',
        3 => 'request_completed',
        4 => 'request_forfeited',
        5 => null,
    ];

    // -------------------------------------------------------
    // GET /document-requests
    // -------------------------------------------------------
    public function index()
    {
        /** @var SystemUser $user */
        $user  = Auth::user();
        $query = DocumentRequest::with(self::RELATIONS);

        if (!$user instanceof SystemUser) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$user->isStaff()) {
            $query->where('user_id', $user->user_id);
        }

        return response()->json($query->get(), 200);
    }

    // -------------------------------------------------------
    // GET /document-requests/{id}
    // -------------------------------------------------------
    public function show(DocumentRequest $documentRequest)
    {
        $this->authorize('view', $documentRequest);

        return response()->json(
            $documentRequest->load(self::RELATIONS),
            200
        );
    }

    // -------------------------------------------------------
    // POST /document-requests
    // -------------------------------------------------------
    // Payload shape:
    // {
    //   "request_purpose_id": 1,
    //   "or_number": "OR-001",
    //   "receipt_date": "2026-04-10",
    //   "documents": [
    //     { "document_type_id": 15, "number_of_copies": 2 }
    //   ],
    //   "certificates": [          ← optional; omit or send [] if none
    //     { "certificate_type_id": 1 },
    //     { "certificate_type_id": 3 }
    //   ]
    // }
    // -------------------------------------------------------
    public function store(Request $request)
    {
        $this->authorize('create', DocumentRequest::class);

        $validated = $request->validate([
            'request_purpose_id'                => 'required|integer|exists:request_purpose,request_purpose_id',
            'or_number'                         => 'nullable|string|max:50',
            'receipt_date'                      => 'nullable|date',

            // At least one document OR one certificate must be present
            'documents'                         => 'nullable|array',
            'documents.*.document_type_id'      => 'required|integer|exists:document_type,document_type_id',
            'documents.*.number_of_copies'      => 'required|integer|min:1|max:10',

            'certificates'                      => 'nullable|array',
            'certificates.*.certificate_type_id'=> 'required|integer|exists:certificate_type,certificate_type_id',
            'certificates.*.number_of_copies'      => 'nullable|integer|min:1|max:10',
        ]);

        // Require at least one document or one certificate
        $hasDocuments    = !empty($validated['documents']);
        $hasCertificates = !empty($validated['certificates']);

        if (!$hasDocuments && !$hasCertificates) {
            return response()->json([
                'message' => 'At least one document or certificate must be requested.',
            ], 422);
        }

        /** @var SystemUser $user */
        $user = Auth::user();

        if ($user->isStudent()) {
            $studentProfile = $user->studentProfile;
            $academicRecord = $user->academicRecord;

            if (!$studentProfile || !$academicRecord) {
                return response()->json([
                    'message' => 'Student profile or academic record not found.'
                ], 400);
            }

            $requestData = [
                'user_id'             => $user->user_id,
                'student_profile_id'  => $studentProfile->student_profile_id,
                'student_academic_id' => $academicRecord->student_academic_id,
                'alumni_profile_id'   => null,
                'alumni_academic_id'  => null,
                'status_id'           => 1,
                'request_purpose_id'  => $validated['request_purpose_id'],
                'or_number'           => $validated['or_number'] ?? null,
                'receipt_date'        => $validated['receipt_date'] ?? null,
            ];

        } elseif ($user->isAlumni()) {
            $alumniProfile  = $user->alumniProfile;
            $academicRecord = $alumniProfile?->academicRecord;

            if (!$alumniProfile || !$academicRecord) {
                return response()->json([
                    'message' => 'Alumni profile or academic record not found.'
                ], 400);
            }

            $requestData = [
                'user_id'             => $user->user_id,
                'student_profile_id'  => null,
                'student_academic_id' => null,
                'alumni_profile_id'   => $alumniProfile->alumni_profile_id,
                'alumni_academic_id'  => $academicRecord->alumni_academic_id,
                'status_id'           => 1,
                'request_purpose_id'  => $validated['request_purpose_id'],
                'or_number'           => $validated['or_number'] ?? null,
                'receipt_date'        => $validated['receipt_date'] ?? null,
            ];

        } else {
            return response()->json(['message' => 'Unauthorized role.'], 403);
        }

        $documentRequest = DocumentRequest::create($requestData);   

        // Persist document line items
        foreach ($validated['documents'] ?? [] as $doc) {
            $documentRequest->documents()->create([
                'document_type_id' => $doc['document_type_id'],
                'number_of_copies' => $doc['number_of_copies'],
            ]);
        }

        // Persist certificate line items
        foreach ($validated['certificates'] ?? [] as $cert) {
            $documentRequest->certificates()->create([
                'certificate_type_id' => $cert['certificate_type_id'],
                'number_of_copies'    => $cert['number_of_copies'] ?? 1,
            ]);
        }

        NotificationService::send(
            recipient:    $user,
            triggerEvent: 'request_submitted',
            data:         ['request_id' => $documentRequest->request_id],
            requestId:    $documentRequest->request_id,
        );

        NotificationService::sendToAdmins(
            triggerEvent: 'admin_new_request',
            data:         ['request_id' => $documentRequest->request_id],
            requestId:    $documentRequest->request_id,
        );

        return response()->json(
            $documentRequest->load(self::RELATIONS),
            201
        );
    }

    // -------------------------------------------------------
    // PUT /document-requests/{id}
    // Admin/Super Admin only
    // -------------------------------------------------------
    public function update(Request $request, DocumentRequest $documentRequest)
    {
        $this->authorize('update', $documentRequest);

        $validated = $request->validate([
            'status_id'    => 'sometimes|integer|exists:request_status,status_id',
            'or_number'    => 'sometimes|nullable|string|max:50',
            'receipt_date' => 'sometimes|nullable|date',
        ]);

        $oldStatusId = $documentRequest->status_id;
        $oldOrNumber = $documentRequest->or_number;

        $documentRequest->update($validated);

        /** @var SystemUser $owner */
        $owner = SystemUser::find($documentRequest->user_id);

        // Log to request_history + notify owner if status changed
        if (isset($validated['status_id']) && $documentRequest->status_id !== $oldStatusId) {

            $minutesProcessed = (int) $documentRequest->requested_at
                ->diffInMinutes(now());

            RequestHistory::create([
                'request_id'        => $documentRequest->request_id,
                'old_status_id'     => $oldStatusId,
                'new_status_id'     => $documentRequest->status_id,
                'changed_at'        => now(),
                'processed_by'      => Auth::id(),
                'minutes_processed' => $minutesProcessed,
            ]);

            if ($owner) {
                $triggerEvent = self::STATUS_NOTIFICATION_MAP[$documentRequest->status_id] ?? null;

                if ($triggerEvent) {
                    NotificationService::send(
                        recipient:    $owner,
                        triggerEvent: $triggerEvent,
                        data:         ['request_id' => $documentRequest->request_id],
                        requestId:    $documentRequest->request_id,
                    );
                }
            }
        }

        // Notify admins if OR number was added/changed
        if (
            isset($validated['or_number']) &&
            $documentRequest->or_number !== $oldOrNumber &&
            !empty($documentRequest->or_number)
        ) {
            NotificationService::sendToAdmins(
                triggerEvent: 'admin_payment_verification',
                data:         ['request_id' => $documentRequest->request_id],
                requestId:    $documentRequest->request_id,
            );
        }

        return response()->json(
            $documentRequest->load(self::RELATIONS),
            200
        );
    }

    // -------------------------------------------------------
    // DELETE /document-requests/{id}
    // -------------------------------------------------------
    public function destroy(DocumentRequest $documentRequest)
    {
        $this->authorize('delete', $documentRequest);
        $documentRequest->delete();

        return response()->json(['message' => 'Request deleted successfully'], 200);
    }
}