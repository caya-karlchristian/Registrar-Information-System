<?php

namespace App\Http\Requests\RequestPurpose;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRequestPurposeRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route sits behind the 'role:3' group in routes/api.php — no
        // per-request Policy check needed here.
        return true;
    }

    public function rules(): array
    {
        // {id} is the route param (RequestPurpose::find($id) happens in
        // the controller, not via route-model binding), read directly
        // here for the unique-ignore clause — same value the controller
        // uses to look the purpose up by primary key.
        $id = $this->route('id');

        return [
            'purpose_name' => "required|string|max:100|unique:request_purpose,purpose_name,{$id},request_purpose_id",
        ];
    }
}
