<?php

namespace App\Http\Controllers;

use App\Models\DocumentType;
use Illuminate\Http\Request;

class DocumentTypeController extends Controller
{
    public function index()
    {
        return response()->json(DocumentType::all(), 200);
    }

    public function show($id)
    {
        $docType = DocumentType::find($id);
        if (!$docType) {
            return response()->json(['message' => 'Document type not found'], 404);
        }

        return response()->json($docType, 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'document_name'           => 'required|string|max:100',
            'document_description'    => 'nullable|string',
            'document_requirements'   => 'nullable|string',
            'document_process_period' => 'nullable|string|max:100',
            'access_id'               => 'nullable|integer',
        ]);

        $docType = DocumentType::create($validated);

        return response()->json($docType, 201);
    }

    public function update(Request $request, $id)
    {
        $docType = DocumentType::find($id);
        if (!$docType) {
            return response()->json(['message' => 'Document type not found'], 404);
        }

        $validated = $request->validate([
            'document_name'           => 'sometimes|string|max:100',
            'document_description'    => 'nullable|string',
            'document_requirements'   => 'nullable|string',
            'document_process_period' => 'nullable|string|max:100',
            'access_id'               => 'nullable|integer',
        ]);

        $docType->update($validated);

        return response()->json($docType, 200);
    }

    public function destroy($id)
    {
        $docType = DocumentType::find($id);
        if (!$docType) {
            return response()->json(['message' => 'Document type not found'], 404);
        }

        $docType->delete();

        return response()->json(['message' => 'Document type deleted'], 200);
    }

    // -------------------------------------------------------------------------
    // Archive / Restore — reversible, distinct from destroy() above.
    // -------------------------------------------------------------------------

    public function archive($id)
    {
        $docType = DocumentType::find($id);
        if (!$docType) {
            return response()->json(['message' => 'Document type not found'], 404);
        }

        $docType->update([
            'is_archived' => true,
            'archived_on' => now(),
        ]);

        return response()->json($docType->fresh(), 200);
    }

    public function restore($id)
    {
        $docType = DocumentType::find($id);
        if (!$docType) {
            return response()->json(['message' => 'Document type not found'], 404);
        }

        $docType->update([
            'is_archived' => false,
            'archived_on' => null,
        ]);

        return response()->json($docType->fresh(), 200);
    }
}