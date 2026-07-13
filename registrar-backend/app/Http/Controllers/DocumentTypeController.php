<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\DocumentType;
use App\Models\SystemUser;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DocumentTypeController extends Controller
{
    public function __construct(private AuditLogger $auditLogger) {}

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
    //
    // Per the Archive Policy — Document & Certificate Management:
    //   - A type may only be archived if no request using it is still
    //     Processing or Ready to Claim ("active"). Finished/forfeited
    //     requests don't block archiving.
    //   - Every archive/restore records who did it, when, and (for
    //     archives) why.
    // -------------------------------------------------------------------------

    public function archive(Request $request, $id)
    {
        $docType = DocumentType::find($id);
        if (!$docType) {
            return response()->json(['message' => 'Document type not found'], 404);
        }

        if ($docType->is_archived) {
            return response()->json($docType, 200);
        }

        $activeCount = $docType->activeRequestsCount();
        if ($activeCount > 0) {
            return response()->json([
                'message' => sprintf(
                    '%d active %s using this — can\'t archive yet.',
                    $activeCount,
                    $activeCount === 1 ? 'request is' : 'requests are'
                ),
                'active_requests' => $activeCount,
            ], 422);
        }

        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        /** @var SystemUser $actor */
        $actor = Auth::user();

        DB::transaction(function () use ($docType, $actor) {
            $docType->update([
                'is_archived' => true,
                'archived_on' => now(),
                'archived_by' => $actor->user_id,
            ]);
        });

        $this->auditLogger->log($request, $actor, AuditLog::ACTION_DOCUMENT_TYPE_ARCHIVED, [
            'document_type_id' => $docType->document_type_id,
            'document_name'    => $docType->document_name,
            'reason'           => $validated['reason'] ?? null,
        ]);

        return response()->json($docType->fresh(), 200);
    }

    public function restore(Request $request, $id)
    {
        $docType = DocumentType::find($id);
        if (!$docType) {
            return response()->json(['message' => 'Document type not found'], 404);
        }

        if (!$docType->is_archived) {
            return response()->json($docType, 200);
        }

        /** @var SystemUser $actor */
        $actor = Auth::user();

        DB::transaction(function () use ($docType) {
            $docType->update([
                'is_archived' => false,
                'archived_on' => null,
                'archived_by' => null,
            ]);
        });

        $this->auditLogger->log($request, $actor, AuditLog::ACTION_DOCUMENT_TYPE_RESTORED, [
            'document_type_id' => $docType->document_type_id,
            'document_name'    => $docType->document_name,
        ]);

        return response()->json($docType->fresh(), 200);
    }
}