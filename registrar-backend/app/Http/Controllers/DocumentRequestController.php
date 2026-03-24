<?php

namespace App\Http\Controllers;

// gawa ni aron stephen s. cordova year 2026
use App\Models\DocumentRequest;
use App\Models\SystemUser;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DocumentRequestController extends Controller
{
    // Relations to eager load on every request
    // Defined once so index() and show() stay in sync
    private const RELATIONS = [
        'user',
        'studentProfile.academicRecords',
        'studentProfile',
        'academicRecord',
        'status',
        'documents.documentType',
    ];

    // -------------------------------------------------------
    // Maps status_id → the trigger_event slug to fire
    // when an admin changes a request to that status.
    //
    // Why a map instead of a switch/if-else?
    //   Cleaner, easier to extend — adding a new status just
    //   means adding one line here, no logic changes needed.
    //
    // null = no notification fired for that status transition
    // -------------------------------------------------------
    private const STATUS_NOTIFICATION_MAP = [
        1 => 'request_processing',   // Pending      → being processed
        2 => 'ready_to_claim',       // Ready to Claim
        3 => 'request_completed',    // Completed
        4 => 'request_forfeited',    // Forfeited
        5 => null,                   // History → no user-facing notification
    ];

    // -------------------------------------------------------
    // GET /document-requests
    // Admin/Super Admin → all requests
    // Student/Alumni → only their own
    // -------------------------------------------------------
    public function index()
    {
        /** @var SystemUser $user */
        $user = Auth::user();

        $query = DocumentRequest::with(self::RELATIONS);

        if (!$user instanceof SystemUser) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Staff (admin + super admin) see everything
        // Students and alumni only see their own requests
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
    // Students and alumni only (enforced by route middleware + policy)
    //
    // NOTIFICATIONS FIRED:
    //   → Student/Alumni: 'request_submitted'
    //   → All admins:     'admin_new_request'
    //
    // Both fire AFTER the request is successfully saved so we
    // never send a notification for a request that failed to save.
    // -------------------------------------------------------
    public function store(Request $request)
    {
        $this->authorize('create', DocumentRequest::class);

        $validated = $request->validate([
            'request_purpose_id'  => 'required|integer|exists:request_purpose,request_purpose_id',
            'or_number'           => 'nullable|string|max:50',
            'receipt_date'        => 'nullable|date',
            'number_of_copies'    => 'required|integer|min:1|max:100',
            'document_type_ids'   => 'required|array|min:1',
            'document_type_ids.*' => 'integer|exists:document_type,document_type_id',
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
            'status_id'           => 1, // Pending
            'request_purpose_id'  => $validated['request_purpose_id'],
            'or_number'           => $validated['or_number'] ?? null,
            'receipt_date'        => $validated['receipt_date'] ?? null,
            'number_of_copies'    => $validated['number_of_copies'],
        ]);

        // Attach the requested document types (many-to-many)
        foreach ($validated['document_type_ids'] as $documentTypeId) {
            $documentRequest->documents()->create([
                'document_type_id' => $documentTypeId,
            ]);
        }

        // -------------------------------------------------------
        // NOTIFY: Tell the student their request was received
        // -------------------------------------------------------
        NotificationService::send(
            recipient:    $user,
            triggerEvent: 'request_submitted',
            data:         ['request_id' => $documentRequest->request_id],
            requestId:    $documentRequest->request_id,
        );

        // -------------------------------------------------------
        // NOTIFY: Tell all admins a new request needs attention
        // -------------------------------------------------------
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
    // Admin/Super Admin only — update status, add notes, etc.
    //
    // NOTIFICATIONS FIRED (only when status_id changes):
    //   → The request owner gets a status-specific notification
    //     based on STATUS_NOTIFICATION_MAP above.
    //   → If or_number is being set/changed, admin gets a
    //     payment verification notification.
    //
    // We only fire when status actually CHANGES — not on every
    // update. This prevents duplicate notifications if an admin
    // updates only the or_number without touching the status.
    // -------------------------------------------------------
    public function update(Request $request, DocumentRequest $documentRequest)
    {
        $this->authorize('update', $documentRequest);

        $validated = $request->validate([
            'status_id'        => 'sometimes|integer|exists:request_status,status_id',
            'or_number'        => 'sometimes|nullable|string|max:50',
            'receipt_date'     => 'sometimes|nullable|date',
            'number_of_copies' => 'sometimes|integer|min:1|max:100',
        ]);

        // Capture old status BEFORE the update so we can compare
        $oldStatusId = $documentRequest->status_id;
        $oldOrNumber = $documentRequest->or_number;

        $documentRequest->update($validated);

        // Load the request owner so we can send them a notification
        // We use fresh() to get the updated model from DB
        /** @var SystemUser $owner */
        $owner = SystemUser::find($documentRequest->user_id);

        // -------------------------------------------------------
        // NOTIFY: Status changed → notify the request owner
        // -------------------------------------------------------
        $newStatusId = $documentRequest->status_id;

        if ($owner && isset($validated['status_id']) && $newStatusId !== $oldStatusId) {

            $triggerEvent = self::STATUS_NOTIFICATION_MAP[$newStatusId] ?? null;

            if ($triggerEvent) {
                NotificationService::send(
                    recipient:    $owner,
                    triggerEvent: $triggerEvent,
                    data:         [
                        'request_id' => $documentRequest->request_id,
                        'status'     => $documentRequest->status->status_name ?? '',
                    ],
                    requestId:    $documentRequest->request_id,
                );
            }

            // Also fire the general status_updated notification
            // so the student always gets SOMETHING even if the
            // specific status has no dedicated notification
            NotificationService::send(
                recipient:    $owner,
                triggerEvent: 'status_updated',
                data:         ['request_id' => $documentRequest->request_id],
                requestId:    $documentRequest->request_id,
            );
        }

        // -------------------------------------------------------
        // NOTIFY: OR number set/changed → admin payment verification
        // -------------------------------------------------------
        $newOrNumber = $documentRequest->or_number;

        if (
            isset($validated['or_number']) &&
            $newOrNumber !== $oldOrNumber &&
            !empty($newOrNumber)
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
    // Admin/Super Admin only
    // -------------------------------------------------------
    public function destroy(DocumentRequest $documentRequest)
    {
        $this->authorize('delete', $documentRequest);
        $documentRequest->delete();

        return response()->json(['message' => 'Request deleted successfully'], 200);
    }
}