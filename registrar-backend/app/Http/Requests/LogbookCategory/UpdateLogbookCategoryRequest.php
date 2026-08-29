<?php

namespace App\Http\Requests\LogbookCategory;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLogbookCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route sits behind the 'role:3' group in routes/api.php — no
        // per-request Policy check needed here.
        return true;
    }

    public function rules(): array
    {
        // {id} is the route param (LogbookCategory::find($id) happens in
        // the controller, not via route-model binding), read directly
        // here for the unique-ignore clause — same pattern as
        // UpdateRequestPurposeRequest.
        $id = $this->route('id');

        return [
            'name' => "required|string|max:150|unique:logbook_category,name,{$id},logbook_category_id",
        ];
    }
}
