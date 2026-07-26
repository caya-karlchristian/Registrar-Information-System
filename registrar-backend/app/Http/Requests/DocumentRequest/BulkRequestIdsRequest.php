<?php

namespace App\Http\Requests\DocumentRequest;

use App\Models\SystemUser;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Shared by DocumentRequestController::archiveBulk() and ::restoreBulk() —
 * both had byte-for-byte identical validation and the same
 * "is this actor staff?" check, so one FormRequest covers both instead
 * of two near-duplicate classes.
 */
class BulkRequestIdsRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Same check both bulk methods had inline: not a per-instance
        // policy (there's no single DocumentRequest to check against —
        // it's a list of ids), so this stays role-based rather than
        // going through DocumentRequestPolicy.
        $actor = $this->user();

        return $actor instanceof SystemUser && $actor->isStaff();
    }

    public function rules(): array
    {
        return [
            'request_ids'   => 'required|array|min:1|max:200',
            'request_ids.*' => 'integer|distinct',
        ];
    }
}
