<?php

namespace App\Http\Requests\FulfillmentTrack;

use Illuminate\Foundation\Http\FormRequest;

class StoreFulfillmentTrackRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route sits behind the 'role:3' group in routes/api.php — no
        // per-request Policy check needed here. Same convention as
        // StoreLogbookCategoryRequest.
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:150|unique:fulfillment_track,name',
        ];
    }
}
