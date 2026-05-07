<?php

namespace App\Http\Controllers;

use App\Models\RequestDocument;
use Illuminate\Http\Request;

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
        $reqDoc->delete();
        return response()->json(['message' => 'Request document deleted'], 200);
    }
}
