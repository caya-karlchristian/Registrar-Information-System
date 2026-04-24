<?php

namespace App\Http\Controllers;

use App\Models\RequestDocument;
use Illuminate\Http\Request;

class RequestDocumentController extends Controller
{
    public function index()
    {
        return response()->json(RequestDocument::with(['request', 'documentType'])->get(), 200);
    }

    public function show($id)
    {
        $reqDoc = RequestDocument::with(['request', 'documentType'])->find($id);
        if (!$reqDoc) return response()->json(['message' => 'Request document not found'], 404);

        return response()->json($reqDoc, 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'request_id' => 'required|integer',
            'document_type_id' => 'required|integer',
        ]);

        $reqDoc = RequestDocument::create($request->all());
        return response()->json($reqDoc, 201);
    }

    public function update(Request $request, $id)
    {
        $reqDoc = RequestDocument::find($id);
        if (!$reqDoc) return response()->json(['message' => 'Request document not found'], 404);

        $reqDoc->update($request->all());
        return response()->json($reqDoc, 200);
    }

    public function destroy($id)
    {
        $reqDoc = RequestDocument::find($id);
        if (!$reqDoc) return response()->json(['message' => 'Request document not found'], 404);

        $reqDoc->delete();
        return response()->json(['message' => 'Request document deleted'], 200);
    }
}
