<?php

namespace App\Http\Requests\DocumentRequest;

use App\Models\SystemUser;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator as ValidatorContract;

/**
 * Validates the payload for POST /document-requests/claim.
 *
 * There is no {documentRequest} route parameter here — unlike update(),
 * the whole point of this endpoint is that staff arrive with a QR scan
 * or a typed claim_code, not a known request_id. So, same reasoning as
 * BulkRequestIdsRequest: authorize() goes through a class-based policy
 * call (no model instance to check ownership/state against) rather
 * than an instance-based one.
 *
 * Exactly one of uuid / claim_code must be present — never both, never
 * neither. uuid comes from a successful QR scan (the frontend decodes
 * the QR client-side and sends the raw uuid string). claim_code comes
 * from the manual-entry fallback field on the same staff screen.
 *
 * Work Item #1 — Granular Per-Action Permissions: this used to inline
 * `$actor->isStaff()` directly. Now delegates to
 * DocumentRequestPolicy::claim(), which additionally requires the
 * 'Complete' dashboard action — a Student Staff account (which has
 * Complete) still passes here, but claimRequest() ultimately runs
 * through DocumentRequestService::updateRequest()'s own fine-grained
 * check too, so the requirement is enforced at both layers.
 */
class ClaimDocumentRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        $actor = $this->user();

        if (!$actor instanceof SystemUser) {
            return false;
        }

        return $actor->can('claim', \App\Models\DocumentRequest::class);
    }

    public function rules(): array
    {
        return [
            'uuid'       => 'required_without:claim_code|nullable|uuid',
            'claim_code' => 'required_without:uuid|nullable|string|size:6',
        ];
    }

    /**
     * Reject a payload that sends both — a scan and a manual entry in
     * the same request is a client bug, not a valid "try both" request.
     * Catching it here keeps the service layer from having to decide
     * which one wins.
     */
    public function withValidator(ValidatorContract $validator): void
    {
        $validator->after(function ($validator) {
            if (filled($this->input('uuid')) && filled($this->input('claim_code'))) {
                $validator->errors()->add('uuid', 'Provide either uuid or claim_code, not both.');
            }
        });
    }

    /**
     * claim_code is stored/generated uppercase (see DocumentRequest::
     * generateUniqueClaimCode()); normalize staff input the same way so
     * a lowercase manual entry still matches.
     */
    protected function prepareForValidation(): void
    {
        if ($this->filled('claim_code')) {
            $this->merge(['claim_code' => strtoupper(trim($this->input('claim_code')))]);
        }

        if ($this->filled('uuid')) {
            $this->merge(['uuid' => trim($this->input('uuid'))]);
        }
    }
}
