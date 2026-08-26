<?php

namespace App\Http\Requests\CashierOrOverride;

use App\Models\SystemUser;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Validates POST /cashier-overrides.
 *
 * Route sits behind 'role:3' in routes/api.php (admin; superadmin
 * bypasses via RoleMiddleware) — same convention as
 * ResolveUnmatchedCashierItemRequest — so authorize() only needs to
 * confirm the target account is actually a student/alumni, not staff.
 *
 * Deliberately does NOT check "is this OR already used" or "does an
 * active override already exist for this pair" here — those are
 * DB-state business checks, not shape/type validation, and belong in
 * the controller inside a locked transaction (same reasoning
 * StoreDocumentRequestRequest's own docblock already gives for why
 * OR-number single-use and payment verification stay out of rules()).
 */
class StoreCashierOrOverrideRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'or_number' => 'required|string|max:50',
            'user_id'   => [
                'required',
                'integer',
                Rule::exists('users', 'user_id'),
            ],

            // A one-line "receipt number matches" note isn't enough —
            // this bypasses a money-facing check, so the admin must
            // record what actually justified it (e.g. "verified
            // physical receipt at the counter, cashier typo'd the
            // middle name"). Minimum length nudges away from
            // rubber-stamp reasons like "ok" or "fine".
            'reason' => 'required|string|min:10|max:1000',

            // What the admin physically read off the receipt, in the
            // same shape CashierDocumentMatcher expects from the live
            // Cashier API's items[] — see the migration's docblock for
            // why this exists at all. Optional at the schema level, but
            // required in practice whenever the request actually
            // carries document/certificate line items (see
            // withValidator() below) — an override with no
            // verified_items for a request that has requested documents
            // would silently skip the item/quantity check entirely,
            // which is exactly the weakening this design exists to
            // avoid.
            'verified_items'             => 'nullable|array|max:50',
            'verified_items.*.document'  => 'required_with:verified_items|string|max:255',
            'verified_items.*.quantity'  => 'required_with:verified_items|integer|min:1|max:999',
            'verified_items.*.amount'    => 'nullable|string|max:50',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $userId = $this->input('user_id');

            if (!$userId) {
                return; // already flagged by the required/integer rule above
            }

            /** @var SystemUser|null $target */
            $target = SystemUser::find($userId);

            if ($target && !in_array($target->role_id, [SystemUser::ROLE_STUDENT, SystemUser::ROLE_ALUMNI], true)) {
                $validator->errors()->add(
                    'user_id',
                    'A cashier OR override can only be issued for a student or alumni account.'
                );
            }
        });
    }
}
