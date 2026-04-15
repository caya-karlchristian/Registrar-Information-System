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
        if (!$docType) return response()->json(['message' => 'Document type not found'], 404);

        return response()->json($docType, 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'document_name'           => 'required|string|max:100',
            'document_description'    => 'nullable|string',
            'document_requirements'   => 'nullable|string',
            'document_process_period' => 'nullable|string',
            'access_id'               => 'nullable|integer',
        ]);

        $docType = DocumentType::create($request->all());
        return response()->json($docType, 201);
    }

    public function update(Request $request, $id)
    {
        $docType = DocumentType::find($id);
        if (!$docType) return response()->json(['message' => 'Document type not found'], 404);

        $docType->update($request->all());
        return response()->json($docType, 200);
    }

    public function destroy($id)
    {
        $docType = DocumentType::find($id);
        if (!$docType) return response()->json(['message' => 'Document type not found'], 404);

        $docType->delete();
        return response()->json(['message' => 'Document type deleted'], 200);
    }
}
