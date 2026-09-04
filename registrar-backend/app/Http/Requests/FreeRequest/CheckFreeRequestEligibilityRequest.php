<?php

namespace App\Http\Requests\FreeRequest;

use Illuminate\Foundation\Http\FormRequest;

/**
 * FESPEC-0008 — Free Document/Certificate Request.
 *
 * Validates POST /free-requests/eligibility — the read-only "show staff
 * the eligibility indicator before they commit to filing" check backed
 * by FreeRequestService::checkEligibility() / FreeRequestEligibilityService::
 * checkMany().
 *
 * POST rather than GET (unlike the original spec's "GET /graduates/{id}/
 * eligibility"): the real FreeRequestEligibilityService::checkMany() takes
 * a full 'documents'/'certificates' line-item array per call — the same
 * shape StoreDocumentRequestRequest already validates for a normal
 * self-service filing — not a single graduate id. That doesn't fit
 * cleanly into query-string params once more than one or two items are
 * selected, so this follows the same "structured array body on a
 * logically read-only action" precedent already set elsewhere in this
 * codebase (e.g. AiQueryRequest). No DB writes happen here or in the
 * controller action it backs.
 *
 * Route sits behind 'role:3,4' + 'module:free_requests,View' in
 * routes/api.php — authorize() only needs to confirm shape, not
 * re-check module access.
 */
class CheckFreeRequestEligibilityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'target_user_id' => 'required|integer|exists:users,user_id',

            'documents'                    => 'nullable|array',
            'documents.*.document_type_id' => 'required_with:documents|integer|exists:document_type,document_type_id',

            'certificates'                       => 'nullable|array',
            'certificates.*.certificate_type_id' => 'required_with:certificates|integer|exists:certificate_type,certificate_type_id',
        ];
    }

    // -------------------------------------------------------------------
    // NOTE, mirroring StoreDocumentRequestRequest's own note: "at least
    // one document or certificate" and "is target_user_id actually a
    // student/alumni account" are cross-field / DB-state business rules,
    // not shape/type rules, and stay in the controller — see
    // FreeRequestController::eligibility().
    // -------------------------------------------------------------------
}
