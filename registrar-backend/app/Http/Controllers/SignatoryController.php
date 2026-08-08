<?php

namespace App\Http\Controllers;

use App\Http\Requests\Signatory\StoreSignatoryRequest;
use App\Http\Requests\Signatory\UpdateSignatoryRequest;
use App\Models\Signatory;

/**
 * Manages the pool of signatories (e.g. "Campus Registrar") selectable
 * when generating certificates. Every route here sits behind the
 * 'role:3' middleware group in routes/api.php — admin (and super admin,
 * which bypasses role checks entirely) only. See
 * 2026_08_13_000000_create_signatories_table for background.
 */
class SignatoryController extends Controller
{
    // -------------------------------------------------------------------------
    // GET /signatories
    // -------------------------------------------------------------------------
    public function index()
    {
        return response()->json(
            Signatory::orderBy('sort_order')->get(),
            200
        );
    }

    // -------------------------------------------------------------------------
    // POST /signatories
    // -------------------------------------------------------------------------
    public function store(StoreSignatoryRequest $request)
    {
        $signatory = Signatory::create($request->validated());

        return response()->json($signatory, 201);
    }

    // -------------------------------------------------------------------------
    // PUT /signatories/{id}
    // -------------------------------------------------------------------------
    public function update(UpdateSignatoryRequest $request, $id)
    {
        $signatory = Signatory::find($id);
        if (!$signatory) {
            return response()->json(['message' => 'Signatory not found'], 404);
        }

        $signatory->update($request->validated());

        return response()->json($signatory, 200);
    }

    // -------------------------------------------------------------------------
    // DELETE /signatories/{id}
    // -------------------------------------------------------------------------
    public function destroy($id)
    {
        $signatory = Signatory::find($id);
        if (!$signatory) {
            return response()->json(['message' => 'Signatory not found'], 404);
        }

        $signatory->delete();

        return response()->json(['message' => 'Signatory deleted'], 200);
    }
}
