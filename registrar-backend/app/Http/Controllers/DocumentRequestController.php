<?php

namespace App\Http\Controllers;

// gawa ni aron stephen s. cordova year 2026
use App\Models\DocumentRequest;
use App\Models\SystemUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DocumentRequestController extends Controller
{
    // Relations to eager load on every request
    // Defined once so index() and show() stay in sync
    private const RELATIONS = [
        'user',
        'studentProfile',
        'academicRecord',
        'status',
        'documents',
    ];

    // -------------------------------------------------------
    // GET /document-requests
    // Admin/Super Admin → all requests
    // Student/Alumni → only their own
    // -------------------------------------------------------
    public function index()
    {
        /** @var \App\Models\SystemUser $user */
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
    // -------------------------------------------------------
    public function store(Request $request)
    {
        $this->authorize('create', DocumentRequest::class);

        $validated = $request->validate([
            'request_purpose_id' => 'required|integer|exists:request_purpose,request_purpose_id',
            'or_number'          => 'nullable|string|max:50',
            'receipt_date'       => 'nullable|date',
            'number_of_copies'   => 'required|integer|min:1|max:100',
            'document_type_ids'  => 'required|array|min:1',
            'document_type_ids.*'=> 'integer|exists:document_type,document_type_id',
        ]);

        $user = Auth::user();

        $studentProfile = $user->studentProfile;
        $academicRecord = $user->academicRecord;

        if (!$studentProfile || !$academicRecord) {
            return response()->json([
                'message' => 'Student profile or academic record not found.'
            ], 400);
        }

        $documentRequest = DocumentRequest::create([
            'user_id'            => $user->user_id,
            'student_profile_id' => $studentProfile->student_profile_id,
            'student_academic_id'=> $academicRecord->student_academic_id,
            'status_id'          => 1, // Pending
            'request_purpose_id' => $validated['request_purpose_id'],
            'or_number'          => $validated['or_number'] ?? null,
            'receipt_date'       => $validated['receipt_date'] ?? null,
            'number_of_copies'   => $validated['number_of_copies'],
        ]);

        // Attach the requested document types (many-to-many)
        foreach ($validated['document_type_ids'] as $documentTypeId) {
            $documentRequest->documents()->create([
                'document_type_id' => $documentTypeId,
            ]);
        }

        return response()->json(
            $documentRequest->load(self::RELATIONS),
            201
        );
    }

    // -------------------------------------------------------
    // PUT /document-requests/{id}
    // Admin/Super Admin only — update status, add notes, etc.
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

        $documentRequest->update($validated);

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