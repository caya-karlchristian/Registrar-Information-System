<?php

namespace App\Http\Requests\Announcement;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route sits behind the superadmin-only (role:4) group in
        // routes/api.php — no per-request Policy check needed here.
        return true;
    }

    public function rules(): array
    {
        return [
            'title'    => 'sometimes|string|max:255',
            'content'  => 'sometimes|string',
            'enabled'  => 'sometimes|boolean',
            'end_date' => 'sometimes|nullable|date',
        ];
    }
}
