<?php

namespace App\Http\Requests\Announcement;

use Illuminate\Foundation\Http\FormRequest;

class ArchiveAnnouncementRequest extends FormRequest
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
            'reason' => 'nullable|string|max:500',
        ];
    }
}
