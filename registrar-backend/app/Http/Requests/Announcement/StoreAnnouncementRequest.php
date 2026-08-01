<?php

namespace App\Http\Requests\Announcement;

use Illuminate\Foundation\Http\FormRequest;

class StoreAnnouncementRequest extends FormRequest
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
            'title'    => 'required|string|max:255',
            'content'  => 'required|string',
            'end_date' => 'nullable|date',
        ];
    }
}
