<?php

namespace App\Http\Controllers;
// gawa ni aron stephen s. cordova year 2027
use App\Models\DocumentRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;


class DocumentRequestController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        $query = DocumentRequest::with([
            'user',
            'studentProfile',
            'academicRecord',
            'status',
            'certificationType',
            'documents'
        ]);

        if (!$user) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 401);
        }
        // If NOT registrar staff
        if ($user->role_id != 3) {
            $query->where('user_id', $user->user_id);
        }

        return response()->json($query->get(), 200);
    }


    public function show(DocumentRequest $documentRequest)
    {
        $this->authorize('view', $documentRequest);

        return response()->json(
            $documentRequest->load([
                'user',
                'studentProfile',
                'academicRecord',
                'status',
                'certificationType',
                'documents'
            ]),
            200
        );
    }

   public function store(Request $request)
{
    $request->validate([
        'purpose_of_request' => 'required|string|max:255',
        'receipt_number' => 'nullable|string|max:100',
        'receipt_date' => 'nullable|date',
        'cert_type_id' => 'nullable|integer',
    ]);

    $user = Auth::user();

    // Get linked student profile + academic record safely
    $studentProfile = $user->studentProfile;
    $academicRecord = $user->academicRecord;

    if (!$studentProfile || !$academicRecord) {
        return response()->json([
            'message' => 'Student profile or academic record not found'
        ], 400);
    }

    $documentRequest = DocumentRequest::create([
        'user_id' => $user->user_id,
        'student_profile_id' => $studentProfile->student_profile_id,
        'academic_record_id' => $academicRecord->academic_record_id,

        'status_id' => 1,
        'number_of_copies' => 1,

        'purpose_of_request' => $request->purpose_of_request,
        'receipt_number' => $request->receipt_number,
        'receipt_date' => $request->receipt_date,
        'cert_type_id' => $request->cert_type_id,
    ]);

    return response()->json($documentRequest, 201);
}
    public function update(Request $request, DocumentRequest $documentRequest)
    {
        $this->authorize('update', $documentRequest);

        $documentRequest->update($request->all());

        return response()->json($documentRequest, 200);
    }


    public function destroy(DocumentRequest $documentRequest)
    {
        $this->authorize('delete', $documentRequest);

        $documentRequest->delete();

        return response()->json(['message' => 'Request deleted'], 200);
    }

}
