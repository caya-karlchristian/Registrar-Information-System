<?php

namespace App\Http\Controllers;
// gawa ni aron stephen s. cordova year 2027
use App\Models\DocumentRequest;
use Illuminate\Http\Request;

class DocumentRequestController extends Controller
{
    public function index()
    {
        return response()->json(
            DocumentRequest::with(['user', 'studentProfile', 'academicRecord', 'status', 'certificationType', 'documents'])->get(),
            200
        );
    }

    public function show($id)
    {
        $requestDoc = DocumentRequest::with(['user', 'studentProfile', 'academicRecord', 'status', 'certificationType', 'documents'])->find($id);
        if (!$requestDoc) return response()->json(['message' => 'Request not found'], 404);

        return response()->json($requestDoc, 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'user_id' => 'required|integer',
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

        $requestDoc = DocumentRequest::create($request->all());
        return response()->json($requestDoc, 201);
    }

    public function update(Request $request, $id)
    {
        $requestDoc = DocumentRequest::find($id);
        if (!$requestDoc) return response()->json(['message' => 'Request not found'], 404);

        $requestDoc->update($request->all());
        return response()->json($requestDoc, 200);
    }

    public function destroy($id)
    {
        $requestDoc = DocumentRequest::find($id);
        if (!$requestDoc) return response()->json(['message' => 'Request not found'], 404);

        $requestDoc->delete();
        return response()->json(['message' => 'Request deleted'], 200);
    }
}
