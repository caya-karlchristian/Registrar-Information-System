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
            'student_profile_id' => 'required|integer',
            'academic_record_id' => 'required|integer',
            'status_id' => 'required|integer',
            'purpose_of_request' => 'required|string|max:255',
            'number_of_copies' => 'required|integer',
            'receipt_number' => 'nullable|string|max:100',
            'receipt_date' => 'nullable|date',
            'additional_notes' => 'nullable|string',
            'cert_type_id' => 'nullable|integer',
            'certification_detail' => 'nullable|string',
            'honors_dismissal_status' => 'nullable|string|max:50',
        ]);

        $requestDoc = DocumentRequest::create([
            ...$request->all(),
            'user_id' => Auth::user()->user_id, // secure
        ]);

        return response()->json($requestDoc, 201);
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
