<?php

namespace App\Http\Requests\DocumentRequest;

use App\Models\DocumentRequest;
use Illuminate\Foundation\Http\FormRequest;

class StoreDocumentRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Replaces the controller's explicit $this->authorize('create', ...)
        // call — FormRequest runs this automatically before rules() below,
        // so the controller no longer needs to call it itself.
        return $this->user()->can('create', DocumentRequest::class);
    }

    public function rules(): array
    {
        return [
            'request_purpose_id'                 => 'required|integer|exists:request_purpose,request_purpose_id',
            'or_number'                          => 'nullable|string|max:50',
            'receipt_date'                       => 'nullable|date',
            'documents'                          => 'nullable|array',
            'documents.*.document_type_id'       => 'required|integer|exists:document_type,document_type_id',
            'documents.*.number_of_copies'       => 'required|integer|min:1|max:10',
            'certificates'                       => 'nullable|array',
            'certificates.*.certificate_type_id' => 'required|integer|exists:certificate_type,certificate_type_id',
            'certificates.*.number_of_copies'    => 'nullable|integer|min:1|max:10',
        ];
    }

    // -------------------------------------------------------------------
    // NOTE: the following checks intentionally stay in the controller,
    // NOT here, even though they run on this same request's data:
    //
    //   - "at least one document or certificate" (cross-field business
    //     rule, not a shape/type rule)
    //   - OR-number single-use check (hits CashierService / DB)
    //   - OR-number payment verification (hits an external API)
    //   - paid-items vs requested-items matching (CashierDocumentMatcher)
    //
    // FormRequest::rules() should stay fast and side-effect-free — it
    // runs on every request before the controller method body, so
    // network/DB-bound checks belong in the controller (or a service),
    // not here. This mirrors how Laravel's own docs distinguish
    // "validation" from "authorization"/business rules.
    // -------------------------------------------------------------------
}
