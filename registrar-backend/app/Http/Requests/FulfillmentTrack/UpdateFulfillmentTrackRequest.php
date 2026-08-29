<?php

namespace App\Http\Requests\FulfillmentTrack;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFulfillmentTrackRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route sits behind the 'role:3' group in routes/api.php — no
        // per-request Policy check needed here. Same convention as
        // UpdateLogbookCategoryRequest.
        return true;
    }

    public function rules(): array
    {
        // {id} is the route param (FulfillmentTrack::find($id) happens in
        // the controller, not via route-model binding), read directly
        // here for the unique-ignore clause — same pattern as
        // UpdateLogbookCategoryRequest.
        $id = $this->route('id');

        return [
            'name' => "required|string|max:150|unique:fulfillment_track,name,{$id},fulfillment_track_id",
        ];
    }
}
