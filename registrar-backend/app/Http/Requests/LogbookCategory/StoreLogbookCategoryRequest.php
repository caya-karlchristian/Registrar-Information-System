<?php

namespace App\Http\Requests\LogbookCategory;

use Illuminate\Foundation\Http\FormRequest;

class StoreLogbookCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route sits behind the 'role:3' group in routes/api.php — no
        // per-request Policy check needed here.
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:150|unique:logbook_category,name',
        ];
    }
}
