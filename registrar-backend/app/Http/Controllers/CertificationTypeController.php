<?php

namespace App\Http\Controllers;

use App\Models\CertificationType;
use Illuminate\Http\Request;

class CertificationTypeController extends Controller
{
    public function index()
    {
        return response()->json(CertificationType::all(), 200);
    }

    public function show($id)
    {
        $cert = CertificationType::find($id);
        if (!$cert) return response()->json(['message' => 'Certification type not found'], 404);

        return response()->json($cert, 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'cert_name' => 'required|string|max:100',
        ]);

        $cert = CertificationType::create($request->all());
        return response()->json($cert, 201);
    }

    public function update(Request $request, $id)
    {
        $cert = CertificationType::find($id);
        if (!$cert) return response()->json(['message' => 'Certification type not found'], 404);

        $cert->update($request->all());
        return response()->json($cert, 200);
    }

    public function destroy($id)
    {
        $cert = CertificationType::find($id);
        if (!$cert) return response()->json(['message' => 'Certification type not found'], 404);

        $cert->delete();
        return response()->json(['message' => 'Certification type deleted'], 200);
    }
}
