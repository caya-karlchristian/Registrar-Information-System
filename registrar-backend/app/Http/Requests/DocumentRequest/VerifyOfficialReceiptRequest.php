<?php

namespace App\Http\Requests\DocumentRequest;

use App\Models\DocumentRequest;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates the payload for POST /document-requests/verify-or.
 *
 * This is the new first step of the request wizard (see the OR-first
 * reorder ticket): OR Number + Date of Payment, verified against the
 * cashier API and matched to document/certificate suggestions, BEFORE the
 * student has selected anything. No DocumentRequest is created here —
 * this only verifies and suggests. StoreDocumentRequestRequest and the
 * strict CashierDocumentMatcher still gate the real submission unchanged.
 *
 * or_number/receipt_date are `required` here (unlike
 * StoreDocumentRequestRequest, where both stay `nullable` — walk-in /
 * staff-created requests still skip OR verification entirely and never
 * hit this endpoint).
 *
 * NOTE: receipt_date previously also enforced a 7-day lookback window
 * (`after_or_equal: now()->subDays(7)`), rejecting receipts older than a
 * week. That restriction has been intentionally removed — a receipt of
 * any age is now accepted, as long as it isn't dated in the future. If
 * this window ever needs to come back (e.g. for a future policy change),
 * reintroduce it here as a single source of truth rather than duplicating
 * the check anywhere else.
 */
class VerifyOfficialReceiptRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Same permission as creating a request — verifying an OR only
        // makes sense as a precursor to submitting one, so this reuses
        // the 'create' ability rather than introducing a separate one.
        return $this->user()->can('create', DocumentRequest::class);
    }

    public function rules(): array
    {
        return [
            'or_number'     => 'required|string|max:50',
            'receipt_date'  => 'required|date|before_or_equal:' . now()->toDateString(),
        ];
    }

    public function messages(): array
    {
        return [
            'receipt_date.before_or_equal' => 'Date of payment cannot be in the future.',
        ];
    }
}