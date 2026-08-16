<?php

namespace App\Http\Requests\UnmatchedCashierItem;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Validates POST /unmatched-cashier-items/{id}/resolve.
 *
 * Exactly one of document_type_id / certificate_type_id must be given —
 * an unmatched receipt label maps to one type, never both and never
 * neither. That "exactly one" rule can't be expressed as a plain Laravel
 * rule string cleanly (required_without_all gets close but allows both to
 * be present simultaneously), so it's enforced explicitly in
 * withValidator() below.
 */
class ResolveUnmatchedCashierItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route sits behind 'role:3' in routes/api.php, same convention
        // as DocumentTypeController/CertificationTypeController.
        return true;
    }

    public function rules(): array
    {
        return [
            'document_type_id'    => 'nullable|integer|exists:document_type,document_type_id',
            'certificate_type_id' => 'nullable|integer|exists:certificate_type,certificate_type_id',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $hasDoc  = filled($this->input('document_type_id'));
            $hasCert = filled($this->input('certificate_type_id'));

            if ($hasDoc === $hasCert) { // both true or both false
                $validator->errors()->add(
                    'document_type_id',
                    'Provide exactly one of document_type_id or certificate_type_id.'
                );
            }
        });
    }
}
