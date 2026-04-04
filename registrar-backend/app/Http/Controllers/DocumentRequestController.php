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
        'studentProfile.academicRecords',
        'studentProfile',
        'academicRecord',
        'status',
        'documents.documentType',
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
    // CHANGED: document_type_ids is now an array of objects:
    //   [{ document_type_id: 1, number_of_copies: 3 }, ...]
    //
    // Each line item carries its own copy count (1–10).
    // This replaces the old single number_of_copies on the header.
    // -------------------------------------------------------
    public function store(Request $request)
    {
        $this->authorize('create', DocumentRequest::class);

        $validated = $request->validate([
            'request_purpose_id'              => 'required|integer|exists:request_purpose,request_purpose_id',
            'or_number'                        => 'nullable|string|max:50',
            'receipt_date'                     => 'nullable|date',

            // documents is now an array of objects, not a flat array of IDs
            'documents'                        => 'required|array|min:1',
            'documents.*.document_type_id'     => 'required|integer|exists:document_type,document_type_id',
            'documents.*.number_of_copies'     => 'required|integer|min:1|max:10',
            // documents.*.  means "for every item in the documents array, validate these keys"
        ]);

        /** @var SystemUser $user */
        $user           = Auth::user();
        $studentProfile = $user->studentProfile;
        $academicRecord = $user->academicRecord;

        if (!$studentProfile || !$academicRecord) {
            return response()->json([
                'message' => 'Student profile or academic record not found.'
            ], 400);
        }

        $documentRequest = DocumentRequest::create([
            'user_id'             => $user->user_id,
            'student_profile_id'  => $studentProfile->student_profile_id,
            'student_academic_id' => $academicRecord->student_academic_id,
            'status_id'           => 1,
            'request_purpose_id'  => $validated['request_purpose_id'],
            'or_number'           => $validated['or_number'] ?? null,
            'receipt_date'        => $validated['receipt_date'] ?? null,
        ]);

        // Each document type gets its own row with its own copy count
        foreach ($validated['documents'] as $doc) {
            $documentRequest->documents()->create([
                'document_type_id' => $doc['document_type_id'],
                'number_of_copies' => $doc['number_of_copies'],
            ]);
        }

        // Notify student
        NotificationService::send(
            recipient:    $user,
            triggerEvent: 'request_submitted',
            data:         ['request_id' => $documentRequest->request_id],
            requestId:    $documentRequest->request_id,
        );

        // Notify all admins
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
    // public function update(Request $request, DocumentRequest $documentRequest)
    // {
    //     $this->authorize('update', $documentRequest);

    //     $validated = $request->validate([
    //         'status_id'    => 'sometimes|integer|exists:request_status,status_id',
    //         'or_number'    => 'sometimes|nullable|string|max:50',
    //         'receipt_date' => 'sometimes|nullable|date',
    //     ]);

    //     $oldStatusId = $documentRequest->status_id;
    //     $oldOrNumber = $documentRequest->or_number;

    //     $documentRequest->update($validated);

    //     /** @var SystemUser $owner */
    //     $owner = SystemUser::find($documentRequest->user_id);

    //     // Notify owner if status changed
    //     if ($owner && isset($validated['status_id']) && $documentRequest->status_id !== $oldStatusId) {

    //         $triggerEvent = self::STATUS_NOTIFICATION_MAP[$documentRequest->status_id] ?? null;

    //         if ($triggerEvent) {
    //             NotificationService::send(
    //                 recipient:    $owner,
    //                 triggerEvent: $triggerEvent,
    //                 data:         ['request_id' => $documentRequest->request_id],
    //                 requestId:    $documentRequest->request_id,
    //             );
    //         }

    //         // Specific trigger event above already covers status change
    //     }

    //     // Notify admins if OR number was added/changed
    //     if (
    //         isset($validated['or_number']) &&
    //         $documentRequest->or_number !== $oldOrNumber &&
    //         !empty($documentRequest->or_number)
    //     ) {
    //         NotificationService::sendToAdmins(
    //             triggerEvent: 'admin_payment_verification',
    //             data:         ['request_id' => $documentRequest->request_id],
    //             requestId:    $documentRequest->request_id,
    //         );
    //     }

    //     return response()->json(
    //         $documentRequest->load(self::RELATIONS),
    //         200
    //     );
    // }
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
