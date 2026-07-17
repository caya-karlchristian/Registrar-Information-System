<?php

namespace App\Http\Controllers;

use App\Models\DocumentRequest;
use App\Models\RequestDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Request document line-items.
 *
 * Explicit validation on all mutations — no $request->all() mass assignment.
 */
class RequestDocumentController extends Controller
{
    public function index()
    {
        return response()->json(
            RequestDocument::with(['request', 'documentType'])->get(),
            200
        );
    }

    public function show($id)
    {
        $reqDoc = RequestDocument::with(['request', 'documentType'])->findOrFail($id);
        return response()->json($reqDoc, 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'request_id'       => 'required|integer|exists:document_request,request_id',
            'document_type_id' => 'required|integer|exists:document_type,document_type_id',
            'number_of_copies' => 'required|integer|min:1|max:10',
        ]);

        // Ensure the authenticated student/alumni owns the parent request.
        // Without this check any student could append line-items to another
        // student's request by guessing the integer request_id.
        DocumentRequest::where('request_id', $validated['request_id'])
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $reqDoc = RequestDocument::create($validated);
        return response()->json($reqDoc, 201);
    }

    public function update(Request $request, $id)
    {
        $reqDoc = RequestDocument::findOrFail($id);

        $validated = $request->validate([
            'document_type_id' => 'sometimes|integer|exists:document_type,document_type_id',
            'number_of_copies' => 'sometimes|integer|min:1|max:10',
        ]);

        $reqDoc->update($validated);
        return response()->json($reqDoc, 200);
    }

    public function destroy($id)
    {
        $reqDoc = RequestDocument::findOrFail($id);

        try {
            $reqDoc->delete();
        } catch (\Illuminate\Database\QueryException $e) {
            if ($e->getCode() === '23000') {
                return response()->json([
                    'message' => 'Cannot delete this request document because it is still referenced elsewhere.',
                ], 409);
            }

            throw $e;
        }

        return response()->json(['message' => 'Request document deleted'], 200);
    }
}