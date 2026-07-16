<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\CertificationType;
use App\Models\SystemUser;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Certification type management.
 *
 * All mutations use explicit validation — no mass assignment from
 * raw request data ($request->all() removed).
 */
class CertificationTypeController extends Controller
{
    public function __construct(private AuditLogger $auditLogger) {}

    private function certColumns(): array
    {
        return [
            'certificate_type_id',
            'certificate_name',
            'certificate_requirements',
            'certificate_process_period',
            'access_id',
            'layout_header_left_url',
            'layout_header_right_url',
            'layout_footer_urls',
            'layout_header_logo_size',
            'layout_footer_logo_size',
            'is_archived',
            'archived_on',
            'archived_by',
        ];
    }

    private function freshRecord(int $id): CertificationType
    {
        return CertificationType::query()
            ->select($this->certColumns())
            ->where('certificate_type_id', $id)
            ->first();
    }

    public function layouts()
    {
        return response()->json(
            CertificationType::query()
                ->select($this->certColumns())
                ->orderBy('certificate_name')
                ->get(),
            200
        );
    }

    public function index()
    {
        return response()->json(
            CertificationType::query()->select($this->certColumns())->get(),
            200
        );
    }

    public function show($id)
    {
        $cert = CertificationType::find($id);
        if (!$cert) {
            return response()->json(['message' => 'Certification type not found'], 404);
        }

        return response()->json($this->freshRecord($id), 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'certificate_name'           => 'required|string|max:255',
            'certificate_requirements'   => 'nullable|string',
            'certificate_process_period' => 'nullable|string|max:100',
            'access_id'                  => 'nullable|integer',
        ]);

        $cert = CertificationType::create($validated);

        return response()->json($this->freshRecord($cert->certificate_type_id), 201);
    }

    public function update(Request $request, $id)
    {
        $cert = CertificationType::find($id);
        if (!$cert) {
            return response()->json(['message' => 'Certification type not found'], 404);
        }

        $validated = $request->validate([
            'certificate_name'           => 'sometimes|string|max:255',
            'certificate_requirements'   => 'nullable|string',
            'certificate_process_period' => 'nullable|string|max:100',
            'access_id'                  => 'nullable|integer',
        ]);

        $cert->update($validated);

        return response()->json($this->freshRecord($id), 200);
    }

    public function destroy($id)
    {
        $cert = CertificationType::find($id);
        if (!$cert) {
            return response()->json(['message' => 'Certification type not found'], 404);
        }

        try {
            $cert->delete();
        } catch (\Illuminate\Database\QueryException $e) {
            // MySQL error 1451 — FK constraint violation
            if ($e->getCode() === '23000') {
                return response()->json([
                    'message' => 'Cannot delete a certification type that is referenced by existing document requests.',
                ], 409);
            }

            throw $e;
        }

        return response()->json(['message' => 'Certification type deleted'], 200);
    }

    // -------------------------------------------------------------------------
    // Archive / Restore — reversible, distinct from destroy() above.
    //
    // Per the Archive Policy — Document & Certificate Management:
    //   - A certificate type may only be archived if no request using it is
    //     still Processing or Ready to Claim ("active").
    //   - Archiving automatically locks the template (enforced in
    //     updateLayout()/uploadLayoutLogo() below via is_archived — no
    //     separate "locked" flag needed, and restoring unlocks it for free).
    //   - Every archive/restore records who did it, when, and (for
    //     archives) why.
    // -------------------------------------------------------------------------

    public function archive(Request $request, $id)
    {
        $cert = CertificationType::find($id);
        if (!$cert) {
            return response()->json(['message' => 'Certification type not found'], 404);
        }

        if ($cert->is_archived) {
            return response()->json($this->freshRecord($id), 200);
        }

        $activeCount = $cert->activeRequestsCount();
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

        DB::transaction(function () use ($cert, $actor) {
            $cert->update([
                'is_archived' => true,
                'archived_on' => now(),
                'archived_by' => $actor->user_id,
            ]);
        });

        $this->auditLogger->log($request, $actor, AuditLog::ACTION_CERTIFICATE_TYPE_ARCHIVED, [
            'certificate_type_id' => $cert->certificate_type_id,
            'certificate_name'    => $cert->certificate_name,
            'reason'              => $validated['reason'] ?? null,
        ]);

        return response()->json($this->freshRecord($id), 200);
    }

    public function restore(Request $request, $id)
    {
        $cert = CertificationType::find($id);
        if (!$cert) {
            return response()->json(['message' => 'Certification type not found'], 404);
        }

        if (!$cert->is_archived) {
            return response()->json($this->freshRecord($id), 200);
        }

        /** @var SystemUser $actor */
        $actor = Auth::user();

        DB::transaction(function () use ($cert) {
            $cert->update([
                'is_archived' => false,
                'archived_on' => null,
                'archived_by' => null,
            ]);
        });

        $this->auditLogger->log($request, $actor, AuditLog::ACTION_CERTIFICATE_TYPE_RESTORED, [
            'certificate_type_id' => $cert->certificate_type_id,
            'certificate_name'    => $cert->certificate_name,
        ]);

        return response()->json($this->freshRecord($id), 200);
    }

    public function updateLayout(Request $request, $id)
    {
        $cert = CertificationType::find($id);
        if (!$cert) {
            return response()->json(['message' => 'Certification type not found'], 404);
        }

        if ($cert->is_archived) {
            return response()->json([
                'message' => 'This certificate is archived — its template is read-only. Restore it first to make changes.',
            ], 423); // 423 Locked
        }

        $validated = $request->validate([
            'layout_header_left_url'  => 'nullable|string|max:2048',
            'layout_header_right_url' => 'nullable|string|max:2048',
            'layout_footer_urls'      => 'nullable|array',
            'layout_footer_urls.*'    => 'string|max:2048',
            'layout_header_logo_size' => 'nullable|integer|min:24|max:240',
            'layout_footer_logo_size' => 'nullable|integer|min:16|max:240',
        ]);

        if (array_key_exists('layout_footer_urls', $validated) && $validated['layout_footer_urls'] === null) {
            $validated['layout_footer_urls'] = [];
        }

        $cert->update($validated);

        return response()->json([
            'message' => 'Certification layout updated successfully',
            'data'    => $cert->fresh(),
        ], 200);
    }

    public function uploadLayoutLogo(Request $request, $id)
    {
        $cert = CertificationType::find($id);
        if (!$cert) {
            return response()->json(['message' => 'Certification type not found'], 404);
        }

        if ($cert->is_archived) {
            return response()->json([
                'message' => 'This certificate is archived — its template is read-only. Restore it first to make changes.',
            ], 423); // 423 Locked
        }

        $validated = $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,svg|max:2048',
            'slot' => 'nullable|in:header_left,header_right,footer',
        ]);

        $slot = $validated['slot'] ?? 'footer';

        // Use the default disk from FILESYSTEM_DISK env var (e.g. 's3' in production).
        // Storing on 'public' (local) while Storage::url() resolves via S3 caused
        // images to be unreadable — the file existed on local disk but the URL
        // pointed at S3 where nothing was uploaded.
        $disk = config('filesystems.default', 'public');
        $path = $request->file('logo')->store("certification-layouts/{$id}/{$slot}", $disk);

        // Persist the resolved public URL into the correct layout column so the
        // model accessors don't need to re-resolve it later (S3 pre-signed URLs
        // differ from local Storage::url() paths).
        $url = Storage::disk($disk)->url($path);

        $column = match ($slot) {
            'header_left'  => 'layout_header_left_url',
            'header_right' => 'layout_header_right_url',
            default        => null, // footer: caller appends via updateLayout
        };

        if ($column) {
            // Store the full public URL for header slots so the accessor returns
            // the correct S3 URL without double-prefixing.
            $cert->update([$column => $url]);
        }

        return response()->json([
            'message' => 'Logo uploaded successfully',
            'data'    => [
                'slot' => $slot,
                'path' => $path,
                // Full public URL — S3 object URL in production, /storage/... locally.
                // The frontend should use this directly as the new layout URL value.
                'url'  => $url,
            ],
        ], 201);
    }
}